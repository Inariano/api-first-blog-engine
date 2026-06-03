# Pull Request Checklist

## 📋 Mandatory Checks
- [ ] O teste de integração foi escrito primeiro (Red phase)?
- [ ] A cobertura de código mantém-se em **100%**?
- [ ] O código segue o **Airbnb Style Guide** (sem warnings do ESLint)?
- [ ] O arquivo `agent.md` foi atualizado com o contexto atual (Self-Updating Context)?
- [ ] O **Loopback HTTP** foi respeitado? (Controllers Web não acessam banco direto)
- [ ] Schemas de validação (**Zod**) foram criados para entradas externas?

## 🧪 Testing
- [ ] Todos os testes passam localmente: `npm test`
- [ ] O build do Docker foi testado: `docker-compose up --build`

## 📝 Conventional Commit
- [ ] O título do PR segue o padrão: `tipo(escopo): descrição`
  - Ex: `feat(auth): add OTP recovery endpoint`
  - Ex: `fix(api): correct content negotiation header`
