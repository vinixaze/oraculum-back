const { getPool } = require('../config/db');
const quizScoring = require('../services/quizScoring');

const startQuiz = async (req, res) => {
  try {
    const { email, modo = 'MEDIO' } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.json({ 
        success: true, 
        message: 'Modo desenvolvimento sem banco' 
      });
    }

     const quizResult = await pool.query(
      "SELECT * FROM quizzes WHERE tipo = 'inicial' LIMIT 1"
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz não encontrado' });
    }

    const quiz = quizResult.rows[0];

    const userResult = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userId = userResult.rows[0].id;

    const sessao = quizScoring.iniciarQuiz(modo);

    await pool.query(
      'DELETE FROM quiz_sessions WHERE usuario_id = $1',
      [userId]
    );

    const sessionResult = await pool.query(
      `INSERT INTO quiz_sessions 
       (usuario_id, quiz_id, email, modo, peso_iniciante, peso_expert, 
        pontuacao, total_perguntas, acertos_seguidos_iniciante, nivel, finalizado) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        userId,
        quiz.id,
        email,
        modo,
        sessao.pesoIniciante,
        sessao.pesoExpert,
        sessao.pontuacao,
        sessao.totalPerguntas,
        sessao.acertosSeguidosIniciante,
        sessao.nivel,
        sessao.finalizado
      ]
    );

    res.json({ 
      success: true, 
      sessionId: sessionResult.rows[0].id,
      sessao: sessao
    });
  } catch (error) {
    console.error('Erro ao iniciar quiz:', error);
    res.status(500).json({ error: 'Erro ao iniciar quiz' });
  }
};

const getNextQuestion = async (req, res) => {
  try {
    const { email } = req.params;
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ error: 'Banco de dados não disponível' });
    }

    const sessionResult = await pool.query(
      `SELECT s.*, u.id as user_id 
       FROM quiz_sessions s 
       JOIN usuarios u ON s.usuario_id = u.id 
       WHERE s.email = $1 AND s.finalizado = FALSE 
       ORDER BY s.started_at DESC 
       LIMIT 1`,
      [email]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const sessao = sessionResult.rows[0];

    if (sessao.pontuacao >= 30 || sessao.total_perguntas >= 12) {
      return res.json({
        finished: true,
        message: 'Quiz finalizado',
        pontuacao: sessao.pontuacao,
        totalPerguntas: sessao.total_perguntas
      });
    }

    const answeredResult = await pool.query(
      'SELECT pergunta_id FROM quiz_answers WHERE session_id = $1',
      [sessao.id]
    );

    const answeredIds = answeredResult.rows.map(r => r.pergunta_id);

    let questionQuery;
    let queryParams;

    if (answeredIds.length > 0) {
      questionQuery = `
        SELECT p.*, 
               array_agg(json_build_object(
                 'id', a.id, 
                 'texto', a.texto, 
                 'letra', a.letra
               ) ORDER BY a.letra) as alternativas
        FROM perguntas p
        LEFT JOIN alternativas a ON p.id = a.pergunta_id
        WHERE p.quiz_id = $1 
          AND p.dificuldade = $2 
          AND p.id NOT IN (${answeredIds.join(',')})
        GROUP BY p.id
        ORDER BY p.ordem
        LIMIT 1
      `;
      queryParams = [sessao.quiz_id, sessao.nivel];
    } else {
      questionQuery = `
        SELECT p.*, 
               array_agg(json_build_object(
                 'id', a.id, 
                 'texto', a.texto, 
                 'letra', a.letra
               ) ORDER BY a.letra) as alternativas
        FROM perguntas p
        LEFT JOIN alternativas a ON p.id = a.pergunta_id
        WHERE p.quiz_id = $1 AND p.dificuldade = $2
        GROUP BY p.id
        ORDER BY p.ordem
        LIMIT 1
      `;
      queryParams = [sessao.quiz_id, sessao.nivel];
    }

    const questionResult = await pool.query(questionQuery, queryParams);

    if (questionResult.rows.length === 0) {
      const outroDificuldade = sessao.nivel === 'INICIANTE' ? 'EXPERT' : 'INICIANTE';
      
      const fallbackQuery = `
        SELECT p.*, 
               array_agg(json_build_object(
                 'id', a.id, 
                 'texto', a.texto, 
                 'letra', a.letra
               ) ORDER BY a.letra) as alternativas
        FROM perguntas p
        LEFT JOIN alternativas a ON p.id = a.pergunta_id
        WHERE p.quiz_id = $1 
          AND p.dificuldade = $2 
          ${answeredIds.length > 0 ? `AND p.id NOT IN (${answeredIds.join(',')})` : ''}
        GROUP BY p.id
        ORDER BY p.ordem
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [sessao.quiz_id, outroDificuldade]);
      
      if (fallbackResult.rows.length === 0) {
        return res.json({
          finished: true,
          message: 'Todas as perguntas foram respondidas',
          pontuacao: sessao.pontuacao,
          totalPerguntas: sessao.total_perguntas
        });
      }
      
      return res.json({
        question: fallbackResult.rows[0],
        nivelAtual: sessao.nivel,
        pontuacaoAtual: sessao.pontuacao,
        totalPerguntas: sessao.total_perguntas
      });
    }

    res.json({
      question: questionResult.rows[0],
      nivelAtual: sessao.nivel,
      pontuacaoAtual: sessao.pontuacao,
      totalPerguntas: sessao.total_perguntas
    });

  } catch (error) {
    console.error('Erro ao buscar próxima pergunta:', error);
    res.status(500).json({ error: 'Erro ao buscar próxima pergunta' });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { email, perguntaId, alternativaEscolhidaId } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.json({ success: true, message: 'Modo desenvolvimento' });
    }

    const sessionResult = await pool.query(
      `SELECT s.*, u.id as user_id 
       FROM quiz_sessions s 
       JOIN usuarios u ON s.usuario_id = u.id 
       WHERE s.email = $1 AND s.finalizado = FALSE 
       ORDER BY s.started_at DESC 
       LIMIT 1`,
      [email]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const sessao = sessionResult.rows[0];

    const perguntaResult = await pool.query(
      'SELECT dificuldade FROM perguntas WHERE id = $1',
      [perguntaId]
    );

    if (perguntaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }

    const dificuldadeQuestao = perguntaResult.rows[0].dificuldade;

    const alternativaResult = await pool.query(
      'SELECT correta FROM alternativas WHERE id = $1',
      [alternativaEscolhidaId]
    );

    if (alternativaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alternativa não encontrada' });
    }

    const respostaCorreta = alternativaResult.rows[0].correta;

    const sessaoAtualizada = quizScoring.processarResposta(
      {
        modo: sessao.modo,
        pesoIniciante: sessao.peso_iniciante,
        pesoExpert: sessao.peso_expert,
        pontuacao: sessao.pontuacao,
        totalPerguntas: sessao.total_perguntas,
        acertosSeguidosIniciante: sessao.acertos_seguidos_iniciante,
        nivel: sessao.nivel,
        historico: [],
        finalizado: sessao.finalizado
      },
      perguntaId,
      respostaCorreta,
      dificuldadeQuestao
    );

    await pool.query(
      `UPDATE quiz_sessions 
       SET pontuacao = $1, 
           total_perguntas = $2, 
           acertos_seguidos_iniciante = $3, 
           nivel = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        sessaoAtualizada.pontuacao,
        sessaoAtualizada.totalPerguntas,
        sessaoAtualizada.acertosSeguidosIniciante,
        sessaoAtualizada.nivel,
        sessao.id
      ]
    );

    await pool.query(
      `INSERT INTO quiz_answers 
       (session_id, pergunta_id, alternativa_escolhida_id, acertou, 
        pontos_ganhos, nivel_atual, mudou_nivel, pontuacao_total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sessao.id,
        perguntaId,
        alternativaEscolhidaId,
        respostaCorreta,
        sessaoAtualizada.ultimaResposta.pontosGanhos,
        sessaoAtualizada.nivel,
        sessaoAtualizada.ultimaResposta.mudouNivel,
        sessaoAtualizada.pontuacao
      ]
    );

    res.json({
      success: true,
      acertou: respostaCorreta,
      pontosGanhos: sessaoAtualizada.ultimaResposta.pontosGanhos,
      pontuacaoAtual: sessaoAtualizada.pontuacao,
      nivelAtual: sessaoAtualizada.nivel,
      mudouNivel: sessaoAtualizada.ultimaResposta.mudouNivel,
      mensagem: sessaoAtualizada.ultimaResposta.mensagem,
      finalizado: sessaoAtualizada.finalizado
    });

  } catch (error) {
    console.error('Erro ao processar resposta:', error);
    res.status(500).json({ error: 'Erro ao processar resposta' });
  }
};

const submitQuiz = async (req, res) => {
  try {
    const { email } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.json({ success: true, message: 'Modo desenvolvimento' });
    }

    const sessionResult = await pool.query(
      `SELECT s.*, u.id as user_id 
       FROM quiz_sessions s 
       JOIN usuarios u ON s.usuario_id = u.id 
       WHERE s.email = $1 AND s.finalizado = FALSE 
       ORDER BY s.started_at DESC 
       LIMIT 1`,
      [email]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const sessao = sessionResult.rows[0];

    const answersResult = await pool.query(
      'SELECT * FROM quiz_answers WHERE session_id = $1 ORDER BY answered_at',
      [sessao.id]
    );

    const sessaoCompleta = {
      modo: sessao.modo,
      pontuacao: sessao.pontuacao,
      totalPerguntas: sessao.total_perguntas,
      historico: answersResult.rows.map(a => ({
        acertou: a.acertou,
        pontosGanhos: a.pontos_ganhos
      }))
    };

    const relatorio = quizScoring.gerarRelatorio(sessaoCompleta);

    await pool.query(
      `INSERT INTO resultados 
       (usuario_id, quiz_id, pontuacao_total, nivel_resultante, total_perguntas, 
        acertos, erros, percentual_conclusao, modo, atingiu_maximo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        sessao.user_id,
        sessao.quiz_id,
        relatorio.pontuacaoFinal,
        relatorio.nivelFinal,
        relatorio.totalPerguntas,
        relatorio.acertos,
        relatorio.erros,
        relatorio.percentualConclusao,
        relatorio.modo,
        relatorio.atingiuMaximo
      ]
    );

    await pool.query(
      `UPDATE usuarios 
       SET quiz_completed = TRUE, 
           nivel_atual = $1, 
           pontuacao_final = $2 
       WHERE id = $3`,
      [relatorio.nivelFinal, relatorio.pontuacaoFinal, sessao.user_id]
    );

    // Marca sessão como finalizada
    await pool.query(
      'UPDATE quiz_sessions SET finalizado = TRUE WHERE id = $1',
      [sessao.id]
    );

    res.json({ success: true, relatorio });

  } catch (error) {
    console.error('Erro ao finalizar quiz:', error);
    res.status(500).json({ error: 'Erro ao finalizar quiz' });
  }
};

const getQuizResult = async (req, res) => {
  try {
    const { email } = req.params;
    const pool = getPool();

    if (!pool) {
      return res.status(404).json({ error: 'Resultado não encontrado' });
    }

    const result = await pool.query(
      `SELECT * FROM resultados r
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE u.email = $1 
       ORDER BY r.data_realizacao DESC 
       LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resultado não encontrado' });
    }

    res.json({ result: result.rows[0] });

  } catch (error) {
    console.error('Erro ao buscar resultado:', error);
    res.status(500).json({ error: 'Erro ao buscar resultado' });
  }
};

module.exports = { 
  startQuiz, 
  getNextQuestion,
  submitAnswer, 
  submitQuiz, 
  getQuizResult 
};