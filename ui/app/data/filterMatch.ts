import type { AppliedFilters } from "../state/FilterContext";
import type { Contributor } from "../hooks/useSDLCActivity";
import type { PullRequest } from "./types";

// Lógica de filtro centralizada. Usada por Overview, PRs e Contribuidores —
// manter em um só lugar evita a página X aplicar `author` mas esquecer
// `provider` (como aconteceu antes: cada página reimplementava o filtro à
// mão e cada uma cobria um subconjunto diferente dos campos).
export function matchesPrFilters(pr: PullRequest, applied: AppliedFilters): boolean {
  if (applied.provider?.length && !applied.provider.includes(pr.provider)) return false;
  if (applied.author?.length && !applied.author.includes(pr.author)) return false;
  if (applied.branch?.length && !applied.branch.includes(pr.branch)) return false;
  if (applied.repository?.length && !applied.repository.includes(pr.repository)) return false;
  return true;
}

export function matchesContributorFilters(c: Contributor, applied: AppliedFilters): boolean {
  if (applied.provider?.length && !applied.provider.includes(c.provider)) return false;
  if (applied.author?.length && !applied.author.includes(c.name)) return false;
  return true;
}
