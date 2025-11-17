const { getDb } = require('../config/firebase');

const memoryProgress = new Map();

const saveProgress = async (req, res) => {
  try {
    const { email, completedLessons, notes, currentModule, currentLesson } = req.body;
    const db = getDb();

    const progressData = {
      email,
      completedLessons: completedLessons || [],
      notes: notes || '',
      currentModule: currentModule || 1,
      currentLesson: currentLesson || 1,
      updatedAt: new Date().toISOString()
    };

    if (!db) {
      memoryProgress.set(email, progressData);
      console.log(`💾 Progresso salvo (memória): ${email}`);
    } else {
      await db.collection('trailProgress').doc(email).set(progressData, { merge: true });
    }

    res.json({ success: true, progress: progressData });
  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
    res.status(500).json({ error: 'Erro ao salvar progresso' });
  }
};

const getProgress = async (req, res) => {
  try {
    const { email } = req.params;
    const db = getDb();

    if (!db) {
      const progress = memoryProgress.get(email);
      return res.json({ progress: progress || null });
    }

    const progressDoc = await db.collection('trailProgress').doc(email).get();

    if (!progressDoc.exists) {
      return res.json({ progress: null });
    }

    res.json({ progress: progressDoc.data() });
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao buscar progresso' });
  }
};

module.exports = { saveProgress, getProgress };