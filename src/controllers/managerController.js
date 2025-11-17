const { getDb } = require('../config/firebase');
const { memoryUsers } = require('../middleware/auth');

const memoryResults = require('./quizController');
const memoryProgress = require('./trailController');

const getDashboard = async (req, res) => {
  try {
    const db = getDb();

    if (!db) {
      const dashboard = Array.from(memoryUsers.values())
        .filter(user => user.role !== 'admin')
        .map(user => {
          const result = memoryResults.memoryResults ? memoryResults.memoryResults.get(user.email) : null;
          const progress = memoryProgress.memoryProgress ? memoryProgress.memoryProgress.get(user.email) : null;

          const totalLessons = 4;
          const completedCount = progress?.completedLessons?.length || 0;
          const progressPercentage = Math.round((completedCount / totalLessons) * 100);

          return {
            email: user.email,
            quizCompleted: user.quizCompleted || false,
            nivelFinal: user.nivelFinal || 'N/A',
            pontuacaoFinal: result?.pontuacaoFinal || 0,
            progress: progressPercentage,
            status: progressPercentage === 100 ? 'completed' : 'in-progress',
            lastAccess: user.lastAccess
          };
        });

      return res.json({ dashboard });
    }
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'user')
      .get();

    const dashboard = await Promise.all(
      usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        const email = doc.id;

        const quizDoc = await db.collection('quizResults').doc(email).get();
        const quizData = quizDoc.exists ? quizDoc.data() : null;

        const progressDoc = await db.collection('trailProgress').doc(email).get();
        const progressData = progressDoc.exists ? progressDoc.data() : null;

        const totalLessons = 4;
        const completedCount = progressData?.completedLessons?.length || 0;
        const progressPercentage = Math.round((completedCount / totalLessons) * 100);

        return {
          email,
          quizCompleted: userData.quizCompleted || false,
          nivelFinal: userData.nivelFinal || 'N/A',
          pontuacaoFinal: quizData?.pontuacaoFinal || 0,
          progress: progressPercentage,
          status: progressPercentage === 100 ? 'completed' : 'in-progress',
          lastAccess: userData.lastAccess
        };
      })
    );

    res.json({ dashboard });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
};

const getCollaboratorDetail = async (req, res) => {
  try {
    const { email } = req.params;
    const db = getDb();

    if (!db) {
      const user = memoryUsers.get(email);
      if (!user || user.role === 'admin') {
        return res.status(404).json({ error: 'Colaborador não encontrado' });
      }

      const result = memoryResults.memoryResults ? memoryResults.memoryResults.get(email) : null;
      const progress = memoryProgress.memoryProgress ? memoryProgress.memoryProgress.get(email) : null;

      const totalLessons = 4;
      const completedCount = progress?.completedLessons?.length || 0;
      const progressPercentage = Math.round((completedCount / totalLessons) * 100);

      return res.json({
        email,
        quizCompleted: user.quizCompleted || false,
        nivelFinal: user.nivelFinal || 'N/A',
        pontuacaoFinal: result?.pontuacaoFinal || 0,
        progress: progressPercentage,
        badges: []
      });
    }

    const userDoc = await db.collection('users').doc(email).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Colaborador não encontrado' });
    }

    const userData = userDoc.data();

    const quizDoc = await db.collection('quizResults').doc(email).get();
    const quizData = quizDoc.exists ? quizDoc.data() : null;

    const progressDoc = await db.collection('trailProgress').doc(email).get();
    const progressData = progressDoc.exists ? progressDoc.data() : null;

    const totalLessons = 4;
    const completedCount = progressData?.completedLessons?.length || 0;
    const progressPercentage = Math.round((completedCount / totalLessons) * 100);

    res.json({
      email,
      quizCompleted: userData.quizCompleted || false,
      nivelFinal: userData.nivelFinal || 'N/A',
      pontuacaoFinal: quizData?.pontuacaoFinal || 0,
      progress: progressPercentage,
      badges: []
    });
  } catch (error) {
    console.error('Erro ao buscar colaborador:', error);
    res.status(500).json({ error: 'Erro ao buscar colaborador' });
  }
};

module.exports = { getDashboard, getCollaboratorDetail };