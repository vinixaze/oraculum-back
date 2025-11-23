const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

const initializeDatabase = () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('⚠️  DATABASE_URL não configurado');
      console.log('   Configure no arquivo .env');
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
        console.log('✅ PostgreSQL conectado!');
        console.log('   Hora do servidor:', res.rows[0].now);
      }
    });

    pool.on('error', (err) => {
      console.error('❌ Erro no pool PostgreSQL:', err.message);
    });

    return pool;
  } catch (error) {
    console.error('❌ Falha ao inicializar PostgreSQL:', error.message);
    return null;
  }
};

const getPool = () => pool;

const isPostgresConnected = () => pool !== null;

module.exports = { 
  initializeDatabase, 
  getPool, 
  isPostgresConnected 
};