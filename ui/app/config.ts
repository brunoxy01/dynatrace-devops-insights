// Repositórios cujos eventos SDLC consideramos parte do nosso projeto.
// Match exato em `repository.full_name`. Tudo que sair daqui é "demo data"
// de outras tenants/orgs e não deve poluir a UI.
export const REPO_WATCHLIST = ["brunoxy01/dynatrace-devops-insights"];

// Match client-side. O DQL não consegue filtrar por `repository.full_name`
// porque a chave vem com ponto literal no nome (não é nested access),
// então filtramos depois do mapping no JS.
export function matchesWatchlist(repoFullName: string | undefined): boolean {
  if (!repoFullName) return false;
  if (REPO_WATCHLIST.length === 0) return true;
  return REPO_WATCHLIST.includes(repoFullName);
}

// URL clicável a partir do full name. Por enquanto assumindo GitHub.
export function repoUrl(fullName: string): string {
  return `https://github.com/${fullName}`;
}
