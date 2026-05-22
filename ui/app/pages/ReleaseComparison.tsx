import React, { useMemo, useState } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { ExternalLink } from "@dynatrace/strato-components/typography";
import {
  builds,
  deploys,
  pullRequests,
  releases,
  repositories,
} from "../data/mockData";
import type { Release } from "../data/types";
import { APP_IDS, navigateToApp } from "../utils/navigation";

type Env = "dev" | "staging" | "production";
const ENVS: Env[] = ["production", "staging", "dev"];

interface MetricRow {
  label: string;
  format: (r: Release) => string;
  better: "lower" | "higher";
  value: (r: Release) => number;
}

const METRICS: MetricRow[] = [
  {
    label: "Error rate",
    format: (r) => `${r.errorRate.toFixed(2)}%`,
    better: "lower",
    value: (r) => r.errorRate,
  },
  {
    label: "Response time",
    format: (r) => `${r.responseTimeMs}ms`,
    better: "lower",
    value: (r) => r.responseTimeMs,
  },
  {
    label: "Throughput",
    format: (r) => `${r.throughput} req/min`,
    better: "higher",
    value: (r) => r.throughput,
  },
  {
    label: "Davis problems",
    format: (r) => `${r.davisProblems}`,
    better: "lower",
    value: (r) => r.davisProblems,
  },
  {
    label: "PRs incluídos",
    format: (r) => `${r.prsIncluded}`,
    better: "higher",
    value: (r) => r.prsIncluded,
  },
  {
    label: "Commits incluídos",
    format: (r) => `${r.commitsIncluded}`,
    better: "higher",
    value: (r) => r.commitsIncluded,
  },
];

const deltaColor = (
  metric: MetricRow,
  latest: Release,
  prev: Release,
): { color: "success" | "critical" | "neutral"; label: string } => {
  const lv = metric.value(latest);
  const pv = metric.value(prev);
  if (pv === 0 && lv === 0) return { color: "neutral", label: "0" };
  const diff = lv - pv;
  if (diff === 0) return { color: "neutral", label: "0" };
  const pct = pv === 0 ? 100 : Math.round((diff / pv) * 100);
  const arrow = diff > 0 ? "↑" : "↓";
  const isImprovement =
    (metric.better === "lower" && diff < 0) || (metric.better === "higher" && diff > 0);
  return { color: isImprovement ? "success" : "critical", label: `${arrow} ${Math.abs(pct)}%` };
};

const fmtDateTime = (iso: string): string => new Date(iso).toLocaleString();

const NativeSelect: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <Flex flexDirection="column" gap={4}>
    <Text>{label}</Text>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "6px 10px",
        background: "var(--dt-colors-background-surface-primary-default)",
        color: "var(--dt-colors-text-primary-default)",
        border: "1px solid var(--dt-colors-border-neutral-default)",
        borderRadius: 4,
        minWidth: 200,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </Flex>
);

const ReleaseCard: React.FC<{ release: Release; title: string }> = ({ release, title }) => (
  <Surface padding={16} elevation="raised" className="dt-hover-card" style={{ flex: 1, minWidth: 280 }}>
    <Flex flexDirection="column" gap={6}>
      <Flex alignItems="center" justifyContent="space-between">
        <Text>{title}</Text>
        <Chip color={release.status === "success" ? "success" : "critical"}>{release.status}</Chip>
      </Flex>
      <Heading level={3}>{release.version}</Heading>
      <Text textStyle="small">build {release.buildId}</Text>
      <Text textStyle="small">{fmtDateTime(release.deployedAt)}</Text>
    </Flex>
  </Surface>
);

export const ReleaseComparison: React.FC = () => {
  const [app, setApp] = useState<string>(repositories[0]?.application ?? "");
  const [env, setEnv] = useState<Env>("production");

  const appReleases = useMemo(
    () =>
      releases
        .filter((r) => r.application === app && r.environment === env)
        .sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()),
    [app, env],
  );

  const [latestId, setLatestId] = useState<string>("");
  const [previousId, setPreviousId] = useState<string>("");

  React.useEffect(() => {
    setLatestId(appReleases[0]?.id ?? "");
    setPreviousId(appReleases[1]?.id ?? "");
  }, [appReleases]);

  const latest = appReleases.find((r) => r.id === latestId);
  const previous = appReleases.find((r) => r.id === previousId);

  const repo = repositories.find((r) => r.application === app);

  const changeStats = useMemo(() => {
    if (!latest || !previous) return null;
    const from = new Date(previous.deployedAt).getTime();
    const to = new Date(latest.deployedAt).getTime();
    const inWindow = <T extends { repository: string; createdAt?: string; startedAt?: string }>(
      list: T[],
    ): T[] =>
      list.filter((x) => {
        if (repo && x.repository !== repo.fullName) return false;
        const raw = x.createdAt ?? x.startedAt;
        if (!raw) return false;
        const t = new Date(raw).getTime();
        return t >= from && t <= to;
      });
    const prs = inWindow(pullRequests);
    const bs = inWindow(builds);
    const ds = inWindow(deploys);
    return {
      prs,
      builds: bs,
      deploys: ds,
    };
  }, [latest, previous, repo]);

  return (
    <Flex flexDirection="column" padding={24} gap={20}>
      <Flex justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={12}>
        <Flex flexDirection="column" gap={4}>
          <Heading level={2}>Release Comparison</Heading>
          <Paragraph>
            Compare duas releases de uma aplicação: o que entrou no código e como o serviço se
            comportou.
          </Paragraph>
        </Flex>
        <Button variant="default" onClick={() => navigateToApp(APP_IDS.CICD)}>
          Ver pipelines no CI/CD Observability
        </Button>
      </Flex>

      <Surface padding={16} elevation="raised">
        <Flex gap={16} flexWrap="wrap" alignItems="flex-end">
          <NativeSelect
            label="Aplicação"
            value={app}
            onChange={setApp}
            options={repositories.map((r) => ({ value: r.application, label: r.application }))}
          />
          <NativeSelect
            label="Ambiente"
            value={env}
            onChange={(v) => setEnv(v as Env)}
            options={ENVS.map((e) => ({ value: e, label: e }))}
          />
          <NativeSelect
            label="Release atual"
            value={latestId}
            onChange={setLatestId}
            options={appReleases.map((r) => ({
              value: r.id,
              label: `${r.version} · ${r.buildId} · ${fmtDateTime(r.deployedAt)}`,
            }))}
          />
          <NativeSelect
            label="Release anterior"
            value={previousId}
            onChange={setPreviousId}
            options={appReleases.map((r) => ({
              value: r.id,
              label: `${r.version} · ${r.buildId} · ${fmtDateTime(r.deployedAt)}`,
            }))}
          />
        </Flex>
      </Surface>

      {repo && (
        <Surface padding={12} elevation="raised">
          <Flex alignItems="center" gap={12} flexWrap="wrap">
            <Text>
              Repositório: <ExternalLink href={repo.url}>{repo.fullName}</ExternalLink>
            </Text>
            {repo.linkedServiceId && <Text>Service: {repo.linkedServiceId}</Text>}
          </Flex>
        </Surface>
      )}

      {!latest || !previous ? (
        <Surface padding={16} elevation="raised">
          <Text>Selecione duas releases para comparar.</Text>
        </Surface>
      ) : (
        <>
          <Flex gap={16} flexWrap="wrap" alignItems="stretch">
            <ReleaseCard release={previous} title="Anterior" />
            <ReleaseCard release={latest} title="Atual" />
          </Flex>

          <Surface padding={16} elevation="raised" className="dt-hover-card">
            <Flex flexDirection="column" gap={12}>
              <Heading level={4}>Métricas e mudanças</Heading>
              <Flex flexDirection="column" gap={8}>
                {METRICS.map((m) => {
                  const d = deltaColor(m, latest, previous);
                  return (
                    <Flex
                      key={m.label}
                      alignItems="center"
                      justifyContent="space-between"
                      gap={12}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 4,
                        background: "var(--dt-colors-background-surface-primary-default)",
                      }}
                    >
                      <Text>{m.label}</Text>
                      <Flex alignItems="center" gap={16}>
                        <Text>{m.format(previous)}</Text>
                        <Text>→</Text>
                        <Text>{m.format(latest)}</Text>
                        <Chip color={d.color}>{d.label}</Chip>
                      </Flex>
                    </Flex>
                  );
                })}
              </Flex>
            </Flex>
          </Surface>

          {changeStats && (
            <Surface padding={16} elevation="raised" className="dt-hover-card">
              <Flex flexDirection="column" gap={12}>
                <Heading level={4}>O que entrou entre as releases</Heading>
                <Flex gap={24} flexWrap="wrap">
                  <Flex flexDirection="column" gap={4} style={{ minWidth: 200 }}>
                    <Text>Pull Requests</Text>
                    <Heading level={3}>{changeStats.prs.length}</Heading>
                  </Flex>
                  <Flex flexDirection="column" gap={4} style={{ minWidth: 200 }}>
                    <Text>Builds</Text>
                    <Heading level={3}>{changeStats.builds.length}</Heading>
                    <Text textStyle="small">
                      {changeStats.builds.filter((b) => b.status === "success").length} sucesso ·{" "}
                      {changeStats.builds.filter((b) => b.status === "failure").length} falha
                    </Text>
                  </Flex>
                  <Flex flexDirection="column" gap={4} style={{ minWidth: 200 }}>
                    <Text>Deploys</Text>
                    <Heading level={3}>{changeStats.deploys.length}</Heading>
                  </Flex>
                </Flex>
                {changeStats.prs.length > 0 && (
                  <Flex flexDirection="column" gap={6}>
                    <Text>PRs:</Text>
                    {changeStats.prs.slice(0, 6).map((p) => (
                      <Text key={p.id} textStyle="small">
                        #{p.number} {p.title} — {p.author}
                      </Text>
                    ))}
                  </Flex>
                )}
              </Flex>
            </Surface>
          )}
        </>
      )}
    </Flex>
  );
};
