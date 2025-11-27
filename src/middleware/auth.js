const { getPool } = require('../config/db');

const memoryUsers = new Map();

const verificarUsuario = async (req, res, next) => {
  try {
    const email = req.body.email || req.params.email;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const pool = getPool();
    
    if (!pool) {
      if (!memoryUsers.has(email)) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      req.user = memoryUsers.get(email);
      return next();
    }

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Erro no middleware de usuário:', error);
    res.status(500).json({ error: 'Erro ao verificar usuário' });
  }
};

const verificarAdmin = async (req, res, next) => {
  try {
    const email = req.body.email || req.params.email || req.query.email;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email é obrigatório para acesso admin' 
      });
    }

    const pool = getPool();
    
    if (!pool) {
      console.log('⚠️ Modo desenvolvimento - verificação de admin simplificada');
      req.user = { email, role: 'admin' };
      return next();
    }

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado' 
      });
    }

    const userData = result.rows[0];

    if (userData.tipo !== 'admin') {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas administradores.' 
      });
    }

    req.user = userData;
    next();
  } catch (error) {
    console.error('Erro no middleware de admin:', error);
    res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};

module.exports = { verificarUsuario, verificarAdmin, memoryUsers };