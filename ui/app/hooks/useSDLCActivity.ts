import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";

export interface Contributor {
  name: string;
  prsOpened: number;
  prsMerged: number;
  commits: number;
  builds: number;
  lastActivity: string;
}

export interface ActivityEvent {
  timestamp: string;
  type: string;
  status: string;
  author: string;
  repository: string;
  branch: string;
}

export interface ActivitySnapshot {
  contributors: Contributor[];
  recent: ActivityEvent[];
  totals: {
    pullRequestEvents: number;
    pushEvents: number;
    buildEvents: number;
    runEvents: number;
    distinctAuthors: number;
  };
  byType: Record<string, number>;
  isLoading: boolean;
  error?: Error;
  rawCount: number;
  matchedCount: number;
  rawSample?: Record<string, unknown>;
  dqlQuery: string;
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

function pick(record: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = record[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return fallback;
}

function authorOf(record: Record<string, unknown>): string {
  return pick(
    record,
    [
      "pull_request.user.login",
      "payload.pull_request.user.login",
      "sender.login",
      "payload.sender.login",
      "vcs.repository.change.author",
      "head_commit.author.username",
      "head_commit.author.name",
      "payload.head_commit.author.username",
      "payload.head_commit.author.name",
      "pusher.name",
      "payload.pusher.name",
      "actor.login",
      "user.login",
      "author",
    ],
    "",
  );
}

function repoOf(record: Record<string, unknown>): string {
  return pick(record, [
    "repository.full_name",
    "pull_request.base.repo.full_name",
    "payload.repository.full_name",
    "payload.pull_request.base.repo.full_name",
    "vcs.repository.name",
  ]);
}

function branchOf(record: Record<string, unknown>): string {
  return pick(
    record,
    [
      "pull_request.head.ref",
      "payload.pull_request.head.ref",
      "head_branch",
      "ref",
      "vcs.repository.ref.name",
    ],
    "—",
  );
}

function buildQuery(fromIso: string, toIso: string): string {
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| sort timestamp desc
| limit 2000`;
}

export function useSDLCActivity(): ActivitySnapshot {
  const { fromIso, toIso } = useTimeRange();
  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;
  const query = isValidRange ? buildQuery(fromIso, toIso) : FALLBACK_QUERY;

  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = (data?.records ?? []) as Record<string, unknown>[];
    const matched = records.filter((r) => matchesWatchlist(repoOf(r)));
    const byAuthor = new Map<string, Contributor>();
    const totals = {
      pullRequestEvents: 0,
      pushEvents: 0,
      buildEvents: 0,
      runEvents: 0,
      distinctAuthors: 0,
    };
    const byType: Record<string, number> = {};
    const recent: ActivityEvent[] = [];

    for (const r of matched) {
      const type = String(r["event.type"] ?? "");
      const status = String(r["event.status"] ?? "").toLowerCase();
      const ts = String(r["timestamp"] ?? "");
      const author = authorOf(r);
      const repo = repoOf(r);
      const branch = branchOf(r);

      byType[type] = (byType[type] ?? 0) + 1;

      if (type === "pull_request") totals.pullRequestEvents++;
      else if (type === "push") totals.pushEvents++;
      else if (type === "build") totals.buildEvents++;
      else if (type === "run") totals.runEvents++;

      if (recent.length < 30) {
        recent.push({
          timestamp: ts,
          type,
          status,
          author: author || "unknown",
          repository: repo || "—",
          branch,
        });
      }

      if (!author) continue;
      const c =
        byAuthor.get(author) ??
        ({
          name: author,
          prsOpened: 0,
          prsMerged: 0,
          commits: 0,
          builds: 0,
          lastActivity: ts,
        } as Contributor);

      if (type === "pull_request" && status === "started") c.prsOpened++;
      if (type === "pull_request" && status === "finished") c.prsMerged++;
      if (type === "push") c.commits++;
      if (type === "build") c.builds++;

      if (ts && (!c.lastActivity || ts > c.lastActivity)) c.lastActivity = ts;
      byAuthor.set(author, c);
    }

    const contributors = Array.from(byAuthor.values()).sort(
      (a, b) => b.prsOpened + b.commits + b.builds - (a.prsOpened + a.commits + a.builds),
    );
    totals.distinctAuthors = contributors.length;

    return {
      contributors,
      recent,
      totals,
      byType,
      isLoading,
      error: error as Error | undefined,
      rawCount: records.length,
      matchedCount: matched.length,
      rawSample: matched[0] as Record<string, unknown> | undefined,
      dqlQuery: query,
    };
  }, [data, isLoading, error, query]);
}
