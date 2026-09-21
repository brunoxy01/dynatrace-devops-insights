// Este app não fixa uma lista de repositórios no código — ele é genérico e
// deve funcionar pra qualquer cliente, independente de provider, grupo,
// projeto ou instância. Se o usuário não filtrar nada, mostramos tudo que a
// tenant tiver de SDLC events. Pra restringir (útil em tenants com volume
// misto de dados, como sandboxes com demo data), o usuário digita
// `repository = owner/repo` no FilterField — e isso vira filtro NO SERVIDOR
// via `contains()`, não uma allowlist fixa.

function escapeDqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Cláusula DQL opcional pra filtrar por repo no servidor usando `contains()`
// sobre o campo bruto (string JSON) — confirmado que funciona via Notebook,
// mesmo sem nested access. Recebe os valores que o usuário digitou no filtro
// `repository = ...`; se vazio, retorna "" (sem filtro, busca tudo).
export function repoContainsFilterDql(repos: string[] | undefined): string {
  if (!repos || repos.length === 0) return "";
  return repos.map((r) => `contains(repository, "${escapeDqlString(r)}")`).join(" or ");
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
