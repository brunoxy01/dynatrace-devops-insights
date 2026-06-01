import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { pullRequests as mockPullRequests } from "../data/mockData";
import type { Provider, PullRequest } from "../data/types";
import { useTimeRange } from "../state/TimeRangeContext";

interface UseSDLCPullRequestsResult {
  data: PullRequest[];
  isLoading: boolean;
  error?: Error;
  source: "grail" | "mock";
}

function providerFromUrl(url: string | undefined): Provider {
  if (!url) return "github";
  if (url.includes("gitlab")) return "gitlab";
  if (url.includes("dev.azure.com") || url.includes("visualstudio")) return "azure-devops";
  return "github";
}

function mapDqlRecordToPr(r: Record<string, unknown>, i: number): PullRequest {
  const url = String(r["vcs.repository.url"] ?? "");
  const repoName = url.replace(/^https?:\/\/[^/]+\//, "").replace(/\.git$/, "");
  const state = String(r["vcs.repository.change.state"] ?? "open").toLowerCase();
  const number = Number(r["vcs.repository.change.id"] ?? r["change.number"] ?? i + 1);
  return {
    id: String(r["event.id"] ?? r["change.id"] ?? `grail-pr-${i}`),
    number,
    title: String(r["vcs.repository.change.title"] ?? "(no title)"),
    repository: repoName || "unknown",
    provider: providerFromUrl(url),
    author: String(r["vcs.repository.change.author"] ?? "unknown"),
    state: state === "merged" ? "merged" : state === "closed" ? "closed" : "open",
    createdAt: String(r["timestamp"] ?? new Date().toISOString()),
    updatedAt: String(r["timestamp"] ?? new Date().toISOString()),
    additions: Number(r["vcs.repository.change.additions"] ?? 0),
    deletions: Number(r["vcs.repository.change.deletions"] ?? 0),
  };
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

export function useSDLCPullRequests(): UseSDLCPullRequestsResult {
  const { fromIso, toIso } = useTimeRange();
  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;

  const query = isValidRange
    ? `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| filter event.type == "change"
| sort timestamp desc
| limit 200`
    : FALLBACK_QUERY;

  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = data?.records ?? [];
    if (!isValidRange || error || records.length === 0) {
      return { data: mockPullRequests, isLoading, error: error as Error | undefined, source: "mock" };
    }
    return {
      data: records.map((r, i) => mapDqlRecordToPr(r as Record<string, unknown>, i)),
      isLoading,
      source: "grail",
    };
  }, [data, isLoading, error, isValidRange]);
}
