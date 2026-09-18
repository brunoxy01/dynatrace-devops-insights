import React from "react";
import type { Provider } from "../data/types";

interface ProviderIconProps {
  provider: Provider;
  size?: number;
  title?: string;
}

const GitHubIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 5.08 3.29 9.38 7.86 10.9.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.33.95.1-.74.4-1.25.72-1.53-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.9-.38 2.88-.39.98.01 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.7.42.36.78 1.07.78 2.16 0 1.56-.01 2.82-.02 3.2 0 .3.21.66.79.55A11.51 11.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
  </svg>
);

const GitLabIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 22.5 16.1 9.9H7.9L12 22.5Z" opacity="0.6" />
    <path d="M12 22.5 7.9 9.9H2.7L12 22.5Z" />
    <path d="M2.7 9.9 0.7 15.9c-.18.55.02 1.16.49 1.5L12 22.5 2.7 9.9Z" opacity="0.85" />
    <path d="M2.7 9.9h5.2L5.9 2.6c-.13-.4-.7-.4-.83 0L2.7 9.9Z" />
    <path d="M12 22.5 16.1 9.9h5.2L12 22.5Z" opacity="0.85" />
    <path d="M21.3 9.9 23.3 15.9c.18.55-.02 1.16-.49 1.5L12 22.5l9.3-12.6Z" opacity="0.6" />
    <path d="M21.3 9.9h-5.2l2.02-7.3c.13-.4.7-.4.83 0l2.35 7.3Z" opacity="0.6" />
  </svg>
);

const AzureDevOpsIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23 5.6v12.9l-5.7 4.7-8.4-3.1v2.9L4 18.3l-4-5 4.3.3V5.7L14.5 2l7.2 2.1L23 5.6ZM14.4 3.9 6.8 9.6l6.8 1.8 8.5-3.5-7.7-4Zm7.6 5.1-8.6 3.5v7.1l8.6-4.1V9Z" />
  </svg>
);

const providerLabels: Record<Provider, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  "azure-devops": "Azure DevOps",
};

export const ProviderIcon: React.FC<ProviderIconProps> = ({ provider, size = 16, title }) => {
  const label = title ?? providerLabels[provider];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
    >
      {provider === "github" && <GitHubIcon size={size} />}
      {provider === "gitlab" && <GitLabIcon size={size} />}
      {provider === "azure-devops" && <AzureDevOpsIcon size={size} />}
    </span>
  );
};
