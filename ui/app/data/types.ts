export type Provider = "github" | "gitlab" | "azure-devops";

export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "github", label: "GitHub" },
  { id: "gitlab", label: "GitLab" },
  { id: "azure-devops", label: "Azure DevOps" },
];

export type BranchStrategy = "gitflow" | "trunk-based" | "none";

export const BRANCH_STRATEGIES: { id: BranchStrategy; label: string; color: string }[] = [
  { id: "gitflow", label: "Gitflow", color: "primary" },
  { id: "trunk-based", label: "Trunk-based", color: "success" },
  { id: "none", label: "Sem estratégia", color: "warning" },
];

export interface Developer {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: Provider;
  commitsLast30d: number;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  linesAdded: number;
  linesRemoved: number;
  avgLeadTimeHours: number;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  provider: Provider;
  url: string;
  application: string;
  openBranches: number;
  openPullRequests: number;
  defaultBranch: string;
  branches: string[];
  lastActivityAt: string;
  isArchived: boolean;
  linkedServiceId?: string;
  strategyOverride?: BranchStrategy;
}

export interface Release {
  id: string;
  application: string;
  environment: "dev" | "staging" | "production";
  version: string;
  buildId: string;
  deployedAt: string;
  finishedAt: string;
  status: "success" | "failure";
  errorRate: number;
  responseTimeMs: number;
  throughput: number;
  davisProblems: number;
  prsIncluded: number;
  commitsIncluded: number;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  repository: string;
  provider: Provider;
  author: string;
  state: "open" | "merged" | "closed";
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
}

export interface Commit {
  sha: string;
  repository: string;
  provider: Provider;
  author: string;
  message: string;
  timestamp: string;
  additions: number;
  deletions: number;
}

export interface Build {
  id: string;
  pipelineId: string;
  repository: string;
  provider: Provider;
  branch: string;
  commitSha: string;
  author: string;
  status: "success" | "failure" | "running" | "cancelled";
  durationSec: number;
  startedAt: string;
  finishedAt?: string;
}

export interface Deploy {
  id: string;
  repository: string;
  provider: Provider;
  environment: "dev" | "staging" | "production";
  status: "success" | "failure" | "in-progress";
  version: string;
  startedAt: string;
  finishedAt?: string;
  linkedServiceId?: string;
}

export interface TimeRange {
  from: string;
  to: string;
  label: string;
}
