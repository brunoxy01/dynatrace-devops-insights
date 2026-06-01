import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Chip } from "@dynatrace/strato-components/content";
import { KpiCard } from "../components/KpiCard";
import { InsightsPanel } from "../components/InsightsPanel";
import { useSDLCActivity } from "../hooks/useSDLCActivity";
import { useSDLCPullRequests } from "../hooks/useSDLCPullRequests";
import { useTimeRange } from "../state/TimeRangeContext";

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

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { range } = useTimeRange();
  const activity = useSDLCActivity();
  const { data: prs, matchedCount: prMatched } = useSDLCPullRequests();

  const stats = useMemo(() => {
    const open = prs.filter((p) => p.state === "open").length;
    const top = activity.contributors[0];
    return {
      commits: activity.totals.pushEvents,
      contributors: activity.totals.distinctAuthors,
      openPrs: open,
      topContributor: top?.name ?? "—",
      topContributorHint: top
        ? `${top.prsOpened} PRs · ${top.commits} commits`
        : undefined,
    };
  }, [activity, prs]);

  const hasData = activity.matchedCount > 0 || prMatched > 0;

  return (
    <Flex flexDirection="column" padding={24} gap={24}>
      <Flex flexDirection="column" gap={4}>
        <Flex alignItems="center" gap={12}>
          <Heading>DevOps Insights</Heading>
          <Chip color={hasData ? "success" : "neutral"}>
            {hasData ? "dados reais (Grail)" : "sem dados"}
          </Chip>
          {activity.isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>Produtividade de engenharia · {range.label}</Paragraph>
      </Flex>

      {!hasData && !activity.isLoading ? (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Sem eventos no período</Heading>
            <Paragraph>
              Abra um PR, faça um push ou rode o workflow. Se já fez, aumente o time range no
              canto superior direito.
            </Paragraph>
          </Flex>
        </Surface>
      ) : (
        <>
          <Flex gap={16} flexWrap="wrap">
            <KpiCard label="Commits / pushes" value={stats.commits} />
            <KpiCard
              label="PRs abertos"
              value={stats.openPrs}
              onClick={() => navigate("/pull-requests")}
            />
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

          <InsightsPanel
            contributors={activity.contributors}
            prs={prs}
            pushes={stats.commits}
          />

          <Surface padding={16} elevation="raised" className="dt-hover-card">
            <Flex flexDirection="column" gap={12}>
              <Heading level={4}>Contribuidores</Heading>
              {activity.contributors.length === 0 ? (
                <Text>Nenhum contribuidor identificado no período.</Text>
              ) : (
                activity.contributors.map((c, i) => (
                  <Flex key={c.name} justifyContent="space-between" alignItems="center">
                    <Text>
                      {i + 1}. {c.name}
                    </Text>
                    <Text textStyle="small">
                      {c.prsOpened} PRs · {c.commits} commits · {fmtRelative(c.lastActivity)}
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
