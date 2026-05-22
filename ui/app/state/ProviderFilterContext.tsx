import React, { createContext, useContext, useMemo, useState } from "react";
import type { Provider } from "../data/types";

interface ProviderFilterValue {
  selected: Provider[];
  toggle: (p: Provider) => void;
  clear: () => void;
  isActive: (p: Provider) => boolean;
}

const ProviderFilterContext = createContext<ProviderFilterValue | undefined>(undefined);

export const ProviderFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<Provider[]>([]);

  const value = useMemo<ProviderFilterValue>(
    () => ({
      selected,
      toggle: (p) =>
        setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])),
      clear: () => setSelected([]),
      isActive: (p) => selected.includes(p),
    }),
    [selected],
  );

  return (
    <ProviderFilterContext.Provider value={value}>{children}</ProviderFilterContext.Provider>
  );
};

export const useProviderFilter = (): ProviderFilterValue => {
  const ctx = useContext(ProviderFilterContext);
  if (!ctx) throw new Error("useProviderFilter must be used inside ProviderFilterProvider");
  return ctx;
};
