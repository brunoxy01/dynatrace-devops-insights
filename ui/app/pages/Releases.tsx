import React, { useMemo } from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph, Text, ExternalLink } from "@dynatrace/strato-components/typography";
import { DataTable } from "@dynatrace/strato-components/tables";
import type { DataTableColumnDef } from "@dynatrace/strato-components/tables";
import { Chip } from "@dynatrace/strato-components/content";
import { KpiCard } from "../components/KpiCard";
import { ProviderIcon } from "../components/ProviderIcon";
import { useSDLCReleases } from "../hooks/useSDLCReleases";
import { useSDLCCommitStats } from "../hooks/useSDLCCommitStats";
import { useTimeRange } from "../state/TimeRangeContext";
import { useFilters } from "../state/FilterContext";
import { matchesReleaseFilters } from "../data/filterMatch";
import type { Release } from "../data/types";
import { PROVIDERS } from "../data/types";
import { repoUrl } from "../config";

const providerLabel = (id: Release["provider"]): string =>
  PROVIDERS.find((p) => p.id === id)?.label ?? id;

const fmtDate = (iso: string): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export const Releases: React.FC = () => {
  const { range } = useTimeRange();
  const { applied } = useFilters();
  const { data: releases, isLoading, matchedCount } = useSDLCReleases();
  const { byRepo, totalCommits, isLoading: commitsLoading } = useSDLCCommitStats();

  const rows = useMemo(
    () => releases.filter((r) => matchesReleaseFilters(r, applied)),
    [releases, applied],
  );

  const columns = useMemo<DataTableColumnDef<Release>[]>(
    () => [
      {
        id: "tag",
        header: "Tag",
        accessor: "tagName",
        width: 140,
        cell: ({ rowData }) =>
          rowData.url ? (
            <ExternalLink href={rowData.url}>{rowData.tagName}</ExternalLink>
          ) : (
            <Text>{rowData.tagName}</Text>
          ),
      },
      { id: "name", header: "Nome", accessor: "name", width: "1fr" },
      {
        id: "repo",
        header: "Repositório",
        accessor: "repository",
        width: 300,
        cell: ({ rowData }) => (
          <ExternalLink href={repoUrl(rowData.repository, rowData.provider)}>
            {rowData.repository}
          </ExternalLink>
        ),
      },
      {
        id: "provider",
        header: "Provider",
        accessor: (r) => providerLabel(r.provider),
        width: 140,
        cell: ({ rowData }) => (
          <Flex alignItems="center" gap={6}>
            <ProviderIcon provider={rowData.provider} size={16} />
            <Text>{providerLabel(rowData.provider)}</Text>
          </Flex>
        ),
      },
      { id: "author", header: "Autor", accessor: (r) => r.author || "—", width: 160 },
      {
        id: "publishedAt",
        header: "Publicada em",
        accessor: (r) => fmtDate(r.publishedAt),
        width: 220,
      },
      {
        id: "prerelease",
        header: "Pre-release",
        accessor: (r) => (r.prerelease ? "sim" : "não"),
        width: 120,
      },
    ],
    [],
  );

  return (
    <Flex flexDirection="column" padding={24} gap={16}>
      <Flex flexDirection="column" gap={4} alignItems="flex-start">
        <Flex alignItems="center" gap={12}>
          <Heading level={2}>Releases</Heading>
          <Chip color={rows.length > 0 ? "success" : "neutral"}>
            {rows.length > 0 ? `${rows.length} release(s)` : "sem releases"}
          </Chip>
          {isLoading && <Text>carregando…</Text>}
        </Flex>
        <Paragraph>{range.label} · releases publicadas via webhook (evento SDLC "release")</Paragraph>
      </Flex>

      <Flex gap={16} flexWrap="wrap">
        <KpiCard label="Releases no período" value={rows.length} />
        <KpiCard
          label="Commits (estimado)"
          value={totalCommits}
          hint="Aproximado — array `commits` do webhook trunca em 20/push"
        />
      </Flex>

      <Surface padding={16} elevation="raised" className="dt-hover-card">
        <Flex flexDirection="column" gap={12}>
          <Heading level={4}>Commits por repositório (estimado)</Heading>
          {commitsLoading && byRepo.length === 0 ? (
            <Text>carregando…</Text>
          ) : byRepo.length === 0 ? (
            <Text>Nenhum push registrado no período.</Text>
          ) : (
            byRepo.map((r) => (
              <Flex key={r.repository} justifyContent="space-between" alignItems="center">
                <Text>{r.repository}</Text>
                <Text textStyle="small">{r.commits} commit(s)</Text>
              </Flex>
            ))
          )}
        </Flex>
      </Surface>

      {rows.length > 0 ? (
        <DataTable data={rows} columns={columns} sortable resizable fullWidth />
      ) : matchedCount > 0 ? (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Nenhuma release bate com o filtro aplicado</Heading>
            <Paragraph>
              Há {matchedCount} release(s) no período, mas nenhuma casa com o filtro digitado na
              barra acima.
            </Paragraph>
          </Flex>
        </Surface>
      ) : (
        <Surface padding={24} elevation="raised">
          <Flex flexDirection="column" gap={8} alignItems="flex-start">
            <Heading level={4}>Nenhuma release no período</Heading>
            <Paragraph>
              Publique uma release no GitHub/GitLab com o webhook de "Releases" habilitado. Se já
              publicou, aumente o time range.
            </Paragraph>
          </Flex>
        </Surface>
      )}
    </Flex>
  );
};
