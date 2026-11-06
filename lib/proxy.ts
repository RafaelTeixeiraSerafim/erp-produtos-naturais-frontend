import { sessionHeader, sessionCookie } from "./auth";
const resources = new Set([
  "clientes",
  "vendas",
  "transferencias-estoque","ajustes-estoque",
  "usuarios",
  "fornecedores",
  "compras",
  "recebimentos-compras",
  "estoques",
  "movimentacoes-estoque",
  "produtos",
  "categorias",
  "unidades-medida",
  "lojas",
  "produtos-sku",
  "produtos-loja",
  "produtos-precos-loja",
]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function forwardCatalog(request: Request, path: string[]) {
  const [resource, id] = path;
  const auth = resource === "auth" && path.length === 2 && ["csrf", "login", "me", "logout", "alterar-senha"].includes(id);
  const reset = resource === "usuarios" && path.length === 3 && path[2] === "senha-temporaria";
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origins = (process.env.FRONTEND_ORIGINS || new URL(request.url).origin).split(",").map(o => o.trim());
    if (!origins.includes(request.headers.get("origin") || "")) return Response.json({ message: "Origem não permitida." }, { status: 403 });
  }
  const inventory =
    resource === "estoques" || resource === "movimentacoes-estoque";
  const receipt = resource === "recebimentos-compras";
  const saleAction = ["vendas","transferencias-estoque","ajustes-estoque"].includes(resource) && path.length === 3 && ["concluir", "cancelar"].includes(path[2]);
  const conclude = receipt && path.length === 3 && path[2] === "concluir";
  const balance = resource === "estoques" && id === "saldo";
  if (
    (!auth && !resources.has(resource)) ||
    (path.length > 2 && !conclude && !reset && !saleAction) ||
    (id && !auth && !balance && !uuid.test(id))
  )
    return Response.json(
      { message: "Recurso não encontrado." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  const allowed =
    auth ? [id === "csrf" || id === "me" ? "GET" : "POST"] : reset ? ["POST"] : receipt
      ? conclude ? ["POST"] : id ? ["GET", "PUT", "DELETE"] : ["GET", "POST"]
      : resource === "usuarios"
      ? id ? ["GET", "PUT", "DELETE"] : ["GET", "POST"]
      : ["vendas","transferencias-estoque","ajustes-estoque"].includes(resource)
        ? saleAction ? ["POST"] : id
          ? ["GET", "PUT"]
          : ["GET", "POST"]
        : inventory
          ? ["GET"]
          : id
            ? resource === "produtos-loja"
              ? ["GET", "DELETE"]
              : resource === "compras"
                ? ["GET", "PUT"]
                : ["GET", "PUT", "DELETE"]
            : ["GET", "POST"];
  if (!allowed.includes(request.method))
    return Response.json(
      { message: "Método não permitido." },
      {
        status: 405,
        headers: { Allow: allowed.join(", "), "Cache-Control": "no-store" },
      },
    );
  if (["vendas","transferencias-estoque","ajustes-estoque"].includes(resource) && !id && request.method === "POST" && !uuid.test(request.headers.get("Idempotency-Key") || ""))
    return Response.json({ message:"Informe Idempotency-Key UUID." }, { status:400 });
  if (receipt) {
    const params = new URL(request.url).searchParams;
    const valid = [...params.keys()].every(k => k === "idCompra" || k === "versao") &&
      (!params.has("idCompra") || (!id && params.getAll("idCompra").length === 1 && uuid.test(params.get("idCompra") || ""))) &&
      (!params.has("versao") || (request.method === "DELETE" && params.getAll("versao").length === 1 && /^\d+$/.test(params.get("versao") || ""))) &&
      (request.method !== "DELETE" || params.has("versao"));
    if (!valid) return Response.json({ message: "Parâmetros de recebimento inválidos." }, { status: 400 });
    if (request.method === "POST" && !id && !uuid.test(request.headers.get("Idempotency-Key") || ""))
      return Response.json({ message: "Informe Idempotency-Key UUID." }, { status: 400 });
  }
  if (balance) {
    const params = new URL(request.url).searchParams;
    if (
      !["idProduto", "idLoja"].every(
        (key) =>
          params.getAll(key).length === 1 && uuid.test(params.get(key) || ""),
      )
    )
      return Response.json(
        { message: "Informe idProduto e idLoja válidos." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
  }
  try {
    const base = process.env.BACKEND_API_URL || "http://localhost:8080";
    const url = new URL(`/api/${path.join("/")}`, base);
    url.search = new URL(request.url).search;
    const result = await fetch(url, {
      method: request.method,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        ...(sessionHeader(request.headers.get("cookie")) ? { Cookie: sessionHeader(request.headers.get("cookie")) } : {}),
        ...(request.headers.get("x-csrf-token") ? { "X-CSRF-TOKEN": request.headers.get("x-csrf-token")! } : {}),
        ...((receipt || ["vendas","transferencias-estoque","ajustes-estoque"].includes(resource)) && !id && request.method === "POST" ? { "Idempotency-Key": request.headers.get("Idempotency-Key")! } : {}),
        ...(request.method === "POST" || request.method === "PUT"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        request.method === "POST" || request.method === "PUT"
          ? await request.text()
          : undefined,
    });
    const responseHeaders = new Headers({ "Content-Type": result.headers.get("content-type") || "application/json", "Cache-Control": "no-store" });
    // Never relay upstream Domain, Path or unrelated cookies.
    for (const cookie of result.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      if (!pair.startsWith(`${sessionCookie}=`)) continue;
      const host = new URL(request.headers.get("host") ? `http://${request.headers.get("host")}` : request.url).hostname;
      const secure = !["localhost", "127.0.0.1", "[::1]"].includes(host);
      const deleted = /(?:^|;)\s*max-age=0(?:;|$)/i.test(cookie) || pair === `${sessionCookie}=`;
      responseHeaders.append("Set-Cookie", `${pair}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}${deleted ? "; Max-Age=0" : ""}`);
    }
    return new Response(
      result.status === 204 || result.status === 304
        ? null
        : await result.arrayBuffer(),
      {
        status: result.status,
        headers: responseHeaders,
      },
    );
  } catch {
    return Response.json(
      { message: "Não foi possível conectar ao backend. Tente novamente." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
