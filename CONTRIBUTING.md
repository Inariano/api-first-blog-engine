# Contributing to API-First Blog Engine

## 🧪 Culture: Test-First Development (TDD)

This project follows **strict Test-Driven Development**. Every feature begins with a failing test.

### The Red-Green-Refactor Cycle
1. **Red**: Write the integration test first (Jest + Supertest + mongodb-memory-server).
2. **Green**: Write the minimum implementation code to pass the test.
3. **Refactor**: Clean up code following Airbnb Style Guide — tests must remain green.

**The build will FAIL if coverage drops below 100%.**

---

## 🎯 Code Style

- **JavaScript**: [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) (strict)
- **Linting**: ESLint with Airbnb config. Run `npm run lint` before committing.
- **Formatting**: No Prettier — ESLint handles both style and formatting.

---

## 📝 Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]
```

### Types
| Type     | Usage                          |
|----------|--------------------------------|
| `feat`   | A new feature                  |
| `fix`    | A bug fix                      |
| `chore`  | Tooling, config, dependencies  |
| `refactor` | Code change without feature/fix |
| `docs`   | Documentation changes          |
| `test`   | Adding or fixing tests         |

### Examples
```
feat(auth): add OTP recovery endpoint
fix(api): correct content-type header on error responses
chore(init): setup repository structure and documentation
```

---

## 🤖 AI-Assisted Development (OpenCodeia)

This project uses OpenCodeia as a **Senior Architect Agent**. The agent:

1. Reads `agent.md` for behavioral rules.
2. Consults `skill.md` for technical contracts and stack mapping.
3. Follows the `ADR_MASTER.md` for architectural decisions.
4. Never writes implementation before tests.
5. Self-updates `agent.md` context after each completed feature.

---

## 🔄 Git Workflow

```
main ──► develop ──► feature/<name>
```

1. Create feature branch from `develop`: `git checkout -b feature/my-feature develop`
2. Write tests → implement → refactor
3. Push and open PR to `develop`
4. PR must pass CI and maintain 100% coverage
5. Squash merge into `develop`
6. Release branches merge into `main`

---

## 🐳 Running Locally

```bash
cp .env.example .env
# Fill in your .env values
docker-compose up --build
npm test
```
