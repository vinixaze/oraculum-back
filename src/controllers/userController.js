const { getPool } = require('../config/db');
const { memoryUsers } = require('../middleware/auth');

const registerUser = async (req, res) => {
  try {
    const { email, role = 'user', nome } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const tipo = role === 'admin' ? 'admin' : 'usuario';
    console.log('📝 [registerUser] Email:', email, 'Tipo:', tipo);

    const pool = getPool();

    if (pool) {
      try {
        console.log('🔍 [registerUser] Verificando se usuário existe...');
        const existingUser = await pool.query(
          'SELECT * FROM usuarios WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          console.log('✅ [registerUser] Usuário já existe');
          await pool.query(
            'UPDATE usuarios SET last_access = NOW() WHERE email = $1',
            [email]
          );

          return res.json({
            success: true,
            user: existingUser.rows[0],
            message: 'Usuário já cadastrado'
          });
        }

        console.log('➕ [registerUser] Criando novo usuário...');
        const result = await pool.query(
          `INSERT INTO usuarios (email, tipo, nome, last_access) 
           VALUES ($1, $2, $3, NOW()) 
           RETURNING *`,
          [email, tipo, nome || email.split('@')[0]]
        );

        console.log('✅ [registerUser] Usuário criado (PostgreSQL):', email);

        return res.json({
          success: true,
          user: result.rows[0],
          message: 'Usuário registrado com sucesso'
        });

      } catch (dbError) {
        console.error('❌ [registerUser] Erro no PostgreSQL:', dbError.message);
        return res.status(500).json({
          error: 'Erro ao registrar usuário no banco de dados',
          details: dbError.message
        });
      }
    }

    const userData = {
      email,
      role,
      tipo,
      nome: nome || email.split('@')[0],
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      quizCompleted: false
    };

    memoryUsers.set(email, userData);
    console.log('✅ [registerUser] Usuário registrado (memória)');

    return res.json({
      success: true,
      user: userData,
      message: 'Usuário registrado (modo desenvolvimento)'
    });

  } catch (error) {
    console.error('❌ [registerUser] Erro geral:', error);
    res.status(500).json({ 
      error: 'Erro ao registrar usuário',
      details: error.message 
    });
  }
};

const getUser = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const pool = getPool();

    if (pool) {
      try {
        const result = await pool.query(
          'SELECT * FROM usuarios WHERE email = $1',
          [email]
        );

        if (result.rows.length > 0) {
          console.log('✅ [getUser] Usuário encontrado (PostgreSQL)');
          return res.json({ 
            user: result.rows[0],
            source: 'postgresql'
          });
        }

        console.log('⚠️ [getUser] Usuário não encontrado (PostgreSQL)');
        
      } catch (dbError) {
        console.error('❌ [getUser] Erro PostgreSQL:', dbError.message);
      }
    }

    const user = memoryUsers.get(email);
    if (user) {
      console.log('✅ [getUser] Usuário encontrado (memória)');
      return res.json({ 
        user,
        source: 'memory'
      });
    }

    console.log('❌ [getUser] Usuário não encontrado');
    return res.status(404).json({ error: 'Usuário não encontrado' });

  } catch (error) {
    console.error('❌ [getUser] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar usuário',
      details: error.message
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ 
        error: 'PostgreSQL não está conectado',
        users: Array.from(memoryUsers.values())
      });
    }

    const result = await pool.query(
      'SELECT id, email, nome, tipo, nivel_atual, quiz_completed, data_criacao, last_access FROM usuarios ORDER BY data_criacao DESC'
    );

    console.log(`📋 [getAllUsers] Total: ${result.rows.length}`);

    res.json({
      success: true,
      total: result.rows.length,
      users: result.rows
    });

  } catch (error) {
    console.error('❌ [getAllUsers] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao listar usuários',
      details: error.message
    });
  }
};

const testUserConnection = async (req, res) => {
  try {
    const pool = getPool();
    
    if (!pool) {
      return res.json({
        status: 'PostgreSQL não conectado',
        mode: 'Usando memória'
      });
    }

    const testQuery = await pool.query('SELECT NOW() as time');
    const countQuery = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const usersQuery = await pool.query(
      'SELECT email, tipo, data_criacao FROM usuarios ORDER BY data_criacao DESC LIMIT 5'
    );

    res.json({
      status: 'Conectado ao PostgreSQL',
      serverTime: testQuery.rows[0].time,
      totalUsers: parseInt(countQuery.rows[0].total),
      recentUsers: usersQuery.rows
    });

  } catch (error) {
    console.error('❌ [testUserConnection] Erro:', error);
    res.status(500).json({
      status: 'Erro',
      error: error.message
    });
  }
};

module.exports = { registerUser, getUser, getAllUsers, testUserConnection };