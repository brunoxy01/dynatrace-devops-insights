import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text, ExternalLink } from "@dynatrace/strato-components/typography";
import { Chip } from "@dynatrace/strato-components/content";
import { Button } from "@dynatrace/strato-components/buttons";
import { KpiCard } from "../components/KpiCard";
import { useSDLCActivity } from "../hooks/useSDLCActivity";
import { useSDLCPullRequests } from "../hooks/useSDLCPullRequests";
import { useTimeRange } from "../state/TimeRangeContext";
import { REPO_WATCHLIST, repoUrl } from "../config";

const TYPE_LABELS: Record<string, string> = {
  pull_request: "Pull requests",
  push: "Pushes",
  build: "Builds",
  run: "Workflow runs",
  schedule: "Scheduled runs",
  delete: "Branches deletadas",
  release: "Releases",
};

const fmtTimestamp = (iso: string): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const fmtRelative = (iso: string): string => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "agora há pouco";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};

interface Insight {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
}

function computeInsights(args: {
  openPrs: number;
  prRawCount: number;
  pushes: number;
  builds: number;
  runs: number;
  contributors: number;
  matchedCount: number;
}): Insight[] {
  const insights: Insight[] = [];
  if (args.matchedCount === 0) {
    insights.push({
      severity: "warning",
      title: "Nenhum evento dos repos da watchlist no período",
      detail:
        "Já tem ingestão SDLC chegando no Grail, mas nada do(s) repo(s) que estamos observando. Confira webhook ou aumente o time range.",
    });
    return insights;
  }
  if (args.contributors === 0 && args.prRawCount > 0) {
    insights.push({
      severity: "warning",
      title: "Autor não identificado nos eventos",
      detail:
        "Temos eventos mas o adapter não está populando o campo de autor que esperamos. Abra a página PRs/MRs e copie o JSON do Debug pra eu ajustar o mapping.",
    });
  }
  if (args.openPrs > 0) {
    insights.push({
      severity: "info",
      title: `${args.openPrs} PR aberto`,
      detail: "Veja na página PRs/MRs.",
    });
  }
  if (args.builds > 0 && args.runs === 0) {
    insights.push({
      severity: "info",
      title: `${args.builds} builds sem workflow runs correspondentes`,
      detail: "Pode ser que os workflows runs ainda não tenham finalizado.",
    });
  }
  if (insights.length === 0) {
    insights.push({
      severity: "info",
      title: "Tudo nominal",
      detail: "Eventos chegando, métricas dentro do esperado.",
    });
  }
  return insights;
}

const severityToColor: Record<Insight["severity"], "primary" | "warning" | "critical"> = {
  info: "primary",
  warning: "warning",
  critical: "critical",
};

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { range } = useTimeRange();
  const activity = useSDLCActivity();
  const { data: prs, rawCount: prRawCount, matchedCount: prMatchedCount } =
    useSDLCPullRequests();
  const [showDql, setShowDql] = useState(false);

  const stats = useMemo(() => {
    const open = prs.filter((p) => p.state === "open").length;
    const top = activity.contributors[0];
    const t = activity.totals;
    return {
      commits: t.pushEvents,
      builds: t.buildEvents,
      runs: t.runEvents,
      contributors: t.distinctAuthors,
      openPrs: open,
      prEvents: prRawCount,
      prMatched: prMatchedCount,
      totalEventsMatched: activity.matchedCount,
      totalEventsAll: activity.rawCount,
      topContributor: top?.name ?? "—",
      topContributorHint: top
        ? `${top.prsOpened} PRs · ${top.commits} commits · ${top.builds} builds`
        : undefined,
    };
  }, [activity, prs, prRawCount, prMatchedCount]);

  const insights = useMemo(
    () =>
      computeInsights({
        openPrs: stats.openPrs,
        prRawCount: stats.prEvents,
        pushes: stats.commits,
        builds: stats.builds,
        runs: stats.runs,
        contributors: stats.contributors,
        matchedCount: stats.totalEventsMatched,
      }),
    [stats],
  );

  const byType = activity.byType;
  const typeKeys = Object.keys(byType).sort((a, b) => (byType[b] ?? 0) - (byType[a] ?? 0));

  const hasAnyMatched = stats.totalEventsMatched > 0;

  return (
    <Flex flexDirection="column" padding={24} gap={24}>
      <Flex flexDirection="column" gap={4}>
        <Flex alignItems="center" gap={12}>
          <Heading>DevOps Insights</Heading>
          <Chip color={hasAnyMatched ? "success" : "neutral"}>
            {hasAnyMatched
              ? `SDLC events (Grail) · ${stats.totalEventsMatched} eventos da watchlist`
              : `${stats.totalEventsAll} eventos no Grail · 0 da watchlist`}
          </Chip>
          {activity.isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>
          Visão consolidada de produtividade · {range.label} · repos:{" "}
          {REPO_WATCHLIST.map((r, i) => (
            <React.Fragment key={r}>
              {i > 0 && ", "}
              <ExternalLink href={repoUrl(r)}>{r}</ExternalLink>
            </React.Fragment>
          ))}
        </Paragraph>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <KpiCard label="Commits / pushes" value={stats.commits} hint="eventos push" />
        <KpiCard
          label="PRs abertos"
          value={stats.openPrs}
          hint={`${stats.prMatched} eventos pull_request`}
          onClick={() => navigate("/pull-requests")}
        />
        <KpiCard label="Builds" value={stats.builds} hint="eventos build" />
        <KpiCard label="Workflow runs" value={stats.runs} hint="eventos run" />
        <KpiCard
          label="Contribuidores"
          value={stats.contributors}
          hint="autores únicos"
          onClick={() => navigate("/developers")}
        />
        <KpiCard
          label="Top contribuidor"
          value={stats.topContributor}
          hint={stats.topContributorHint}
          onClick={() => navigate("/developers")}
        />
      </Flex>

      <Flex gap={16} flexWrap="wrap" alignItems="stretch">
        <Surface
          padding={16}
          elevation="raised"
          className="dt-hover-card"
          style={{ flex: 2, minWidth: 360 }}
        >
          <Flex flexDirection="column" gap={12}>
            <Heading level={4}>Insights</Heading>
            {insights.map((i, idx) => (
              <Flex key={idx} flexDirection="column" gap={4}>
                <Flex alignItems="center" gap={8}>
                  <Chip color={severityToColor[i.severity]}>{i.severity}</Chip>
                  <Text>{i.title}</Text>
                </Flex>
                <Text textStyle="small">{i.detail}</Text>
              </Flex>
            ))}
          </Flex>
        </Surface>

        <Surface
          padding={16}
          elevation="raised"
          className="dt-hover-card"
          style={{ flex: 1, minWidth: 280 }}
        >
          <Flex flexDirection="column" gap={12}>
            <Heading level={4}>Distribuição por tipo</Heading>
            {typeKeys.length === 0 ? (
              <Text>—</Text>
            ) : (
              typeKeys.map((t) => {
                const max = Math.max(...typeKeys.map((k) => byType[k] ?? 0));
                const pct = Math.round(((byType[t] ?? 0) / Math.max(max, 1)) * 100);
                return (
                  <Flex key={t} flexDirection="column" gap={2}>
                    <Flex justifyContent="space-between">
                      <Text>{TYPE_LABELS[t] ?? t}</Text>
                      <Text>{byType[t]}</Text>
                    </Flex>
                    <div
                      style={{
                        height: 4,
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: "var(--dt-colors-background-accent-default)",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </Flex>
                );
              })
            )}
          </Flex>
        </Surface>
      </Flex>

      <Surface padding={16} elevation="raised" className="dt-hover-card">
        <Flex flexDirection="column" gap={12}>
          <Heading level={4}>Top contribuidores</Heading>
          {activity.contributors.length === 0 ? (
            <Text>
              Sem contribuidores identificados — provavelmente o adapter está usando outro field
              name para o autor. Veja o Debug JSON na página de PRs/MRs.
            </Text>
          ) : (
            activity.contributors.slice(0, 10).map((c, i) => (
              <Flex key={c.name} justifyContent="space-between" alignItems="center">
                <Text>
                  {i + 1}. {c.name}
                </Text>
                <Text textStyle="small">
                  {c.prsOpened} PRs · {c.commits} commits · {c.builds} builds · última {fmtRelative(c.lastActivity)}
                </Text>
              </Flex>
            ))
          )}
        </Flex>
      </Surface>

      <Surface padding={16} elevation="raised" className="dt-hover-card">
        <Flex flexDirection="column" gap={12}>
          <Heading level={4}>Atividade recente</Heading>
          {activity.recent.length === 0 ? (
            <Text>Sem eventos no período.</Text>
          ) : (
            activity.recent.slice(0, 15).map((e, i) => (
              <Flex key={i} justifyContent="space-between" alignItems="center" gap={12}>
                <Flex alignItems="center" gap={8} style={{ minWidth: 0, flex: 1 }}>
                  <Chip color="primary">{TYPE_LABELS[e.type] ?? e.type}</Chip>
                  <Text>{e.status}</Text>
                  <Text textStyle="small">
                    {e.author} · {e.branch}
                  </Text>
                </Flex>
                <Text textStyle="small">{fmtTimestamp(e.timestamp)}</Text>
              </Flex>
            ))
          )}
        </Flex>
      </Surface>

      <Surface padding={12} elevation="raised">
        <Flex flexDirection="column" gap={8}>
          <Flex alignItems="center" justifyContent="space-between">
            <Text>DQL usada (todos os SDLC events do período · filtrados client-side)</Text>
            <Button variant="default" onClick={() => setShowDql((v) => !v)}>
              {showDql ? "Ocultar" : "Mostrar"}
            </Button>
          </Flex>
          {showDql && (
            <pre
              style={{
                margin: 0,
                padding: 12,
                background: "var(--dt-colors-background-surface-primary-default)",
                fontSize: 12,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {activity.dqlQuery}
            </pre>
          )}
        </Flex>
      </Surface>
    </Flex>
  );
};
