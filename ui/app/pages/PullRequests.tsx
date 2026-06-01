import React, { useMemo } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text, ExternalLink } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import type { DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { Chip } from "@dynatrace/strato-components/content";
import type { PullRequest } from "../data/types";
import { PROVIDERS } from "../data/types";
import { useFilters } from "../state/FilterContext";
import { useSDLCPullRequests } from "../hooks/useSDLCPullRequests";
import { useTimeRange } from "../state/TimeRangeContext";
import { repoUrl } from "../config";

const providerLabel = (id: PullRequest["provider"]): string =>
  PROVIDERS.find((p) => p.id === id)?.label ?? id;

export const PullRequests: React.FC = () => {
  const { applied } = useFilters();
  const { range } = useTimeRange();
  const { data: prsData, isLoading, matchedCount } = useSDLCPullRequests();

  const rows = useMemo(() => {
    return prsData.filter((p) => {
      if (p.state !== "open") return false;
      if (applied.author?.length && !applied.author.includes(p.author)) return false;
      if (applied.branch?.length && !applied.branch.includes(p.branch)) return false;
      return true;
    });
  }, [prsData, applied]);

  const columns = useMemo<DataTableColumnDef<PullRequest>[]>(
    () => [
      {
        id: "number",
        header: "PR / MR",
        accessor: "number",
        width: 100,
        cell: ({ rowData }) =>
          rowData.url ? (
            <ExternalLink href={rowData.url}>#{rowData.number}</ExternalLink>
          ) : (
            <Text>#{rowData.number}</Text>
          ),
      },
      {
        id: "title",
        header: "Título",
        accessor: (r) => r.title || "—",
        width: "1fr",
      },
      {
        id: "repo",
        header: "Repositório",
        accessor: "repository",
        width: 320,
        cell: ({ rowData }) => (
          <ExternalLink href={repoUrl(rowData.repository)}>{rowData.repository}</ExternalLink>
        ),
      },
      {
        id: "branch",
        header: "Branch",
        accessor: (r) => r.branch || "—",
        width: 200,
      },
      {
        id: "author",
        header: "Autor",
        accessor: (r) => r.author || "—",
        width: 180,
      },
      {
        id: "provider",
        header: "Provider",
        accessor: (r) => providerLabel(r.provider),
        width: 120,
      },
      { id: "createdAt", header: "Criado em", accessor: "createdAt", width: 220 },
    ],
    [],
  );

  return (
    <Flex flexDirection="column" padding={24} gap={16}>
      <Flex flexDirection="column" gap={4} alignItems="flex-start">
        <Flex alignItems="center" gap={12}>
          <Heading level={2}>Pull / Merge Requests abertos</Heading>
          <Chip color={matchedCount > 0 ? "success" : "neutral"}>
            {matchedCount > 0 ? `${rows.length} aberto(s)` : "sem PRs"}
          </Chip>
          {isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>{range.label} · dados dos SDLC events ingeridos via webhook</Paragraph>
      </Flex>

      {matchedCount > 0 ? (
        <DataTable data={rows} columns={columns} sortable resizable fullWidth />
      ) : (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Nenhum PR no período</Heading>
            <Paragraph>
              Abra ou atualize um PR no repositório conectado. Se já abriu, aumente o time range.
            </Paragraph>
          </Flex>
        </Surface>
      )}
    </Flex>
  );
};
