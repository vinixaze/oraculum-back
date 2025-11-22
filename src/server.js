const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeFirebase } = require('./config/firebase');
const { initializeDatabase, isPostgresConnected } = require('./config/db');
const routes = require('./routes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

initializeFirebase();

initializeDatabase();

// Rotas
app.use('/api', routes);

app.get('/api/test-db', async (req, res) => {
  const { getPool } = require('./config/db');
  const pool = getPool();

  if (!pool) {
    return res.json({ 
      status: 'Sem banco configurado', 
      mode: 'Dados em memória' 
    });
  }

  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as database');
    res.json({ 
      status: 'Conectado!', 
      time: result.rows[0].time,
      database: result.rows[0].database
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Erro', 
      error: error.message 
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Oraculum Quiz API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/api/health',
      testDb: '/api/test-db',
      docs: '/api'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro no servidor'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════╗
║          🚀 ORACULUM QUIZ API                  ║
╠════════════════════════════════════════════════╣
║  Servidor:     http://0.0.0.0:${PORT}          ║
║  Ambiente:     ${process.env.NODE_ENV || 'development'}                   ║
║  PostgreSQL:   ${isPostgresConnected() ? 'Online' : 'Offline'}        ║
╚════════════════════════════════════════════════╝
  `);
});

module.exports = app;