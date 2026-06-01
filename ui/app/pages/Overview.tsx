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

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { range } = useTimeRange();
  const activity = useSDLCActivity();
  const { data: prs, rawCount: prRawCount } = useSDLCPullRequests();
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
      totalEvents: activity.rawCount + prRawCount,
      topContributor: top?.name ?? "—",
      topContributorHint: top
        ? `${top.prsOpened} PRs · ${top.commits} commits · ${top.builds} builds`
        : undefined,
    };
  }, [activity, prs, prRawCount]);

  const hasAnyData = stats.totalEvents > 0;

  return (
    <Flex flexDirection="column" padding={24} gap={24}>
      <Flex flexDirection="column" gap={4}>
        <Flex alignItems="center" gap={12}>
          <Heading>DevOps Insights</Heading>
          <Chip color={hasAnyData ? "success" : "neutral"}>
            {hasAnyData ? `SDLC events (Grail) · ${stats.totalEvents} eventos` : "sem dados"}
          </Chip>
          {activity.isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>
          Visão consolidada de produtividade de engenharia · {range.label} · repos:{" "}
          {REPO_WATCHLIST.map((r, i) => (
            <React.Fragment key={r}>
              {i > 0 && ", "}
              <ExternalLink href={repoUrl(r)}>{r}</ExternalLink>
            </React.Fragment>
          ))}
        </Paragraph>
      </Flex>

      {!hasAnyData && !activity.isLoading ? (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Sem eventos SDLC no período</Heading>
            <Paragraph>
              Ainda não há eventos no Grail para esses repos neste intervalo. Tente:
            </Paragraph>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Aumentar o time range (canto superior direito)</li>
              <li>Abrir um PR, fazer um push, rodar o workflow</li>
              <li>Conferir se o webhook do GitHub está ativo</li>
            </ul>
          </Flex>
        </Surface>
      ) : (
        <>
          <Flex gap={16} flexWrap="wrap">
            <KpiCard
              label="Commits / pushes"
              value={stats.commits}
              hint="eventos push"
            />
            <KpiCard
              label="PRs / MRs abertos"
              value={stats.openPrs}
              hint={`${stats.prEvents} eventos pull_request`}
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

          <Surface padding={16} elevation="raised" className="dt-hover-card">
            <Flex flexDirection="column" gap={12}>
              <Heading level={4}>Atividade recente por contribuidor</Heading>
              {activity.contributors.length === 0 ? (
                <Text>
                  Sem contribuidores identificados ainda — o adapter pode não estar populando o
                  field de autor nos eventos. Confira na página de PRs / MRs, no painel Debug, qual
                  o nome do campo no JSON.
                </Text>
              ) : (
                activity.contributors.slice(0, 10).map((c, i) => (
                  <Flex key={c.name} justifyContent="space-between" alignItems="center">
                    <Text>
                      {i + 1}. {c.name}
                    </Text>
                    <Text>
                      {c.prsOpened} PRs · {c.commits} commits · {c.builds} builds
                    </Text>
                  </Flex>
                ))
              )}
            </Flex>
          </Surface>

          <Surface padding={12} elevation="raised">
            <Flex flexDirection="column" gap={8}>
              <Flex alignItems="center" justifyContent="space-between">
                <Text>DQL usada para os KPIs (todos os SDLC events do repo)</Text>
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
        </>
      )}
    </Flex>
  );
};
