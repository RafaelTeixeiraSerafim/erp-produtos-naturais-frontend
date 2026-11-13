import { forwardCatalog } from "./proxy";

export async function relayOfficialIbge(request: Request, uf?: string) {
  const auth = await forwardCatalog(request, ["auth", "me"]);
  if (!auth.ok) return auth;
  const identity = await auth.json();
  if (identity.alterarSenha) return Response.json({ message: "Altere sua senha antes de continuar." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (uf !== undefined && !/^[A-Z]{2}$/.test(uf)) return Response.json({ message: "UF inválida" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const path = uf === undefined ? "estados" : `estados/${uf}/municipios`;
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/${path}?orderBy=nome`, {
      headers: { Accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      const headers = new Headers({ "Cache-Control": "no-store" });
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter && retryAfter.length <= 128) headers.set("Retry-After", retryAfter);
      return Response.json({ message: "Catálogo IBGE indisponível." }, { status: response.status, headers });
    }
    const data: unknown = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Resposta IBGE sem localidades");
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ message: "Catálogo IBGE indisponível." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
