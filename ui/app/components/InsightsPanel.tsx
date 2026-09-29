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
}

function buildInsights({ contributors, prs }: Props): Insight[] {
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

  // Volume de PRs abertos
  if (openPrs.length > 0) {
    out.push({
      severity: openPrs.length >= 5 ? "warning" : "info",
      title: `${openPrs.length} PR(s) aberto(s) no período`,
      detail:
        openPrs.length >= 5
          ? "Fila de revisão crescendo — avalie priorizar merges."
          : "Fluxo de revisão dentro do normal.",
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
    const totalPrs = contributors.reduce((a, c) => a + c.prsOpen, 0);
    const pct = Math.round((top.prsOpen / Math.max(totalPrs, 1)) * 100);
    if (pct >= 70) {
      out.push({
        severity: "warning",
        title: `Concentração de atividade em ${top.name} (${pct}%)`,
        detail: "A maior parte dos PRs está concentrada em um contribuidor. Avalie distribuir a carga.",
      });
    }
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
          Análise automática dos seus SDLC events (PRs/MRs) ingeridos no Grail.
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
