import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import type { Provider, PullRequest } from "../data/types";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";

interface UseSDLCPullRequestsResult {
  data: PullRequest[];
  isLoading: boolean;
  error?: Error;
  rawCount: number;
  matchedCount: number;
  rawSample?: Record<string, unknown>;
  dqlQuery: string;
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
    ["pull_request.state", "payload.pull_request.state", "event.outcome", "change.state", "state"],
    "",
  ).toLowerCase();
  if (outcome === "merged") return "merged";
  if (outcome === "closed") return "closed";
  return "open";
}

function mapDqlRecordToPr(r: Record<string, unknown>, i: number): PullRequest {
  const repoFull = pick(r, [
    "repository.full_name",
    "pull_request.base.repo.full_name",
    "payload.repository.full_name",
    "payload.pull_request.base.repo.full_name",
    "vcs.repository.name",
  ]);
  const url = pick(r, [
    "pull_request.html_url",
    "payload.pull_request.html_url",
    "vcs.repository.url",
    "repository.html_url",
  ]);
  const number =
    Number(
      pick(r, [
        "pull_request.number",
        "payload.pull_request.number",
        "vcs.repository.change.id",
        "change.id",
        "number",
      ]),
    ) || i + 1;
  const title = pick(
    r,
    [
      "pull_request.title",
      "payload.pull_request.title",
      "vcs.repository.change.title",
      "change.title",
      "title",
    ],
    "(no title)",
  );
  const author = pick(
    r,
    [
      "pull_request.user.login",
      "payload.pull_request.user.login",
      "vcs.repository.change.author",
      "sender.login",
      "payload.sender.login",
      "change.author",
      "actor.login",
      "user.login",
      "author",
    ],
    "unknown",
  );
  const branch = pick(
    r,
    [
      "pull_request.head.ref",
      "payload.pull_request.head.ref",
      "vcs.repository.ref.name",
      "head_branch",
      "branch",
      "ref",
    ],
    "—",
  );
  const additions = Number(
    pick(
      r,
      ["pull_request.additions", "payload.pull_request.additions", "additions"],
      "0",
    ),
  );
  const deletions = Number(
    pick(
      r,
      ["pull_request.deletions", "payload.pull_request.deletions", "deletions"],
      "0",
    ),
  );
  const createdAt = pick(
    r,
    ["pull_request.created_at", "payload.pull_request.created_at", "timestamp"],
    new Date().toISOString(),
  );
  const updatedAt = pick(
    r,
    ["pull_request.updated_at", "payload.pull_request.updated_at", "timestamp"],
    createdAt,
  );

  return {
    id: pick(
      r,
      ["pull_request.id", "payload.pull_request.id", "event.id", "change.id"],
      `grail-pr-${i}`,
    ),
    number,
    title,
    repository: repoFull || "unknown",
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

function dedupLatestPerPR(prs: PullRequest[]): PullRequest[] {
  const map = new Map<string, PullRequest>();
  const hasRealNumbers = prs.some(
    (p, i) => p.number !== i + 1 && p.number !== 0 && !Number.isNaN(p.number),
  );
  for (const pr of prs) {
    const key = hasRealNumbers ? `${pr.repository}#${pr.number}` : pr.repository;
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
  // Sem filtro de repo no DQL: a key `repository.full_name` no payload
  // tem ponto literal no nome e DQL trata como nested access (= 0 records).
  // Filtramos no JS depois do mapping.
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| filter event.type == "pull_request"
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
    const allMapped = records.map((r, i) => mapDqlRecordToPr(r, i));
    const matched = allMapped.filter((p) => matchesWatchlist(p.repository));
    const prs = dedupLatestPerPR(matched);
    return {
      data: prs,
      isLoading,
      rawCount: records.length,
      matchedCount: matched.length,
      rawSample: records[0],
      dqlQuery: query,
    };
  }, [data, isLoading, error, isValidRange, query]);
}
