import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { builds as mockBuilds } from "../data/mockData";
import type { Build } from "../data/types";
import { useTimeRange } from "../state/TimeRangeContext";

interface UseSDLCBuildsResult {
  data: Build[];
  isLoading: boolean;
  error?: Error;
  source: "grail" | "mock";
}

function mapDqlRecordToBuild(r: Record<string, unknown>, i: number): Build {
  const status = String(r["event.status"] ?? r["build.status"] ?? "success");
  const startedAt = String(r["timestamp"] ?? r["start_time"] ?? new Date().toISOString());
  const finishedAt = r["end_time"] ? String(r["end_time"]) : undefined;
  return {
    id: String(r["build.id"] ?? r["cicd.task.run.id"] ?? `grail-${i}`),
    pipelineId: String(r["cicd.pipeline.name"] ?? "unknown"),
    repository: String(r["vcs.repository.url"] ?? r["vcs.repository.name"] ?? "unknown"),
    provider: "github",
    branch: String(r["vcs.repository.change.target_revision"] ?? r["vcs.repository.ref.name"] ?? "main"),
    commitSha: String(r["vcs.repository.commit.sha"] ?? "").slice(0, 7),
    author: String(r["vcs.repository.change.author"] ?? "unknown"),
    status:
      status === "finished" || status === "success"
        ? "success"
        : status === "failure" || status === "failed"
          ? "failure"
          : status === "running" || status === "started"
            ? "running"
            : "cancelled",
    durationSec: Number(r["duration"] ?? 0) / 1_000_000_000,
    startedAt,
    finishedAt,
  };
}

const FALLBACK_QUERY = "fetch dt.entity.host | limit 0";

export function useSDLCBuilds(): UseSDLCBuildsResult {
  const { fromIso, toIso } = useTimeRange();

  const isValidRange = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;

  const query = isValidRange
    ? `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| filter event.type == "build" or event.type == "task"
| filter event.category == "task"
| sort timestamp desc
| limit 200`
    : FALLBACK_QUERY;

  const { data, isLoading, error } = useDql({ query });

  return useMemo(() => {
    const records = data?.records ?? [];
    if (!isValidRange || error || records.length === 0) {
      return { data: mockBuilds, isLoading, error: error as Error | undefined, source: "mock" };
    }
    return {
      data: records.map((r, i) => mapDqlRecordToBuild(r as Record<string, unknown>, i)),
      isLoading,
      source: "grail",
    };
  }, [data, isLoading, error, isValidRange]);
}
