import React, { useMemo } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Chip } from "@dynatrace/strato-components/content";
import { Button } from "@dynatrace/strato-components/buttons";
import { KpiCard } from "../components/KpiCard";
import { filterByTimeRange, repositories } from "../data/mockData";
import { filterBuilds, filterRepositories } from "../data/applyFilters";
import { PROVIDERS, type Build } from "../data/types";
import { useFilters } from "../state/FilterContext";
import { useTimeRange } from "../state/TimeRangeContext";
import { useSDLCBuilds } from "../hooks/useSDLCBuilds";
import { APP_IDS, navigateToApp } from "../utils/navigation";

const providerLabel = (id: Build["provider"]): string =>
  PROVIDERS.find((p) => p.id === id)?.label ?? id;

const statusMeta: Record<
  Build["status"],
  { color: "success" | "critical" | "warning" | "neutral"; label: string; icon: string }
> = {
  success: { color: "success", label: "Sucesso", icon: "✓" },
  failure: { color: "critical", label: "Falhou", icon: "✕" },
  running: { color: "warning", label: "Rodando", icon: "⟳" },
  cancelled: { color: "neutral", label: "Cancelado", icon: "○" },
};

const fmtDuration = (s: number): string => {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m${r > 0 ? ` ${r}s` : ""}`;
};

const fmtRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};

const BuildCard: React.FC<{ build: Build }> = ({ build }) => {
  const meta = statusMeta[build.status];
  return (
    <Surface
      padding={16}
      elevation="raised"
      className="dt-hover-card"
      style={{ minWidth: 280, flex: 1 }}
    >
      <Flex flexDirection="column" gap={8}>
        <Flex justifyContent="space-between" alignItems="center">
          <Chip color={meta.color}>
            {meta.icon} {meta.label}
          </Chip>
          <Text textStyle="small">{fmtRelative(build.startedAt)}</Text>
        </Flex>
        <Heading level={5}>{build.repository}</Heading>
        <Flex flexDirection="column" gap={2}>
          <Text textStyle="small">
            <strong>branch</strong> {build.branch}
          </Text>
          <Text textStyle="small">
            <strong>commit</strong> {build.commitSha} · {build.author}
          </Text>
          <Text textStyle="small">
            <strong>duração</strong> {fmtDuration(build.durationSec)} · {providerLabel(build.provider)}
          </Text>
        </Flex>
      </Flex>
    </Surface>
  );
};

export const Builds: React.FC = () => {
  const { applied } = useFilters();
  const { fromIso, toIso, range } = useTimeRange();
  const { data, source, isLoading } = useSDLCBuilds();

  const rows = useMemo(() => {
    const repoSet = new Set(filterRepositories(repositories, applied).map((r) => r.fullName));
    return filterByTimeRange(filterBuilds(data, applied, repoSet), fromIso, toIso);
  }, [applied, data, fromIso, toIso]);

  const stats = useMemo(() => {
    const total = rows.length;
    const succ = rows.filter((b) => b.status === "success").length;
    const fail = rows.filter((b) => b.status === "failure").length;
    const running = rows.filter((b) => b.status === "running").length;
    const avgDur =
      rows.filter((b) => b.status === "success").reduce((a, b) => a + b.durationSec, 0) /
      Math.max(succ, 1);
    return {
      total,
      succ,
      fail,
      running,
      avgDur,
      successRate: total > 0 ? Math.round((succ / (succ + fail || 1)) * 100) : 0,
    };
  }, [rows]);

  const grouped = useMemo(() => {
    return {
      running: rows.filter((b) => b.status === "running"),
      failure: rows.filter((b) => b.status === "failure"),
      success: rows.filter((b) => b.status === "success"),
      cancelled: rows.filter((b) => b.status === "cancelled"),
    };
  }, [rows]);

  return (
    <Flex flexDirection="column" padding={24} gap={20}>
      <Flex justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={12}>
        <Flex flexDirection="column" gap={4}>
          <Heading level={2}>Builds</Heading>
          <Paragraph>
            {source === "grail"
              ? "SDLC events do Grail"
              : "Sem ingestão SDLC detectada — mostrando mock"}{" "}
            · {range.label} {isLoading && "· carregando…"}
          </Paragraph>
        </Flex>
        <Button variant="default" onClick={() => navigateToApp(APP_IDS.CICD)}>
          Ver no CI/CD Observability
        </Button>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <KpiCard label="Total" value={stats.total} />
        <KpiCard label="Sucesso" value={stats.succ} hint={`${stats.successRate}% taxa`} />
        <KpiCard label="Falhas" value={stats.fail} />
        <KpiCard label="Rodando" value={stats.running} />
        <KpiCard label="Duração média" value={fmtDuration(stats.avgDur)} hint="apenas sucessos" />
      </Flex>

      {(["running", "failure", "success", "cancelled"] as Build["status"][]).map((s) => {
        const list = grouped[s];
        if (list.length === 0) return null;
        const meta = statusMeta[s];
        return (
          <Flex key={s} flexDirection="column" gap={12}>
            <Flex alignItems="center" gap={8}>
              <Heading level={4}>{meta.label}</Heading>
              <Chip color={meta.color}>{list.length}</Chip>
            </Flex>
            <Flex gap={12} flexWrap="wrap">
              {list.slice(0, 12).map((b) => (
                <BuildCard key={b.id} build={b} />
              ))}
            </Flex>
          </Flex>
        );
      })}
    </Flex>
  );
};
