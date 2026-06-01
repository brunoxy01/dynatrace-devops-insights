import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { pullRequests as mockPullRequests } from "../data/mockData";
import type { Provider, PullRequest } from "../data/types";
import { useTimeRange } from "../state/TimeRangeContext";

// Repos que queremos enxergar. Adicione novos repos aqui conforme conectar
// mais webhooks. O filtro casa por `contains` pra absorver pequenas variações
// de URL (https vs git@, com ou sem .git no final).
export const REPO_WATCHLIST = ["brunoxy01/dynatrace-devops-insights"];

interface UseSDLCPullRequestsResult {
  data: PullRequest[];
  isLoading: boolean;
  error?: Error;
  source: "grail" | "mock";
  rawSample?: Record<string, unknown>;
  rawCount: number;
}

function providerFromUrl(url: string | undefined): Provider {
  if (!url) return "github";
  if (url.includes("gitlab")) return "gitlab";
  if (url.includes("dev.azure.com") || url.includes("visualstudio")) return "azure-devops";
  return "github";
}

function pick<T>(record: Record<string, unknown>, keys: string[], fallback: T): T | string {
  for (const k of keys) {
    const v = record[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return fallback;
}

function inferState(record: Record<string, unknown>): PullRequest["state"] {
  const status = String(record["event.status"] ?? "").toLowerCase();
  const outcome = String(record["event.outcome"] ?? record["pull_request.state"] ?? "").toLowerCase();
  if (outcome === "merged") return "merged";
  if (outcome === "closed") return "closed";
  if (status === "finished" || status === "completed") {
    return outcome === "merged" ? "merged" : outcome === "closed" ? "closed" : "open";
  }
  return "open";
}

function mapDqlRecordToPr(r: Record<string, unknown>, i: number): PullRequest {
  const url = String(
    pick(r, ["vcs.repository.url", "repository.url", "pull_request.repository.url"], ""),
  );
  const repoName = url
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
  const number = Number(
    pick(
      r,
      [
        "vcs.repository.change.id",
        "pull_request.number",
        "change.id",
        "pull_request.id",
      ],
      String(i + 1),
    ),
  );
  const title = String(
    pick(
      r,
      ["vcs.repository.change.title", "pull_request.title", "change.title", "title"],
      "(no title)",
    ),
  );
  const author = String(
    pick(
      r,
      [
        "vcs.repository.change.author",
        "pull_request.user.login",
        "pull_request.author",
        "change.author",
        "author",
      ],
      "unknown",
    ),
  );
  const additions = Number(
    pick(r, ["vcs.repository.change.additions", "pull_request.additions", "additions"], "0"),
  );
  const deletions = Number(
    pick(r, ["vcs.repository.change.deletions", "pull_request.deletions", "deletions"], "0"),
  );
  const ts = String(pick(r, ["timestamp"], new Date().toISOString()));

  return {
    id: String(pick(r, ["event.id", "change.id", "pull_request.id"], `grail-pr-${i}`)),
    number,
    title,
    repository: repoName || "unknown",
    provider: providerFromUrl(url),
    author,
    state: inferState(r),
    createdAt: ts,
    updatedAt: ts,
    additions,
    deletions,
  };
}

// Dedup: pega o evento mais recente por (repo + PR number). Isso porque o
// adapter gera vários eventos (started/finished) pra mesma PR e queremos só
// o estado atual.
function dedupLatestPerPR(prs: PullRequest[]): PullRequest[] {
  const map = new Map<string, PullRequest>();
  for (const pr of prs) {
    const key = `${pr.repository}#${pr.number}`;
    const existing = map.get(key);
    if (!existing || new Date(pr.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      map.set(key, pr);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

function buildQuery(fromIso: string, toIso: string): string {
  const repoFilter = REPO_WATCHLIST.map((r) => `vcs.repository.url contains "${r}"`).join(" or ");
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| filter event.type == "pull_request"
| filter ${repoFilter}
| sort timestamp desc
| limit 200`;
}

export function useSDLCPullRequests(): UseSDLCPullRequestsResult {
  const { fromIso, toIso } = useTimeRange();
  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;

  const query = isValidRange ? buildQuery(fromIso, toIso) : FALLBACK_QUERY;
  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = (data?.records ?? []) as Record<string, unknown>[];
    if (!isValidRange || error || records.length === 0) {
      return {
        data: mockPullRequests,
        isLoading,
        error: error as Error | undefined,
        source: "mock",
        rawCount: 0,
      };
    }
    const prs = dedupLatestPerPR(records.map((r, i) => mapDqlRecordToPr(r, i)));
    return {
      data: prs,
      isLoading,
      source: "grail",
      rawSample: records[0],
      rawCount: records.length,
    };
  }, [data, isLoading, error, isValidRange]);
}
