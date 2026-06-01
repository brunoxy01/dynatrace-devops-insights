# DevOps Insights Lab

Hello-World Node/Express usado como alvo de CI/CD para **gerar SDLC events reais** que alimentam:

1. O app oficial [Community CI/CD Observability](https://www.dynatrace.com/hub/detail/community-cicd-observability/)
2. O nosso app **DevOps Insights** (na mesma tenant)

> Não é um app de produção. Existe pra ser pequeno o bastante para fechar o loop **commit → PR → build → deploy → eventos no Grail** rapidamente.

## Como rodar local

```bash
cd lab
npm install
npm test            # 2 testes (Node test runner nativo)
npm start           # sobe em http://localhost:3000
```

Endpoints:

- `GET /` → JSON com nome do serviço, versão e mensagem
- `GET /health` → `{ "status": "ok" }`

## Como gera eventos no Dynatrace

O fluxo é:

```
push/PR no GitHub
  └── GitHub Actions workflow (.github/workflows/lab-ci.yml)
        └── instala, testa, builda, "deploya"
  └── (paralelo) Webhook do GitHub configurado no repo
        └── POST → endpoint Dynatrace /platform/ingest/custom/events.sdlc/github
              └── Grail (events bucket)
                    └── App DevOps Insights / CI/CD Observability lê via DQL
```

Cada PR/MR aberto, build rodado e job concluído vira um **SDLC event** no Grail com `event.kind == "SDLC_EVENT"`.

## Como testar o loop completo

1. Crie uma branch:
   ```bash
   git checkout -b feat/lab-bump
   echo "// touched" >> lab/src/server.js
   git commit -am "feat(lab): touch server"
   git push -u origin feat/lab-bump
   ```
2. Abra um PR no GitHub apontando pra `main` — isso dispara:
   - O **workflow** `.github/workflows/lab-ci.yml` (gera builds/deploy events)
   - O **webhook** do GitHub (gera o evento `change` do PR)
3. No Notebook Dynatrace, valide com:
   ```dql
   fetch events
   | filter event.kind == "SDLC_EVENT"
   | summarize count(), by: {event.type, event.status, event.outcome}
   ```
4. Abra o app **DevOps Insights** ou o **Community CI/CD Observability** — o PR deve aparecer

## Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `SERVICE_NAME` | `devops-insights-lab` | Aparece no payload e nos logs |
| `RELEASE_VERSION` | `0.1.0` | Sobrescrita pelo CI durante o build pra refletir o commit SHA |
