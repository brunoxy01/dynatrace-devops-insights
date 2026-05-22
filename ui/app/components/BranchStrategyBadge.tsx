import React from "react";
import { Chip } from "@dynatrace/strato-components/content";
import { BRANCH_STRATEGIES, type BranchStrategy } from "../data/types";

const COLOR_MAP: Record<BranchStrategy, "primary" | "success" | "warning"> = {
  gitflow: "primary",
  "trunk-based": "success",
  none: "warning",
};

interface Props {
  strategy: BranchStrategy;
}

export const BranchStrategyBadge: React.FC<Props> = ({ strategy }) => {
  const label = BRANCH_STRATEGIES.find((s) => s.id === strategy)?.label ?? strategy;
  return <Chip color={COLOR_MAP[strategy]}>{label}</Chip>;
};
