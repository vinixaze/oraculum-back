// src/routes/index.js
const express = require('express');
const router = express.Router();

const { verificarUsuario, verificarAdmin } = require('../middleware/auth');
const { registerUser, getUser } = require('../controllers/userController');
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

router.post('/quiz/start', startQuiz);
router.get('/quiz/next-question/:email', getNextQuestion);
router.post('/quiz/submit', submitQuiz);
router.get('/quiz/result/:email', getQuizResult);

router.post('/trail/progress', saveProgress);
router.get('/trail/progress/:email', getProgress);

router.get('/manager/dashboard', verificarAdmin, getDashboard);
router.get('/manager/collaborator/:email', verificarAdmin, getCollaboratorDetail);

router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString()
  });
});

module.exports = router;