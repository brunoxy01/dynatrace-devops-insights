import { useMemo } from "react";
import { useDql } from "@dynatrace-sdk/react-hooks";
import { useTimeRange } from "../state/TimeRangeContext";

interface DebugResult {
  total: number;
  byType: Record<string, number>;
  sample?: Record<string, unknown>;
  matchCount: number;
  isLoading: boolean;
}

const FALLBACK = "fetch dt.entity.host | limit 0";

// Hook de diagnóstico: busca TODOS os SDLC events do período (sem filtro de
// type nem repo) e procura, no JSON cru, eventos que contenham `needle`.
// Usado pra descobrir como um provider novo (GitLab/Azure) estrutura os eventos.
export function useSDLCDebug(needle: string): DebugResult {
  const { fromIso, toIso } = useTimeRange();
  const valid = new Date(fromIso).getTime() < new Date(toIso).getTime() - 60_000;
  const query = valid
    ? `fetch events, from: "${fromIso}", to: "${toIso}"
| filter event.kind == "SDLC_EVENT"
| sort timestamp desc
| limit 1000`
    : FALLBACK;
  const { data, isLoading } = useDql({ query });

  return useMemo(() => {
    const records = (data?.records ?? []) as Record<string, unknown>[];
    const byType: Record<string, number> = {};
    let sample: Record<string, unknown> | undefined;
    let matchCount = 0;
    for (const r of records) {
      const t = String(r["event.type"] ?? "(sem type)");
      byType[t] = (byType[t] ?? 0) + 1;
      if (needle && JSON.stringify(r).includes(needle)) {
        matchCount++;
        if (!sample) sample = r;
      }
    }
    return { total: records.length, byType, sample, matchCount, isLoading };
  }, [data, isLoading, needle]);
}
