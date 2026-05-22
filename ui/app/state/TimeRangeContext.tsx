import React, { createContext, useContext, useMemo, useState } from "react";

export interface TimeRangeValue {
  from: string;
  to: string;
  label: string;
}

interface TimeRangeContextValue {
  range: TimeRangeValue;
  setRange: (r: TimeRangeValue) => void;
  fromIso: string;
  toIso: string;
}

const TimeRangeContext = createContext<TimeRangeContextValue | undefined>(undefined);

function resolveLabelToIso(value: string): string {
  if (/^\d{4}-/.test(value)) return value;
  const match = value.match(/now-(\d+)([mhd])/);
  if (!match) return new Date().toISOString();
  const n = Number(match[1]);
  const unit = match[2];
  const ms = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;
  return new Date(Date.now() - n * ms).toISOString();
}

const DEFAULT_RANGE: TimeRangeValue = {
  from: "now-30d",
  to: "now",
  label: "Últimos 30 dias",
};

export const TimeRangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [range, setRange] = useState<TimeRangeValue>(DEFAULT_RANGE);

  const value = useMemo<TimeRangeContextValue>(() => {
    const fromIso = resolveLabelToIso(range.from);
    const toIso = range.to === "now" ? new Date().toISOString() : resolveLabelToIso(range.to);
    return { range, setRange, fromIso, toIso };
  }, [range]);

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
};

export const useTimeRange = (): TimeRangeContextValue => {
  const ctx = useContext(TimeRangeContext);
  if (!ctx) throw new Error("useTimeRange must be used inside TimeRangeProvider");
  return ctx;
};
