import React, { useMemo } from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import type { DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { Button } from "@dynatrace/strato-components/buttons";
import { Chip } from "@dynatrace/strato-components/content";
import { showToast } from "@dynatrace/strato-components/notifications";
import { repositories } from "../data/mockData";
import { filterPullRequests, filterRepositories } from "../data/applyFilters";
import type { PullRequest } from "../data/types";
import { PROVIDERS } from "../data/types";
import { useFilters } from "../state/FilterContext";
import { useSDLCPullRequests } from "../hooks/useSDLCPullRequests";
import { useTimeRange } from "../state/TimeRangeContext";

const providerLabel = (id: PullRequest["provider"]): string =>
  PROVIDERS.find((p) => p.id === id)?.label ?? id;

const WORKFLOW_ID = "approve-pr-workflow";

function triggerApproveWorkflow(pr: PullRequest): void {
  showToast({
    type: "info",
    title: `Workflow disparado`,
    message: `Aprovação de ${pr.repository} PR #${pr.number} enviada para o workflow ${WORKFLOW_ID}.`,
    lifespan: 6000,
  });
}

export const PullRequests: React.FC = () => {
  const { applied } = useFilters();
  const { range } = useTimeRange();
  const { data: prsData, source, isLoading } = useSDLCPullRequests();

  const rows = useMemo(() => {
    const repoSet = new Set(filterRepositories(repositories, applied).map((r) => r.fullName));
    return filterPullRequests(prsData, applied, repoSet).filter((p) => p.state === "open");
  }, [applied, prsData]);

  const columns = useMemo<DataTableColumnDef<PullRequest>[]>(
    () => [
      {
        id: "number",
        header: "PR / MR",
        accessor: (r) => `#${r.number}`,
        width: 100,
      },
      { id: "title", header: "Título", accessor: "title", width: "1fr" },
      { id: "repo", header: "Repositório", accessor: "repository", width: 240 },
      {
        id: "provider",
        header: "Provider",
        accessor: (r) => providerLabel(r.provider),
        width: 140,
      },
      { id: "author", header: "Autor", accessor: "author", width: 160 },
      { id: "additions", header: "Linhas +", accessor: "additions", width: 110 },
      { id: "deletions", header: "Linhas -", accessor: "deletions", width: 110 },
      { id: "createdAt", header: "Criado em", accessor: "createdAt", width: 200 },
      {
        id: "actions",
        header: "Ações",
        accessor: () => "",
        width: 140,
        cell: ({ rowData }) => (
          <Button
            variant="accent"
            onClick={() => triggerApproveWorkflow(rowData)}
            aria-label={`Aprovar ${rowData.repository} #${rowData.number}`}
          >
            Aprovar
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <Flex flexDirection="column" padding={24} gap={16}>
      <Flex flexDirection="column" gap={4} alignItems="flex-start">
        <Flex alignItems="center" gap={12}>
          <Heading level={2}>Pull / Merge Requests abertos</Heading>
          <Chip color={source === "grail" ? "success" : "neutral"}>
            {source === "grail" ? "SDLC events (Grail)" : "mock"}
          </Chip>
          {isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>
          {source === "grail"
            ? `${rows.length} PRs/MRs abertos vindos dos webhooks do GitHub/GitLab/Azure DevOps · ${range.label}`
            : "Sem ingestão SDLC detectada — mostrando mock data. Configure webhooks pra ver dados reais (ver README)."}{" "}
          Botão <strong>Aprovar</strong> dispara um Workflow do Dynatrace que chama a API do provider.
        </Paragraph>
      </Flex>
      <DataTable data={rows} columns={columns} sortable resizable fullWidth />
    </Flex>
  );
};
