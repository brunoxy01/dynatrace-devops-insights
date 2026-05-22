import React from "react";
import { TimeframeSelector } from "@dynatrace/strato-components/filters";
import type { Timeframe } from "@dynatrace/strato-components/core";
import { useTimeRange } from "../state/TimeRangeContext";

export const TimeRangeFilter: React.FC = () => {
  const { range, setRange } = useTimeRange();

  const value = {
    from: range.from,
    to: range.to,
  };

  return (
    <TimeframeSelector
      value={value}
      onChange={(next: Timeframe | null) => {
        if (!next) {
          setRange({ from: "now-30d", to: "now", label: "Últimos 30 dias" });
          return;
        }
        const fromVal = next.from?.value ?? "now-30d";
        const toVal = next.to?.value ?? "now";
        setRange({
          from: fromVal,
          to: toVal,
          label: `${fromVal} → ${toVal}`,
        });
      }}
    />
  );
};
