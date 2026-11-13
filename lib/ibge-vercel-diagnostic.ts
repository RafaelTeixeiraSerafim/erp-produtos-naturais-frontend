import { forwardCatalog } from "./proxy";

type Probe = { path: string; success: boolean; status: number | null; elapsedMs: number; count?: number; errors?: string[] };
let cached: { at: number; report: Promise<{ runtime: string; executedAt: string; checks: Probe[] }> } | undefined;
async function probe(path: string): Promise<Probe> {
  const started = Date.now();
  let status: number | null = null;
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/${path}?orderBy=nome`, {
      headers: { Accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6000),
    });
    status = response.status;
    if (!response.ok) throw new Error(`IBGE respondeu HTTP ${status}`);
    const body: unknown = await response.json();
    if (!Array.isArray(body) || body.length === 0) throw new Error("Resposta IBGE sem lista de localidades");
    return { path, success: true, status, elapsedMs: Date.now() - started, count: body.length };
  } catch (error) {
    const errors: string[] = [];
    const seen = new Set<unknown>();
    for (let cause: unknown = error; cause && errors.length < 8 && !seen.has(cause);) {
      seen.add(cause);
      errors.push(String(cause).slice(0, 2048));
      cause = cause instanceof Error ? cause.cause : undefined;
    }
    return { path, success: false, status, elapsedMs: Date.now() - started, errors };
  }
}
export async function inspectIbgeFromVercel(request: Request) {
  // Authenticate on every call, including cache hits. Never send the session to IBGE.
  const auth = await forwardCatalog(request, ["auth", "me"]);
  if (!auth.ok) return auth;
  const identity = await auth.json();
  if (identity.cargo !== "ADMIN") return Response.json({ message: "Acesso negado" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!cached || Date.now() - cached.at >= 300000) {
    cached = { at: Date.now(), report: Promise.all([probe("estados"), probe("estados/SC/municipios")])
      .then(checks => ({ runtime: "frontend", executedAt: new Date().toISOString(), checks })) };
  }
  return Response.json(await cached.report, { headers: { "Cache-Control": "no-store" } });
}
