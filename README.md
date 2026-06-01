# DevOps Insights

App Dynatrace que complementa o app oficial [**Community CI/CD Observability**](https://www.dynatrace.com/hub/detail/community-cicd-observability/), oferecendo visões adicionais sobre **PRs/MRs abertos**, **comparação entre releases** e produtividade dos desenvolvedores. Todo o dado vem dos **SDLC events ingeridos no Grail** — pela mesma config de webhook que alimenta o app da comunidade.

| App ID | Environment |
|---|---|
| `my.devops.insights` | `https://bwm98081.apps.dynatrace.com/ui/apps/my.devops.insights` |

## Estrutura do repositório

```
.
├── ui/app/                  → Código do app Dynatrace (React + Strato)
├── lab/                     → Hello World Express usado pra gerar SDLC events reais
├── .github/workflows/       → CI do lab (gera builds/deploys → eventos no Grail)
├── docs/screenshots/        → Imagens referenciadas pelo README (anexar manualmente)
└── README.md
```

## Telas do app

- **Overview** — KPIs (commits, PRs, deploys, lead time, top contributor), **Dynatrace Intelligence** (anomalias automáticas) e distribuição de estratégia de branch
- **PRs / MRs** — lista de PRs/MRs abertos lidos do Grail (`event.type == "change"`). Botão **Aprovar** dispara workflow stub
- **Release Comparison** — latest vs previous side-by-side com delta em error rate / response time / throughput / Davis problems / PRs incluídos
- **Desenvolvedores** — ranking por commits, PRs, lead time

> Screenshots em [`docs/screenshots/`](docs/screenshots/) — anexe manualmente conforme os nomes referenciados no [README de lá](docs/screenshots/README.md).

## Stack

- React 18 + TypeScript
- [Strato Design System](https://developer.dynatrace.com/design/) — `@dynatrace/strato-components`, `@dynatrace/strato-components-preview`
- `@dynatrace-sdk/react-hooks` — `useDql` pra queries em Grail
- `@dynatrace-sdk/navigation` — `openApp` pra abrir CI/CD Observability inline
- `FilterField` do Strato pra filtros (provider, strategy, repository, application, environment, author, branch)

## Como rodar localmente

```bash
# Node 24 recomendado
npm install
npm run start          # ou: npx dt-app dev
```

A CLI imprime dois links: o `http://localhost:3000/ui` (preview cru) e o de dentro do tenant (com OAuth + Grail real).

## Como fazer deploy na tenant

```bash
npx dt-app deploy
```

O deploy registra como `my.devops.insights`. Pra reverter: `npx dt-app uninstall`.

---

## Ingestão de SDLC events

O app não ingere eventos — ele **consome** o que já está no Grail. A ingestão é feita via webhooks do provider apontando pro endpoint Custom Events da Dynatrace.

### Endpoint pelo tipo de tenant

| Tipo de tenant | Endpoint base |
|---|---|
| **Gen3 (apenas `.apps.dynatrace.com`)** | `https://<ENV-ID>.apps.dynatrace.com/platform/ingest/custom/events.sdlc/<provider>` |
| **Clássico (`.live.dynatrace.com`)** | `https://<ENV-ID>.live.dynatrace.com/platform/ingest/custom/events.sdlc/<provider>` |

Substitua `<provider>` por `github`, `gitlab` ou `azuredevops`.

### Token necessário

- **Tipo:** Access Token (formato `dt0c01.XXX.YYY`)
- **Scope obrigatório:** `events.ingest`
- **Onde gerar:** Settings → Access Tokens → Generate new token, marque `Ingest events` (também aceito como `storage:events:write` em algumas versões)

> Em tenants Gen3 modernos, talvez seja necessário usar **Platform Token** (criado via OAuth client) em vez de Access Token clássico. Se o `Api-Token` retornar 401 mesmo com scope correto, tente Platform Token.

### Troubleshooting do 401

| Sintoma | Causa provável | Fix |
|---|---|---|
| 401 `Authentication required` | URL com `.live.` em tenant Gen3 | Trocar pra `.apps.dynatrace.com` |
| 401 mesmo com URL correta | Scope `events.ingest` faltando no token | Recriar token com a permissão certa |
| 401 só nesse endpoint, outros funcionam | Tenant exige Platform Token | Criar via OAuth client com escopo `storage:events:write` |
| 404 | URL errada (provider name) | Confira: `github` / `gitlab` / `azuredevops` (sem hifens) |

Teste rápido:

```bash
curl -i -X POST \
  -H "Authorization: Api-Token <SEU_TOKEN>" \
  -H "Content-Type: application/json" \
  "https://bwm98081.apps.dynatrace.com/platform/ingest/custom/events.sdlc/gitlab" \
  -d '{"event.type":"test"}'
```

`200 OK` ou `202 Accepted` = ingestão ativa. Valide depois no Notebook:

```dql
fetch events
| filter event.kind == "SDLC_EVENT"
| summarize count(), by: {event.type, event.status}
```

---

## Configuração dos webhooks por provider

### GitLab (mais simples — sem proxy)

1. Repo → Settings → Webhooks → Add new webhook
2. **URL:** `https://<ENV-ID>.apps.dynatrace.com/platform/ingest/custom/events.sdlc/gitlab`
3. **Custom header:** `Authorization: Api-Token <TOKEN>`
4. **Triggers:** Merge request events, Job events, Pipeline events, Deployment events, Releases events
5. Save → "Test" → confira que o request volta 2xx

### Azure DevOps (também sem proxy)

1. Project Settings → Service Hooks → Create subscription → **Web Hooks**
2. Crie **uma subscription por trigger** (sim, várias):
   - Build completed
   - Run job state changed
   - Run state changed
   - Pull request created
   - Pull request updated
   - Release deployment started / completed / approval completed / approval pending
3. Pra cada: URL `https://<ENV-ID>.apps.dynatrace.com/platform/ingest/custom/events.sdlc/azuredevops`, HTTP header `Authorization: Api-Token <TOKEN>`

### GitHub (precisa de proxy)

O GitHub não suporta custom HTTP headers em webhooks e a Dynatrace não verifica HMAC-SHA256, então precisa de proxy.

**Opção A (recomendada) — Function/Lambda como proxy:**

```
GitHub webhook  →  Cloud Function (verifica HMAC + adiciona Authorization header)  →  Dynatrace
```

**Opção B (sandbox apenas):** Token na query string — *não usar em produção*:

```
URL: https://<ENV-ID>.apps.dynatrace.com/platform/ingest/custom/events.sdlc/github?api-token=<TOKEN>
```

No GitHub: Repo Settings → Webhooks → Add webhook
- Payload URL: a URL acima
- Content type: `application/json`
- Events: Pull requests, Workflow runs, Workflow jobs (desmarque Pushes pra não floodar)
- Active: ✓

---

## Lab — pipeline de teste

A pasta [`lab/`](lab/) tem um Hello-World Express com Dockerfile + testes + workflow GitHub Actions (`.github/workflows/lab-ci.yml`). Ele existe pra **gerar SDLC events reais** sem precisar do código real de produção.

Loop pra testar o app oficial e o nosso:

1. `git checkout -b feat/lab-touch` → mexer em qualquer coisa em `lab/`
2. `git push -u origin feat/lab-touch`
3. Abrir PR no GitHub
4. O workflow `lab-ci` roda → gera builds/deploys
5. O webhook GitHub configurado dispara → `event.type == "change"` cai no Grail
6. Abrir o app **DevOps Insights** (rota `/pull-requests`) → o PR deve aparecer com o badge `SDLC events (Grail)`
7. Abrir o **Community CI/CD Observability** → confere se ele também enxerga

Mais detalhes em [`lab/README.md`](lab/README.md).

---

## Custo / Billing

- **O app em si não é cobrado** — apps customizados rodam dentro do platform subscription
- **SDLC events ingeridos** consomem DDU (storage de events) — ~1 KB por evento. Pipeline com 1000 builds/dia × 90 dias retention ≈ 90 MB
- **Queries DQL** (`useDql`) consomem DPS. Otimizações já aplicadas:
  - `staleTime` default de 60s — cache entre rerenders
  - `| limit 200` explícito nas queries
  - Guard contra `from === to` (não dispara DQL inválido)
  - Filtros aplicados client-side sobre os records — não disparam novas queries

Pra monitorar:

```dql
fetch dt.system.events
| filter event.kind == "BILLING_USAGE"
| summarize sum(value), by: {bin(timestamp, 1d), license.type}
```

---

## Roadmap

- [ ] Proxy GitHub → Dynatrace como function do próprio app
- [ ] Charts de tendência (TimeseriesChart) na Overview
- [ ] Aprovação real de PR via Workflow do Dynatrace + API do provider
- [ ] Métricas reais de serviço no Release Comparison (puxar `dt.entity.service` do Grail)
