import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import type { Provider, PullRequest } from "../data/types";
import { useTimeRange } from "../state/TimeRangeContext";

interface UseSDLCPullRequestsResult {
  data: PullRequest[];
  isLoading: boolean;
  error?: Error;
  rawCount: number;
  rawSample?: Record<string, unknown>;
}

function providerFromUrl(url: string | undefined): Provider {
  if (!url) return "github";
  if (url.includes("gitlab")) return "gitlab";
  if (url.includes("dev.azure.com") || url.includes("visualstudio")) return "azure-devops";
  return "github";
}

function pick(record: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = record[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return fallback;
}

function inferState(record: Record<string, unknown>): PullRequest["state"] {
  const outcome = pick(
    record,
    ["pull_request.state", "event.outcome", "change.state", "state"],
    "",
  ).toLowerCase();
  if (outcome === "merged") return "merged";
  if (outcome === "closed") return "closed";
  return "open";
}

function mapDqlRecordToPr(r: Record<string, unknown>, i: number): PullRequest {
  const url = pick(r, [
    "vcs.repository.url",
    "pull_request.html_url",
    "pull_request.base.repo.html_url",
    "repository.html_url",
    "repository.url",
  ]);
  const repoFull = pick(r, [
    "repository.full_name",
    "pull_request.base.repo.full_name",
    "vcs.repository.name",
  ]);
  const repoName =
    repoFull ||
    url
      .replace(/^https?:\/\/[^/]+\//, "")
      .replace(/\/pull\/.*$/, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");
  const number =
    Number(
      pick(r, [
        "pull_request.number",
        "vcs.repository.change.id",
        "change.id",
        "number",
      ]),
    ) || i + 1;
  const title = pick(
    r,
    ["pull_request.title", "vcs.repository.change.title", "change.title", "title"],
    "(no title)",
  );
  const author = pick(
    r,
    [
      "pull_request.user.login",
      "vcs.repository.change.author",
      "sender.login",
      "change.author",
      "author",
      "user.login",
    ],
    "unknown",
  );
  const additions = Number(
    pick(r, ["pull_request.additions", "vcs.repository.change.additions", "additions"], "0"),
  );
  const deletions = Number(
    pick(r, ["pull_request.deletions", "vcs.repository.change.deletions", "deletions"], "0"),
  );
  const createdAt = pick(
    r,
    ["pull_request.created_at", "timestamp"],
    new Date().toISOString(),
  );
  const updatedAt = pick(r, ["pull_request.updated_at", "timestamp"], createdAt);

  return {
    id: pick(r, ["pull_request.id", "event.id", "change.id"], `grail-pr-${i}`),
    number,
    title,
    repository: repoName || "unknown",
    provider: providerFromUrl(url),
    author,
    state: inferState(r),
    createdAt,
    updatedAt,
    additions,
    deletions,
  };
}

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
  // Sem filtro de repo: o campo vcs.repository.url chega null no payload do
  // GitHub adapter, então não dá pra filtrar por aqui. Como a tenant tem
  // um único webhook conectado por enquanto, todos os pull_request events
  // são nossos. Quando conectar outros repos, filtramos no client.
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| filter event.type == "pull_request"
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
        data: [],
        isLoading,
        error: error as Error | undefined,
        rawCount: 0,
      };
    }
    const prs = dedupLatestPerPR(records.map((r, i) => mapDqlRecordToPr(r, i)));
    return {
      data: prs,
      isLoading,
      rawCount: records.length,
      rawSample: records[0],
    };
  }, [data, isLoading, error, isValidRange]);
}
