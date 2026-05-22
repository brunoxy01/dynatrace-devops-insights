import type {
  Build,
  Commit,
  Deploy,
  Developer,
  Provider,
  PullRequest,
  Release,
  Repository,
} from "./types";

export const developers: Developer[] = [
  {
    id: "dev-1",
    name: "Bruno Silva",
    email: "bruno.silva@example.com",
    provider: "github",
    commitsLast30d: 142,
    pullRequestsOpened: 23,
    pullRequestsMerged: 19,
    linesAdded: 8420,
    linesRemoved: 3150,
    avgLeadTimeHours: 14,
  },
  {
    id: "dev-2",
    name: "Ana Costa",
    email: "ana.costa@example.com",
    provider: "github",
    commitsLast30d: 98,
    pullRequestsOpened: 17,
    pullRequestsMerged: 16,
    linesAdded: 5210,
    linesRemoved: 1980,
    avgLeadTimeHours: 9,
  },
  {
    id: "dev-3",
    name: "Carlos Mendes",
    email: "carlos.mendes@example.com",
    provider: "gitlab",
    commitsLast30d: 73,
    pullRequestsOpened: 11,
    pullRequestsMerged: 10,
    linesAdded: 3420,
    linesRemoved: 1240,
    avgLeadTimeHours: 22,
  },
  {
    id: "dev-4",
    name: "Mariana Lopes",
    email: "mariana.lopes@example.com",
    provider: "gitlab",
    commitsLast30d: 61,
    pullRequestsOpened: 9,
    pullRequestsMerged: 8,
    linesAdded: 2840,
    linesRemoved: 920,
    avgLeadTimeHours: 18,
  },
  {
    id: "dev-5",
    name: "Pedro Almeida",
    email: "pedro.almeida@example.com",
    provider: "azure-devops",
    commitsLast30d: 55,
    pullRequestsOpened: 8,
    pullRequestsMerged: 7,
    linesAdded: 2100,
    linesRemoved: 780,
    avgLeadTimeHours: 26,
  },
  {
    id: "dev-6",
    name: "Juliana Rocha",
    email: "juliana.rocha@example.com",
    provider: "azure-devops",
    commitsLast30d: 47,
    pullRequestsOpened: 6,
    pullRequestsMerged: 6,
    linesAdded: 1840,
    linesRemoved: 620,
    avgLeadTimeHours: 12,
  },
  {
    id: "dev-7",
    name: "Rafael Souza",
    email: "rafael.souza@example.com",
    provider: "github",
    commitsLast30d: 34,
    pullRequestsOpened: 5,
    pullRequestsMerged: 4,
    linesAdded: 1280,
    linesRemoved: 410,
    avgLeadTimeHours: 30,
  },
];

export const repositories: Repository[] = [
  {
    id: "repo-1",
    name: "payments-api",
    fullName: "Dynatrace/payments-api",
    provider: "github",
    url: "https://github.com/Dynatrace/payments-api",
    application: "payments-api",
    openBranches: 12,
    openPullRequests: 5,
    defaultBranch: "main",
    branches: [
      "main",
      "develop",
      "release/2026.05",
      "hotfix/timeout",
      "feature/idempotency-keys",
      "feature/3ds",
    ],
    lastActivityAt: "2026-05-21T14:30:00Z",
    isArchived: false,
    linkedServiceId: "SERVICE-PAYMENTS-API",
  },
  {
    id: "repo-2",
    name: "checkout-ui",
    fullName: "Dynatrace/checkout-ui",
    provider: "github",
    url: "https://github.com/Dynatrace/checkout-ui",
    application: "checkout-ui",
    openBranches: 8,
    openPullRequests: 3,
    defaultBranch: "main",
    branches: ["main", "feature/empty-cart", "fix/safari-render", "chore/deps"],
    lastActivityAt: "2026-05-22T09:10:00Z",
    isArchived: false,
    linkedServiceId: "SERVICE-CHECKOUT-UI",
  },
  {
    id: "repo-3",
    name: "data-pipeline",
    fullName: "Dynatrace/data-pipeline",
    provider: "gitlab",
    url: "https://github.com/Dynatrace/data-pipeline",
    application: "data-pipeline",
    openBranches: 15,
    openPullRequests: 7,
    defaultBranch: "main",
    branches: [
      "main",
      "develop",
      "release/airflow-2.9",
      "feature/dbt-tests",
      "feature/incremental",
    ],
    lastActivityAt: "2026-05-22T11:45:00Z",
    isArchived: false,
    linkedServiceId: "SERVICE-DATA-PIPELINE",
  },
  {
    id: "repo-4",
    name: "billing-service",
    fullName: "Dynatrace/billing-service",
    provider: "gitlab",
    url: "https://github.com/Dynatrace/billing-service",
    application: "billing-service",
    openBranches: 6,
    openPullRequests: 2,
    defaultBranch: "master",
    branches: ["master", "feature/retry", "fix/timezone"],
    lastActivityAt: "2026-05-20T16:00:00Z",
    isArchived: false,
    linkedServiceId: "SERVICE-BILLING",
  },
  {
    id: "repo-5",
    name: "internal-portal",
    fullName: "Dynatrace/internal-portal",
    provider: "azure-devops",
    url: "https://github.com/Dynatrace/internal-portal",
    application: "internal-portal",
    openBranches: 9,
    openPullRequests: 4,
    defaultBranch: "main",
    branches: [
      "main",
      "develop",
      "release/q2",
      "hotfix/ldap",
      "feature/user-split",
    ],
    lastActivityAt: "2026-05-21T18:20:00Z",
    isArchived: false,
  },
  {
    id: "repo-6",
    name: "legacy-erp",
    fullName: "Dynatrace/legacy-erp",
    provider: "azure-devops",
    url: "https://github.com/Dynatrace/legacy-erp",
    application: "legacy-erp",
    openBranches: 3,
    openPullRequests: 1,
    defaultBranch: "develop",
    branches: ["develop", "feature/sync-fix"],
    lastActivityAt: "2026-05-15T10:00:00Z",
    isArchived: true,
  },
];

export const pullRequests: PullRequest[] = [
  {
    id: "pr-1",
    number: 423,
    title: "feat(payments): add idempotency keys",
    repository: "Dynatrace/payments-api",
    provider: "github",
    author: "Bruno Silva",
    state: "open",
    createdAt: "2026-05-21T08:00:00Z",
    updatedAt: "2026-05-22T07:00:00Z",
    additions: 320,
    deletions: 45,
  },
  {
    id: "pr-2",
    number: 187,
    title: "fix(checkout): handle empty cart",
    repository: "Dynatrace/checkout-ui",
    provider: "github",
    author: "Ana Costa",
    state: "open",
    createdAt: "2026-05-22T06:30:00Z",
    updatedAt: "2026-05-22T08:15:00Z",
    additions: 78,
    deletions: 12,
  },
  {
    id: "pr-3",
    number: 95,
    title: "chore(pipeline): bump airflow to 2.9",
    repository: "Dynatrace/data-pipeline",
    provider: "gitlab",
    author: "Carlos Mendes",
    state: "open",
    createdAt: "2026-05-20T14:00:00Z",
    updatedAt: "2026-05-22T09:30:00Z",
    additions: 540,
    deletions: 210,
  },
  {
    id: "pr-4",
    number: 42,
    title: "feat(billing): retry on transient errors",
    repository: "Dynatrace/billing-service",
    provider: "gitlab",
    author: "Mariana Lopes",
    state: "open",
    createdAt: "2026-05-19T11:00:00Z",
    updatedAt: "2026-05-21T16:00:00Z",
    additions: 145,
    deletions: 30,
  },
  {
    id: "pr-5",
    number: 71,
    title: "refactor(portal): split user module",
    repository: "Dynatrace/internal-portal",
    provider: "azure-devops",
    author: "Pedro Almeida",
    state: "open",
    createdAt: "2026-05-21T13:00:00Z",
    updatedAt: "2026-05-22T10:00:00Z",
    additions: 620,
    deletions: 480,
  },
  {
    id: "pr-6",
    number: 18,
    title: "fix(erp): legacy sync timezone",
    repository: "Dynatrace/legacy-erp",
    provider: "azure-devops",
    author: "Juliana Rocha",
    state: "open",
    createdAt: "2026-05-18T09:00:00Z",
    updatedAt: "2026-05-20T15:00:00Z",
    additions: 24,
    deletions: 6,
  },
];

const buildAuthor = ["Bruno Silva", "Ana Costa", "Carlos Mendes", "Mariana Lopes", "Pedro Almeida", "Juliana Rocha"];

export const builds: Build[] = Array.from({ length: 24 }, (_, i) => {
  const repo = repositories[i % repositories.length];
  const author = buildAuthor[i % buildAuthor.length];
  const status: Build["status"] =
    i % 9 === 0 ? "failure" : i % 7 === 0 ? "cancelled" : i % 13 === 0 ? "running" : "success";
  const startedAt = new Date(Date.now() - i * 3 * 3600 * 1000).toISOString();
  const durationSec = 60 + (i * 17) % 600;
  return {
    id: `build-${i + 1}`,
    pipelineId: `${repo.fullName}-pipeline`,
    repository: repo.fullName,
    provider: repo.provider,
    branch: repo.branches[i % repo.branches.length],
    commitSha: `sha${i}${repo.id}`.padEnd(7, "0").slice(0, 7),
    author,
    status,
    durationSec,
    startedAt,
    finishedAt: status === "running" ? undefined : new Date(new Date(startedAt).getTime() + durationSec * 1000).toISOString(),
  };
});

export const deploys: Deploy[] = Array.from({ length: 12 }, (_, i) => {
  const repo = repositories[i % repositories.length];
  const envs: Deploy["environment"][] = ["dev", "staging", "production"];
  const env = envs[i % envs.length];
  const status: Deploy["status"] = i % 8 === 0 ? "failure" : "success";
  const startedAt = new Date(Date.now() - i * 4 * 3600 * 1000).toISOString();
  return {
    id: `deploy-${i + 1}`,
    repository: repo.fullName,
    provider: repo.provider,
    environment: env,
    status,
    version: `v1.${20 + i}.0`,
    startedAt,
    finishedAt: new Date(new Date(startedAt).getTime() + 180 * 1000).toISOString(),
    linkedServiceId: repo.linkedServiceId,
  };
});

export const commits: Commit[] = developers.flatMap((dev) =>
  Array.from({ length: Math.min(dev.commitsLast30d, 5) }, (_, i) => ({
    sha: `${dev.id}-c${i}`,
    repository: repositories.find((r) => r.provider === dev.provider)?.fullName ?? "unknown",
    provider: dev.provider,
    author: dev.name,
    message: `chore: commit ${i + 1} by ${dev.name}`,
    timestamp: new Date(Date.now() - i * 86400000).toISOString(),
    additions: Math.round(dev.linesAdded / dev.commitsLast30d),
    deletions: Math.round(dev.linesRemoved / dev.commitsLast30d),
  })),
);

export const releases: Release[] = repositories.flatMap((repo, repoIdx) => {
  const envs: Release["environment"][] = ["production", "staging", "dev"];
  return envs.flatMap((env, envIdx) =>
    Array.from({ length: 4 }, (_, i) => {
      const base = repoIdx * 12 + envIdx * 4 + i;
      const deployedAt = new Date(Date.now() - (base + 1) * 6 * 3600 * 1000).toISOString();
      const finishedAt = new Date(new Date(deployedAt).getTime() + 4 * 60 * 1000).toISOString();
      const failure = base % 11 === 0;
      return {
        id: `release-${repo.id}-${env}-${i}`,
        application: repo.application,
        environment: env,
        version: `v${2 + repoIdx}.${10 + i}.${base % 7}`,
        buildId: `b${(base * 37).toString(36).padStart(7, "0").slice(0, 7)}`,
        deployedAt,
        finishedAt,
        status: failure ? "failure" : "success",
        errorRate: Math.round((failure ? 4 + (i % 3) : 0.2 + (i % 10) * 0.1) * 100) / 100,
        responseTimeMs: 120 + ((base * 17) % 380),
        throughput: 450 + ((base * 53) % 2000),
        davisProblems: failure ? 1 + (i % 3) : i % 2,
        prsIncluded: 2 + (base % 7),
        commitsIncluded: 5 + (base % 18),
      } satisfies Release;
    }),
  );
});

export function filterByProviders<T extends { provider: Provider }>(
  items: T[],
  selected: Provider[],
): T[] {
  if (selected.length === 0) return items;
  return items.filter((i) => selected.includes(i.provider));
}

export function filterByTimeRange<T extends { startedAt?: string; timestamp?: string; createdAt?: string }>(
  items: T[],
  fromIso: string,
  toIso: string,
): T[] {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return items.filter((i) => {
    const raw = i.startedAt ?? i.timestamp ?? i.createdAt;
    if (!raw) return true;
    const t = new Date(raw).getTime();
    return t >= from && t <= to;
  });
}
