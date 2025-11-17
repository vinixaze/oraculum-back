const { getDb } = require('../config/firebase');
const { memoryUsers } = require('../middleware/auth');

const registerUser = async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const db = getDb();
    
    if (!db) {
      const userData = {
        email,
        role,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        quizCompleted: false
      };
      
      memoryUsers.set(email, userData);
      
      console.log(`📝 Usuário registrado (memória): ${email}`);
      
      return res.json({
        success: true,
        user: userData,
        message: 'Usuário registrado (modo desenvolvimento)'
      });
    }

    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      await userRef.update({ lastAccess: new Date().toISOString() });
      return res.json({
        success: true,
        user: { email, ...userDoc.data() },
        message: 'Usuário já cadastrado'
      });
    }

    const newUser = {
      email,
      role,
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      quizCompleted: false
    };

    await userRef.set(newUser);

    res.json({
      success: true,
      user: newUser,
      message: 'Usuário registrado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
};

const getUser = async (req, res) => {
  try {
    const { email } = req.params;

    const db = getDb();
    
    if (!db) {
      const user = memoryUsers.get(email);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      return res.json({ user });
    }

    const userDoc = await db.collection('users').doc(email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user: { email, ...userDoc.data() } });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

module.exports = { registerUser, getUser };