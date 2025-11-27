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
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    req.user = { email, tipo: "liberado" };
    next();

  } catch (error) {
    console.error('Erro no middleware de admin:', error);
    res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};


module.exports = { verificarUsuario, verificarAdmin, memoryUsers };