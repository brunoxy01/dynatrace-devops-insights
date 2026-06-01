# DevOps Insights

App Dynatrace que complementa o app oficial [**Community CI/CD Observability**](https://www.dynatrace.com/hub/detail/community-cicd-observability/), oferecendo visões adicionais sobre **PRs/MRs abertos**, **contribuidores** e **insights** de produtividade. Todo o dado vem dos **SDLC events ingeridos no Grail** — pela mesma config de webhook que alimenta o app da comunidade. **Zero mock data**: o que aparece é o que está no Grail.

| App ID | Environment |
|---|---|
| `my.devops.insights` | `https://bwm98081.apps.dynatrace.com/ui/apps/my.devops.insights` |

## Estrutura do repositório

```
.
├── ui/app/                  → App Dynatrace (React + Strato)
├── lab/                     → Hello World Express que gera SDLC events reais
├── .github/workflows/       → CI do lab (gera build/deploy events no Grail)
├── docs/screenshots/        → Imagens do README (anexar manualmente)
└── README.md
```

## Páginas do app

- **Overview** — KPIs (commits, PRs abertos, contribuidores, top contribuidor), painel **Insights** (análise automática dos eventos) e lista de contribuidores
- **PRs / MRs** — pull/merge requests abertos lidos do Grail (`event.type == "pull_request"`), com link pro repositório
- **Contribuidores** — ranking de autores derivado dos eventos (commits, PRs), com última atividade

A barra superior tem o **FilterField** do Strato (`provider = github AND author = ...`) e o **TimeframeSelector**.

## Como os dados chegam

```
push / PR no GitHub
  ├── webhook do GitHub  →  endpoint Dynatrace /platform/ingest/custom/events.sdlc/github
  │                           └── Grail (events)  →  este app lê via DQL (useDql)
  └── GitHub Actions (.github/workflows/lab-ci.yml)  →  gera build/deploy events
```

O app **consome**, não ingere. A ingestão é via webhook (config abaixo).

### ⚠️ Detalhe importante de implementação (campos JSON serializados)

O GitHub adapter armazena cada objeto de topo do payload (`repository`,
`pull_request`, `sender`, `commits`, `workflow`) como **string JSON
serializada** dentro do evento — não como campo plano nem nested real.

Consequências:
- DQL `filter repository.full_name == "..."` **retorna 0** (DQL interpreta como acesso nested, mas o valor é uma string)
- Pra filtrar no DQL use `contains()`: `filter contains(repository, "meu-repo")`
- No app, [`ui/app/data/eventFields.ts`](ui/app/data/eventFields.ts) tem `resolveField(record, path)` que navega o path fazendo `JSON.parse` das strings ao longo do caminho. Por isso conseguimos extrair `pull_request.user.login`, `commits[].length`, etc.

O filtro por repositório (watchlist em [`ui/app/config.ts`](ui/app/config.ts)) é aplicado **client-side** depois do mapping, justamente porque o DQL não consegue filtrar esses campos.

## Como rodar localmente

```bash
npm install
npm run start          # ou: npx dt-app dev
```

## Deploy na tenant

```bash
npx dt-app deploy      # registra como my.devops.insights
npx dt-app uninstall   # remove
```

---

## DQL útil

**PRs/MRs abertos — quantos, por autor e por repositório (a query principal do app):**

```dql
fetch events
| filter event.kind == "SDLC_EVENT" and event.type == "pull_request"
| parse repository, "JSON:repoObj"
| parse sender, "JSON:senderObj"
| parse workflow_run, "JSON:wfObj"
| fieldsAdd repo = repoObj[full_name],
           author = senderObj[login],
           branch = wfObj[head_branch]
| filter isNotNull(repo)
| dedup {repo, branch}, sort: {timestamp desc}
| summarize open_prs = count(), by: {repo, author}
| sort open_prs desc
```

> **Por que o `parse ..., "JSON:..."`?** No webhook adapter, os objetos
> `repository`, `sender`, `pull_request`, `workflow_run` chegam como **strings
> JSON serializadas**. Por isso `repository.full_name == ...` retorna 0 — é
> preciso desserializar a string com o matcher JSON do DQL. O
> `dedup {repo, branch}` colapsa os vários eventos (opened/synchronize/finished)
> do mesmo PR em uma linha, separando PRs distintos pela branch de origem.

**Versão simples (só listar os eventos do nosso repo):**

```dql
fetch events
| filter event.kind == "SDLC_EVENT"
| filter event.type == "pull_request"
| filter contains(repository, "dynatrace-devops-insights")
| sort timestamp desc
| limit 20
```

> `contains(repository, "...")` funciona como filtro de repo justamente porque
> `repository` é uma string JSON que contém o nome.

**Ver tudo que está chegando, agrupado por tipo/status:**

```dql
fetch events
| filter event.kind == "SDLC_EVENT"
| summarize count(), by: {event.type, event.status}
| sort `count()` desc
```

## Status de validação por provider

A ingestão de SDLC events foi validada por provider de Git:

| Provider | Status | Observação |
|---|---|---|
| **GitHub** | ✅ Validado | PRs aparecem no app via webhook (evento `pull_request`). Requer proxy ou token na query (ver abaixo) |
| **Azure DevOps** | ⏳ A testar | Mesmo cenário, webhook nativo (Service Hooks) |
| **GitLab** | ⏳ A testar | Mesmo cenário, webhook nativo |

---

## Ingestão de SDLC events (webhooks)

### Endpoint pelo tipo de tenant

| Tenant | Endpoint |
|---|---|
| **Gen3 (`.apps.dynatrace.com`)** | `https://<ENV-ID>.apps.dynatrace.com/platform/ingest/custom/events.sdlc/<provider>` |
| **Clássico (`.live.dynatrace.com`)** | `https://<ENV-ID>.live.dynatrace.com/platform/ingest/custom/events.sdlc/<provider>` |

`<provider>` = `github` · `gitlab` · `azuredevops`. Token: Access Token com scope `events.ingest`.

### Troubleshooting do 401

| Sintoma | Causa | Fix |
|---|---|---|
| 401 com URL `.live.` em tenant Gen3 | domínio errado | usar `.apps.dynatrace.com` |
| 401 com URL certa | scope faltando | recriar token com `events.ingest` |
| 401 persistente Gen3 | precisa Platform Token | criar via OAuth client |
| 404 | provider name errado | `github`/`gitlab`/`azuredevops` (sem hífen) |

### GitLab (sem proxy)
Settings → Webhooks → URL do endpoint + custom header `Authorization: Api-Token <TOKEN>`. Triggers: Merge request, Job, Pipeline, Deployment, Releases.

### Azure DevOps (sem proxy)
Project Settings → Service Hooks → uma subscription por trigger (Build completed, Run job/state changed, PR created/updated, Release deployment *). Header `Authorization: Api-Token <TOKEN>`.

### GitHub (precisa proxy)
GitHub não manda custom headers e a Dynatrace não verifica HMAC, então:
- **Recomendado:** function/lambda que valida HMAC e adiciona o header `Authorization`
- **Sandbox:** `...events.sdlc/github?api-token=<TOKEN>` (token na query — só pra teste)

Eventos a habilitar: **Pull requests**, Workflow runs, Workflow jobs, Pushes.

---

## Lab — pipeline de teste

[`lab/`](lab/) tem um Hello-World Express (`npm test` passa, Dockerfile incluso) e o workflow [`.github/workflows/lab-ci.yml`](.github/workflows/lab-ci.yml) (test → build → deploy staging → deploy production). Existe só pra **gerar SDLC events reais**. Veja [`lab/README.md`](lab/README.md) pro loop completo.

---

## Custo / Billing

- App customizado **não é cobrado** (roda no platform subscription)
- SDLC events consomem DDU (storage, ~1 KB/evento)
- Queries `useDql` consomem DPS — mitigado com `staleTime` 60s, `limit`, e filtros client-side
- Monitorar: `fetch dt.system.events | filter event.kind == "BILLING_USAGE"`

## Roadmap

- [ ] Davis Analyzer (forecast/anomaly) quando houver volume de série temporal
- [ ] Número/título/URL real do PR (depende do evento `pull_request` puro do GitHub trazer o objeto completo)
- [ ] Aprovação de PR via Workflow do Dynatrace
- [ ] Proxy GitHub→Dynatrace como function do próprio app
