import type { BranchStrategy, Repository } from "./types";

const GITFLOW_MARKERS = ["develop", "release/", "hotfix/", "support/"];
const TRUNK_PROTECTED = ["main", "master", "trunk"];

export function inferBranchStrategy(repo: Repository): BranchStrategy {
  if (repo.strategyOverride) return repo.strategyOverride;

  const names = repo.branches.map((b) => b.toLowerCase());
  const hasGitflow = names.some((n) => GITFLOW_MARKERS.some((m) => n === m || n.startsWith(m)));
  const trunkOnly =
    names.every((n) => TRUNK_PROTECTED.includes(n) || /^(feature|fix|chore|refactor)\//.test(n)) &&
    names.length <= 8 &&
    repo.openBranches <= 10;

  if (hasGitflow) return "gitflow";
  if (trunkOnly) return "trunk-based";
  return "none";
}

export function strategyDistribution(repos: Repository[]): Record<BranchStrategy, number> {
  return repos.reduce(
    (acc, r) => {
      const s = inferBranchStrategy(r);
      acc[s] += 1;
      return acc;
    },
    { gitflow: 0, "trunk-based": 0, none: 0 } as Record<BranchStrategy, number>,
  );
}
