// Script para verificar/criar admin no banco
// Execute: node verify-admin.js

const { Pool } = require('pg');
require('dotenv').config();

async function verifyAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurado');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Conectando ao PostgreSQL...');
    
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado!');

    // Verificar se admin existe
    console.log('\n🔍 Verificando usuário admin...');
    const adminCheck = await pool.query(
      "SELECT * FROM usuarios WHERE email = 'admin@empresa.com'"
    );

    if (adminCheck.rows.length === 0) {
      console.log('⚠️ Admin não encontrado! Criando...');
      
      await pool.query(
        `INSERT INTO usuarios (email, tipo, quiz_completed, nome) 
         VALUES ('admin@empresa.com', 'admin', TRUE, 'Administrador')`
      );
      
      console.log('✅ Admin criado com sucesso!');
    } else {
      console.log('✅ Admin já existe:');
      console.log('   Email:', adminCheck.rows[0].email);
      console.log('   Tipo:', adminCheck.rows[0].tipo);
      console.log('   Nome:', adminCheck.rows[0].nome);
      
      // Garantir que é tipo admin
      if (adminCheck.rows[0].tipo !== 'admin') {
        console.log('⚠️ Corrigindo tipo para admin...');
        await pool.query(
          "UPDATE usuarios SET tipo = 'admin' WHERE email = 'admin@empresa.com'"
        );
        console.log('✅ Tipo corrigido!');
      }
    }

    // Listar todos os admins
    console.log('\n📋 Todos os admins no sistema:');
    const allAdmins = await pool.query(
      "SELECT email, nome, tipo, data_criacao FROM usuarios WHERE tipo = 'admin'"
    );
    
    allAdmins.rows.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.nome}) - Criado em ${admin.data_criacao}`);
    });

    await pool.end();
    console.log('\n✅ Verificação concluída!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyAdmin();