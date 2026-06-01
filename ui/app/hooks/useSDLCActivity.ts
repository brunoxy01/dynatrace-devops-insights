import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";
import type { Provider } from "../data/types";
import {
  authorName,
  branchName,
  eventProvider,
  isPrEvent,
  prDedupKey,
  prNumber,
  repoFullName,
} from "../data/sdlcFields";

export interface Contributor {
  name: string;
  provider: Provider;
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

// Contribuidor é identificado por provider + nome: brunoxy01 no GitHub e
// brunoxy01 no GitLab são contas distintas em plataformas distintas.
const contribKey = (provider: Provider, name: string): string => `${provider}|${name}`;

export function useSDLCActivity(): ActivitySnapshot {
  const { fromIso, toIso } = useTimeRange();
  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;
  const query = isValidRange ? buildQuery(fromIso, toIso) : FALLBACK_QUERY;
  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = (data?.records ?? []) as Record<string, unknown>[];
    const matched = records.filter((r) => matchesWatchlist(repoFullName(r)));

    const contribByKey = new Map<string, Contributor>();
    const prByKey = new Map<string, { authorKey: string; ts: string }>();

    for (const r of matched) {
      const ts = String(r["timestamp"] ?? "");
      const provider = eventProvider(r);
      const author = authorName(r);

      if (author) {
        const k = contribKey(provider, author);
        const c =
          contribByKey.get(k) ?? ({ name: author, provider, prsOpen: 0, lastActivity: "" } as Contributor);
        if (ts && ts > c.lastActivity) c.lastActivity = ts;
        contribByKey.set(k, c);
      }

      if (isPrEvent(r)) {
        const dk = prDedupKey(repoFullName(r), prNumber(r), branchName(r));
        if (dk) {
          const existing = prByKey.get(dk);
          if (!existing || ts > existing.ts) {
            prByKey.set(dk, { authorKey: author ? contribKey(provider, author) : "", ts });
          }
        }
      }
    }

    // Atribui PRs abertos ao contribuidor correspondente
    for (const { authorKey } of prByKey.values()) {
      if (!authorKey) continue;
      const c = contribByKey.get(authorKey);
      if (c) c.prsOpen += 1;
    }

    const contributors = Array.from(contribByKey.values()).sort(
      (a, b) => b.prsOpen - a.prsOpen || a.name.localeCompare(b.name),
    );

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
