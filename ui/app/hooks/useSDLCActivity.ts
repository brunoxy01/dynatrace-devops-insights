import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";
import {
  authorName,
  branchName,
  isPrEvent,
  prDedupKey,
  prNumber,
  repoFullName,
} from "../data/sdlcFields";

export interface Contributor {
  name: string;
  prsOpen: number;
  lastActivity: string;
}

export interface ActivitySnapshot {
  contributors: Contributor[];
  totals: {
    openPrs: number;
    distinctAuthors: number;
  };
  isLoading: boolean;
  error?: Error;
  rawCount: number;
  matchedCount: number;
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

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
    const matched = records.filter((r) => matchesWatchlist(repoFullName(r)));

    const prByKey = new Map<string, { author: string; ts: string }>();
    const lastSeen = new Map<string, string>();

    for (const r of matched) {
      const ts = String(r["timestamp"] ?? "");
      const author = authorName(r);

      if (author) {
        const prev = lastSeen.get(author);
        if (!prev || (ts && ts > prev)) lastSeen.set(author, ts);
      }

      if (isPrEvent(r)) {
        const key = prDedupKey(repoFullName(r), prNumber(r), branchName(r));
        if (key) {
          const existing = prByKey.get(key);
          if (!existing || ts > existing.ts) prByKey.set(key, { author, ts });
        }
      }
    }

    const prsOpenByAuthor = new Map<string, number>();
    for (const { author } of prByKey.values()) {
      if (!author) continue;
      prsOpenByAuthor.set(author, (prsOpenByAuthor.get(author) ?? 0) + 1);
    }

    const names = new Set<string>([...prsOpenByAuthor.keys(), ...lastSeen.keys()]);
    const contributors: Contributor[] = Array.from(names)
      .map((name) => ({
        name,
        prsOpen: prsOpenByAuthor.get(name) ?? 0,
        lastActivity: lastSeen.get(name) ?? "",
      }))
      .sort((a, b) => b.prsOpen - a.prsOpen);

    return {
      contributors,
      totals: {
        openPrs: prByKey.size,
        distinctAuthors: contributors.length,
      },
      isLoading,
      error: error as Error | undefined,
      rawCount: records.length,
      matchedCount: matched.length,
    };
  }, [data, isLoading, error]);
}
