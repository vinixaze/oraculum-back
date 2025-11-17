const { getDb } = require('../config/firebase');

const memoryUsers = new Map();

const verificarUsuario = async (req, res, next) => {
  try {
    const email = req.body.email || req.params.email;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const db = getDb();
    
    if (!db) {
      if (!memoryUsers.has(email)) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      req.user = memoryUsers.get(email);
      return next();
    }

    const userDoc = await db.collection('users').doc(email).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    req.user = { id: userDoc.id, ...userDoc.data() };
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
      return res.status(400).json({ error: 'Email é obrigatório para acesso admin' });
    }

    const db = getDb();
    
    if (!db) {
      console.log('⚠️ Modo desenvolvimento - verificação de admin simplificada');
      req.user = { email, role: 'admin' };
      return next();
    }

    const userDoc = await db.collection('users').doc(email).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userData = userDoc.data();

    if (userData.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Acesso negado. Apenas administradores.' 
      });
    }

    req.user = { id: userDoc.id, ...userData };
    next();
  } catch (error) {
    console.error('Erro no middleware de admin:', error);
    res.status(500).json({ error: 'Erro ao verificar permissões' });
  }
};

module.exports = { verificarUsuario, verificarAdmin, memoryUsers };