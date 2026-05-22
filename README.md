# DevOps Insights

App Dynatrace que consolida métricas de produtividade de engenharia: commits, PRs/MRs, builds, deploys, estratégia de branch e comparação entre releases — tudo correlacionado com o que já existe no Grail (SDLC events) e com o app **CI/CD Observability**.

| App ID | Environment |
|---|---|
| `my.devops.insights` | `https://bwm98081.apps.dynatrace.com/` |

## Telas

> Screenshots em [`docs/screenshots/`](docs/screenshots/) — adicione conforme indicado no [README de lá](docs/screenshots/README.md).

- **Overview** — KPIs (commits, repos, branches, PRs, builds com taxa de sucesso, deploys, lead time), painel **Dynatrace Intelligence** com anomalias automáticas, distribuição de estratégia de branch por repositório, top 5 contribuidores. → `docs/screenshots/overview.png`
- **Release Comparison** — compara latest vs previous release de uma aplicação: error rate, response time, throughput, Davis problems, PRs e commits que entraram entre as duas. → `docs/screenshots/release-comparison.png`
- **Builds** — cards agrupados por status (rodando / falha / sucesso / cancelado) com repo, branch, commit, autor, duração. → `docs/screenshots/builds.png`
- **PRs / MRs** — lista com botão `Aprovar` que dispara um workflow do Dynatrace via toast (stub). → `docs/screenshots/pull-requests.png`
- **Repositórios** — lista com link pro repositório no GitHub, badge da estratégia inferida, service linkado. → `docs/screenshots/repositories.png`
- **Desenvolvedores** — ranking por commits / PRs / lead time.

## Stack

- React 18 + TypeScript
- [Strato Design System](https://developer.dynatrace.com/design/) (`@dynatrace/strato-components`, `@dynatrace/strato-components-preview`)
- `@dynatrace-sdk/react-hooks` para queries DQL (`useDql`)
- `@dynatrace-sdk/navigation` para navegar entre apps (`openApp`)
- react-router-dom para roteamento interno

## Arquitetura

```
ui/app/
├── App.tsx                          Page (Strato) + Routes + Providers
├── components/
│   ├── BranchStrategyBadge.tsx      Badge colorido por estratégia
│   ├── DynatraceIntelligencePanel.tsx  Painel de insights automáticos
│   ├── FilterBar.tsx                Provider + Strategy + TimeframeSelector
│   ├── Header.tsx                   AppHeader Strato
│   ├── KpiCard.tsx                  Card com hover gradient border
│   └── TimeRangeFilter.tsx          Wrapper do TimeframeSelector
├── data/
│   ├── branchStrategy.ts            Heurística gitflow/trunk/none
│   ├── mockData.ts                  Fallback quando não há SDLC events
│   └── types.ts                     Provider, Developer, Repository, PullRequest, Build, Deploy, Release
├── hooks/
│   └── useSDLCBuilds.ts             useDql + fallback pra mock
├── pages/
│   ├── Overview.tsx                 KPIs + Intelligence + branch dist
│   ├── ReleaseComparison.tsx        Latest vs Previous side-by-side
│   ├── Builds.tsx                   Cards agrupados
│   ├── PullRequests.tsx             Tabela + botão Aprovar
│   ├── Repositories.tsx             Tabela com link
│   └── Developers.tsx               Ranking
├── state/                           Contexts (provider, strategy, time range)
├── styles/animations.css            Hover gradient border (conic-gradient)
└── utils/navigation.ts              openApp + fallback window.open
```

## Como rodar localmente

```bash
# Node 24 recomendado (Node 25+ funciona com warning)
node --version

# instalar deps
npm install

# subir dev server (abre o app via tunnel do Dynatrace)
npm run start
# ou: npx dt-app dev
```

A CLI imprime dois links:
- `http://localhost:3000/ui` — preview local cru
- `https://bwm98081.apps.dynatrace.com/ui/apps/local-dev-server/?locationAppIds=...` — preview rodando **dentro** do seu tenant Dynatrace, com OAuth do usuário e acesso a Grail/DQL real

## Como os dados chegam no app

O app consome **dois tipos de fonte** com fallback automático:

### 1. SDLC events (Grail) — fonte primária

Quando há ingestão de SDLC events no tenant, o hook [`useSDLCBuilds`](ui/app/hooks/useSDLCBuilds.ts) executa via `useDql`:

```dql
fetch events, from: "<from>", to: "<to>"
| filter event.kind == "SDLC_EVENT"
| filter event.type == "build" or event.type == "task"
| filter event.category == "task"
| sort timestamp desc
| limit 200
```

Os registros são mapeados pros campos da semantic dictionary (`vcs.repository.url`, `vcs.repository.commit.sha`, `vcs.repository.change.author`, `cicd.pipeline.name`, `event.status`, etc).

### 2. Mock data — fallback

Se a query retorna 0 records ou erro, o app cai pra `mockData.ts` e exibe na UI: **"fonte: mock data (sem ingestão detectada)"**. Útil pra desenvolvimento, demo e onboarding.

## Como ingerir SDLC events no Dynatrace

Pra alimentar o app com dados reais, configure **Pipeline Observability** seguindo um destes caminhos (todos populam `event.kind == "SDLC_EVENT"` no Grail):

### Opção A — Plugin oficial no seu CI/CD

A Dynatrace mantém plugins/actions oficiais que ingerem eventos sem código:

| Plataforma | Ferramenta |
|---|---|
| GitHub Actions | [`dynatrace-platform-monitoring/sdlc-actions`](https://github.com/Dynatrace) |
| GitLab CI | Template `sdlc-events` (component catalog) |
| Jenkins | Plugin oficial Dynatrace |
| Azure DevOps | Extension marketplace |

Cada plugin captura eventos de:
- **change** — abertura/fechamento de PR/MR
- **build / task** — início e fim de cada etapa do pipeline
- **deployment** — deploy iniciado e finalizado
- **validation** — testes, gates de qualidade
- **pipeline** — execução completa

### Opção B — API direta (Generic Events Ingest)

Envie POST pra `/platform/ingest/v1/events` com payload no formato:

```json
{
  "event.kind": "SDLC_EVENT",
  "event.category": "task",
  "event.type": "build",
  "event.status": "finished",
  "event.outcome": "success",
  "cicd.pipeline.name": "payments-api/main",
  "vcs.repository.url": "https://github.com/Dynatrace/payments-api",
  "vcs.repository.commit.sha": "abc123…",
  "vcs.repository.change.author": "bruno.silva@dynatrace.com",
  "duration": 187000000000,
  "timestamp": "2026-05-22T10:00:00Z"
}
```

### Opção C — OpenTelemetry

Se seu pipeline já emite traces OTel, configure o exporter pro endpoint Dynatrace. SDLC events viram spans com os mesmos atributos da semantic dictionary.

**Referências oficiais:**
- [Pipeline Observability docs](https://docs.dynatrace.com/docs/deliver/pipeline-observability-sdlc-events)
- [Semantic Dictionary — SDLC events](https://docs.dynatrace.com/docs/semantic-dictionary/model/sdlc-events)
- [DQL fetch events](https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language/commands/data-source-commands)

Depois de configurar a ingestão, valide rodando no Notebook:

```dql
fetch events
| filter event.kind == "SDLC_EVENT"
| summarize count(), by: {event.type, event.status}
```

## Custo / Billing no Dynatrace

O app em si **não** é cobrado — apps customizados rodam dentro do tenant sem licença extra (o consumo é do usuário/tempo de uso que já está incluso no platform subscription).

O que **gera consumo** é o que ele consulta:

### 1. Storage de SDLC events no Grail

Cada SDLC event ingerido conta como **bizevents/log retention** dependendo do bucket configurado:

| Recurso | Métrica de billing | Unidade |
|---|---|---|
| Ingestão de events | `events` ingest | **DDU** (Davis Data Units) — ou GiB se contratado por volume |
| Retention de events | Days of retention × volume | DDU/dia |

Cálculo: ~1 KB por evento × volume diário × dias de retenção. Um pipeline com 1000 builds/dia × 90 dias de retenção ≈ ~90 MB armazenados — quantidade pequena.

### 2. Queries DQL (CPU usage)

Cada `useDql` que esse app executa consome **DPS** (Davis Platform Seconds — substituto do antigo DDU pra queries):

- `fetch events | filter event.kind == "SDLC_EVENT"` rodando a cada filtro → ~1-5 DPS por query
- Cache de 60s no `useDql` (default) — refetch automático só após expiração
- Time range maior = mais bytes escaneados → mais DPS

**Boas práticas implementadas no app pra reduzir custo:**

- `staleTime: 60000` (default do `useDql`) — usa cache se a query rodou nos últimos 60s
- Limite explícito `| limit 200` nas queries de builds
- Filtro por timeframe estrito (TimeframeSelector controla `from`/`to` na query, não scaneia tudo)
- Guard em `useSDLCBuilds`: se `from === to` ou range inválido → não dispara DQL
- Filtros client-side (provider, strategy) aplicados sobre os records já retornados — não disparam novas queries

### 3. Workflows (botão Aprovar)

Cada execução de Workflow que o botão **Aprovar** dispara conta como:

- Function execution time (segundos) → DPS
- API calls externas (GitHub/GitLab) — só consumo do provider, não do Dynatrace

### 4. Monitoramento de quanto está custando

Use o app **Account Management** ou o Notebook:

```dql
fetch dt.system.events
| filter event.kind == "BILLING_USAGE"
| summarize sum(value), by: {bin(timestamp, 1d), license.type}
```

**Resumo:** o app foi desenhado pra ser **cost-light** — depende quase totalmente de queries pontuais a SDLC events que você já está ingerindo pro CI/CD Observability. Não duplica armazenamento, não roda jobs em background, não polla métricas em loop.

## Roadmap

- [ ] Approvação real de PR via Workflow do Dynatrace chamando API do provider
- [ ] Charts de tendência (TimeseriesChart) na Overview
- [ ] Detecção de uso de IA por commit (heurística co-author trailers)
- [ ] Métricas reais de serviço no Release Comparison (puxar do Grail por `dt.entity.service`)
- [ ] App function pra ingerir dados de GitHub/GitLab quando o pipeline não tem plugin SDLC

## Licença

Privado — projeto interno.
