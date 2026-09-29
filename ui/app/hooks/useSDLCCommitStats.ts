import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";
import { useFilters } from "../state/FilterContext";
import { repoContainsFilterDql } from "../config";
import { resolveField, resolveString } from "../data/eventFields";
import { repoFullName } from "../data/sdlcFields";

export interface RepoCommitStats {
  repository: string;
  commits: number;
}

interface UseSDLCCommitStatsResult {
  byRepo: RepoCommitStats[];
  totalCommits: number;
  isLoading: boolean;
  error?: Error;
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

// APROXIMADO — o array `commits` de um evento push tem limite de 20 itens
// (limitação do próprio payload de webhook do GitHub/GitLab), então pushes
// grandes são sub-contados. Também só conta o que foi ingerido depois do
// webhook estar configurado — commits anteriores não aparecem. Escolha
// consciente feita com o usuário: prefere ver uma estimativa a não ver nada.
function buildQuery(fromIso: string, toIso: string, repoFilter: string): string {
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
${repoFilter ? `| filter ${repoFilter}\n` : ""}| filter event.type == "push" or action == "push"
| sort timestamp desc
| limit 1000`;
}

export function useSDLCCommitStats(): UseSDLCCommitStatsResult {
  const { fromIso, toIso } = useTimeRange();
  const { applied } = useFilters();
  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;
  const repoFilter = repoContainsFilterDql(applied.repository);
  const query = isValidRange ? buildQuery(fromIso, toIso, repoFilter) : FALLBACK_QUERY;
  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = (data?.records ?? []) as Record<string, unknown>[];

    const seenShas = new Set<string>();
    const countByRepo = new Map<string, number>();

    for (const r of records) {
      const repo = repoFullName(r);
      if (!repo) continue;

      const commitsArr = resolveField(r, "commits");
      if (Array.isArray(commitsArr) && commitsArr.length > 0) {
        for (const c of commitsArr) {
          const co = c as Record<string, unknown> | null;
          const sha = co ? String(co.id ?? co.sha ?? "") : "";
          if (!sha || seenShas.has(sha)) continue;
          seenShas.add(sha);
          countByRepo.set(repo, (countByRepo.get(repo) ?? 0) + 1);
        }
      } else {
        // Push sem array `commits` serializado: conta ao menos o head commit.
        const sha = resolveString(r, ["head_commit.id", "after", "checkout_sha"]);
        if (sha && !seenShas.has(sha)) {
          seenShas.add(sha);
          countByRepo.set(repo, (countByRepo.get(repo) ?? 0) + 1);
        }
      }
    }

    const byRepo = Array.from(countByRepo.entries())
      .map(([repository, commits]) => ({ repository, commits }))
      .sort((a, b) => b.commits - a.commits);

    return {
      byRepo,
      totalCommits: byRepo.reduce((a, r) => a + r.commits, 0),
      isLoading,
      error: error as Error | undefined,
    };
  }, [data, isLoading, error]);
}
