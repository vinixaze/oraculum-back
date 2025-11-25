const { getPool } = require('../config/db');

const saveProgress = async (req, res) => {
  try {
    const { email, completedLessons, notes, currentModule, currentLesson } = req.body;
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ 
        error: 'Banco de dados não disponível' 
      });
    }

    console.log('💾 Salvando progresso da trilha:', email, {
      completedLessons,
      currentModule,
      currentLesson
    });

    // Buscar o ID do usuário
    const userResult = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado' 
      });
    }

    const userId = userResult.rows[0].id;

    // Verificar se já existe progresso
    const existingProgress = await pool.query(
      'SELECT id FROM trail_progress WHERE usuario_id = $1',
      [userId]
    );

    if (existingProgress.rows.length > 0) {
      // Atualizar progresso existente
      await pool.query(
        `UPDATE trail_progress 
         SET completed_lessons = $1, 
             notes = $2, 
             current_module = $3, 
             current_lesson = $4,
             updated_at = NOW()
         WHERE usuario_id = $5`,
        [
          completedLessons || [],
          notes || '',
          currentModule || 1,
          currentLesson || 1,
          userId
        ]
      );
      console.log('✅ Progresso atualizado para:', email);
    } else {
      // Criar novo registro de progresso
      await pool.query(
        `INSERT INTO trail_progress 
         (usuario_id, email, completed_lessons, notes, current_module, current_lesson, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          userId,
          email,
          completedLessons || [],
          notes || '',
          currentModule || 1,
          currentLesson || 1
        ]
      );
      console.log('✅ Novo progresso criado para:', email);
    }

    const progressData = {
      email,
      completedLessons: completedLessons || [],
      notes: notes || '',
      currentModule: currentModule || 1,
      currentLesson: currentLesson || 1,
      updatedAt: new Date().toISOString()
    };

    res.json({ 
      success: true, 
      progress: progressData 
    });

  } catch (error) {
    console.error('❌ Erro ao salvar progresso:', error);
    res.status(500).json({ 
      error: 'Erro ao salvar progresso',
      details: error.message
    });
  }
};

const getProgress = async (req, res) => {
  try {
    const { email } = req.params;
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ 
        error: 'Banco de dados não disponível' 
      });
    }

    console.log('📥 Buscando progresso da trilha:', email);

    const progressResult = await pool.query(
      `SELECT tp.* 
       FROM trail_progress tp
       JOIN usuarios u ON tp.usuario_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (progressResult.rows.length === 0) {
      console.log('ℹ️ Nenhum progresso encontrado para:', email);
      return res.json({ progress: null });
    }

    const progress = progressResult.rows[0];
    console.log('✅ Progresso encontrado:', progress);

    res.json({ 
      progress: {
        email: progress.email,
        completedLessons: progress.completed_lessons || [],
        notes: progress.notes || '',
        currentModule: progress.current_module || 1,
        currentLesson: progress.current_lesson || 1,
        updatedAt: progress.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar progresso:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar progresso',
      details: error.message
    });
  }
};

module.exports = { saveProgress, getProgress };