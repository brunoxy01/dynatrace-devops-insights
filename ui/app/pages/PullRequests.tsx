import React, { useMemo, useState } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text, ExternalLink } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import type { DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { Chip } from "@dynatrace/strato-components/content";
import { Button } from "@dynatrace/strato-components/buttons";
import type { PullRequest } from "../data/types";
import { PROVIDERS } from "../data/types";
import { useFilters } from "../state/FilterContext";
import { useSDLCPullRequests } from "../hooks/useSDLCPullRequests";
import { useSDLCDebug } from "../hooks/useSDLCDebug";
import { useTimeRange } from "../state/TimeRangeContext";
import { repoUrl } from "../config";

const providerLabel = (id: PullRequest["provider"]): string =>
  PROVIDERS.find((p) => p.id === id)?.label ?? id;

export const PullRequests: React.FC = () => {
  const { applied } = useFilters();
  const { range } = useTimeRange();
  const { data: prsData, isLoading, matchedCount } = useSDLCPullRequests();
  const debug = useSDLCDebug("dynatrace-mr-lab");
  const [showDebug, setShowDebug] = useState(true);

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
        id: "repo",
        header: "Repositório",
        accessor: "repository",
        width: "1fr",
        alignment: "center",
        cell: ({ rowData }) => (
          <ExternalLink href={repoUrl(rowData.repository, rowData.provider)}>
            {rowData.repository}
          </ExternalLink>
        ),
      },
      {
        id: "branch",
        header: "Branch",
        accessor: (r) => r.branch || "—",
        width: 220,
      },
      {
        id: "author",
        header: "Autor",
        accessor: (r) => r.author || "—",
        width: 200,
      },
      {
        id: "provider",
        header: "Provider",
        accessor: (r) => providerLabel(r.provider),
        width: 140,
      },
      { id: "createdAt", header: "Criado em", accessor: "createdAt", width: 240 },
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

      <Surface
        padding={12}
        elevation="raised"
        style={{ borderLeft: "4px solid var(--dt-colors-border-accent-default)" }}
      >
        <Flex flexDirection="column" gap={8}>
          <Flex alignItems="center" justifyContent="space-between">
            <Text>
              🔧 Debug temporário (GitLab) — {debug.total} SDLC events no período ·{" "}
              {debug.matchCount} mencionam "dynatrace-mr-lab"
            </Text>
            <Button variant="default" onClick={() => setShowDebug((v) => !v)}>
              {showDebug ? "Ocultar" : "Mostrar"}
            </Button>
          </Flex>
          {showDebug && (
            <>
              <Text textStyle="small">
                event.types no período:{" "}
                {Object.entries(debug.byType)
                  .map(([t, n]) => `${t} (${n})`)
                  .join(" · ")}
              </Text>
              {debug.sample ? (
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: "var(--dt-colors-background-surface-primary-default)",
                    fontSize: 12,
                    overflow: "auto",
                    maxHeight: 460,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {JSON.stringify(debug.sample, null, 2)}
                </pre>
              ) : (
                <Text textStyle="small">
                  Nenhum evento contém "dynatrace-mr-lab" no período — o webhook do GitLab pode não
                  ter ingerido, ou o repo vem com outro nome. Aumente o time range.
                </Text>
              )}
            </>
          )}
        </Flex>
      </Surface>

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
