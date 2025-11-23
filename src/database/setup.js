const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurado no .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando ao PostgreSQL...');
    
    const testConnection = await pool.query('SELECT NOW()');
    console.log('✅ Conexão estabelecida:', testConnection.rows[0].now);

    console.log('\n📂 Lendo arquivo schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔨 Executando schema...');
    await pool.query(schema);

    console.log('✅ Schema criado com sucesso!');

    const countUsers = await pool.query('SELECT COUNT(*) FROM usuarios');
    console.log(`\n👥 Total de usuários criados: ${countUsers.rows[0].count}`);

    const users = await pool.query('SELECT email, tipo FROM usuarios');
    console.log('\n📋 Usuários no banco:');
    users.rows.forEach(u => console.log(`  - ${u.email} (${u.tipo})`));

    await pool.end();
    console.log('\n✅ Setup concluído com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro durante setup:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();