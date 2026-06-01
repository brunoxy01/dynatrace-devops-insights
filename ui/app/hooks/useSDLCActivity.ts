import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";
import { resolveString, resolveField } from "../data/eventFields";

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
    commits: number;
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

// Número de commits dentro de um evento push. O payload do GitHub traz o
// array `commits`; somamos seu tamanho. Fallbacks: size/distinct_size, e
// por fim 1 (o push trouxe ao menos 1 commit).
function commitCountOf(r: Record<string, unknown>): number {
  const commits = resolveField(r, "commits");
  if (Array.isArray(commits)) return commits.length || 1;
  const size = Number(resolveString(r, ["size", "distinct_size"], ""));
  if (Number.isFinite(size) && size > 0) return size;
  return 1;
}

// Identificador único do push pra não contar o mesmo push duas vezes
// (o adapter emite started + finished pra cada push).
function pushKeyOf(r: Record<string, unknown>): string {
  return resolveString(r, ["after", "head_commit.id", "checkout_sha", "timestamp"], "");
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
    const totals = { commits: 0, pushEvents: 0, buildEvents: 0, distinctAuthors: 0 };
    const seenPush = new Set<string>();

    const getContributor = (name: string): Contributor => {
      const c =
        byAuthor.get(name) ??
        ({ name, prsOpened: 0, prsMerged: 0, commits: 0, builds: 0, lastActivity: "" } as Contributor);
      byAuthor.set(name, c);
      return c;
    };

    for (const r of matched) {
      const type = String(r["event.type"] ?? "");
      const status = String(r["event.status"] ?? "").toLowerCase();
      const ts = String(r["timestamp"] ?? "");
      const author = authorOf(r);

      if (type === "build") totals.buildEvents++;

      // Commits: conta o array de commits por push único
      if (type === "push") {
        totals.pushEvents++;
        const key = pushKeyOf(r);
        if (key && !seenPush.has(key)) {
          seenPush.add(key);
          const n = commitCountOf(r);
          totals.commits += n;
          if (author) getContributor(author).commits += n;
        }
      }

      if (!author) continue;
      const c = getContributor(author);
      if (type === "pull_request" && status === "started") c.prsOpened++;
      if (type === "pull_request" && status === "finished") c.prsMerged++;
      if (type === "build") c.builds++;
      if (ts && (!c.lastActivity || ts > c.lastActivity)) c.lastActivity = ts;
    }

    const contributors = Array.from(byAuthor.values()).sort(
      (a, b) => b.commits + b.prsOpened - (a.commits + a.prsOpened),
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
