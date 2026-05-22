import type { AppliedFilters } from "../state/FilterContext";
import { inferBranchStrategy } from "./branchStrategy";
import type {
  Build,
  Commit,
  Deploy,
  Developer,
  PullRequest,
  Repository,
} from "./types";

const inList = (list: string[] | undefined, v: string | undefined): boolean => {
  if (!list || list.length === 0) return true;
  if (!v) return false;
  return list.includes(v);
};

export function filterRepositories(repos: Repository[], f: AppliedFilters): Repository[] {
  return repos.filter((r) => {
    if (!inList(f.provider as string[] | undefined, r.provider)) return false;
    if (!inList(f.repository, r.fullName)) return false;
    if (!inList(f.application, r.application)) return false;
    if (f.strategy && f.strategy.length > 0 && !f.strategy.includes(inferBranchStrategy(r))) {
      return false;
    }
    return true;
  });
}

export function filterPullRequests(
  prs: PullRequest[],
  f: AppliedFilters,
  validRepoNames: Set<string>,
): PullRequest[] {
  return prs.filter((p) => {
    if (!validRepoNames.has(p.repository)) return false;
    if (!inList(f.provider as string[] | undefined, p.provider)) return false;
    if (!inList(f.repository, p.repository)) return false;
    if (!inList(f.author, p.author)) return false;
    return true;
  });
}

export function filterBuilds(
  builds: Build[],
  f: AppliedFilters,
  validRepoNames: Set<string>,
): Build[] {
  return builds.filter((b) => {
    if (!validRepoNames.has(b.repository)) return false;
    if (!inList(f.provider as string[] | undefined, b.provider)) return false;
    if (!inList(f.repository, b.repository)) return false;
    if (!inList(f.author, b.author)) return false;
    if (!inList(f.branch, b.branch)) return false;
    return true;
  });
}

export function filterDeploys(
  deploys: Deploy[],
  f: AppliedFilters,
  validRepoNames: Set<string>,
): Deploy[] {
  return deploys.filter((d) => {
    if (!validRepoNames.has(d.repository)) return false;
    if (!inList(f.provider as string[] | undefined, d.provider)) return false;
    if (!inList(f.repository, d.repository)) return false;
    if (!inList(f.environment, d.environment)) return false;
    return true;
  });
}

export function filterCommits(
  commits: Commit[],
  f: AppliedFilters,
  validRepoNames: Set<string>,
): Commit[] {
  return commits.filter((c) => {
    if (!validRepoNames.has(c.repository)) return false;
    if (!inList(f.provider as string[] | undefined, c.provider)) return false;
    if (!inList(f.repository, c.repository)) return false;
    if (!inList(f.author, c.author)) return false;
    return true;
  });
}

export function filterDevelopers(devs: Developer[], f: AppliedFilters): Developer[] {
  return devs.filter((d) => {
    if (!inList(f.provider as string[] | undefined, d.provider)) return false;
    if (!inList(f.author, d.name)) return false;
    return true;
  });
}
