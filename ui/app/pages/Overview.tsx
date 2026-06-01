import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Chip } from "@dynatrace/strato-components/content";
import { KpiCard } from "../components/KpiCard";
import { useSDLCActivity } from "../hooks/useSDLCActivity";
import { useSDLCPullRequests } from "../hooks/useSDLCPullRequests";
import { useTimeRange } from "../state/TimeRangeContext";

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { range } = useTimeRange();
  const activity = useSDLCActivity();
  const { data: prs, rawCount: prRawCount } = useSDLCPullRequests();

  const stats = useMemo(() => {
    const open = prs.filter((p) => p.state === "open").length;
    const top = activity.contributors[0];
    return {
      contributors: activity.totals.distinctAuthors,
      pushes: activity.totals.pushEvents,
      builds: activity.totals.buildEvents,
      runs: activity.totals.runEvents,
      openPrs: open,
      prEvents: prRawCount,
      topContributor: top?.name ?? "—",
      topContributorHint: top
        ? `${top.prsOpened} PRs · ${top.commits} pushes · ${top.builds} builds`
        : undefined,
    };
  }, [activity, prs, prRawCount]);

  const hasAnyData =
    activity.rawCount > 0 || prRawCount > 0 || activity.contributors.length > 0;

  return (
    <Flex flexDirection="column" padding={24} gap={24}>
      <Flex flexDirection="column" gap={4}>
        <Flex alignItems="center" gap={12}>
          <Heading>DevOps Insights</Heading>
          <Chip color={hasAnyData ? "success" : "neutral"}>
            {hasAnyData
              ? `SDLC events (Grail) · ${activity.rawCount + prRawCount} eventos`
              : "sem dados"}
          </Chip>
          {activity.isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>
          Visão consolidada de produtividade de engenharia · {range.label} · fonte: SDLC events
          ingeridos via webhook
        </Paragraph>
      </Flex>

      {!hasAnyData && !activity.isLoading ? (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Sem eventos SDLC no período</Heading>
            <Paragraph>
              Ainda não há eventos no Grail para este intervalo. Algumas opções:
            </Paragraph>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                Aumentar o time range (canto superior direito → "Last 24 hours" ou maior)
              </li>
              <li>Abrir um PR ou empurrar um commit pro repo conectado</li>
              <li>Conferir se o webhook está ativo (Settings → Webhooks no GitHub)</li>
            </ul>
          </Flex>
        </Surface>
      ) : (
        <>
          <Flex gap={16} flexWrap="wrap">
            <KpiCard
              label="PRs / MRs abertos"
              value={stats.openPrs}
              hint={`${stats.prEvents} eventos`}
              onClick={() => navigate("/pull-requests")}
            />
            <KpiCard
              label="Pushes"
              value={stats.pushes}
              hint="commits empurrados"
            />
            <KpiCard label="Builds" value={stats.builds} />
            <KpiCard label="Workflow runs" value={stats.runs} />
            <KpiCard
              label="Contribuidores"
              value={stats.contributors}
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
                <Text>Sem contribuidores identificados ainda.</Text>
              ) : (
                activity.contributors.slice(0, 10).map((c, i) => (
                  <Flex key={c.name} justifyContent="space-between" alignItems="center">
                    <Text>
                      {i + 1}. {c.name}
                    </Text>
                    <Text>
                      {c.prsOpened} PRs · {c.commits} pushes · {c.builds} builds
                    </Text>
                  </Flex>
                ))
              )}
            </Flex>
          </Surface>
        </>
      )}
    </Flex>
  );
};
