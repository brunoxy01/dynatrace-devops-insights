# GitLab lab — validação de SDLC events

Réplica do cenário de validação (que já funcionou no GitHub) agora pro **GitLab**.

Repo de teste: https://gitlab.com/dynatrace3835911/dynatrace-merge-resquest-event

## Conteúdo

- `.gitlab-ci.yml` — pipeline build → test → deploy (staging + production) só com `echo`. Copie pra **raiz** do repo GitLab.

## Diferença pro GitHub (a favor)

No GitHub, o evento do PR só chegava quando o **workflow rodava** (o webhook pegava `workflow_run`). No GitLab, o webhook **"Merge request events"** dispara **ao abrir/atualizar o MR**, independente da pipeline — então o MR aparece no app mesmo sem rodar pipeline. A pipeline aqui serve pra gerar os eventos de build/deploy.

## Passo a passo

### 1. Subir o pipeline pro repo GitLab

```bash
git clone https://gitlab.com/dynatrace3835911/dynatrace-merge-resquest-event.git
cd dynatrace-merge-resquest-event
# copie o .gitlab-ci.yml deste diretório pra cá
cp /caminho/para/gitlab-lab/.gitlab-ci.yml .
git add .gitlab-ci.yml
git commit -m "ci: add echo build/test/deploy pipeline"
git push origin main
```

### 2. Configurar o webhook (Settings → Webhooks)

- **URL:** `https://bwm98081.apps.dynatrace.com/platform/ingest/custom/events.sdlc/gitlab`
- **Custom header:** nome `Authorization`, valor `Api-Token <SEU_TOKEN>` (token com scope `events.ingest`)
- **Triggers:** Merge request events, Pipeline events, Job events, Deployment events, Releases events
- Salvar e usar **"Test"** → deve retornar 2xx

### 3. Abrir um Merge Request

```bash
git checkout -b feat/gitlab-test
echo "// touched" >> README.md
git commit -am "feat: trigger MR event"
git push -u origin feat/gitlab-test
# abrir o MR pela UI do GitLab (feat/gitlab-test -> main)
```

### 4. Validar no Grail (Notebook)

```dql
fetch events
| filter event.kind == "SDLC_EVENT"
| filter event.type == "merge_request" or event.type == "pull_request"
| filter contains(project, "dynatrace-merge-resquest-event")
| sort timestamp desc
| limit 20
```

### 5. Conferir no app DevOps Insights

O MR deve aparecer na página **PRs / MRs** com provider **GitLab**.
