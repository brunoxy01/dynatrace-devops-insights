export type Provider = "github" | "gitlab" | "azure-devops";

export const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "github", label: "GitHub" },
  { id: "gitlab", label: "GitLab" },
  { id: "azure-devops", label: "Azure DevOps" },
];

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  repository: string;
  provider: Provider;
  author: string;
  branch: string;
  url: string;
  state: "open" | "merged" | "closed";
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
}

export interface Release {
  id: string;
  tagName: string;
  name: string;
  repository: string;
  provider: Provider;
  author: string;
  url: string;
  publishedAt: string;
  prerelease: boolean;
}

export interface TimeRange {
  from: string;
  to: string;
  label: string;
}
