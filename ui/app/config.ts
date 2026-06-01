// Repositórios cujos eventos SDLC consideramos parte do nosso projeto.
// Match exato em `repository.full_name`. Tudo que sair daqui é "demo data"
// de outras tenants/orgs e não deve poluir a UI.
export const REPO_WATCHLIST = ["brunoxy01/dynatrace-devops-insights"];

// String pronta pra plugar no filtro DQL: `(name == "a" or name == "b")`
export function repoFilterDql(field = "repository.full_name"): string {
  return REPO_WATCHLIST.map((r) => `${field} == "${r}"`).join(" or ");
}

// URL clicável a partir do full name. Por enquanto assumindo GitHub.
export function repoUrl(fullName: string): string {
  return `https://github.com/${fullName}`;
}
