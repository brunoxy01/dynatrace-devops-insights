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
  const { contributors, isLoading, rawCount } = useSDLCActivity();

  const rows = useMemo(() => {
    const authorFilter = applied.author;
    if (!authorFilter || authorFilter.length === 0) return contributors;
    return contributors.filter((c) => authorFilter.includes(c.name));
  }, [contributors, applied.author]);

  const columns = useMemo<DataTableColumnDef<Contributor>[]>(
    () => [
      { id: "name", header: "Desenvolvedor", accessor: "name", width: "1fr" },
      { id: "prsOpened", header: "PRs abertos", accessor: "prsOpened", width: 140 },
      { id: "prsMerged", header: "PRs concluídos", accessor: "prsMerged", width: 160 },
      { id: "commits", header: "Pushes", accessor: "commits", width: 130 },
      { id: "builds", header: "Builds", accessor: "builds", width: 120 },
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
          <Heading level={2}>Desenvolvedores</Heading>
          <Chip color={rows.length > 0 ? "success" : "neutral"}>
            {rows.length > 0
              ? `${rows.length} contribuidor${rows.length === 1 ? "" : "es"} · ${rawCount} eventos`
              : "sem dados"}
          </Chip>
          {isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>
          Contribuidores derivados dos SDLC events ingeridos no Grail · {range.label}
        </Paragraph>
      </Flex>

      {rows.length === 0 && !isLoading ? (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Ainda não temos contribuidores</Heading>
            <Paragraph>
              Os contribuidores aparecem aqui quando houver eventos `pull_request`, `push` ou
              `build` no Grail com autor identificado. Abra um PR ou faça um push pro repo
              conectado pra começar a popular.
            </Paragraph>
          </Flex>
        </Surface>
      ) : (
        <DataTable data={rows} columns={columns} sortable resizable fullWidth />
      )}
    </Flex>
  );
};
