Este é o Registro de Decisões de Arquitetura (ADR) Master. Ele foi
meticulosamente reescrito e expandido após uma revisão completa de todo o
histórico da nossa conversa. Nenhuma decisão tomada ficou de fora.

Este documento consolida a arquitetura, a infraestrutura, a segurança e a
metodologia do seu Blog RESTful, servindo como o Plano Diretor definitivo para
você e para o Agente OpenCodeia.

📑 Registro de Decisões de Arquitetura (ADR) - Master Blueprint

Projeto: Blog Engine RESTful de Alta Performance
Data da Versão Final: Maio de 2026
Status: 🟢 Aprovado e Selado
Público-Alvo: Desenvolvedores e Agentes de IA (OpenCodeia)

📌 Sumário Executivo

O projeto adota uma arquitetura MVC Desacoplada (API-First) com renderização do
lado do servidor via Handlebars e interatividade moderna via HTMX. A
persistência é gerida pelo MongoDB Atlas e a infraestrutura é 100%
conteinerizada via Docker. A metodologia de desenvolvimento é estritamente
Test-First (TDD) com revisão autônoma por Inteligência Artificial.

ADR-001: Metodologia, Qualidade de Código e IA (OpenCodeia)

  - Contexto: Garantir que o projeto escale sem acumular dívida técnica e seja
    perfeitamente compreendido por ferramentas de IA atuando como revisores de
    código.
  - Decisões:
      - TDD Obrigatório (Test-First): Fluxo Red-Green-Refactor usando Jest +
        Supertest. É proibido gerar código de produção antes do teste de
        integração (que utilizará o banco simulado mongodb-memory-server).
      - Cobertura Inegociável: Threshold (limite mínimo) de 100% de Code
        Coverage. O build falhará se a cobertura for inferior.
      - Estilo e Linting: Adoção estrita do Airbnb Style Guide.
      - Commit Interativo: Scripts CLI validarão as etapas de teste antes de
        permitir o git commit.
      - Agente OpenCodeia (Design-Time): A IA atua apenas como Arquiteta. O
        arquivo skill.md mapeia funcionalidades, e agent.md dita as regras. O
        Agente atualizará o próprio arquivo (Self-Updating Context) para
        preservar a memória de evolução do software.

ADR-002: Padrão Arquitetural e Roteamento

  - Contexto: Necessidade de aliar as vantagens do SSR (SEO e carregamento
    rápido) com a flexibilidade de uma API independente.
  - Decisões:
      - API-First + Loopback HTTP: A lógica de negócios reside exclusivamente na
        API RESTful. Os Controladores Web não acessam o banco de dados; eles
        fazem requisições HTTP internas (Loopback) para a própria API para
        popular as Views.
      - Negociação de Conteúdo (Content Negotiation): A mesma rota de API serve
        clientes diferentes avaliando o cabeçalho. Retorna JSON (padrão) ou
        Fragmentos HTML (Partials) se a chamada for originada pelo HTMX
        (HX-Request).
      - Versionamento e Formato: Versionamento de API feito através de
        Cabeçalhos (Headers), mantendo URLs limpas. As respostas seguem o
        padrão REST puro baseado em recursos e Status HTTP.

ADR-003: Persistência, Busca e População de Dados (Seeding)

  - Contexto: O banco de dados deve suportar relações hierárquicas
    (comentários), buscas complexas e métricas agregadas eficientes.
  - Decisões:
      - MongoDB Atlas (Cloud): Modelagem normalizada entre Users, Posts,
        Comments, Categories e Tags.
      - Home e Agregações: Uso de pipelines $facet para carregar simultaneamente
        o Carrossel (Recentes) e o Top Posts (Mais Lidos) em uma única query.
      - Busca Semântica: Implementação do Atlas Search com Highlighting Nativo
        (o MongoDB devolve os fragmentos pesquisados em negrito).
      - Performance: Adoção de Índices Compostos para otimizar filtros massivos
        de categorias e datas.
      - Seeding Programático: População do banco de desenvolvimento baseada em
        datasets JSON técnicos e determinísticos, criados para testar
        especificamente a relevância do Atlas Search.

ADR-004: Segurança Multi-Camada e Gestão de Contas

  - Contexto: O blog possuirá Admins, Escritores e Inscritos. É vital proteger
    contra fraudes, ataques em massa e vazamentos.
  - Decisões:
      - Autenticação JWT: Trafegado exclusivamente em Cookies HTTP-Only
        protegido contra interceptação XSS.
      - Login Social (OAuth): Integração com Google/GitHub via Passport.js.
        Contas sociais operam em Isolamento Estrito (sem vínculo automático por
        e-mail) para evitar sequestro de conta local.
      - Autorização Híbrida: Middlewares validam RBAC (Papel) e Ownership
        (Propriedade do documento).
      - Proteção de Fronteira: CORS estrito, Tokens CSRF (Double-Submit), e
        Helmet com CSP Estrita via Nonces randômicos a cada requisição HTML.
      - Segurança de Variáveis: Validação de runtime no startup utilizando
        Schema do Zod/Joi. O servidor não liga se o .env estiver incorreto, mas
        as configurações de senha utilizam a lógica de "Ponte" no arquivo para
        não vazar no GitHub.
      - Rate Limiting: Limites diferenciados. Rotas de login e recuperação de
        senha têm bloqueios por IP/E-mail para impedir uso indevido de SMTP e
        ataques de força bruta.

ADR-005: Interface, Interatividade (HTMX) e UX

  - Contexto: Substituir frameworks JavaScript pesados por uma solução ágil,
    performática e que seja validada por testes de backend.
  - Decisões:
      - Motor Visual: Handlebars com suporte a Múltiplos Layouts (Admin vs.
        Public), e Dicionários JSON estáticos para i18n (Internacionalização).
      - CSS: Tailwind CSS via PostCSS. O CSS final será entregue através de
        Middleware Estático com Cache vitalício e Cache Busting via Query String
        (ex: style.css?v=2.0).
      - Interatividade HTMX: O carregamento dinâmico (ex: paginação de
        comentários via botão "Ver mais") é guiado por atributos HTML. O
        tratamento de erros ocorre localmente na interface via hx-target-error.
      - Testes HTML: Os fragmentos de interface gerados pela API serão validados
        em testes unitários usando a biblioteca Cheerio.
      - UX de Erros e Estados: Layout de erro dinâmico único (error.hbs). Para
        listas sem conteúdo, renderização de Partials de Estado Vazio Estáticos
        (no-results.hbs). Feedback ao usuário gerido por Flash Messages através
        de Sessões.

ADR-006: Desempenho, SEO e Otimização

  - Contexto: O blog precisa conquistar altas pontuações no Google PageSpeed e
    indexação orgânica impecável.
  - Decisões:
      - SEO: Injeção programática de JSON-LD para marcação estruturada (Rich
        Snippets). Geração dinâmica (On-the-fly) de sitemap.xml e RSS Feeds
        baseada no status publicado dos posts.
      - URLs e Datas: Slugs baseados na união de ID + Título (indestrutíveis).
        Datas formatadas via Helper de forma Híbrida (relativas para recentes,
        absolutas para antigos).
      - Compressão e Cache: Middleware de Gzip/Brotli. Gestão de Cache de rotas
        via cabeçalhos HTTP puros (Etag / Cache-Control).
      - Gestão de Imagens: Uploads intermediados pelo Multer e processados via
        Cloudinary (transformação responsiva via URL). Implementação simultânea
        de Lazy Loading nativo no HTML. Validação restrita a Magic Numbers e
        dimensões do buffer para blindar contra malwares.

ADR-007: Infraestrutura, Observabilidade e Operação Contínua

  - Contexto: Ambiente de produção auto-suficiente, observável e preparado para
    escalabilidade sem perda de dados.
  - Decisões:
      - Containers: Execução isolada em Docker. O ambiente local usa
        Docker-Compose with Bind Mounts para agilidade (Live-Reload).
      - Lifecycle: Graceful Shutdown ativado interceptando SIGTERM/SIGINT para
        fechamento polido de conexões com o MongoDB. Implementação dos endpoints
        de saúde e monitoramento (/health e /metrics).
      - Persistência de Sessão: Sessões de usuário armazenadas no próprio
        MongoDB (connect-mongo) para sobreviver a restarts de container.
      - Deploy: Entrega automatizada (Auto-build) via provedor PaaS conectado ao
        repositório GitHub.
      - Backups: Snapshots automáticos providos nativamente pelo MongoDB Atlas.
      - Monitoramento Global:
          - Winston: Grava logs de servidor e do banco (protegidos por
            Mascaramento de PII automático) no Atlas com índice de expiração
            (TTL).
          - Morgan: Monitora tráfego HTTP.
          - Performance: Middleware de X-Response-Time sinaliza ao Winston
            qualquer query que ultrapasse o limite (ex: 500ms).
          - Client-Side Logs: Navegadores enviam erros de Javascript da página
            web diretamente para a API através da rota /api/logs/client.
          - Alertas via Telegram: O Docker aciona um Cron Job programático
            para: 1) Escanear logs de erro a cada 15 min; 2) Enviar um resumo
            numérico (Digest) diário.
      - Analytics Nativo: Controle de Page Views e tráfego executado diretamente
        pelo servidor no MongoDB Atlas, eliminando trackers de terceiros (como
        GA4) e respeitando o Banner de Consentimento de Cookies simples (LGPD).

ADR-008: Lógica de Engajamento e Relacionamento (Core Business)

  - Contexto: O motor de conteúdo do blog e o sistema de retenção de usuários e
    moderação.
  - Decisões:
      - Agendamento de Posts: Transição de status (Rascunho -> Publicado)
        gerenciada por um Cron Job autônomo dentro do container Docker.
      - Comunidade (Comentários): Sistema aninhado hierarquicamente (Threaded)
        suportando ordem linear na mesma thread. Inclui Destaque de Autor
        (Author Highlight). Aprovação é automática (Whitelist) para usuários
        Inscritos autênticos.
      - Compartilhamento Social: Abordagem Híbrida: Links de ícones estáticos
        integrados com o acionamento da Web Share API nativa de celulares.
      - E-mails Transacionais: Entrega viabilizada via conexão SMTP (Mailrelay).
        O visual dos e-mails é construído utilizando os mesmos templates do
        Handlebars e os Helpers nativos do projeto.
      - Recuperação de Senha: Protegida pela exigência de um código OTP de 6
        dígitos enviado ao e-mail do usuário, validado de forma temporal no
        banco.

Nota Arquitetural: O projeto prescinde da necessidade de frameworks de frontend
complexos, gateways de armazenamento externos pesados para sessões ou
inteligência artificial em runtime. Toda a complexidade foi movida
inteligentemente para o banco de dados (Atlas Search, Aggregations, TTL, Store
de Sessões) e para o processamento robusto em Node.js (SSR, HTMX, Loopback),
criando um software elegante, coeso e extremamente veloz.
