const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ error: 'Banco não disponível' });
    }

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND tipo = $2',
      [email, 'admin']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const admin = result.rows[0];

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, tipo: admin.tipo },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ 
      success: true, 
      token,
      user: {
        email: admin.email,
        nome: admin.nome,
        tipo: admin.tipo
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

module.exports = { adminLogin };