<p align="center">
  <h1 align="center">API-First Blog Engine</h1>
  <p align="center">
    A high-performance, API-First blog engine built with Node.js, MongoDB Atlas, HTMX, and Tailwind.
    <br />
    100% Test-Driven &amp; AI-Architected.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/Docker-supported-blue" alt="Docker">
  <img src="https://img.shields.io/badge/MongoDB%20Atlas-ready-green" alt="MongoDB Atlas">
  <img src="https://img.shields.io/badge/AI-Assisted-OpenCodeia%20Agent-purple" alt="AI-Assisted">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
</p>

---

## 📐 Architecture

```
                    ┌──────────────────────────────────────────┐
                    │           Browser (HTMX + Tailwind)       │
                    └────────────────┬─────────────────────────┘
                                     │ HX-Request / JSON
                                     ▼
               ┌─────────────────────────────────────────┐
               │         Express Web Controllers          │
               │  (Handlebars SSR / HTML Partial Render)  │
               └────────────────┬────────────────────────┘
                                │ Loopback HTTP (internal)
                                ▼
               ┌─────────────────────────────────────────┐
               │           RESTful API Controllers         │
               │     Content Negotiation (JSON / HTML)     │
               └────────────────┬────────────────────────┘
                                │
               ┌────────────────┼────────────────────┐
               │                │                    │
               ▼                ▼                    ▼
        ┌────────────┐  ┌────────────┐  ┌──────────────────┐
        │  MongoDB   │  │ Cloudinary │  │  SMTP (Mailrelay)│
        │  Atlas     │  │ (Images)   │  │  (Emails)        │
        └────────────┘  └────────────┘  └──────────────────┘
```

**Key Principle**: Web Controllers never access the database directly. They consume the internal API via Loopback HTTP requests. This enforces a clean separation of concerns and allows the API to be consumed by any client.

---

## 🛠 Tech Stack

| Category       | Technology                                      |
|----------------|-------------------------------------------------|
| Runtime        | Node.js, Express                                |
| Database       | MongoDB Atlas, Mongoose, Atlas Search           |
| Frontend       | Handlebars (SSR), HTMX, Tailwind CSS (PostCSS)  |
| Auth           | JWT (HTTP-Only Cookies), Passport.js (OAuth)    |
| Validation     | Zod                                             |
| Testing        | Jest, Supertest, mongodb-memory-server, Cheerio |
| Linting        | ESLint (Airbnb Strict)                          |
| Infrastructure | Docker, Docker-Compose                          |
| CI/CD          | GitHub Actions                                  |
| AI Agent       | OpenCodeia (Design-Time Architect)              |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker-Compose
- MongoDB Atlas account (or use mongodb-memory-server for tests)

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials (MongoDB URI, JWT secret, etc.)
```

### Run with Docker (recommended)

```bash
docker-compose up --build
```

The server will be available at `http://localhost:3000`.

### Run locally

```bash
npm install
npm run dev
```

### Run tests

```bash
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

---

## 🧪 TDD & Code Quality

- **100% code coverage** is mandatory. The build fails if coverage drops below the threshold.
- Tests use `mongodb-memory-server` for isolated integration testing.
- External services (Cloudinary, Telegram, SMTP) are mocked during tests.
- HTML fragments are validated structurally with Cheerio.

---

## 🔄 Git Workflow

```
main ──► develop ──► feature/<name>
```

1. Branch from `develop`
2. Write test → implement → refactor (Red-Green-Refactor)
3. Open Pull Request to `develop`
4. CI validates tests, coverage, and linting
5. Squash merge after approval

---

## 📁 Project Structure

```
.
├── .github/             # PR & Issue templates
├── src/
│   ├── api/             # RESTful API controllers
│   ├── web/             # Web controllers (Handlebars SSR)
│   ├── models/          # Mongoose schemas
│   ├── middlewares/      # Auth, validation, security
│   ├── services/        # Business logic
│   ├── views/           # Handlebars templates
│   └── utils/           # Helpers, logger, config
├── tests/               # Integration tests (Jest + Supertest)
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with 🧪 TDD, 🐳 Docker, and 🤖 OpenCodeia AI Agent
</p>
