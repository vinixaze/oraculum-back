ALTER TABLE perguntas ADD COLUMN IF NOT EXISTS dica TEXT;

UPDATE perguntas SET dica = 'Pense em uma barreira de proteção digital que filtra o que pode entrar e sair da rede.' WHERE id = 1;
UPDATE perguntas SET dica = 'Os princípios básicos são como os pilares de uma casa: garantem que os dados estejam corretos, secretos e sempre disponíveis.' WHERE id = 2;
UPDATE perguntas SET dica = 'Pense em como você reagiria se detectasse um invasor tentando entrar no sistema.' WHERE id = 3;
UPDATE perguntas SET dica = 'É como ter várias camadas de segurança: se uma falhar, outras protegem o sistema.' WHERE id = 4;
UPDATE perguntas SET dica = 'É um tipo de ataque que sobrecarrega sistemas com tráfego excessivo.' WHERE id = 5;
UPDATE perguntas SET dica = 'Considere quem é responsável pela segurança física versus quem configura acessos e políticas.' WHERE id = 6;
UPDATE perguntas SET dica = 'Pense em quem cuida da infraestrutura física dos servidores na nuvem.' WHERE id = 7;
UPDATE perguntas SET dica = 'DLP significa "Data Loss Prevention" - prevenção de perda de dados.' WHERE id = 8;
UPDATE perguntas SET dica = 'JIT significa "Just-In-Time" - acesso concedido apenas quando necessário, por tempo limitado.' WHERE id = 9;
UPDATE perguntas SET dica = 'Pense em dar permissões temporárias em vez de permanentes.' WHERE id = 10;
UPDATE perguntas SET dica = 'Contas genéricas dificultam a rastreabilidade de ações no sistema.' WHERE id = 11;
UPDATE perguntas SET dica = 'Considere a importância de ter um processo estruturado de descoberta, priorização e correção de vulnerabilidades.' WHERE id = 12;
UPDATE perguntas SET dica = 'Ao usar SaaS, você não controla a infraestrutura. O que você deve verificar no fornecedor?' WHERE id = 13;
UPDATE perguntas SET dica = 'Modelos de IA podem ser "caixas-pretas" difíceis de auditar e entender como tomam decisões.' WHERE id = 14;

UPDATE perguntas SET dica = 'Autenticação verifica "quem você é", autorização verifica "o que você pode fazer".' WHERE id = 15;
UPDATE perguntas SET dica = 'Pense em como armazenar segredos de forma criptografada e isolada no Kubernetes.' WHERE id = 16;
UPDATE perguntas SET dica = 'ICP está relacionado a certificados digitais e infraestrutura de chave pública (PKI).' WHERE id = 17;
UPDATE perguntas SET dica = 'Pense em acesso sob demanda que expira automaticamente após uso.' WHERE id = 18;
UPDATE perguntas SET dica = 'Combine controle baseado em função (RBAC) com acesso temporário (JIT).' WHERE id = 19;
UPDATE perguntas SET dica = 'Sem correlação entre logs, é impossível reconstruir a sequência completa de eventos de um ataque.' WHERE id = 20;
UPDATE perguntas SET dica = 'Gates de qualidade são pontos de verificação automatizados no pipeline CI/CD.' WHERE id = 21;
UPDATE perguntas SET dica = 'Containers processam dados sensíveis, então credenciais devem ser protegidas com criptografia forte.' WHERE id = 22;
UPDATE perguntas SET dica = 'A cadeia de custódia garante que evidências sejam admissíveis em processos legais.' WHERE id = 23;
UPDATE perguntas SET dica = 'Zero Trust exige verificação contínua de múltiplos fatores, não apenas identidade.' WHERE id = 24;
UPDATE perguntas SET dica = 'Decisões baseadas apenas em identidade ignoram o contexto do dispositivo e do ambiente.' WHERE id = 25;