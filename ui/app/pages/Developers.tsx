import React, { useMemo } from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import type { DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { developers } from "../data/mockData";
import { filterDevelopers } from "../data/applyFilters";
import type { Developer } from "../data/types";
import { PROVIDERS } from "../data/types";
import { useFilters } from "../state/FilterContext";

const providerLabel = (id: Developer["provider"]): string =>
  PROVIDERS.find((p) => p.id === id)?.label ?? id;

export const Developers: React.FC = () => {
  const { applied } = useFilters();

  const rows = useMemo(() => {
    const filtered = filterDevelopers(developers, applied);
    return [...filtered].sort((a, b) => b.commitsLast30d - a.commitsLast30d);
  }, [applied]);

  const columns = useMemo<DataTableColumnDef<Developer>[]>(
    () => [
      { id: "name", header: "Desenvolvedor", accessor: "name", width: "1fr" },
      {
        id: "provider",
        header: "Provider",
        accessor: (r) => providerLabel(r.provider),
        width: 140,
      },
      { id: "commits", header: "Commits (30d)", accessor: "commitsLast30d", width: 140 },
      { id: "prsOpen", header: "PRs abertos", accessor: "pullRequestsOpened", width: 130 },
      { id: "prsMerged", header: "PRs mergeados", accessor: "pullRequestsMerged", width: 140 },
      { id: "added", header: "Linhas +", accessor: "linesAdded", width: 110 },
      { id: "removed", header: "Linhas -", accessor: "linesRemoved", width: 110 },
      { id: "lead", header: "Lead time (h)", accessor: "avgLeadTimeHours", width: 130 },
    ],
    [],
  );

  return (
    <Flex flexDirection="column" padding={24} gap={16}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={2}>Desenvolvedores</Heading>
        <Paragraph>Ranking por commits, PRs e lead time (últimos 30 dias).</Paragraph>
      </Flex>
      <DataTable data={rows} columns={columns} sortable resizable fullWidth />
    </Flex>
  );
};
