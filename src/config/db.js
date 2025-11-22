const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

const initializeDatabase = () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL não configurado - usando dados em memória');
      return null;
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('❌ Erro ao conectar PostgreSQL:', err.message);
        pool = null;
      } else {
        console.log('PostgreSQL conectado!', res.rows[0].now);
      }
    });

    pool.on('error', (err) => {
      console.error('Erro inesperado no pool PostgreSQL:', err);
    });

    return pool;
  } catch (error) {
    console.error('Erro ao inicializar PostgreSQL:', error.message);
    return null;
  }
};

const getPool = () => {
  return pool;
};

const isPostgresConnected = () => {
  return pool !== null;
};

module.exports = { 
  initializeDatabase, 
  getPool, 
  isPostgresConnected 
};