import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";
import { resolveString } from "../data/eventFields";

export interface Contributor {
  name: string;
  prsOpened: number;
  prsMerged: number;
  commits: number;
  builds: number;
  lastActivity: string;
}

export interface ActivitySnapshot {
  contributors: Contributor[];
  totals: {
    pushEvents: number;
    buildEvents: number;
    distinctAuthors: number;
  };
  isLoading: boolean;
  error?: Error;
  rawCount: number;
  matchedCount: number;
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

function repoOf(r: Record<string, unknown>): string {
  return resolveString(r, [
    "repository.full_name",
    "pull_request.base.repo.full_name",
    "project.path_with_namespace",
  ]);
}

function authorOf(r: Record<string, unknown>): string {
  return resolveString(r, [
    "pull_request.user.login",
    "sender.login",
    "head_commit.author.username",
    "head_commit.author.name",
    "pusher.name",
    "user.login",
    "user.username",
  ]);
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
    const totals = { pushEvents: 0, buildEvents: 0, distinctAuthors: 0 };

    for (const r of matched) {
      const type = String(r["event.type"] ?? "");
      const status = String(r["event.status"] ?? "").toLowerCase();
      const ts = String(r["timestamp"] ?? "");
      const author = authorOf(r);

      if (type === "push") totals.pushEvents++;
      else if (type === "build") totals.buildEvents++;

      if (!author) continue;
      const c =
        byAuthor.get(author) ??
        ({ name: author, prsOpened: 0, prsMerged: 0, commits: 0, builds: 0, lastActivity: ts } as Contributor);

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
      totals,
      isLoading,
      error: error as Error | undefined,
      rawCount: records.length,
      matchedCount: matched.length,
    };
  }, [data, isLoading, error]);
}
