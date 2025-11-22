DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS trail_progress CASCADE;
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS resultados CASCADE;
DROP TABLE IF EXISTS quiz_sessions CASCADE;
DROP TABLE IF EXISTS alternativas CASCADE;
DROP TABLE IF EXISTS perguntas CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(180) UNIQUE,
    nome VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'usuario' CHECK (tipo IN ('usuario', 'admin')),
    nivel_atual VARCHAR(20) DEFAULT 'junior',
    quiz_completed BOOLEAN DEFAULT FALSE,
    pontuacao_final INTEGER,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_access TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('inicial', 'final')),
    nivel VARCHAR(20) CHECK (nivel IN ('junior', 'pleno', 'expert')),
    modo VARCHAR(20) DEFAULT 'MEDIO',
    peso_iniciante INTEGER DEFAULT 2,
    peso_expert INTEGER DEFAULT 5,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE perguntas (
    id SERIAL PRIMARY KEY,
    quiz_id INT NOT NULL,
    texto TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'multipla',
    pontuacao INT NOT NULL DEFAULT 10,
    dificuldade VARCHAR(20) DEFAULT 'INICIANTE' CHECK (dificuldade IN ('INICIANTE', 'EXPERT')),
    ordem INT,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE alternativas (
    id SERIAL PRIMARY KEY,
    pergunta_id INT NOT NULL,
    texto TEXT NOT NULL,
    correta BOOLEAN DEFAULT FALSE,
    letra CHAR(1),
    FOREIGN KEY (pergunta_id) REFERENCES perguntas(id) ON DELETE CASCADE
);

CREATE TABLE quiz_sessions (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    quiz_id INT,
    email VARCHAR(255) NOT NULL,
    modo VARCHAR(50) DEFAULT 'MEDIO',
    peso_iniciante INT DEFAULT 2,
    peso_expert INT DEFAULT 5,
    pontuacao INT DEFAULT 0,
    total_perguntas INT DEFAULT 0,
    acertos_seguidos_iniciante INT DEFAULT 0,
    nivel VARCHAR(50) DEFAULT 'INICIANTE',
    finalizado BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL
);

CREATE TABLE quiz_answers (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    pergunta_id INT,
    alternativa_escolhida_id INT,
    acertou BOOLEAN NOT NULL,
    pontos_ganhos INT DEFAULT 0,
    nivel_atual VARCHAR(50),
    mudou_nivel BOOLEAN DEFAULT FALSE,
    pontuacao_total INT,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (pergunta_id) REFERENCES perguntas(id) ON DELETE SET NULL,
    FOREIGN KEY (alternativa_escolhida_id) REFERENCES alternativas(id) ON DELETE SET NULL
);

CREATE TABLE resultados (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    quiz_id INT NOT NULL,
    pontuacao_total INT NOT NULL,
    nivel_resultante VARCHAR(20) NOT NULL,
    total_perguntas INT,
    acertos INT,
    erros INT,
    percentual_conclusao INT,
    modo VARCHAR(50),
    atingiu_maximo BOOLEAN DEFAULT FALSE,
    data_realizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE trail_progress (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    completed_lessons INT[] DEFAULT '{}',
    notes TEXT,
    current_module INT DEFAULT 1,
    current_lesson INT DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    badge_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_firebase_uid ON usuarios(firebase_uid);
CREATE INDEX idx_quiz_sessions_usuario ON quiz_sessions(usuario_id);
CREATE INDEX idx_perguntas_quiz ON perguntas(quiz_id);
CREATE INDEX idx_alternativas_pergunta ON alternativas(pergunta_id);

INSERT INTO usuarios (email, tipo, quiz_completed, nome) 
VALUES ('admin@empresa.com', 'admin', TRUE, 'Administrador');

INSERT INTO usuarios (email, tipo, nome) VALUES 
    ('teste1@empresa.com', 'usuario', 'Usuário Teste 1'),
    ('teste2@empresa.com', 'usuario', 'Usuário Teste 2'),
    ('teste3@empresa.com', 'usuario', 'Usuário Teste 3');

INSERT INTO quizzes (tipo, nivel, modo, peso_iniciante, peso_expert) 
VALUES ('inicial', NULL, 'MEDIO', 2, 5)
RETURNING id;

DO $$
DECLARE
    quiz_id INT;
    p_id INT;
BEGIN
    SELECT id INTO quiz_id FROM quizzes WHERE tipo = 'inicial' LIMIT 1;

    
    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Em um sistema web, quais mecanismos são utilizados para garantir que apenas usuários legítimos possam acessar determinados recursos e que cada usuário tenha acesso apenas ao que está autorizado?', 'INICIANTE', 1)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Criptografia e hashing', FALSE, 'A'),
        (p_id, 'Firewall e proxy', FALSE, 'B'),
        (p_id, 'Autenticação e autorização', TRUE, 'C'),
        (p_id, 'Backup e recuperação de dados', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Quais são os princípios da segurança em nuvem?', 'INICIANTE', 2)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Confiabilidade, intensidade, segurança', FALSE, 'A'),
        (p_id, 'Disponibilidade, intermutabilidade, probabilidade e confiabilidade', FALSE, 'B'),
        (p_id, 'Integridade, confidencialidade, disponibilidade e autenticidade', TRUE, 'C'),
        (p_id, 'Flexibilidade, durabilidade, disponibilidade e confiabilidade', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Assinale a melhor alternativa que representa uma prática ou mecanismo utilizado para responder a ameaças em ambientes em nuvem.', 'INICIANTE', 3)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Desabilitar logs de auditoria para reduzir o consumo de recursos', FALSE, 'A'),
        (p_id, 'Implementar políticas de resposta a incidentes e monitoramento contínuo', TRUE, 'B'),
        (p_id, 'Permitir acesso administrativo irrestrito para agilizar correções', FALSE, 'C'),
        (p_id, 'Confiar exclusivamente na segurança fornecida pelo provedor de nuvem', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Qual dos seguintes itens representa um pilar da estratégia de "Defesa em Profundidade" (Defense in Depth) na segurança em nuvem?', 'INICIANTE', 4)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Implementar múltiplas camadas de controle de segurança (como firewall, IAM e criptografia) para que, se uma falhar, outra possa conter a ameaça', TRUE, 'A'),
        (p_id, 'Focar apenas na criptografia dos dados, assumindo que isso é suficiente para proteger contra ameaças', FALSE, 'B'),
        (p_id, 'Utilizar apenas um único firewall de rede robusto na borda da VPC', FALSE, 'C'),
        (p_id, 'Garantir que todos os recursos da nuvem estejam acessíveis publicamente para facilitar o acesso', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Qual das opções a seguir representa um ataque que pode ocorrer em um ambiente de nuvem (cloud)?', 'INICIANTE', 5)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'DDOS', TRUE, 'A'),
        (p_id, 'Cloud Insecuring Hack', FALSE, 'B'),
        (p_id, 'Attack Overflow', FALSE, 'C'),
        (p_id, 'Failed UI', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Qual é a mudança mais significativa no paradigma de segurança ao migrar de um ambiente on-premises para a nuvem?', 'INICIANTE', 6)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'A segurança passa a ser uma responsabilidade compartilhada entre o cliente e o provedor de nuvem', TRUE, 'A'),
        (p_id, 'O provedor de nuvem assume toda a responsabilidade pela segurança', FALSE, 'B'),
        (p_id, 'Firewalls se tornam desnecessários', FALSE, 'C'),
        (p_id, 'A única mudança é que o provedor cuida da segurança do datacenter', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Qual das alternativas é responsabilidade do provedor de serviços em nuvem?', 'INICIANTE', 7)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Configuração correta dos grupos de segurança e políticas de acesso', FALSE, 'A'),
        (p_id, 'Proteção física dos datacenters e da infraestrutura', TRUE, 'B'),
        (p_id, 'Criptografia dos dados do cliente, em armazenamento e em trânsito', FALSE, 'C'),
        (p_id, 'Gerenciamento das permissões de usuários dentro da conta do cliente', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'O que é DLP (Data Loss Prevention) em ambientes de nuvem e qual é sua função principal?', 'INICIANTE', 8)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Um tipo de firewall que bloqueia todo o tráfego externo da nuvem', FALSE, 'A'),
        (p_id, 'Um conjunto de políticas, ferramentas e processos que previnem a perda ou vazamento de dados sensíveis, controlando quem pode acessar, transferir ou modificar informações na nuvem', TRUE, 'B'),
        (p_id, 'Um sistema de backup automático que salva todos os dados da nuvem periodicamente', FALSE, 'C'),
        (p_id, 'Um protocolo de criptografia usado apenas para comunicação entre datacenters de nuvem', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'O que é JIT Access (Just-In-Time Access) e por que ele deve ser usado em ambientes de nuvem?', 'INICIANTE', 9)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Um método que concede acesso permanente a todos os usuários, garantindo disponibilidade total de recursos', FALSE, 'A'),
        (p_id, 'Um mecanismo que permite acesso temporário e controlado a recursos sensíveis, reduzindo riscos de exposição e ataques', TRUE, 'B'),
        (p_id, 'Um protocolo de criptografia de dados que protege informações em trânsito na nuvem', FALSE, 'C'),
        (p_id, 'Um sistema de backup automático de todos os recursos de nuvem para evitar perda de dados', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Um usuário precisa acessar um recurso na nuvem de forma temporária. Qual é a melhor opção para conceder esse acesso de forma segura?', 'INICIANTE', 10)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Adicionar o usuário em questão a um grupo de segurança', FALSE, 'A'),
        (p_id, 'Compartilhar o acesso de outro usuário que já possui as permissões necessárias', FALSE, 'B'),
        (p_id, 'Conceder ao usuário uma função (role) com tempo de expiração, garantindo que o acesso seja temporário', TRUE, 'C'),
        (p_id, 'Criar uma política de acesso baseada em tarefas específicas, permitindo que o usuário execute apenas as ações necessárias durante o período requerido', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Abaixo é apresentada uma série de políticas de identidade e acesso implementadas em ambiente de nuvem. Assinale aquela que não é recomendada.', 'INICIANTE', 11)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Exercer a responsabilidade compartilhada entre provedor de nuvem e empresa, com equipe corporativa responsável pela resposta a incidentes', FALSE, 'A'),
        (p_id, 'Criar contas genéricas para que qualquer funcionário na equipe possa acessar os recursos, possibilitando a acessibilidade', TRUE, 'B'),
        (p_id, 'Implementar políticas de acesso baseadas em função (RBAC)', FALSE, 'C'),
        (p_id, 'Controle de sessões com bloqueios por IP ou geolocalização', FALSE, 'D'),
        (p_id, 'Aprovação dupla para alteração de políticas de identidade e acesso (IAM), e proibição de contas root/owner', FALSE, 'E');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Em um ambiente de nuvem pública com múltiplos serviços gerenciados e instâncias personalizadas, qual abordagem representa melhor uma estratégia robusta para lidar com vulnerabilidades e aplicação de patches?', 'INICIANTE', 12)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Implementar um processo contínuo de gerenciamento de vulnerabilidades, incluindo varreduras regulares e priorização baseada em risco', TRUE, 'A'),
        (p_id, 'Confiar que o provedor de nuvem faz as atualizações necessárias em patches automaticamente em todos os serviços e instâncias', FALSE, 'B'),
        (p_id, 'Realizar varreduras de vulnerabilidades apenas em ambientes de produção, evitando impacto em ambientes de desenvolvimento', FALSE, 'C'),
        (p_id, 'Aplicar apenas patches manualmente, quando uma vulnerabilidade for explorada ativamente, para evitar indisponibilidade', FALSE, 'D'),
        (p_id, 'Utilizar snapshots periódicos como substituto para atualização de patches, garantindo recuperação rápida em caso de ataque', FALSE, 'E');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Ao adotar soluções SaaS em um ambiente corporativo, quais são as principais preocupações de segurança que devem ser avaliadas em relação ao fornecedor e ao modelo de serviço?', 'INICIANTE', 13)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Garantir que o fornecedor utilize apenas servidores físicos dedicados para cada cliente, evitando virtualização', FALSE, 'A'),
        (p_id, 'Priorizar fornecedores que oferecem o menor custo, já que a segurança é responsabilidade do cliente no modelo SaaS', FALSE, 'B'),
        (p_id, 'Não esmiuçar detalhes de segurança em contratos, a fim de não burocratizar os acordos', FALSE, 'C'),
        (p_id, 'Realizar varredura constante para descoberta de shadow IT nos sistemas alheios, quando permitido e acordado em contrato', FALSE, 'D'),
        (p_id, 'Avaliar se o fornecedor utiliza criptografia de dados e realiza pentests de vulnerabilidades', TRUE, 'E');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Ao utilizar serviços de inteligência artificial (Cloud AI Services) baseados em nuvem, qual é a principal preocupação de segurança que deve ser considerada?', 'INICIANTE', 14)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'A impossibilidade de auditar os modelos de IA utilizados pelo provedor, o que impede a validação de decisões automatizadas', TRUE, 'A'),
        (p_id, 'Garantir que os dados utilizados para treinar os modelos de IA sejam sempre categorizados nos seus níveis de confidencialidade', FALSE, 'B'),
        (p_id, 'A certeza de que os serviços de IA em nuvem armazenam dados sensíveis, realçando a necessidade de controles de acesso', FALSE, 'C'),
        (p_id, 'O conhecimento dos riscos relacionados à privacidade, já que os modelos de IA retêm informações dos dados processados', FALSE, 'D'),
        (p_id, 'A segurança dos serviços de IA depende da infraestrutura física do provedor e das políticas de segurança virtuais específicas', FALSE, 'E');


    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'No contexto de sistemas web, qual é a diferença entre autenticação e autorização?', 'EXPERT', 15)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'A autenticação verifica as permissões do usuário e a autorização confirma sua identidade', FALSE, 'A'),
        (p_id, 'A autenticação identifica o usuário e a autorização define o que ele pode acessar', TRUE, 'B'),
        (p_id, 'A autenticação controla o tráfego de rede e a autorização protege os dados transmitidos', FALSE, 'C'),
        (p_id, 'A autenticação e a autorização são etapas idênticas de validação de acesso', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Em um ambiente Kubernetes, qual é a forma mais segura de fornecer credenciais de banco de dados a um Pod que precisa utilizá-las?', 'EXPERT', 16)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Incluir as credenciais como texto simples em um ConfigMap e montá-lo no Pod', FALSE, 'A'),
        (p_id, 'Inserir as credenciais diretamente na imagem do container durante o build', FALSE, 'B'),
        (p_id, 'Usar um Secret nativo do Kubernetes, montando-o como volume no Pod ou injetando-o como variável de ambiente', TRUE, 'C'),
        (p_id, 'Armazenar as credenciais como variáveis de ambiente diretamente na definição YAML do Deployment ou Pod', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'O que são serviços ICP?', 'EXPERT', 17)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Um framework para gerenciar a troca de informações de forma segura e criptografada utilizando certificados digitais', TRUE, 'A'),
        (p_id, 'Um serviço de segurança para scripts de gerenciamento de dados', FALSE, 'B'),
        (p_id, 'Um IP dinâmico usado apenas em ambientes de nuvem', FALSE, 'C'),
        (p_id, 'Significa "Inconditional Computer Power" e é um protocolo de segurança inovador', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'O que é Just-In-Time (JIT) Access em ambientes de TI ou nuvem?', 'EXPERT', 18)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Técnica que mantém acessos administrativos ativos permanentemente', FALSE, 'A'),
        (p_id, 'Modelo de controle de acesso que concede permissões temporárias e sob demanda', TRUE, 'B'),
        (p_id, 'Ferramenta de backup utilizada para restaurar acessos de usuários', FALSE, 'C'),
        (p_id, 'Metodologia de desenvolvimento ágil voltada à otimização de entregas contínuas', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Uma empresa utiliza serviços em nuvem para hospedagem, deploy e monitoramento de aplicações e possui funcionários com diferentes funções. Qual é a abordagem mais adequada para o controle de acesso?', 'EXPERT', 19)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Conceder permissões amplas e permanentes a todos os usuários', FALSE, 'A'),
        (p_id, 'Centralizar todos os acessos em um único usuário administrativo compartilhado', FALSE, 'B'),
        (p_id, 'Utilizar o modelo de acesso baseado em função (RBAC) combinado com Just-In-Time (JIT) Access, concedendo permissões temporárias apenas quando necessário', TRUE, 'C'),
        (p_id, 'Permitir que cada funcionário defina suas próprias permissões', FALSE, 'D');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Em uma arquitetura distribuída com workloads críticos em múltiplas regiões, qual é o impacto da ausência de correlação entre logs secundários e logs primários na reconstrução de incidentes complexos?', 'EXPERT', 20)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Dificulta a aplicação de políticas de tagging por criticidade', FALSE, 'A'),
        (p_id, 'Impede a rastreabilidade entre camadas e contas distintas, comprometendo a linha temporal do ataque', TRUE, 'B'),
        (p_id, 'Viola requisitos de retenção legal conforme LGPD', FALSE, 'C'),
        (p_id, 'Reduz a eficiência de alertas baseados em métricas operacionais', FALSE, 'D'),
        (p_id, 'Afeta a identificação de anomalias em ambientes multicloud', FALSE, 'E');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Em um pipeline CI/CD que utiliza imagens de containers, qual prática recomendada deve ser aplicada para evitar que configurações vulneráveis sejam promovidas para produção?', 'EXPERT', 21)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Uso de TLS 1.3 em todos os ambientes', FALSE, 'A'),
        (p_id, 'Aplicação de políticas de negação por padrão (deny-by-default) em runtime', FALSE, 'B'),
        (p_id, 'Implementação de gates de qualidade que bloqueiem imagens não conformes', TRUE, 'C'),
        (p_id, 'Criação de imagens com base em sistemas operacionais genéricos', FALSE, 'D'),
        (p_id, 'Execução de containers com privilégios elevados para facilitar testes', FALSE, 'E');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Durante o provisionamento de containers que processam dados sensíveis, qual prática é essencial para garantir a confidencialidade dos segredos utilizados?', 'EXPERT', 22)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Armazenar segredos diretamente nas imagens de container', FALSE, 'A'),
        (p_id, 'Compartilhar segredos entre múltiplos containers', FALSE, 'B'),
        (p_id, 'Utilizar criptografia em repouso e em trânsito com algoritmos validados pelo FIPS 140', TRUE, 'C'),
        (p_id, 'Persistir segredos em volumes compartilhados entre hosts', FALSE, 'D'),
        (p_id, 'Incluir segredos em variáveis de ambiente sem controle de acesso', FALSE, 'E');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Durante um incidente envolvendo abuso de permissões IAM, qual prática é essencial para garantir a validade jurídica da investigação?', 'EXPERT', 23)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Execução de reteste imediato após a contenção', FALSE, 'A'),
        (p_id, 'Registro de métricas de MTTR e MTTD em dashboards operacionais', FALSE, 'B'),
        (p_id, 'Preservação da cadeia de custódia com registro de ações, cópia da evidência original e verificação de integridade', TRUE, 'C'),
        (p_id, 'Notificação interna aos times de desenvolvimento e produto', FALSE, 'D'),
        (p_id, 'Ativação de alertas em tempo real para eventos de IAM', FALSE, 'E');

    INSERT INTO perguntas (quiz_id, texto, dificuldade, ordem) 
    VALUES (quiz_id, 'Em uma arquitetura Zero Trust, qual falha no mecanismo de decisão de políticas pode permitir acesso indevido mesmo com autenticação multifator ativa?', 'EXPERT', 24)
    RETURNING id INTO p_id;
    INSERT INTO alternativas (pergunta_id, texto, correta, letra) VALUES
        (p_id, 'Ausência de logs de auditoria em tempo real', FALSE, 'A'),
        (p_id, 'Falta de integração com sistemas de classificação de dados', FALSE, 'B'),
        (p_id, 'Decisões de acesso baseadas apenas em identidade, sem considerar postura do dispositivo e atributos ambientais', TRUE, 'C'),
        (p_id, 'Uso de TLS 1.2 em vez de TLS 1.3 para microsserviços internos', FALSE, 'D'),
        (p_id, 'Expiração de sessão baseada em tempo fixo, sem avaliação contínua', FALSE, 'E');

END $$;