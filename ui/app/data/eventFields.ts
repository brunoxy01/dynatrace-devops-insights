// Os eventos SDLC do GitHub adapter chegam no Grail com os objetos de nível
// superior do payload (repository, pull_request, sender, workflow, etc)
// armazenados como STRINGS JSON serializadas — não como campos planos nem
// nested reais. Então `record["repository.full_name"]` é undefined e o DQL
// `filter repository.full_name == ...` retorna 0. A solução é navegar o path
// fazendo JSON.parse das strings ao longo do caminho.

function maybeParseJson(value: string): unknown {
  const t = value.trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      return JSON.parse(t);
    } catch {
      return value;
    }
  }
  return value;
}

export function resolveField(record: Record<string, unknown>, path: string): unknown {
  // 1) chave plana com ponto literal (caso o Grail já tenha expandido).
  //    Se o valor for uma string que contém JSON (ex: o array `commits` ou
  //    o objeto `repository`), parseia — senão Array.isArray/acesso falham.
  const direct = record[path];
  if (direct !== undefined && direct !== null && typeof direct !== "object") {
    if (typeof direct === "string") return maybeParseJson(direct);
    return direct;
  }

  // 2) navega os segmentos, parseando strings JSON encontradas no caminho
  const parts = path.split(".");
  let cur: unknown = record;
  for (const part of parts) {
    if (cur === undefined || cur === null) return undefined;
    if (typeof cur === "string") {
      try {
        cur = JSON.parse(cur);
      } catch {
        return undefined;
      }
    }
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }

  // valor folha pode ainda ser uma string JSON
  if (typeof cur === "string") {
    const t = cur.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        return JSON.parse(t);
      } catch {
        return cur;
      }
    }
  }
  return cur;
}

export function resolveString(
  record: Record<string, unknown>,
  paths: string[],
  fallback = "",
): string {
  for (const p of paths) {
    const v = resolveField(record, p);
    if (v !== undefined && v !== null && v !== "" && typeof v !== "object") {
      return String(v);
    }
  }
  return fallback;
}

export function resolveNumber(
  record: Record<string, unknown>,
  paths: string[],
  fallback = 0,
): number {
  const s = resolveString(record, paths, "");
  const n = Number(s);
  return Number.isFinite(n) && s !== "" ? n : fallback;
}
