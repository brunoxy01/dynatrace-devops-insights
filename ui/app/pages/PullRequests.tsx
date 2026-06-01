import React, { useMemo, useState } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text, ExternalLink } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import type { DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { Button } from "@dynatrace/strato-components/buttons";
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
  const { data: prsData, isLoading, rawSample, rawCount, matchedCount, dqlQuery } =
    useSDLCPullRequests();
  const [showRaw, setShowRaw] = useState(true);
  const [showDql, setShowDql] = useState(false);

  const rows = useMemo(() => {
    return prsData.filter((p) => {
      if (p.state !== "open") return false;
      if (applied.author && applied.author.length > 0 && !applied.author.includes(p.author))
        return false;
      if (
        applied.branch &&
        applied.branch.length > 0 &&
        !applied.branch.includes(p.branch)
      )
        return false;
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
      { id: "title", header: "Título", accessor: "title", width: "1fr" },
      {
        id: "repo",
        header: "Repositório",
        accessor: "repository",
        width: 320,
        cell: ({ rowData }) => (
          <ExternalLink href={repoUrl(rowData.repository)}>{rowData.repository}</ExternalLink>
        ),
      },
      { id: "branch", header: "Branch", accessor: "branch", width: 200 },
      { id: "author", header: "Autor", accessor: "author", width: 160 },
      {
        id: "provider",
        header: "Provider",
        accessor: (r) => providerLabel(r.provider),
        width: 120,
      },
      { id: "additions", header: "+", accessor: "additions", width: 90 },
      { id: "deletions", header: "-", accessor: "deletions", width: 90 },
      { id: "createdAt", header: "Criado em", accessor: "createdAt", width: 220 },
    ],
    [],
  );

  const hasData = matchedCount > 0;

  return (
    <Flex flexDirection="column" padding={24} gap={16}>
      <Flex flexDirection="column" gap={4} alignItems="flex-start">
        <Flex alignItems="center" gap={12}>
          <Heading level={2}>Pull / Merge Requests abertos</Heading>
          <Chip color={hasData ? "success" : "neutral"}>
            {hasData
              ? `${rows.length} aberto(s) · ${matchedCount}/${rawCount} eventos na watchlist`
              : "sem eventos"}
          </Chip>
          {isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>
          {hasData
            ? `${range.label} · dados reais dos SDLC events ingeridos via webhook`
            : `Sem eventos pull_request no Grail para ${range.label}.`}
        </Paragraph>
      </Flex>

      {rawSample && (
        <Surface
          padding={16}
          elevation="raised"
          style={{ borderLeft: "4px solid var(--dt-colors-border-accent-default)" }}
        >
          <Flex flexDirection="column" gap={8}>
            <Flex alignItems="center" justifyContent="space-between">
              <Flex flexDirection="column" gap={2}>
                <Text>
                  <strong>Debug — JSON do primeiro evento.</strong> Se "Autor" ou "Título"
                  estiverem vazios, me copie tudo abaixo aqui no chat que eu corrijo o mapper.
                </Text>
              </Flex>
              <Button variant="default" onClick={() => setShowRaw((v) => !v)}>
                {showRaw ? "Ocultar" : "Mostrar"}
              </Button>
            </Flex>
            {showRaw && (
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  background: "var(--dt-colors-background-surface-primary-default)",
                  fontSize: 12,
                  overflow: "auto",
                  maxHeight: 500,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {JSON.stringify(rawSample, null, 2)}
              </pre>
            )}
          </Flex>
        </Surface>
      )}

      {hasData ? (
        <DataTable data={rows} columns={columns} sortable resizable fullWidth />
      ) : (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Nenhum PR no período</Heading>
            <Paragraph>
              {rawCount > 0
                ? `${rawCount} eventos pull_request no Grail, mas nenhum bateu com a watchlist (brunoxy01/dynatrace-devops-insights).`
                : "Nenhum evento pull_request foi recebido no Grail. Confira o webhook do GitHub."}
            </Paragraph>
          </Flex>
        </Surface>
      )}

      <Surface padding={12} elevation="raised">
        <Flex flexDirection="column" gap={8}>
          <Flex alignItems="center" justifyContent="space-between">
            <Text>DQL usada (cole no Notebook pra explorar)</Text>
            <Button variant="default" onClick={() => setShowDql((v) => !v)}>
              {showDql ? "Ocultar" : "Mostrar"}
            </Button>
          </Flex>
          {showDql && (
            <pre
              style={{
                margin: 0,
                padding: 12,
                background: "var(--dt-colors-background-surface-primary-default)",
                fontSize: 12,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {dqlQuery}
            </pre>
          )}
        </Flex>
      </Surface>
    </Flex>
  );
};
