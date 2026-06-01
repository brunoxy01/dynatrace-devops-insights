import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";
import { matchesWatchlist } from "../config";
import { resolveString, resolveField } from "../data/eventFields";

export interface Contributor {
  name: string;
  prsOpen: number;
  commits: number;
  lastActivity: string;
}

export interface ActivitySnapshot {
  contributors: Contributor[];
  totals: {
    commits: number;
    openPrs: number;
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

    // --- PRs únicos: agrupa eventos pull_request por repositório (sem número
    // confiável, assumimos 1 PR aberto por repo). Pega o autor do evento mais
    // recente de cada grupo. NÃO conta started/finished como PRs separados. ---
    const prByRepo = new Map<string, { author: string; ts: string }>();

    // --- Commits: SHAs únicos coletados dos arrays `commits` dos pushes.
    // Atribui cada commit ao seu próprio autor. ---
    const commitShas = new Set<string>();
    const commitsByAuthor = new Map<string, Set<string>>();

    const lastSeen = new Map<string, string>();

    const touchAuthor = (name: string, ts: string): void => {
      if (!name) return;
      const prev = lastSeen.get(name);
      if (!prev || (ts && ts > prev)) lastSeen.set(name, ts);
    };

    for (const r of matched) {
      const type = String(r["event.type"] ?? "");
      const ts = String(r["timestamp"] ?? "");
      const evAuthor = authorOf(r);
      touchAuthor(evAuthor, ts);

      if (type === "pull_request") {
        const repo = repoOf(r);
        const existing = prByRepo.get(repo);
        if (!existing || ts > existing.ts) prByRepo.set(repo, { author: evAuthor, ts });
      }

      if (type === "push") {
        const commits = resolveField(r, "commits");
        if (Array.isArray(commits)) {
          for (const c of commits) {
            const co = c as Record<string, unknown> | null;
            const sha = co ? String(co.id ?? co.sha ?? "") : "";
            if (!sha || commitShas.has(sha)) continue;
            commitShas.add(sha);
            const ca =
              (co &&
                (resolveString(co, ["author.username", "author.name"]) ||
                  String(co.author ?? ""))) ||
              evAuthor;
            if (ca) {
              const set = commitsByAuthor.get(ca) ?? new Set<string>();
              set.add(sha);
              commitsByAuthor.set(ca, set);
            }
          }
        }
      }
    }

    // PRs abertos por autor
    const prsOpenByAuthor = new Map<string, number>();
    for (const { author } of prByRepo.values()) {
      if (!author) continue;
      prsOpenByAuthor.set(author, (prsOpenByAuthor.get(author) ?? 0) + 1);
    }

    const names = new Set<string>([
      ...prsOpenByAuthor.keys(),
      ...commitsByAuthor.keys(),
    ]);

    const contributors: Contributor[] = Array.from(names)
      .map((name) => ({
        name,
        prsOpen: prsOpenByAuthor.get(name) ?? 0,
        commits: commitsByAuthor.get(name)?.size ?? 0,
        lastActivity: lastSeen.get(name) ?? "",
      }))
      .sort((a, b) => b.commits + b.prsOpen - (a.commits + a.prsOpen));

    return {
      contributors,
      totals: {
        commits: commitShas.size,
        openPrs: prByRepo.size,
        distinctAuthors: contributors.length,
      },
      isLoading,
      error: error as Error | undefined,
      rawCount: records.length,
      matchedCount: matched.length,
    };
  }, [data, isLoading, error]);
}
