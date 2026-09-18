// Repositórios cujos eventos SDLC consideramos parte do nosso projeto.
// Match exato no nome completo (GitHub: repository.full_name;
// GitLab: project.path_with_namespace). Tudo que sair daqui é "demo data"
// de outras orgs e não deve poluir a UI.
export const REPO_WATCHLIST = [
  "brunoxy01/dynatrace-devops-insights",
  "brunoxy01/dynatrace-mr-lab",
  "brunoxy01/pipeline-deploy-demo",
];

// Match client-side. O DQL não consegue filtrar por `repository.full_name`
// porque a chave vem com ponto literal no nome (não é nested access),
// então filtramos depois do mapping no JS.
export function matchesWatchlist(repoFullName: string | undefined): boolean {
  if (!repoFullName) return false;
  if (REPO_WATCHLIST.length === 0) return true;
  return REPO_WATCHLIST.includes(repoFullName);
}

// Cláusula DQL pra filtrar por repo NO SERVIDOR usando `contains()` sobre o
// campo bruto (string JSON), em vez de nested access. Confirmado que funciona
// via Notebook. Reduz drasticamente o volume escaneado (a tenant tem muito
// demo data de outras orgs) e evita o bug de `limit` sendo saturado antes de
// chegar nos nossos eventos.
export function repoContainsFilterDql(): string {
  return REPO_WATCHLIST.map((r) => `contains(repository, "${r}")`).join(" or ");
}

// URL clicável a partir do full name + provider.
export function repoUrl(fullName: string, provider?: string): string {
  const base =
    provider === "gitlab"
      ? "https://gitlab.com"
      : provider === "azure-devops"
        ? "https://dev.azure.com"
        : "https://github.com";
  return `${base}/${fullName}`;
}
