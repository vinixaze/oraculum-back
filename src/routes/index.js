const express = require('express');
const router = express.Router();

const { verificarUsuario, verificarAdmin } = require('../middleware/auth');
const { registerUser, getUser } = require('../controllers/userController');
const { 
  startQuiz, 
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
router.post('/quiz/answer', submitAnswer);
router.post('/quiz/submit', submitQuiz);
router.get('/quiz/result/:email', getQuizResult);

router.post('/trail/progress', saveProgress);
router.get('/trail/progress/:email', getProgress);

router.get('/manager/dashboard', verificarAdmin, getDashboard);
router.get('/manager/collaborator/:email', verificarAdmin, getCollaboratorDetail);

router.get('/health', (req, res) => {
  const { isFirebaseConnected } = require('../config/firebase');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    firebase: isFirebaseConnected() ? 'Conectado' : 'Desconectado (usando memória)'
  });
});

module.exports = router;