import React, { createContext, useContext, useMemo, useState } from "react";
import type { BranchStrategy } from "../data/types";

interface StrategyFilterValue {
  selected: BranchStrategy[];
  toggle: (s: BranchStrategy) => void;
  clear: () => void;
  isActive: (s: BranchStrategy) => boolean;
}

const StrategyFilterContext = createContext<StrategyFilterValue | undefined>(undefined);

export const StrategyFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<BranchStrategy[]>([]);

  const value = useMemo<StrategyFilterValue>(
    () => ({
      selected,
      toggle: (s) =>
        setSelected((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])),
      clear: () => setSelected([]),
      isActive: (s) => selected.includes(s),
    }),
    [selected],
  );

  return (
    <StrategyFilterContext.Provider value={value}>{children}</StrategyFilterContext.Provider>
  );
};

export const useStrategyFilter = (): StrategyFilterValue => {
  const ctx = useContext(StrategyFilterContext);
  if (!ctx) throw new Error("useStrategyFilter must be used inside StrategyFilterProvider");
  return ctx;
};
