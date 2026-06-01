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
  const { data: prsData, isLoading, rawSample, rawCount, dqlQuery } = useSDLCPullRequests();
  const [showRaw, setShowRaw] = useState(true);
  const [showDql, setShowDql] = useState(false);

  const rows = useMemo(() => {
    return prsData.filter((p) => {
      if (p.state !== "open") return false;
      if (applied.author && applied.author.length > 0 && !applied.author.includes(p.author))
        return false;
      if (
        applied.repository &&
        applied.repository.length > 0 &&
        !applied.repository.includes(p.repository)
      )
        return false;
      if (
        applied.provider &&
        applied.provider.length > 0 &&
        !applied.provider.includes(p.provider)
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
        accessor: (r) => `#${r.number}`,
        width: 100,
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
      {
        id: "provider",
        header: "Provider",
        accessor: (r) => providerLabel(r.provider),
        width: 140,
      },
      { id: "author", header: "Autor", accessor: "author", width: 160 },
      { id: "additions", header: "Linhas +", accessor: "additions", width: 110 },
      { id: "deletions", header: "Linhas -", accessor: "deletions", width: 110 },
      { id: "createdAt", header: "Criado em", accessor: "createdAt", width: 220 },
    ],
    [],
  );

  const hasData = rawCount > 0;

  return (
    <Flex flexDirection="column" padding={24} gap={16}>
      <Flex flexDirection="column" gap={4} alignItems="flex-start">
        <Flex alignItems="center" gap={12}>
          <Heading level={2}>Pull / Merge Requests abertos</Heading>
          <Chip color={hasData ? "success" : "neutral"}>
            {hasData ? `SDLC events (Grail) · ${rawCount} eventos` : "sem eventos"}
          </Chip>
          {isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>
          {hasData
            ? `${rows.length} PR(s) abertos · ${range.label} · filtrando pelos repos da watchlist`
            : `Sem eventos pull_request no Grail para ${range.label}.`}
        </Paragraph>
      </Flex>

      <Surface padding={12} elevation="raised">
        <Flex flexDirection="column" gap={8}>
          <Flex alignItems="center" justifyContent="space-between">
            <Text>DQL usada nesta página (cole no Notebook pra explorar)</Text>
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

      {hasData ? (
        <DataTable data={rows} columns={columns} sortable resizable fullWidth />
      ) : (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Nenhum PR detectado no período</Heading>
            <Paragraph>Pra popular esta tela:</Paragraph>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                Confirme no GitHub que o webhook tem o evento <code>Pull requests</code> habilitado
              </li>
              <li>Aumente o time range (Last 24h ou mais)</li>
              <li>Abra ou atualize um PR pra disparar o evento</li>
            </ul>
          </Flex>
        </Surface>
      )}

      {hasData && rawSample && (
        <Surface padding={12} elevation="raised">
          <Flex flexDirection="column" gap={8}>
            <Flex alignItems="center" justifyContent="space-between">
              <Text>
                Debug — JSON completo do primeiro evento (me copia se o autor/título estiverem
                vazios pra eu corrigir o mapping)
              </Text>
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
                  maxHeight: 400,
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
    </Flex>
  );
};
