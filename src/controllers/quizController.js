const { getPool } = require('../config/db');
const quizScoring = require('../services/quizScoring');

const startQuiz = async (req, res) => {
  try {
    const { email, modo = 'MEDIO' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ error: 'Banco de dados não disponível' });
    }

    const userResult = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userId = userResult.rows[0].id;

    const quizResult = await pool.query(
      "SELECT * FROM quizzes WHERE tipo = 'inicial' LIMIT 1"
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz não encontrado' });
    }

    const quiz = quizResult.rows[0];

    await pool.query(
      'DELETE FROM quiz_sessions WHERE usuario_id = $1 AND finalizado = FALSE',
      [userId]
    );

    const sessao = quizScoring.iniciarQuiz(modo);

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
      email: email,
      modo: modo,
      message: 'Quiz iniciado com sucesso'
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar quiz', details: error.message });
  }
};

const getNextQuestion = async (req, res) => {
  try {
    const { email } = req.params;
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ 
        error: 'Banco de dados não disponível' 
      });
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
      return res.status(404).json({ 
        error: 'Nenhuma sessão ativa encontrada'
      });
    }

    const sessao = sessionResult.rows[0];

      if (sessao.total_perguntas >= 12) {
      await pool.query(
        'UPDATE quiz_sessions SET finalizado = TRUE WHERE id = $1',
        [sessao.id]
      );

      return res.json({
        finished: true,
        message: 'Quiz finalizado - 12 perguntas respondidas!',
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
        SELECT p.id, p.texto, p.ordem, p.dica,
               json_agg(
                 json_build_object(
                   'id', a.id, 
                   'texto', a.texto, 
                   'letra', a.letra
                 ) ORDER BY a.letra
               ) as alternativas
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
        SELECT p.id, p.texto, p.ordem, p.dica,
               json_agg(
                 json_build_object(
                   'id', a.id, 
                   'texto', a.texto, 
                   'letra', a.letra
                 ) ORDER BY a.letra
               ) as alternativas
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
        SELECT p.id, p.texto, p.ordem, p.dica,
               json_agg(
                 json_build_object(
                   'id', a.id, 
                   'texto', a.texto, 
                   'letra', a.letra
                 ) ORDER BY a.letra
               ) as alternativas
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
        await pool.query(
          'UPDATE quiz_sessions SET finalizado = TRUE WHERE id = $1',
          [sessao.id]
        );

        return res.json({
          finished: true,
          message: 'Quiz finalizado - sem mais perguntas!',
          pontuacao: sessao.pontuacao,
          totalPerguntas: sessao.total_perguntas
        });
      }
      
      return res.json({
        question: fallbackResult.rows[0],
        pontuacaoAtual: sessao.pontuacao,
        nivelAtual: sessao.nivel,
        totalPerguntas: sessao.total_perguntas,
        perguntaNumero: sessao.total_perguntas + 1
      });
    }

    console.log(`📝 Pergunta ${sessao.total_perguntas + 1}/12 carregada`);

    res.json({
      question: questionResult.rows[0],
      pontuacaoAtual: sessao.pontuacao,
      nivelAtual: sessao.nivel,
      totalPerguntas: sessao.total_perguntas,
      perguntaNumero: sessao.total_perguntas + 1
    });

  } catch (error) {
    console.error('❌ [getNextQuestion] ERRO:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar próxima pergunta',
      details: error.message
    });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { email, perguntaId, alternativaEscolhidaId, usouDica } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ error: 'Banco de dados não disponível' });
    }

    if (!email || !perguntaId || !alternativaEscolhidaId) {
      return res.status(400).json({ error: 'Dados incompletos' });
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

    const alreadyAnswered = await pool.query(
      'SELECT id FROM quiz_answers WHERE session_id = $1 AND pergunta_id = $2',
      [sessao.id, perguntaId]
    );

    if (alreadyAnswered.rows.length > 0) {
      return res.status(400).json({ error: 'Pergunta já foi respondida' });
    }

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
      dificuldadeQuestao,
      usouDica || false
    );

    await pool.query(
      `UPDATE quiz_sessions 
       SET pontuacao = $1, 
           total_perguntas = $2, 
           acertos_seguidos_iniciante = $3, 
           nivel = $4,
           finalizado = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        sessaoAtualizada.pontuacao,
        sessaoAtualizada.totalPerguntas,
        sessaoAtualizada.acertosSeguidosIniciante,
        sessaoAtualizada.nivel,
        sessaoAtualizada.finalizado,
        sessao.id
      ]
    );

    await pool.query(
      `INSERT INTO quiz_answers 
       (session_id, pergunta_id, alternativa_escolhida_id, acertou, 
        pontos_ganhos, nivel_atual, mudou_nivel, pontuacao_total, usou_dica) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sessao.id,
        perguntaId,
        alternativaEscolhidaId,
        respostaCorreta,
        sessaoAtualizada.ultimaResposta.pontosGanhos,
        sessaoAtualizada.nivel,
        sessaoAtualizada.ultimaResposta.mudouNivel,
        sessaoAtualizada.pontuacao,
        usouDica || false
      ]
    );

    res.json({
      success: true,
      finalizado: sessaoAtualizada.finalizado,
      totalPerguntas: sessaoAtualizada.totalPerguntas,
      usouDica: usouDica || false
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar resposta', details: error.message });
  }
};

const submitQuiz = async (req, res) => {
  try {
    const { email } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ error: 'Banco de dados não disponível' });
    }

    const sessionResult = await pool.query(
      `SELECT s.*, u.id as user_id 
       FROM quiz_sessions s 
       JOIN usuarios u ON s.usuario_id = u.id 
       WHERE s.email = $1 
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

    const existingResult = await pool.query(
      'SELECT id FROM resultados WHERE usuario_id = $1 AND quiz_id = $2',
      [sessao.user_id, sessao.quiz_id]
    );

    if (existingResult.rows.length > 0) {
      await pool.query(
        `UPDATE resultados 
         SET pontuacao_total = $1, nivel_resultante = $2, total_perguntas = $3,
             acertos = $4, erros = $5, percentual_conclusao = $6,
             atingiu_maximo = $7, data_realizacao = NOW()
         WHERE id = $8`,
        [
          relatorio.pontuacaoFinal,
          relatorio.nivelFinal,
          relatorio.totalPerguntas,
          relatorio.acertos,
          relatorio.erros,
          relatorio.percentualConclusao,
          relatorio.atingiuMaximo,
          existingResult.rows[0].id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO resultados 
         (usuario_id, quiz_id, pontuacao_total, nivel_resultante, totalPerguntas, 
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
          sessao.modo,
          relatorio.atingiuMaximo
        ]
      );
    }

    await pool.query(
      'UPDATE quiz_sessions SET finalizado = TRUE WHERE id = $1',
      [sessao.id]
    );

    res.json({
      success: true,
      message: 'Quiz finalizado com sucesso',
      relatorio
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao finalizar quiz', details: error.message });
  }
};

const getQuizResult = async (req, res) => {
  try {
    const { email } = req.params;

    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ error: 'Banco de dados não disponível' });
    }

    const result = await pool.query(
      `SELECT r.*, q.tipo 
       FROM resultados r
       JOIN quizzes q ON r.quiz_id = q.id
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resultado não encontrado' });
    }

    res.json({ success: true, resultado: result.rows[0] });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar resultado', details: error.message });
  }
};

module.exports = { 
  startQuiz, 
  getNextQuestion,
  submitAnswer, 
  submitQuiz, 
  getQuizResult 
};
