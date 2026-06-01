import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import type { Provider, PullRequest } from "../data/types";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";
import { resolveString, resolveNumber } from "../data/eventFields";

interface UseSDLCPullRequestsResult {
  data: PullRequest[];
  isLoading: boolean;
  error?: Error;
  rawCount: number;
  matchedCount: number;
  dqlQuery: string;
}

function providerFromUrl(url: string): Provider {
  if (url.includes("gitlab")) return "gitlab";
  if (url.includes("dev.azure.com") || url.includes("visualstudio")) return "azure-devops";
  return "github";
}

function inferState(r: Record<string, unknown>): PullRequest["state"] {
  const merged = resolveString(r, ["pull_request.merged"], "");
  if (merged === "true") return "merged";
  const state = resolveString(
    r,
    ["pull_request.state", "merge_request.state", "state"],
    "open",
  ).toLowerCase();
  if (state === "merged") return "merged";
  if (state === "closed") return "closed";
  return "open";
}

function mapRecord(r: Record<string, unknown>, i: number): PullRequest {
  const repository = resolveString(r, [
    "repository.full_name",
    "pull_request.base.repo.full_name",
    "project.path_with_namespace", // gitlab
  ]);
  const url = resolveString(r, [
    "pull_request.html_url",
    "pull_request.url",
    "object_attributes.url", // gitlab MR
  ]);
  // 0 = número desconhecido. Não usamos i+1 (era o índice no array global e
  // gerava numeração falsa tipo #3, #4 pra eventos do mesmo PR).
  const number = resolveNumber(r, ["pull_request.number", "object_attributes.iid", "number"], 0);
  const title = resolveString(
    r,
    ["pull_request.title", "object_attributes.title", "title"],
    "",
  );
  const author = resolveString(
    r,
    [
      "pull_request.user.login",
      "sender.login",
      "user.username", // gitlab MR webhook
      "user.name",
      "user.login",
      "object_attributes.last_commit.author.name", // gitlab
    ],
    "",
  );
  const branch = resolveString(
    r,
    [
      "pull_request.head.ref",
      "workflow_run.head_branch",
      "head_branch",
      "object_attributes.source_branch",
      "head.ref",
    ],
    "",
  );
  const additions = resolveNumber(r, ["pull_request.additions"], 0);
  const deletions = resolveNumber(r, ["pull_request.deletions"], 0);
  const createdAt = resolveString(
    r,
    ["pull_request.created_at", "object_attributes.created_at", "timestamp"],
    new Date().toISOString(),
  );
  const updatedAt = resolveString(
    r,
    ["pull_request.updated_at", "object_attributes.updated_at", "timestamp"],
    createdAt,
  );

  const prId = resolveString(r, ["pull_request.id", "merge_request.id"], "");

  return {
    id: prId || resolveString(r, ["event.id"], `pr-${i}`),
    number,
    title,
    repository: repository || "unknown",
    provider: providerFromUrl(url),
    author,
    branch,
    url,
    state: inferState(r),
    createdAt,
    updatedAt,
    additions,
    deletions,
  };
}

// Cada PR gera vários eventos (opened/synchronize/finished/etc). Agrupamos
// pelo melhor identificador disponível: número do PR, senão a branch de
// origem (separa múltiplos PRs no mesmo repo), senão o repositório. Nunca
// usamos event.id (é único por evento e quebraria o dedup).
function dedupLatestPerPR(prs: PullRequest[]): PullRequest[] {
  const map = new Map<string, PullRequest>();
  for (const pr of prs) {
    const key =
      pr.number > 0
        ? `${pr.repository}#${pr.number}`
        : pr.branch
          ? `${pr.repository}@${pr.branch}`
          : pr.repository;
    const existing = map.get(key);
    if (!existing || new Date(pr.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      map.set(key, pr);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

function buildQuery(fromIso: string, toIso: string): string {
  // pull_request = GitHub · merge_request = GitLab/Azure
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| filter event.type == "pull_request" or event.type == "merge_request"
| sort timestamp desc
| limit 500`;
}

export function useSDLCPullRequests(): UseSDLCPullRequestsResult {
  const { fromIso, toIso } = useTimeRange();
  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;
  const query = isValidRange ? buildQuery(fromIso, toIso) : FALLBACK_QUERY;
  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = (data?.records ?? []) as Record<string, unknown>[];
    if (!isValidRange || error) {
      return {
        data: [],
        isLoading,
        error: error as Error | undefined,
        rawCount: 0,
        matchedCount: 0,
        dqlQuery: query,
      };
    }
    const mapped = records.map(mapRecord);
    const matched = mapped.filter((p) => matchesWatchlist(p.repository));
    // Descarta eventos sem identificador de PR (nem número nem branch) — são
    // eventos derivados de workflow sem contexto de PR, viram ruído/linhas
    // fantasma. Eventos pull_request/merge_request reais trazem ao menos a branch.
    const identifiable = matched.filter((p) => p.number > 0 || p.branch);
    return {
      data: dedupLatestPerPR(identifiable),
      isLoading,
      rawCount: records.length,
      matchedCount: matched.length,
      dqlQuery: query,
    };
  }, [data, isLoading, error, isValidRange, query]);
}
