const { getDb } = require('../config/firebase');
const quizScoring = require('../services/quizScoring');

const memorySessions = new Map();
const memoryResults = new Map();

const startQuiz = async (req, res) => {
  try {
    const { email, modo = 'MEDIO' } = req.body;

    const sessao = quizScoring.iniciarQuiz(modo);
    const db = getDb();

    if (!db) {
      memorySessions.set(email, {
        ...sessao,
        email,
        startedAt: new Date().toISOString()
      });
      console.log(`🎮 Quiz iniciado (memória): ${email} - Modo: ${modo}`);
    } else {
      await db.collection('quizSessions').doc(email).set({
        ...sessao,
        email,
        startedAt: new Date().toISOString()
      });
    }

    res.json({ success: true, sessao });
  } catch (error) {
    console.error('Erro ao iniciar quiz:', error);
    res.status(500).json({ error: 'Erro ao iniciar quiz' });
  }
};

const submitAnswer = async (req, res) => {
  try {
    const { email, questaoId, respostaCorreta, dificuldadeQuestao } = req.body;
    const db = getDb();

    let sessao;
    
    if (!db) {
      sessao = memorySessions.get(email);
      if (!sessao) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
    } else {
      const sessaoDoc = await db.collection('quizSessions').doc(email).get();
      if (!sessaoDoc.exists) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      sessao = sessaoDoc.data();
    }

    const sessaoAtualizada = quizScoring.processarResposta(
      sessao,
      questaoId,
      respostaCorreta,
      dificuldadeQuestao
    );

    if (!db) {
      memorySessions.set(email, sessaoAtualizada);
    } else {
      await db.collection('quizSessions').doc(email).update(sessaoAtualizada);
    }

    res.json({
      success: true,
      sessao: sessaoAtualizada,
      proximoNivel: sessaoAtualizada.nivel
    });
  } catch (error) {
    console.error('Erro ao processar resposta:', error);
    res.status(500).json({ error: 'Erro ao processar resposta' });
  }
};

const submitQuiz = async (req, res) => {
  try {
    const { email } = req.body;
    const db = getDb();

    let sessao;
    
    if (!db) {
      sessao = memorySessions.get(email);
      if (!sessao) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
    } else {
      const sessaoDoc = await db.collection('quizSessions').doc(email).get();
      if (!sessaoDoc.exists) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }
      sessao = sessaoDoc.data();
    }

    const relatorio = quizScoring.gerarRelatorio(sessao);

    if (!db) {
      memoryResults.set(email, {
        email,
        ...relatorio,
        completedAt: new Date().toISOString()
      });

      const { memoryUsers } = require('../middleware/auth');
      const user = memoryUsers.get(email);
      if (user) {
        user.quizCompleted = true;
        user.nivelFinal = relatorio.nivelFinal;
        user.pontuacaoFinal = relatorio.pontuacaoFinal;
        memoryUsers.set(email, user);
      }
      
      memorySessions.delete(email);
      
      console.log(`✅ Quiz finalizado (memória): ${email} - Pontos: ${relatorio.pontuacaoFinal}`);
    } else {
      await db.collection('quizResults').doc(email).set({
        email,
        ...relatorio,
        completedAt: new Date().toISOString()
      });

      await db.collection('users').doc(email).update({
        quizCompleted: true,
        nivelFinal: relatorio.nivelFinal,
        pontuacaoFinal: relatorio.pontuacaoFinal
      });

      await db.collection('quizSessions').doc(email).delete();
    }

    res.json({ success: true, relatorio });
  } catch (error) {
    console.error('Erro ao finalizar quiz:', error);
    res.status(500).json({ error: 'Erro ao finalizar quiz' });
  }
};

const getQuizResult = async (req, res) => {
  try {
    const { email } = req.params;
    const db = getDb();

    if (!db) {
      const result = memoryResults.get(email);
      if (!result) {
        return res.status(404).json({ error: 'Resultado não encontrado' });
      }
      return res.json({ result });
    }

    const resultDoc = await db.collection('quizResults').doc(email).get();

    if (!resultDoc.exists) {
      return res.status(404).json({ error: 'Resultado não encontrado' });
    }

    res.json({ result: resultDoc.data() });
  } catch (error) {
    console.error('Erro ao buscar resultado:', error);
    res.status(500).json({ error: 'Erro ao buscar resultado' });
  }
};

module.exports = { startQuiz, submitAnswer, submitQuiz, getQuizResult };