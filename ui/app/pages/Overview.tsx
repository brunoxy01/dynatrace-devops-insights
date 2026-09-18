import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Chip } from "@dynatrace/strato-components/content";
import { KpiCard } from "../components/KpiCard";
import { InsightsPanel } from "../components/InsightsPanel";
import { ProviderIcon } from "../components/ProviderIcon";
import { useSDLCActivity } from "../hooks/useSDLCActivity";
import { useSDLCPullRequests } from "../hooks/useSDLCPullRequests";
import { useTimeRange } from "../state/TimeRangeContext";
import { useFilters } from "../state/FilterContext";
import { matchesContributorFilters, matchesPrFilters } from "../data/filterMatch";

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
  const { applied } = useFilters();
  const activity = useSDLCActivity();
  const { data: prs, matchedCount: prMatched } = useSDLCPullRequests();

  const filteredPrs = useMemo(
    () => prs.filter((p) => p.state === "open" && matchesPrFilters(p, applied)),
    [prs, applied],
  );
  const filteredContributors = useMemo(
    () => activity.contributors.filter((c) => matchesContributorFilters(c, applied)),
    [activity.contributors, applied],
  );

  const stats = useMemo(() => {
    const top = filteredContributors[0];
    return {
      openPrs: filteredPrs.length,
      contributors: filteredContributors.length,
      topContributor: top?.name ?? "—",
      topContributorProvider: top?.provider,
      topContributorHint: top ? `${top.prsOpen} PR(s) aberto(s)` : undefined,
    };
  }, [filteredPrs, filteredContributors]);

  const hasData = activity.matchedCount > 0 || prMatched > 0;
  const hasFilteredData = filteredPrs.length > 0 || filteredContributors.length > 0;
  const isFilterActive = Object.keys(applied).length > 0;

  return (
    <Flex flexDirection="column" padding={24} gap={24}>
      <Flex flexDirection="column" gap={4}>
        <Flex alignItems="center" gap={12}>
          <Heading>DevOps Insights</Heading>
          <Chip color={hasFilteredData ? "success" : "neutral"}>
            {hasFilteredData ? "dados reais (Grail)" : "sem dados"}
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
      ) : !hasFilteredData && !activity.isLoading ? (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Nenhum dado bate com o filtro aplicado</Heading>
            <Paragraph>
              Há eventos no período, mas nenhum casa com o filtro digitado na barra acima. Ajuste
              ou remova o filtro.
            </Paragraph>
          </Flex>
        </Surface>
      ) : (
        <>
          <Flex gap={16} flexWrap="wrap">
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
              icon={
                stats.topContributorProvider && (
                  <ProviderIcon provider={stats.topContributorProvider} size={20} />
                )
              }
              onClick={() => navigate("/developers")}
            />
          </Flex>

          <InsightsPanel contributors={filteredContributors} prs={filteredPrs} />

          <Surface padding={16} elevation="raised" className="dt-hover-card">
            <Flex flexDirection="column" gap={12}>
              <Flex alignItems="center" gap={8}>
                <Heading level={4}>Contribuidores</Heading>
                {isFilterActive && <Chip color="primary">filtrado</Chip>}
              </Flex>
              {filteredContributors.length === 0 ? (
                <Text>Nenhum contribuidor identificado no período.</Text>
              ) : (
                filteredContributors.map((c, i) => (
                  <Flex
                    key={`${c.provider}|${c.name}`}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Flex alignItems="center" gap={8}>
                      <Text>{i + 1}.</Text>
                      <ProviderIcon provider={c.provider} size={16} />
                      <Text>{c.name}</Text>
                    </Flex>
                    <Text textStyle="small">
                      {c.prsOpen} PR(s) · {fmtRelative(c.lastActivity)}
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
