const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurado');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Conectando ao PostgreSQL...');
    
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado!');

    console.log('📝 Adicionando coluna dica...');
    await pool.query('ALTER TABLE perguntas ADD COLUMN IF NOT EXISTS dica TEXT');
    console.log('✅ Coluna criada!');

    console.log('💾 Atualizando perguntas INICIANTE com dicas...');
    
    const dicasIniciante = [
      { id: 1, dica: 'Pense em uma barreira de proteção digital que filtra o que pode entrar e sair da rede.' },
      { id: 2, dica: 'Os princípios básicos são como os pilares de uma casa: garantem que os dados estejam corretos, secretos e sempre disponíveis.' },
      { id: 3, dica: 'Pense em como você reagiria se detectasse um invasor tentando entrar no sistema.' },
      { id: 4, dica: 'É como ter várias camadas de segurança: se uma falhar, outras protegem o sistema.' },
      { id: 5, dica: 'É um tipo de ataque que sobrecarrega sistemas com tráfego excessivo.' },
      { id: 6, dica: 'Considere quem é responsável pela segurança física versus quem configura acessos e políticas.' },
      { id: 7, dica: 'Pense em quem cuida da infraestrutura física dos servidores na nuvem.' },
      { id: 8, dica: 'DLP significa "Data Loss Prevention" - prevenção de perda de dados.' },
      { id: 9, dica: 'JIT significa "Just-In-Time" - acesso concedido apenas quando necessário, por tempo limitado.' },
      { id: 10, dica: 'Pense em dar permissões temporárias em vez de permanentes.' },
      { id: 11, dica: 'Contas genéricas dificultam a rastreabilidade de ações no sistema.' },
      { id: 12, dica: 'Considere a importância de ter um processo estruturado de descoberta, priorização e correção de vulnerabilidades.' },
      { id: 13, dica: 'Ao usar SaaS, você não controla a infraestrutura. O que você deve verificar no fornecedor?' },
      { id: 14, dica: 'Modelos de IA podem ser "caixas-pretas" difíceis de auditar e entender como tomam decisões.' }
    ];

    for (const { id, dica } of dicasIniciante) {
      await pool.query('UPDATE perguntas SET dica = $1 WHERE id = $2', [dica, id]);
      console.log(`  ✅ Pergunta ${id} atualizada`);
    }

    console.log('💾 Atualizando perguntas EXPERT com dicas...');
    
    const dicasExpert = [
      { id: 15, dica: 'Autenticação verifica "quem você é", autorização verifica "o que você pode fazer".' },
      { id: 16, dica: 'Pense em como armazenar segredos de forma criptografada e isolada no Kubernetes.' },
      { id: 17, dica: 'ICP está relacionado a certificados digitais e infraestrutura de chave pública (PKI).' },
      { id: 18, dica: 'Pense em acesso sob demanda que expira automaticamente após uso.' },
      { id: 19, dica: 'Combine controle baseado em função (RBAC) com acesso temporário (JIT).' },
      { id: 20, dica: 'Sem correlação entre logs, é impossível reconstruir a sequência completa de eventos de um ataque.' },
      { id: 21, dica: 'Gates de qualidade são pontos de verificação automatizados no pipeline CI/CD.' },
      { id: 22, dica: 'Containers processam dados sensíveis, então credenciais devem ser protegidas com criptografia forte.' },
      { id: 23, dica: 'A cadeia de custódia garante que evidências sejam admissíveis em processos legais.' },
      { id: 24, dica: 'Zero Trust exige verificação contínua de múltiplos fatores, não apenas identidade.' },
      { id: 25, dica: 'Decisões baseadas apenas em identidade ignoram o contexto do dispositivo e do ambiente.' }
    ];

    for (const { id, dica } of dicasExpert) {
      await pool.query('UPDATE perguntas SET dica = $1 WHERE id = $2', [dica, id]);
      console.log(`  ✅ Pergunta ${id} atualizada`);
    }

    console.log('\n🎉 Migration concluída com sucesso!');
    
    const result = await pool.query('SELECT COUNT(*) as total FROM perguntas WHERE dica IS NOT NULL');
    console.log(`📊 Total de perguntas com dicas: ${result.rows[0].total}/25`);

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro durante migration:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();