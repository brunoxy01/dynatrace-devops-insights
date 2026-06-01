import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import type { PullRequest } from "../data/types";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";
import {
  authorName,
  branchName,
  eventProvider,
  inferState,
  prNumber,
  prTitle,
  prUrl,
  repoFullName,
} from "../data/sdlcFields";

interface UseSDLCPullRequestsResult {
  data: PullRequest[];
  isLoading: boolean;
  error?: Error;
  rawCount: number;
  matchedCount: number;
  dqlQuery: string;
}

function mapRecord(r: Record<string, unknown>, i: number): PullRequest {
  const numberStr = prNumber(r);
  const number = Number(numberStr) || 0;
  return {
    id: numberStr ? `pr-${repoFullName(r)}-${numberStr}` : `pr-${i}`,
    number,
    title: prTitle(r),
    repository: repoFullName(r) || "unknown",
    provider: eventProvider(r),
    author: authorName(r),
    branch: branchName(r),
    url: prUrl(r),
    state: inferState(r),
    createdAt: String(r["timestamp"] ?? new Date().toISOString()),
    updatedAt: String(r["timestamp"] ?? new Date().toISOString()),
    additions: 0,
    deletions: 0,
  };
}

// Vários eventos representam o mesmo PR/MR. Agrupa por número (preferido) ou
// branch. Mantém o mais recente.
function dedupLatestPerPR(prs: PullRequest[]): PullRequest[] {
  const map = new Map<string, PullRequest>();
  for (const pr of prs) {
    const key = pr.number > 0 ? `${pr.repository}#${pr.number}` : `${pr.repository}@${pr.branch}`;
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
  // pull_request = GitHub · merge_request = GitLab/Azure brutos ·
  // change = schema semântico (GitLab/Azure via adapter oficial)
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| filter event.type == "pull_request" or event.type == "merge_request" or event.type == "change"
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
    // Descarta eventos sem número nem branch (sem como identificar o PR).
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
