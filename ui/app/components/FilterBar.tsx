import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Button } from "@dynatrace/strato-components/buttons";
import { Text } from "@dynatrace/strato-components/typography";
import { BRANCH_STRATEGIES, PROVIDERS, type BranchStrategy, type Provider } from "../data/types";
import { useProviderFilter } from "../state/ProviderFilterContext";
import { useStrategyFilter } from "../state/StrategyFilterContext";
import { TimeRangeFilter } from "./TimeRangeFilter";

export const FilterBar: React.FC = () => {
  const {
    isActive: isProviderActive,
    toggle: toggleProvider,
    clear: clearProvider,
    selected: selectedProviders,
  } = useProviderFilter();
  const {
    isActive: isStrategyActive,
    toggle: toggleStrategy,
    clear: clearStrategy,
    selected: selectedStrategies,
  } = useStrategyFilter();

  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      gap={16}
      padding={12}
      flexWrap="wrap"
      style={{ borderBottom: "1px solid var(--dt-colors-border-neutral-default)" }}
    >
      <Flex alignItems="center" gap={16} flexWrap="wrap">
        <Flex alignItems="center" gap={6}>
          <Text>Provider:</Text>
          {PROVIDERS.map((p: { id: Provider; label: string }) => (
            <Button
              key={p.id}
              variant={isProviderActive(p.id) ? "accent" : "default"}
              onClick={() => toggleProvider(p.id)}
            >
              {p.label}
            </Button>
          ))}
          {selectedProviders.length > 0 && (
            <Button variant="default" onClick={clearProvider}>
              ✕
            </Button>
          )}
        </Flex>

        <Flex alignItems="center" gap={6}>
          <Text>Estratégia:</Text>
          {BRANCH_STRATEGIES.map((s: { id: BranchStrategy; label: string }) => (
            <Button
              key={s.id}
              variant={isStrategyActive(s.id) ? "accent" : "default"}
              onClick={() => toggleStrategy(s.id)}
            >
              {s.label}
            </Button>
          ))}
          {selectedStrategies.length > 0 && (
            <Button variant="default" onClick={clearStrategy}>
              ✕
            </Button>
          )}
        </Flex>
      </Flex>

      <TimeRangeFilter />
    </Flex>
  );
};
