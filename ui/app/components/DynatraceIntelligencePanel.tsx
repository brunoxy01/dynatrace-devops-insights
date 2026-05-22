import React, { useMemo } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { Chip } from "@dynatrace/strato-components/content";
import type { Build, Deploy, PullRequest, Repository, Developer } from "../data/types";
import { inferBranchStrategy } from "../data/branchStrategy";

interface Insight {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
}

interface Props {
  repos: Repository[];
  prs: PullRequest[];
  builds: Build[];
  deploys: Deploy[];
  devs: Developer[];
}

function computeInsights({ repos, prs, builds, deploys, devs }: Omit<Props, never>): Insight[] {
  const insights: Insight[] = [];

  const oldPrs = prs.filter((p) => {
    const ageH = (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000;
    return p.state === "open" && ageH > 72;
  });
  if (oldPrs.length > 0) {
    insights.push({
      severity: oldPrs.length >= 3 ? "warning" : "info",
      title: `${oldPrs.length} PR${oldPrs.length === 1 ? "" : "s"} aberto há mais de 72h`,
      detail: `Revisão lenta detectada em: ${oldPrs.slice(0, 3).map((p) => `${p.repository}#${p.number}`).join(", ")}`,
    });
  }

  const total = builds.length;
  const fails = builds.filter((b) => b.status === "failure").length;
  const failRate = total > 0 ? Math.round((fails / total) * 100) : 0;
  if (failRate >= 20) {
    insights.push({
      severity: failRate >= 40 ? "critical" : "warning",
      title: `Taxa de falha de build em ${failRate}%`,
      detail: `${fails} builds com erro de ${total} no período. Top repos: ${[...new Set(builds.filter((b) => b.status === "failure").map((b) => b.repository))].slice(0, 3).join(", ")}`,
    });
  }

  const prodDeploys = deploys.filter((d) => d.environment === "production");
  if (prodDeploys.length === 0 && deploys.length > 0) {
    insights.push({
      severity: "info",
      title: "Nenhum deploy em produção no período",
      detail: `${deploys.length} deploys em dev/staging mas zero em prod. Verifique gates de promoção.`,
    });
  }

  const noStrategy = repos.filter((r) => inferBranchStrategy(r) === "none");
  if (noStrategy.length > 0) {
    insights.push({
      severity: "warning",
      title: `${noStrategy.length} repo${noStrategy.length === 1 ? "" : "s"} sem estratégia clara`,
      detail: `Mistura de padrões gitflow + trunk: ${noStrategy.slice(0, 3).map((r) => r.fullName).join(", ")}. Considere alinhar com o time.`,
    });
  }

  const slowDevs = devs.filter((d) => d.avgLeadTimeHours > 24);
  if (slowDevs.length > 0) {
    insights.push({
      severity: "info",
      title: `Lead time elevado para ${slowDevs.length} dev${slowDevs.length === 1 ? "" : "s"}`,
      detail: `Tempo médio de PR > 24h: ${slowDevs.slice(0, 3).map((d) => d.name).join(", ")}. Pode indicar gargalo de review.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      severity: "info",
      title: "Nenhuma anomalia detectada",
      detail: "Métricas dentro dos limites esperados para o período selecionado.",
    });
  }

  return insights;
}

const colorMap: Record<Insight["severity"], "primary" | "warning" | "critical"> = {
  info: "primary",
  warning: "warning",
  critical: "critical",
};

export const DynatraceIntelligencePanel: React.FC<Props> = ({ repos, prs, builds, deploys, devs }) => {
  const insights = useMemo(
    () => computeInsights({ repos, prs, builds, deploys, devs }),
    [repos, prs, builds, deploys, devs],
  );

  return (
    <Surface padding={16} elevation="raised" className="dt-hover-card">
      <Flex flexDirection="column" gap={12}>
        <Flex alignItems="center" gap={8}>
          <Heading level={4}>Dynatrace Intelligence</Heading>
          <Chip color="primary">{insights.length}</Chip>
        </Flex>
        <Paragraph>
          Anomalias e sugestões detectadas automaticamente sobre os dados filtrados.
        </Paragraph>
        <Flex flexDirection="column" gap={12}>
          {insights.map((i, idx) => (
            <Flex key={idx} flexDirection="column" gap={4}>
              <Flex alignItems="center" gap={8}>
                <Chip color={colorMap[i.severity]}>{i.severity}</Chip>
                <Text>{i.title}</Text>
              </Flex>
              <Text textStyle="small">{i.detail}</Text>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Surface>
  );
};
