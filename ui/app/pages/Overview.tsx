import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { KpiCard } from "../components/KpiCard";
import { BranchStrategyBadge } from "../components/BranchStrategyBadge";
import { DynatraceIntelligencePanel } from "../components/DynatraceIntelligencePanel";
import {
  commits,
  deploys,
  developers,
  filterByTimeRange,
  pullRequests,
  repositories,
} from "../data/mockData";
import {
  filterBuilds,
  filterCommits,
  filterDeploys,
  filterDevelopers,
  filterPullRequests,
  filterRepositories,
} from "../data/applyFilters";
import { useFilters } from "../state/FilterContext";
import { useTimeRange } from "../state/TimeRangeContext";
import { useSDLCBuilds } from "../hooks/useSDLCBuilds";
import { inferBranchStrategy, strategyDistribution } from "../data/branchStrategy";
import type { BranchStrategy, Repository } from "../data/types";

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { applied } = useFilters();
  const { fromIso, toIso, range } = useTimeRange();
  const { data: buildsData, source: buildsSource } = useSDLCBuilds();

  const filtered = useMemo(() => {
    const repos = filterRepositories(repositories, applied);
    const repoSet = new Set(repos.map((r) => r.fullName));
    const devs = filterDevelopers(developers, applied);
    const prs = filterByTimeRange(filterPullRequests(pullRequests, applied, repoSet), fromIso, toIso);
    const cms = filterByTimeRange(filterCommits(commits, applied, repoSet), fromIso, toIso);
    const fbuilds = filterByTimeRange(filterBuilds(buildsData, applied, repoSet), fromIso, toIso);
    const fdeploys = filterByTimeRange(filterDeploys(deploys, applied, repoSet), fromIso, toIso);
    return { repos, devs, prs, cms, builds: fbuilds, deploys: fdeploys };
  }, [applied, fromIso, toIso, buildsData]);

  const stats = useMemo(() => {
    const succBuilds = filtered.builds.filter((b) => b.status === "success").length;
    const failBuilds = filtered.builds.filter((b) => b.status === "failure").length;
    const buildSuccessRate =
      filtered.builds.length > 0
        ? Math.round((succBuilds / (succBuilds + failBuilds || 1)) * 100)
        : 0;
    const prodDeploys = filtered.deploys.filter((d) => d.environment === "production");
    const deployFrequency = Math.max(1, Math.round(prodDeploys.length / 7));
    const avgLeadTime = Math.round(
      filtered.devs.reduce((a, d) => a + d.avgLeadTimeHours, 0) / Math.max(filtered.devs.length, 1),
    );
    const topDev = [...filtered.devs].sort((a, b) => b.commitsLast30d - a.commitsLast30d)[0];
    return {
      totalCommits: filtered.cms.length || filtered.devs.reduce((a, d) => a + d.commitsLast30d, 0),
      totalBranches: filtered.repos.reduce((acc, r) => acc + r.openBranches, 0),
      openRepos: filtered.repos.filter((r) => !r.isArchived).length,
      openPrs: filtered.prs.filter((p) => p.state === "open").length,
      buildSuccessRate,
      buildsCount: filtered.builds.length,
      deployFrequency,
      avgLeadTime,
      topDev,
      devCount: filtered.devs.length,
      distribution: strategyDistribution(filtered.repos),
      deploysCount: filtered.deploys.length,
    };
  }, [filtered]);

  const reposByStrategy = useMemo(() => {
    const grouped: Record<BranchStrategy, Repository[]> = {
      gitflow: [],
      "trunk-based": [],
      none: [],
    };
    filtered.repos.forEach((r) => grouped[inferBranchStrategy(r)].push(r));
    return grouped;
  }, [filtered.repos]);

  return (
    <Flex flexDirection="column" padding={24} gap={24}>
      <Flex flexDirection="column" gap={4}>
        <Heading>DevOps Insights</Heading>
        <Paragraph>
          Visão consolidada de produtividade de engenharia · {range.label} · fonte:{" "}
          {buildsSource === "grail" ? "SDLC events (Grail)" : "mock data (sem ingestão detectada)"}
        </Paragraph>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <KpiCard
          label="Commits"
          value={stats.totalCommits}
          hint={`${stats.devCount} devs ativos`}
          onClick={() => navigate("/developers")}
        />
        <KpiCard
          label="PRs / MRs abertos"
          value={stats.openPrs}
          onClick={() => navigate("/pull-requests")}
        />
        <KpiCard label="Lead time PR" value={`${stats.avgLeadTime}h`} hint="média devs" />
        <KpiCard
          label="Top contribuidor"
          value={stats.topDev?.name ?? "—"}
          hint={stats.topDev ? `${stats.topDev.commitsLast30d} commits` : undefined}
          onClick={() => navigate("/developers")}
        />
      </Flex>

      <DynatraceIntelligencePanel
        repos={filtered.repos}
        prs={filtered.prs}
        builds={filtered.builds}
        deploys={filtered.deploys}
        devs={filtered.devs}
      />

      <Surface padding={16} elevation="raised" className="dt-hover-card">
        <Flex flexDirection="column" gap={16}>
          <Heading level={4}>Distribuição de estratégia de branch</Heading>
          <Flex gap={24} flexWrap="wrap">
            {(Object.keys(reposByStrategy) as BranchStrategy[]).map((s) => (
              <Flex
                key={s}
                flexDirection="column"
                gap={8}
                style={{ minWidth: 260, flex: 1 }}
              >
                <Flex alignItems="center" gap={12}>
                  <BranchStrategyBadge strategy={s} />
                  <Text>{reposByStrategy[s].length} repos</Text>
                </Flex>
                <Flex flexDirection="column" gap={2}>
                  {reposByStrategy[s].length === 0 ? (
                    <Text textStyle="small">—</Text>
                  ) : (
                    reposByStrategy[s].map((r) => (
                      <Text
                        key={r.id}
                        onClick={() => navigate(`/repositories`)}
                        style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                      >
                        {r.fullName}
                      </Text>
                    ))
                  )}
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Surface>

      <Surface padding={16} elevation="raised" className="dt-hover-card">
        <Flex flexDirection="column" gap={12}>
          <Heading level={4}>Top 5 contribuidores</Heading>
          {filtered.devs
            .slice()
            .sort((a, b) => b.commitsLast30d - a.commitsLast30d)
            .slice(0, 5)
            .map((d, i) => (
              <Flex key={d.id} justifyContent="space-between" alignItems="center">
                <Text>
                  {i + 1}. {d.name} · {d.email}
                </Text>
                <Text>
                  {d.commitsLast30d} commits · {d.pullRequestsMerged} PRs mergeados
                </Text>
              </Flex>
            ))}
        </Flex>
      </Surface>
    </Flex>
  );
};
