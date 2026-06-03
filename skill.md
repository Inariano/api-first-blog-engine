# 🛠 Project Skills & Technical Contracts: Blog Engine RESTful

## 🧩 Core Stack & Architecture
- **Runtime:** Node.js, Express.
- **Database:** MongoDB Atlas, Mongoose.
- **Frontend:** Handlebars (SSR), Tailwind CSS (PostCSS), HTMX.
- **Architecture:** Desacoplada MVC (API-First). Controladores Web NUNCA acessam o banco; eles usam **Loopback HTTP** para consumir a API interna.
- **Testing:** Jest, Supertest, mongodb-memory-server, Cheerio (para parsing de HTML).
- **Code Quality:** ESLint configurado com o **Strict Airbnb Style Guide**.
- **Infra:** Docker-Compose (Bind Mounts local), Graceful Shutdown (SIGTERM).

## 📡 API Content Negotiation & Routing
- A API responde em dois formatos dependendo dos Headers HTTP:
  - `application/json` (Padrão para requisições REST tradicionais).
  - `text/html` (Fragmentos/Partials Handlebars injetados se detectar o cabeçalho `HX-Request` do HTMX).
- **Versionamento:** Feito via Header, mantendo URLs limpas.

## 🗺 Feature Map (Mapeamento de Funcionalidades)

### 1. Segurança e Autenticação
- **Sessões:** Persistidas no MongoDB via `connect-mongo`.
- **Login Local:** Senhas hasheadas com Bcrypt (via Mongoose pre-save).
- **Login Social:** OAuth (Google/GitHub) operando em isolamento estrito (sem auto-vínculo por e-mail).
- **Recuperação:** Envio de código OTP de 6 dígitos via SMTP (Mailrelay) com Rate Limit por IP/E-mail.
- **Autorização:** Middlewares Híbridos (RBAC [Admin, Escritor, Inscrito] + Ownership).
- **Borda e Proteção Web:** CORS estrito, Helmet (CSP com Nonces dinâmicos), Tokens CSRF (Double-Submit), e sanitização de dados no runtime via **Zod/Joi**.

### 2. Conteúdo, Mídia e SEO
- **Posts:** URLs baseadas no padrão `ID + Slug`. Editor WYSIWYG com sanitização estrita no backend.
- **Imagens:** Armazenadas no Cloudinary (Transformação responsiva via URL). Upload seguro validando **Magic Numbers** e dimensões do buffer. Imagens no frontend usam `loading="lazy"`.
- **Agendamento:** Transição de status (Rascunho -> Publicado) gerenciada por um Cron Job interno no Docker.
- **SEO:** Geração on-the-fly de `sitemap.xml` e RSS. Injeção dinâmica de JSON-LD e Meta Tags via Helpers do Handlebars.

### 3. Banco de Dados e Busca Avançada
- **Atlas Search:** Busca semântica com *Highlighting Nativo* e Índices Compostos para performance em paginação.
- **Home/Aggregations:** Uso do pipeline `$facet` para agrupar Recentes e Mais Lidos em uma única query.
- **Seeding:** População de dados no ambiente de dev utilizando scripts determinísticos (arquivos JSON técnicos) criados para aferir a relevância da busca.

### 4. Interface e Interatividade (Frontend)
- **UX Geral:** Uso de Estados Vazios estáticos (`no-results.hbs`). Tratamento centralizado de erros em layout único (`error.hbs`).
- **HTMX:** Paginação ("Ver mais") e envio de formulários via atributos HTML. Tratamento de falhas via `hx-target-error`. Testes de interface validados estruturalmente com **Cheerio**.
- **Comentários:** Hierarquia aninhada (Threaded) com destaque de Autor. Aprovação automática para inscritos autenticados.

### 5. Observabilidade e Operação Contínua
- **Logs (Winston):** Salvos no MongoDB com TTL de 30 dias. Obrigatório **Mascaramento de Dados** (Senhas, Tokens, PII) antes da persistência. Log de Client-Side enviado via `/api/logs/client`.
- **Métricas:** Tracking nativo de Page Views (eliminando dependência do Google Analytics). Middleware `X-Response-Time` para detectar slow queries (>500ms).
- **Alertas (Telegram):** Cron Jobs verificam erros críticos a cada 15 min e despacham um Digest diário de KPIs.