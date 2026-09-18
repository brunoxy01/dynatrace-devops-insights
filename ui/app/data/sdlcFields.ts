import type { Provider } from "./types";
import { resolveField, resolveString } from "./eventFields";

// Extractors que funcionam para os DOIS schemas de SDLC event que recebemos:
//
// - GitHub adapter: campos = payload bruto do GitHub serializado como JSON
//   string (repository, pull_request, sender, workflow_run). event.type =
//   "pull_request".
// - GitLab adapter: segue o semantic dictionary da Dynatrace — event.provider
//   = "gitlab", event.type = "change" (merge request), campos vcs.* e
//   ext.pipeline.* . Não traz os objetos brutos.
//
// Por isso cada extractor tenta vários caminhos, na ordem de preferência.

export function eventProvider(r: Record<string, unknown>): Provider {
  const p = resolveString(r, ["event.provider"]).toLowerCase();
  if (p === "gitlab") return "gitlab";
  if (p === "github") return "github";
  if (p.includes("azure")) return "azure-devops";
  // fallback: inferir de qualquer URL presente
  const url = resolveString(r, [
    "vcs.repository.url.full",
    "pull_request.html_url",
    "object_attributes.url",
    "vcs.repository.url",
  ]);
  if (url.includes("gitlab")) return "gitlab";
  if (url.includes("dev.azure.com") || url.includes("visualstudio")) return "azure-devops";
  return "github";
}

export function repoFullName(r: Record<string, unknown>): string {
  // GitHub bruto
  const gh = resolveString(r, ["repository.full_name", "pull_request.base.repo.full_name"]);
  if (gh) return gh;
  // GitLab MR webhook bruto
  const glRaw = resolveString(r, ["project.path_with_namespace"]);
  if (glRaw) return glRaw;
  // GitLab/Azure semantic: namespace + nome
  const ns = resolveString(r, ["ext.pipeline.project.namespace"]);
  const name = resolveString(r, ["vcs.repository.name"]);
  if (ns && name) return `${ns}/${name}`;
  // extrair o path da URL completa
  const url = resolveString(r, ["vcs.repository.url.full", "vcs.repository.url"]);
  if (url) {
    return url
      .replace(/^https?:\/\/[^/]+\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");
  }
  if (name) return name;
  return "";
}

export function branchName(r: Record<string, unknown>): string {
  return resolveString(r, [
    "pull_request.head.ref", // github bruto
    "vcs.ref.head.name", // semantic (gitlab/azure)
    "workflow_run.head_branch", // github workflow
    "object_attributes.source_branch", // gitlab MR bruto
    "head_branch",
  ]);
}

export function authorName(r: Record<string, unknown>): string {
  return resolveString(r, [
    "pull_request.user.login", // github bruto
    "sender.login",
    "vcs.change.author", // semantic dictionary
    "vcs.change.author.name",
    "vcs.change.author.username",
    "vcs.author.name",
    "vcs.author.username",
    "vcs.author",
    "ext.vcs.change.author",
    "user.username", // gitlab MR bruto
    "user.name",
    "author",
    "head_commit.author.username",
    "pusher.name",
  ]);
}

export function prNumber(r: Record<string, unknown>): string {
  return resolveString(r, [
    "pull_request.number", // github bruto
    "vcs.change.id", // semantic
    "object_attributes.iid", // gitlab MR bruto
    "number",
  ]);
}

export function prTitle(r: Record<string, unknown>): string {
  return resolveString(r, [
    "pull_request.title",
    "vcs.change.title",
    "object_attributes.title",
    "title",
  ]);
}

export function prUrl(r: Record<string, unknown>): string {
  return resolveString(r, [
    "pull_request.html_url",
    "vcs.change.url",
    "object_attributes.url",
    "vcs.repository.url.full",
  ]);
}

export function inferState(r: Record<string, unknown>): "open" | "merged" | "closed" {
  const s = resolveString(r, [
    "pull_request.state",
    "object_attributes.state",
    "vcs.change.status",
    "event.outcome",
    "state",
  ]).toLowerCase();
  if (resolveString(r, ["pull_request.merged"]) === "true" || s === "merged") return "merged";
  if (s === "closed") return "closed";
  return "open";
}

// event.types que representam um PR/MR aberto, conforme o provider/adapter.
export const PR_EVENT_TYPES = ["pull_request", "merge_request", "change"];

// Ações de webhook que representam a ENTIDADE PR (não a pipeline disparada
// por ela). Descoberto via DQL: pra este adapter, esses eventos chegam com
// event.type/event.category NULOS — o `event.type` é reservado pro gatilho
// da pipeline (push/schedule/pull_request-como-trigger). A única forma
// confiável de achar a entidade PR é pelo campo `action` + a presença do
// objeto `pull_request`/`object_attributes` no payload.
export const PR_ENTITY_ACTIONS = [
  "opened",
  "edited",
  "synchronize",
  "reopened",
  "closed",
  "ready_for_review",
  "converted_to_draft",
];

function hasPrPayload(r: Record<string, unknown>): boolean {
  return Boolean(resolveField(r, "pull_request") ?? resolveField(r, "object_attributes"));
}

export function isPrEvent(r: Record<string, unknown>): boolean {
  const type = String(r["event.type"] ?? "");
  // GitLab/Azure semantic dictionary: "change" já É a entidade PR, sem
  // objeto pull_request/object_attributes bruto — não dá pra exigir payload.
  if (type === "change") return true;
  // GitHub/GitLab brutos: esse MESMO event.type também marca pipelines
  // disparadas por um PR (sem payload da entidade). Só conta se o objeto
  // pull_request/object_attributes estiver presente de fato.
  if (type === "pull_request" || type === "merge_request") return hasPrPayload(r);
  // event.type null/vazio: só conta se a ação for de PR E o payload carregar
  // o objeto da PR (evita falso positivo com Issues, que também usam "opened").
  if (!type) {
    const action = String(r["action"] ?? "");
    return PR_ENTITY_ACTIONS.includes(action) && hasPrPayload(r);
  }
  return false;
}

// Chave de dedup: vários eventos do mesmo PR colapsam. Preferimos a BRANCH,
// porque uma branch de origem é única por PR aberto e vem tanto nos eventos
// pull_request "puros" quanto nos derivados de workflow — assim eventos do
// mesmo PR não se separam por alguns terem número e outros não. Sem branch,
// caímos no número; sem nenhum, "" (evento sem contexto de PR → ignora).
export function prDedupKey(repo: string, number: string, branch: string): string {
  if (branch) return `${repo}@${branch}`;
  if (number) return `${repo}#${number}`;
  return "";
}
