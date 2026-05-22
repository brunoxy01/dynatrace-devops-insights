import React, { useMemo } from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import type { DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { ExternalLink } from "@dynatrace/strato-components/typography";
import { repositories } from "../data/mockData";
import { filterRepositories } from "../data/applyFilters";
import type { Repository } from "../data/types";
import { PROVIDERS } from "../data/types";
import { useFilters } from "../state/FilterContext";
import { inferBranchStrategy } from "../data/branchStrategy";
import { BranchStrategyBadge } from "../components/BranchStrategyBadge";

const providerLabel = (id: Repository["provider"]): string =>
  PROVIDERS.find((p) => p.id === id)?.label ?? id;

export const Repositories: React.FC = () => {
  const { applied } = useFilters();

  const rows = useMemo(() => filterRepositories(repositories, applied), [applied]);

  const columns = useMemo<DataTableColumnDef<Repository>[]>(
    () => [
      {
        id: "name",
        header: "Repositório",
        accessor: "fullName",
        width: "1fr",
        cell: ({ rowData }) => (
          <ExternalLink href={rowData.url}>{rowData.fullName}</ExternalLink>
        ),
      },
      {
        id: "provider",
        header: "Provider",
        accessor: (r) => providerLabel(r.provider),
        width: 140,
      },
      { id: "defaultBranch", header: "Default", accessor: "defaultBranch", width: 120 },
      { id: "openBranches", header: "Branches", accessor: "openBranches", width: 110 },
      { id: "openPRs", header: "PRs/MRs abertos", accessor: "openPullRequests", width: 160 },
      {
        id: "strategy",
        header: "Estratégia",
        accessor: (r) => inferBranchStrategy(r),
        width: 160,
        cell: ({ rowData }) => <BranchStrategyBadge strategy={inferBranchStrategy(rowData)} />,
      },
      {
        id: "service",
        header: "Service",
        accessor: (r) => r.linkedServiceId ?? "—",
        width: 200,
      },
      { id: "lastActivity", header: "Última atividade", accessor: "lastActivityAt", width: 220 },
      {
        id: "archived",
        header: "Status",
        accessor: (r) => (r.isArchived ? "Arquivado" : "Ativo"),
        width: 120,
      },
    ],
    [],
  );

  return (
    <Flex flexDirection="column" padding={24} gap={16}>
      <Flex flexDirection="column" gap={4}>
        <Heading level={2}>Repositórios</Heading>
        <Paragraph>Repos por provider, branches, PRs e estratégia de branch inferida.</Paragraph>
      </Flex>
      <DataTable data={rows} columns={columns} sortable resizable fullWidth />
    </Flex>
  );
};
