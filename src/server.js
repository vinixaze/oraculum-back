const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeFirebase, isFirebaseConnected } = require('./config/firebase');
const routes = require('./routes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

initializeFirebase();

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Oraculum Quiz API',
    version: '1.0.0',
    endpoints: {
      api: '/api',
      health: '/api/health',
      docs: 'https://github.com/vinixaze/oraculum-back'
    },
    firebase: isFirebaseConnected() ? 'Conectado' : 'Modo desenvolvimento (memória)'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  const firebaseStatus = isFirebaseConnected() 
    ? '🔥 Conectado' 
    : '⚠️  Modo desenvolvimento (dados em memória)';

  console.log(`
╔════════════════════════════════════════════════╗
║          🚀 ORACULUM QUIZ API                  ║
╠════════════════════════════════════════════════╣
║  Servidor:     http://localhost:${PORT}         ║
║  API:          http://localhost:${PORT}/api     ║
║  Health:       http://localhost:${PORT}/api/health ║
║  Firebase:     ${firebaseStatus.padEnd(30)} ║
║  Ambiente:     ${process.env.NODE_ENV || 'development'}                   ║
╚════════════════════════════════════════════════╝

📝 Endpoints disponíveis:
   POST   /api/users/register
   GET    /api/users/:email
   
   POST   /api/quiz/start
   POST   /api/quiz/answer
   POST   /api/quiz/submit
   GET    /api/quiz/result/:email
   
   POST   /api/trail/progress
   GET    /api/trail/progress/:email
   
   GET    /api/manager/dashboard (admin only)
   GET    /api/manager/collaborator/:email (admin only)

${isFirebaseConnected() ? '' : `
⚠️  ATENÇÃO: Firebase não configurado!
   O backend está funcionando com dados em memória.
   
   Para conectar ao Firebase:
   1. Adicione serviceAccountKey.json na raiz
   2. Descomente as linhas no src/config/firebase.js
   3. Reinicie o servidor
`}
  `);
});

module.exports = app;
