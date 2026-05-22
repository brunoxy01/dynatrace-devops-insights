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
  filterByProviders,
  filterByTimeRange,
  pullRequests,
  repositories,
} from "../data/mockData";
import { useProviderFilter } from "../state/ProviderFilterContext";
import { useStrategyFilter } from "../state/StrategyFilterContext";
import { useTimeRange } from "../state/TimeRangeContext";
import { useSDLCBuilds } from "../hooks/useSDLCBuilds";
import { inferBranchStrategy, strategyDistribution } from "../data/branchStrategy";
import type { BranchStrategy, Repository } from "../data/types";

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { selected: selectedProviders } = useProviderFilter();
  const { selected: selectedStrategies } = useStrategyFilter();
  const { fromIso, toIso, range } = useTimeRange();
  const { data: buildsData, source: buildsSource } = useSDLCBuilds();

  const filtered = useMemo(() => {
    const repos = filterByProviders(repositories, selectedProviders).filter((r) => {
      if (selectedStrategies.length === 0) return true;
      return selectedStrategies.includes(inferBranchStrategy(r));
    });
    const repoSet = new Set(repos.map((r) => r.fullName));

    const devs = filterByProviders(developers, selectedProviders);
    const prs = filterByTimeRange(
      filterByProviders(pullRequests, selectedProviders).filter((p) => repoSet.has(p.repository)),
      fromIso,
      toIso,
    );
    const cms = filterByTimeRange(
      filterByProviders(commits, selectedProviders).filter((c) => repoSet.has(c.repository)),
      fromIso,
      toIso,
    );
    const fbuilds = filterByTimeRange(
      filterByProviders(buildsData, selectedProviders).filter((b) => repoSet.has(b.repository)),
      fromIso,
      toIso,
    );
    const fdeploys = filterByTimeRange(
      filterByProviders(deploys, selectedProviders).filter((d) => repoSet.has(d.repository)),
      fromIso,
      toIso,
    );
    return { repos, devs, prs, cms, builds: fbuilds, deploys: fdeploys };
  }, [selectedProviders, selectedStrategies, fromIso, toIso, buildsData]);

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
    const distribution = strategyDistribution(filtered.repos);
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
      distribution,
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
          label="Repositórios ativos"
          value={stats.openRepos}
          onClick={() => navigate("/repositories")}
        />
        <KpiCard label="Branches abertos" value={stats.totalBranches} onClick={() => navigate("/repositories")} />
        <KpiCard
          label="PRs / MRs abertos"
          value={stats.openPrs}
          onClick={() => navigate("/pull-requests")}
        />
        <KpiCard
          label="Builds"
          value={stats.buildsCount}
          hint={`${stats.buildSuccessRate}% sucesso`}
          onClick={() => navigate("/builds")}
        />
        <KpiCard
          label="Deploys"
          value={stats.deploysCount}
          hint={`~${stats.deployFrequency}/dia prod`}
          onClick={() => navigate("/releases")}
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
                        onClick={() =>
                          navigate(`/repositories?repo=${encodeURIComponent(r.fullName)}`)
                        }
                        style={{
                          cursor: "pointer",
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                        }}
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
          {[...developers]
            .filter((d) => selectedProviders.length === 0 || selectedProviders.includes(d.provider))
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
