const express = require('express');
const router = express.Router();

const { verificarUsuario, verificarAdmin } = require('../middleware/auth');
const { 
  registerUser, 
  getUser, 
  getAllUsers, 
  testUserConnection 
} = require('../controllers/userController');
const { 
  startQuiz, 
  getNextQuestion,
  submitAnswer, 
  submitQuiz, 
  getQuizResult 
} = require('../controllers/quizController');
const { saveProgress, getProgress } = require('../controllers/trailController');
const { 
  getDashboard, 
  getCollaboratorDetail 
} = require('../controllers/managerController');

router.post('/users/register', registerUser);
router.get('/users/:email', getUser);
router.get('/users', getAllUsers);
router.get('/users/test/connection', testUserConnection);

router.post('/quiz/start', startQuiz);
router.get('/quiz/next-question/:email', getNextQuestion);
router.post('/quiz/answer', submitAnswer);
router.post('/quiz/submit', submitQuiz);
router.get('/quiz/result/:email', getQuizResult);

router.get('/quiz/debug/:email', async (req, res) => {
  const { getPool } = require('../config/db');
  const pool = getPool();
  
  if (!pool) {
    return res.json({ error: 'PostgreSQL não conectado' });
  }

  try {
    const { email } = req.params;
    
    const session = await pool.query(
      'SELECT * FROM quiz_sessions WHERE email = $1 ORDER BY started_at DESC LIMIT 1',
      [email]
    );
    
    const answers = session.rows.length > 0 
      ? await pool.query('SELECT * FROM quiz_answers WHERE session_id = $1', [session.rows[0].id])
      : { rows: [] };
    
    const questions = await pool.query(
      'SELECT COUNT(*) as total FROM perguntas WHERE quiz_id = 1'
    );

    res.json({
      email,
      hasSession: session.rows.length > 0,
      session: session.rows[0] || null,
      answersCount: answers.rows.length,
      totalQuestionsInDB: questions.rows[0].total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trail/progress', saveProgress);
router.get('/trail/progress/:email', getProgress);

router.get('/manager/dashboard', verificarAdmin, getDashboard);
router.get('/manager/collaborator/:email', verificarAdmin, getCollaboratorDetail);

router.get('/health', (req, res) => {
  const { isPostgresConnected } = require('../config/db');
  
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      postgresql: isPostgresConnected() ? 'online' : 'offline'
    }
  });
});

module.exports = router;