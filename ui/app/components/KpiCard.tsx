import React from "react";
import { Flex, Surface } from "@dynatrace/strato-components/layouts";
import { Heading, Text } from "@dynatrace/strato-components/typography";

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, hint, onClick }) => {
  return (
    <Surface
      padding={16}
      elevation="raised"
      className="dt-hover-card"
      style={{ minWidth: 200, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <Flex flexDirection="column" gap={4}>
        <Text>{label}</Text>
        <Heading level={2}>{value}</Heading>
        {hint && <Text textStyle="small">{hint}</Text>}
      </Flex>
    </Surface>
  );
};
