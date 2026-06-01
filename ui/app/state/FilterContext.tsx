import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { FilterFieldTree } from "@dynatrace/strato-components/filters";
import type { Provider } from "../data/types";

export interface AppliedFilters {
  provider?: Provider[];
  repository?: string[];
  environment?: string[];
  author?: string[];
  branch?: string[];
}

interface FilterContextValue {
  rawValue: string;
  setRawValue: (v: string) => void;
  applied: AppliedFilters;
  apply: (tree: FilterFieldTree) => void;
  reset: () => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

function parseTreeToFilters(tree: FilterFieldTree): AppliedFilters {
  const out: AppliedFilters = {};
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      children?: unknown[];
      key?: { value?: string };
      value?: { value?: string; children?: unknown[] };
    };
    if (n.type === "Statement" && n.key?.value) {
      const k = n.key.value as keyof AppliedFilters;
      const val = n.value;
      const collected: string[] = [];
      if (val && "value" in val && typeof val.value === "string") {
        collected.push(val.value);
      } else if (val && "children" in val && Array.isArray(val.children)) {
        val.children.forEach((c) => {
          const cn = c as { value?: string };
          if (cn?.value) collected.push(cn.value);
        });
      }
      if (collected.length > 0) {
        const existing = out[k] ?? [];
        out[k] = [...existing, ...collected] as never;
      }
    }
    if (Array.isArray(n.children)) n.children.forEach(visit);
  };
  visit(tree);
  return out;
}

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawValue, setRawValue] = useState("");
  const [applied, setApplied] = useState<AppliedFilters>({});

  const apply = useCallback((tree: FilterFieldTree) => {
    setApplied(parseTreeToFilters(tree));
  }, []);

  const reset = useCallback(() => {
    setRawValue("");
    setApplied({});
  }, []);

  const value = useMemo(
    () => ({ rawValue, setRawValue, applied, apply, reset }),
    [rawValue, applied, apply, reset],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used inside FilterProvider");
  return ctx;
}
