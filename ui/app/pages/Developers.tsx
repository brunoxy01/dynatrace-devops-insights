import React, { useMemo } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import type { DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { Chip } from "@dynatrace/strato-components/content";
import { useSDLCActivity, type Contributor } from "../hooks/useSDLCActivity";
import { useTimeRange } from "../state/TimeRangeContext";
import { useFilters } from "../state/FilterContext";

const fmtTimestamp = (iso: string): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export const Developers: React.FC = () => {
  const { applied } = useFilters();
  const { range } = useTimeRange();
  const { contributors, isLoading, matchedCount } = useSDLCActivity();

  const rows = useMemo(() => {
    if (!applied.author?.length) return contributors;
    return contributors.filter((c) => applied.author!.includes(c.name));
  }, [contributors, applied.author]);

  const columns = useMemo<DataTableColumnDef<Contributor>[]>(
    () => [
      { id: "name", header: "Desenvolvedor", accessor: "name", width: "1fr" },
      { id: "prsOpened", header: "PRs abertos", accessor: "prsOpened", width: 140 },
      { id: "prsMerged", header: "PRs concluídos", accessor: "prsMerged", width: 160 },
      { id: "commits", header: "Commits", accessor: "commits", width: 150 },
      {
        id: "lastActivity",
        header: "Última atividade",
        accessor: (c) => fmtTimestamp(c.lastActivity),
        width: 220,
      },
    ],
    [],
  );

  return (
    <Flex flexDirection="column" padding={24} gap={16}>
      <Flex flexDirection="column" gap={4} alignItems="flex-start">
        <Flex alignItems="center" gap={12}>
          <Heading level={2}>Contribuidores</Heading>
          <Chip color={rows.length > 0 ? "success" : "neutral"}>
            {rows.length > 0 ? `${rows.length} contribuidor(es)` : "sem dados"}
          </Chip>
          {isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>Contribuidores derivados dos SDLC events · {range.label}</Paragraph>
      </Flex>

      {rows.length === 0 && !isLoading ? (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>
              {matchedCount > 0
                ? "Eventos sem autor identificado"
                : "Sem eventos no período"}
            </Heading>
            <Paragraph>
              {matchedCount > 0
                ? "Há eventos no Grail mas nenhum trouxe o autor. Pode ser evento de sistema (workflow run) sem usuário associado."
                : "Abra um PR ou faça um push pro repositório conectado pra começar a popular."}
            </Paragraph>
          </Flex>
        </Surface>
      ) : (
        <DataTable data={rows} columns={columns} sortable resizable fullWidth />
      )}
    </Flex>
  );
};
