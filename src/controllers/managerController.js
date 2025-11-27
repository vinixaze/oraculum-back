const { getPool } = require('../config/db');

const getDashboard = async (req, res) => {
  try {
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ 
        error: 'Banco de dados não disponível' 
      });
    }

    const usersResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.nome,
        u.quiz_completed,
        u.nivel_atual,
        u.pontuacao_final,
        u.data_criacao,
        u.last_access,
        r.acertos,
        r.total_perguntas,
        r.percentual_conclusao,
        tp.completed_lessons
      FROM usuarios u
      LEFT JOIN resultados r ON u.id = r.usuario_id
      LEFT JOIN trail_progress tp ON u.id = tp.usuario_id
      WHERE u.tipo = 'usuario'
      ORDER BY u.data_criacao DESC
    `);

    const totalUsuarios = usersResult.rows.length;
    const usuariosQuizCompleto = usersResult.rows.filter(u => u.quiz_completed).length;

    const usuariosIniciante = usersResult.rows.filter(
      u => u.quiz_completed && u.nivel_atual === 'INICIANTE'
    ).length;

    const usuariosIntermediario = usersResult.rows.filter(
      u => u.quiz_completed && u.nivel_atual === 'INTERMEDIÁRIO'
    ).length;

    const usuariosAvancado = usersResult.rows.filter(
      u => u.quiz_completed && u.nivel_atual === 'AVANÇADO'
    ).length;

    const pontuacaoMedia = usersResult.rows
      .filter(u => u.quiz_completed && u.pontuacao_final)
      .reduce((acc, u) => acc + (u.pontuacao_final || 0), 0) / (usuariosQuizCompleto || 1);

    const taxaAcertoMedia = usersResult.rows
      .filter(u => u.quiz_completed && u.acertos && u.total_perguntas)
      .reduce((acc, u) => acc + ((u.acertos / u.total_perguntas) * 100), 0) / (usuariosQuizCompleto || 1);

    const dashboard = usersResult.rows.map(user => {
      const completedLessons = user.completed_lessons ? user.completed_lessons.length : 0;
      const totalLessons = 4;
      const trailProgress = Math.round((completedLessons / totalLessons) * 100);

      return {
        email: user.email,
        nome: user.nome,
        quizCompleted: user.quiz_completed || false,
        nivelFinal: user.nivel_atual || 'N/A',
        pontuacaoFinal: user.pontuacao_final || 0,
        acertos: user.acertos || 0,
        totalPerguntas: user.total_perguntas || 0,
        percentualQuiz: user.percentual_conclusao || 0,
        progress: trailProgress,
        status:
          trailProgress === 100
            ? 'completed'
            : user.quiz_completed
            ? 'in-progress'
            : 'not-started',
        lastAccess: user.last_access,
        dataCriacao: user.data_criacao
      };
    });

    console.log(`📊 Dashboard: ${dashboard.length} usuários`);

    res.json({ 
      success: true,
      dashboard,
      statistics: {
        totalUsuarios,
        usuariosQuizCompleto,
        usuariosPorNivel: {
          iniciante: usuariosIniciante,
          intermediario: usuariosIntermediario,
          avancado: usuariosAvancado
        },
        metricas: {
          pontuacaoMedia: Math.round(pontuacaoMedia * 10) / 10,
          taxaAcertoMedia: Math.round(taxaAcertoMedia * 10) / 10
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar dashboard:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar dashboard',
      details: error.message
    });
  }
};

const getCollaboratorDetail = async (req, res) => {
  try {
    const { email } = req.params;
    const pool = getPool();

    if (!pool) {
      return res.status(503).json({ 
        error: 'Banco de dados não disponível' 
      });
    }

    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.nome,
        u.quiz_completed,
        u.nivel_atual,
        u.pontuacao_final,
        u.data_criacao,
        u.last_access,
        r.acertos,
        r.total_perguntas,
        r.percentual_conclusao,
        r.erros,
        r.atingiu_maximo,
        r.modo,
        r.data_realizacao,
        tp.completed_lessons,
        tp.current_module,
        tp.current_lesson,
        tp.updated_at as trail_updated
      FROM usuarios u
      LEFT JOIN resultados r ON u.id = r.usuario_id
      LEFT JOIN trail_progress tp ON u.id = tp.usuario_id
      WHERE u.email = $1 AND u.tipo = 'usuario'
    `, [email]);

    if (userResult.rows.length === 0) {
      console.log('❌ [getCollaboratorDetail] Colaborador não encontrado:', email);
      return res.status(404).json({ 
        error: 'Colaborador não encontrado' 
      });
    }

    const user = userResult.rows[0];
    console.log('✅ [getCollaboratorDetail] Colaborador encontrado:', user.email);

    const completedLessons = user.completed_lessons ? user.completed_lessons.length : 0;
    const totalLessons = 4;
    const trailProgress = Math.round((completedLessons / totalLessons) * 100);

    const answersResult = await pool.query(`
      SELECT 
        qa.acertou,
        qa.pontos_ganhos,
        qa.nivel_atual,
        qa.answered_at,
        p.dificuldade
      FROM quiz_answers qa
      JOIN quiz_sessions qs ON qa.session_id = qs.id
      JOIN perguntas p ON qa.pergunta_id = p.id
      WHERE qs.email = $1
      ORDER BY qa.answered_at
    `, [email]);

    const badges = [];
    
    if (user.quiz_completed) {
      badges.push({ 
        id: 1, 
        name: 'Quiz Concluído', 
        icon: '✅',
        description: 'Completou o quiz de nivelamento'
      });
    }

    if (user.nivel_atual === 'AVANÇADO') {
      badges.push({ 
        id: 2, 
        name: 'Nível Avançado', 
        icon: '🏆',
        description: 'Atingiu o nível avançado'
      });
    } else if (user.nivel_atual === 'INTERMEDIÁRIO') {
      badges.push({ 
        id: 3, 
        name: 'Nível Intermediário', 
        icon: '🥈',
        description: 'Atingiu o nível intermediário'
      });
    }

    if (user.atingiu_maximo) {
      badges.push({ 
        id: 4, 
        name: 'Pontuação Máxima', 
        icon: '⭐',
        description: 'Atingiu a pontuação máxima no quiz'
      });
    }

    if (trailProgress === 100) {
      badges.push({ 
        id: 5, 
        name: 'Trilha Completa', 
        icon: '🎓',
        description: 'Completou toda a trilha de aprendizado'
      });
    } else if (trailProgress >= 50) {
      badges.push({ 
        id: 6, 
        name: 'Meio Caminho', 
        icon: '🚀',
        description: 'Completou metade da trilha'
      });
    }

    const collaborator = {
      email: user.email,
      nome: user.nome,
      quizCompleted: user.quiz_completed || false,
      nivelFinal: user.nivel_atual || 'N/A',
      pontuacaoFinal: user.pontuacao_final || 0,
      
      acertos: user.acertos || 0,
      erros: user.erros || 0,
      totalPerguntas: user.total_perguntas || 0,
      percentualQuiz: user.percentual_conclusao || 0,
      atingiuMaximo: user.atingiu_maximo || false,
      modo: user.modo || 'N/A',
      dataRealizacao: user.data_realizacao,
      
      trailProgress,
      completedLessonsCount: completedLessons,
      totalLessons,
      currentModule: user.current_module || 1,
      currentLesson: user.current_lesson || 1,
      trailLastUpdate: user.trail_updated,
      
      badges,

      dataCriacao: user.data_criacao,
      lastAccess: user.last_access,

      answersHistory: answersResult.rows
    };

    console.log(`✅ [getCollaboratorDetail] Enviando detalhes do colaborador: ${email}`);

    res.json({ 
      success: true,
      collaborator 
    });

  } catch (error) {
    console.error('❌ [getCollaboratorDetail] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar detalhes do colaborador',
      details: error.message
    });
  }
};

module.exports = { getDashboard, getCollaboratorDetail };