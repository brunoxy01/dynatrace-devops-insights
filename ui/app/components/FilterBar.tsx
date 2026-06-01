import React, { useMemo, useState } from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import { FilterField } from "@dynatrace/strato-components/filters";
import type { FilterFieldTree, FilterFieldValidatorMap } from "@dynatrace/strato-components/filters";
import { useFilters } from "../state/FilterContext";
import { useTimeRange } from "../state/TimeRangeContext";
import { TimeRangeFilter } from "./TimeRangeFilter";

const PROVIDER_VALUES = ["github", "gitlab", "azure-devops"];
const ENV_VALUES = ["production", "staging", "dev"];

export const FilterBar: React.FC = () => {
  const { rawValue, setRawValue, apply, reset } = useFilters();
  const { setRange, range } = useTimeRange();
  const [pendingTree, setPendingTree] = useState<FilterFieldTree | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const validatorMap = useMemo<FilterFieldValidatorMap>(() => {
    return {
      keyPredicates: [
        {
          key: "provider",
          valueType: "String",
          valuePredicate: PROVIDER_VALUES,
          details: "Git provider",
        },
        {
          key: "repository",
          valueType: "String",
          details: "Full repo name (e.g. brunoxy01/dynatrace-devops-insights)",
        },
        {
          key: "environment",
          valueType: "String",
          valuePredicate: ENV_VALUES,
          details: "Deployment environment",
        },
        {
          key: "author",
          valueType: "String",
          details: "Commit / PR author",
        },
        {
          key: "branch",
          valueType: "String",
          details: "Git branch name",
        },
      ],
      exhaustive: false,
    };
  }, []);

  const handleApply = (): void => {
    if (pendingTree) apply(pendingTree);
  };

  const handleClear = (): void => {
    setRawValue("");
    reset();
    setPendingTree(null);
  };

  const handleReload = (): void => {
    setReloadTick((t) => t + 1);
    if (pendingTree) apply(pendingTree);
    setRange({ ...range });
  };

  return (
    <Flex
      alignItems="center"
      gap={8}
      padding={12}
      style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default)" }}
    >
      <Flex style={{ flex: 1, minWidth: 0 }}>
        <FilterField
          value={rawValue}
          onChange={(v, tree) => {
            setRawValue(v);
            setPendingTree(tree);
          }}
          onFilter={({ syntaxTree, isValid }) => {
            if (isValid) apply(syntaxTree);
          }}
          placeholder="Example: provider = github AND author = brunoxy01"
          validatorMap={validatorMap}
          autoSuggestions
        />
      </Flex>
      <TimeRangeFilter key={reloadTick} />
      <Button variant="emphasized" onClick={handleApply}>
        Apply
      </Button>
      <Button variant="default" onClick={handleReload} aria-label="Reload">
        ↻
      </Button>
      {rawValue && (
        <Button variant="default" onClick={handleClear} aria-label="Clear">
          ✕
        </Button>
      )}
    </Flex>
  );
};
