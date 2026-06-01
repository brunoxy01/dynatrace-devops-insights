import React, { useMemo } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";
import { Chip } from "@dynatrace/strato-components/content";
import type { Contributor } from "../hooks/useSDLCActivity";
import type { PullRequest } from "../data/types";

interface Insight {
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
}

interface Props {
  contributors: Contributor[];
  prs: PullRequest[];
  pushes: number;
}

function buildInsights({ contributors, prs, pushes }: Props): Insight[] {
  const out: Insight[] = [];
  const openPrs = prs.filter((p) => p.state === "open");

  // PRs parados (sem update há mais de 48h)
  const stale = openPrs.filter((p) => {
    const ageH = (Date.now() - new Date(p.updatedAt).getTime()) / 3_600_000;
    return ageH > 48;
  });
  if (stale.length > 0) {
    out.push({
      severity: "warning",
      title: `${stale.length} PR aberto há mais de 48h`,
      detail: `Revisão pode estar travada. Repos: ${[...new Set(stale.map((p) => p.repository))].join(", ")}.`,
    });
  }

  // Bus factor
  if (contributors.length === 1) {
    out.push({
      severity: "info",
      title: "Um único contribuidor ativo no período",
      detail: `Toda a atividade veio de ${contributors[0].name}. Conforme o time crescer, este painel mostra a distribuição entre autores do GitHub/GitLab/Azure.`,
    });
  } else if (contributors.length > 1) {
    const top = contributors[0];
    const totalActions = contributors.reduce(
      (a, c) => a + c.prsOpened + c.commits + c.builds,
      0,
    );
    const topActions = top.prsOpened + top.commits + top.builds;
    const pct = Math.round((topActions / Math.max(totalActions, 1)) * 100);
    if (pct >= 70) {
      out.push({
        severity: "warning",
        title: `Concentração de atividade em ${top.name} (${pct}%)`,
        detail: "A maior parte das entregas está concentrada em um contribuidor. Avalie distribuir a carga.",
      });
    }
  }

  // Ritmo de commits
  if (pushes > 0) {
    out.push({
      severity: "info",
      title: `${pushes} push(es) no período`,
      detail:
        openPrs.length > 0
          ? `${openPrs.length} PR(s) aberto(s) acompanhando o ritmo de commits.`
          : "Commits chegando direto sem PR aberto no momento.",
    });
  }

  if (out.length === 0) {
    out.push({
      severity: "info",
      title: "Sem sinais de alerta",
      detail: "Nenhum PR parado, atividade distribuída. Tudo dentro do esperado para o período.",
    });
  }

  return out;
}

const severityColor: Record<Insight["severity"], "primary" | "warning" | "critical"> = {
  info: "primary",
  warning: "warning",
  critical: "critical",
};

export const InsightsPanel: React.FC<Props> = (props) => {
  const insights = useMemo(() => buildInsights(props), [props]);

  return (
    <Surface padding={16} elevation="raised" className="dt-hover-card">
      <Flex flexDirection="column" gap={12}>
        <Flex alignItems="center" gap={8}>
          <Heading level={4}>Insights</Heading>
          <Chip color="primary">{insights.length}</Chip>
        </Flex>
        <Text textStyle="small">
          Análise automática dos seus SDLC events (commits, PRs, builds) ingeridos no Grail.
        </Text>
        <Flex flexDirection="column" gap={12}>
          {insights.map((i, idx) => (
            <Flex key={idx} flexDirection="column" gap={4}>
              <Flex alignItems="center" gap={8}>
                <Chip color={severityColor[i.severity]}>{i.severity}</Chip>
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
