import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";
import { repoFilterDql } from "../config";

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
    pullRequestEvents: number;
    pushEvents: number;
    buildEvents: number;
    runEvents: number;
    distinctAuthors: number;
  };
  isLoading: boolean;
  error?: Error;
  rawCount: number;
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

function buildQuery(fromIso: string, toIso: string): string {
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| filter ${repoFilterDql()}
| sort timestamp desc
| limit 1000`;
}

export function useSDLCActivity(): ActivitySnapshot {
  const { fromIso, toIso } = useTimeRange();
  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;
  const query = isValidRange ? buildQuery(fromIso, toIso) : FALLBACK_QUERY;

  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = (data?.records ?? []) as Record<string, unknown>[];
    const byAuthor = new Map<string, Contributor>();
    const totals = {
      pullRequestEvents: 0,
      pushEvents: 0,
      buildEvents: 0,
      runEvents: 0,
      distinctAuthors: 0,
    };

    for (const r of records) {
      const type = String(r["event.type"] ?? "");
      const status = String(r["event.status"] ?? "").toLowerCase();
      const ts = String(r["timestamp"] ?? "");
      const author = authorOf(r);

      if (type === "pull_request") totals.pullRequestEvents++;
      else if (type === "push") totals.pushEvents++;
      else if (type === "build") totals.buildEvents++;
      else if (type === "run") totals.runEvents++;

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
      (a, b) =>
        b.prsOpened + b.commits + b.builds - (a.prsOpened + a.commits + a.builds),
    );
    totals.distinctAuthors = contributors.length;

    return {
      contributors,
      totals,
      isLoading,
      error: error as Error | undefined,
      rawCount: records.length,
      rawSample: records[0] as Record<string, unknown> | undefined,
      dqlQuery: query,
    };
  }, [data, isLoading, error, query]);
}
