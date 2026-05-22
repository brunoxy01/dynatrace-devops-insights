import { openApp } from "@dynatrace-sdk/navigation";
import { getEnvironmentUrl } from "@dynatrace-sdk/app-environment";

export const APP_IDS = {
  CICD: "my.cicd.observability",
  SERVICES: "dynatrace.classic.services",
  NOTEBOOKS: "dynatrace.notebooks",
} as const;

export function appUrl(appId: string): string {
  const base = getEnvironmentUrl().replace(/\/$/, "");
  return `${base}/ui/apps/${appId}/`;
}

export function navigateToApp(appId: string): void {
  try {
    openApp(appId);
  } catch {
    window.open(appUrl(appId), "_blank", "noopener,noreferrer");
  }
}
