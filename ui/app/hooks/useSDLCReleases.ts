import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import type { Release } from "../data/types";
import { useTimeRange } from "../state/TimeRangeContext";
import { useFilters } from "../state/FilterContext";
import { repoContainsFilterDql } from "../config";
import {
  eventProvider,
  isReleaseEvent,
  releaseAuthor,
  releaseName,
  releasePrerelease,
  releasePublishedAt,
  releaseTagName,
  releaseUrl,
  repoFullName,
} from "../data/sdlcFields";

interface UseSDLCReleasesResult {
  data: Release[];
  isLoading: boolean;
  error?: Error;
  rawCount: number;
  matchedCount: number;
}

function mapRecord(r: Record<string, unknown>, i: number): Release {
  const tagName = releaseTagName(r);
  const repository = repoFullName(r) || "unknown";
  return {
    id: tagName ? `release-${repository}-${tagName}` : `release-${i}`,
    tagName,
    name: releaseName(r) || tagName || "(sem nome)",
    repository,
    provider: eventProvider(r),
    author: releaseAuthor(r),
    url: releaseUrl(r),
    publishedAt: releasePublishedAt(r) || String(r["timestamp"] ?? ""),
    prerelease: releasePrerelease(r),
  };
}

// Cada release pode gerar mais de um evento (created/published/edited).
// Agrupa por repo+tag, mantém o mais recente.
function dedupLatestPerRelease(releases: Release[]): Release[] {
  const map = new Map<string, Release>();
  for (const rel of releases) {
    const key = rel.tagName ? `${rel.repository}@${rel.tagName}` : rel.id;
    const existing = map.get(key);
    if (
      !existing ||
      new Date(rel.publishedAt).getTime() >= new Date(existing.publishedAt).getTime()
    ) {
      map.set(key, rel);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

function buildQuery(fromIso: string, toIso: string, repoFilter: string): string {
  return `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
${repoFilter ? `| filter ${repoFilter}\n` : ""}| filter event.type == "release"
   or action == "published" or action == "released" or action == "created"
   or action == "edited" or action == "prereleased"
| sort timestamp desc
| limit 200`;
}

export function useSDLCReleases(): UseSDLCReleasesResult {
  const { fromIso, toIso } = useTimeRange();
  const { applied } = useFilters();
  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;
  const repoFilter = repoContainsFilterDql(applied.repository);
  const query = isValidRange ? buildQuery(fromIso, toIso, repoFilter) : FALLBACK_QUERY;
  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = (data?.records ?? []) as Record<string, unknown>[];
    if (!isValidRange || error) {
      return {
        data: [],
        isLoading,
        error: error as Error | undefined,
        rawCount: 0,
        matchedCount: 0,
      };
    }
    const releaseEvents = records.filter(isReleaseEvent);
    const mapped = releaseEvents.map(mapRecord);
    const identifiable = mapped.filter((rel) => rel.tagName);
    return {
      data: dedupLatestPerRelease(identifiable),
      isLoading,
      rawCount: records.length,
      matchedCount: mapped.length,
    };
  }, [data, isLoading, error, isValidRange, query]);
}
