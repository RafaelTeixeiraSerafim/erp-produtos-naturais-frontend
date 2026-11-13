// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { forwardCatalog } from "@/lib/proxy";
function browserRequest(url: string, init: RequestInit = {}) {
  return new Request(url, { ...init, headers: { Origin: new URL(url).origin, ...init.headers } });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("mantém filtros, status e mensagem JSON sem cache", async () => {
  vi.stubEnv("BACKEND_API_URL", "http://localhost:9090");
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({ message: "Duplicado" }, { status: 409 }),
    );
  vi.stubGlobal("fetch", fetch);
  const result = await forwardCatalog(
    browserRequest("http://localhost/api/produtos?idProdutoSku=abc"),
    ["produtos"],
  );
  expect(String(fetch.mock.calls[0][0])).toBe(
    "http://localhost:9090/api/produtos?idProdutoSku=abc",
  );
  expect(fetch.mock.calls[0][1].cache).toBe("no-store");
  expect(result.status).toBe(409);
  expect(await result.json()).toEqual({ message: "Duplicado" });
});
it("preserva resposta vazia 204", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  const result = await forwardCatalog(
    browserRequest(
      "http://localhost/api/produtos/11111111-1111-4111-8111-111111111111",
      { method: "DELETE" },
    ),
    ["produtos", "11111111-1111-4111-8111-111111111111"],
  );
  expect(result.status).toBe(204);
  expect(await result.text()).toBe("");
});
it.each([
  ["usuarios", "invalid"],
  ["produtos", ".."],
  ["produtos", "11111111-1111-4111-8111-111111111111", "extra"],
])("bloqueia caminhos fora do catálogo: %s", async (...path) => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (await forwardCatalog(browserRequest("http://localhost/api/usuarios"), path))
      .status,
  ).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
it("não permite PUT de vínculo", async () =>
  expect(
    (
      await forwardCatalog(
        browserRequest("http://localhost/api/skus-loja/id", { method: "PUT" }),
        ["skus-loja", "11111111-1111-4111-8111-111111111111"],
      )
    ).status,
  ).toBe(405));
it("retorna erro tratável quando backend está indisponível", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect(
    (
      await forwardCatalog(browserRequest("http://localhost/api/produtos"), [
        "produtos",
      ])
    ).status,
  ).toBe(502);
});
const inventoryId = "11111111-1111-4111-8111-111111111111";
it.each([
  ["estoques"],
  ["estoques", inventoryId],
  ["estoques", "saldo"],
  ["movimentacoes-estoque"],
  ["movimentacoes-estoque", inventoryId],
])("encaminha GET de estoque %s", async (...path) => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  const query = `?idProdutoSku=${inventoryId}&idLoja=${inventoryId}`;
  const result = await forwardCatalog(
    browserRequest(`http://localhost/api/${path.join("/")}${query}`),
    path,
  );
  expect(result.status).toBe(200);
  expect(String(fetch.mock.calls[0][0])).toBe(
    `http://localhost:8080/api/${path.join("/")}${query}`,
  );
});
it.each([
  "",
  "?idProdutoSku=abc&idLoja=abc",
  `?idProdutoSku=${inventoryId}`,
  `?idLoja=${inventoryId}`,
  `?idProdutoSku=${inventoryId}&idLoja=${inventoryId}&idLoja=${inventoryId}`,
])("exige parâmetros válidos no saldo %s", async (query) => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (
      await forwardCatalog(
        browserRequest(`http://localhost/api/estoques/saldo${query}`),
        ["estoques", "saldo"],
      )
    ).status,
  ).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
it.each(["estoques", "movimentacoes-estoque"])(
  "valida UUID e bloqueia toda escrita em %s",
  async (resource) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const id of ["invalid", "..", "saldo"]) {
      if (resource === "estoques" && id === "saldo") continue;
      expect(
        (
          await forwardCatalog(browserRequest("http://localhost/api"), [
            resource,
            id,
          ])
        ).status,
      ).toBe(404);
    }
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      for (const path of [
        [resource],
        [resource, inventoryId],
        ...(resource === "estoques" ? [[resource, "saldo"]] : []),
      ]) {
        const result = await forwardCatalog(
          browserRequest("http://localhost/api", { method }),
          path,
        );
        expect(result.status).toBe(405);
        expect(result.headers.get("Allow")).toBe("GET");
      }
    }
    expect(fetch).not.toHaveBeenCalled();
  },
);
it.each(["fornecedores", "compras"])(
  "permite somente o contrato de %s",
  async (resource) => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json({ id: inventoryId })),
      );
    vi.stubGlobal("fetch", fetch);
    for (const [path, methods] of [
      [[resource], ["GET", "POST"]],
      [
        [resource, inventoryId],
        resource === "compras" ? ["GET", "PUT"] : ["GET", "PUT", "DELETE"],
      ],
    ] as [string[], string[]][]) {
      for (const method of methods)
        expect(
          (
            await forwardCatalog(
              browserRequest("http://localhost/api", { method }),
              path,
            )
          ).status,
        ).toBe(200);
    }
  },
);
it("bloqueia exclusão, transições e recebimentos de compras sem consultar upstream", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(
    (
      await forwardCatalog(
        browserRequest("http://localhost/api", { method: "DELETE" }),
        ["compras", inventoryId],
      )
    ).status,
  ).toBe(405);
  for (const path of [
    ["compras", inventoryId, "status"],
    ["compras", inventoryId, "receber"],
    ["compras", "status"],
    ["recebimentos-compra"],
  ])
    expect(
      (
        await forwardCatalog(
          browserRequest("http://localhost/api", { method: "POST" }),
          path,
        )
      ).status,
    ).toBe(404);
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  ["clientes", "GET", false],
  ["clientes", "POST", false],
  ["clientes", "GET", true],
  ["clientes", "PUT", true],
  ["clientes", "DELETE", true],
  ["vendas", "GET", false],
  ["vendas", "POST", false],
  ["vendas", "GET", true],
  ["usuarios", "GET", false],
])("etapa 4 permite %s %s uuid=%s", async (resource, method, record) => {
  const fetch = vi.fn().mockResolvedValue(Response.json({}));
  vi.stubGlobal("fetch", fetch);
  const path = record ? [resource, inventoryId] : [resource];
  expect(
    (
      await forwardCatalog(
        browserRequest(`http://localhost/api/${path.join("/")}`, { method, headers:{"Idempotency-Key":inventoryId} }),
        path,
      )
    ).status,
  ).toBe(200);
  expect(fetch).toHaveBeenCalledOnce();
});
it.each([
  ["vendas", "DELETE"],
  ["usuarios", "PUT"],
  ["usuarios", "DELETE"],
])("etapa 4 bloqueia %s %s", async (resource, method) => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const path = resource === "vendas" ? [resource, inventoryId] : [resource];
  expect(
    (
      await forwardCatalog(
        browserRequest("http://localhost/api/", { method }),
        path,
      )
    ).status,
  ).toBe(405);
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  ["vendas", "invalido"],
  ["clientes", "x"],
])("etapa 4 bloqueia caminho %s", async (...path) => {
  expect(
    (await forwardCatalog(browserRequest("http://localhost/api/"), path)).status,
  ).toBe(404);
});
it("recebimentos: encaminha chave somente na criação e exige versão na exclusão", async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ id:inventoryId }))); vi.stubGlobal("fetch",fetch);
  const create = await forwardCatalog(browserRequest("http://localhost/api/recebimentos-compras", { method:"POST",headers:{ "Idempotency-Key":inventoryId },body:"{}" }),["recebimentos-compras"]);
  expect(create.status).toBe(200); expect(fetch.mock.calls[0][1].headers["Idempotency-Key"]).toBe(inventoryId);
  expect((await forwardCatalog(browserRequest("http://localhost/api/recebimentos-compras", { method:"POST",body:"{}" }),["recebimentos-compras"])).status).toBe(400);
  expect((await forwardCatalog(browserRequest("http://localhost/api/recebimentos-compras/x", { method:"DELETE" }),["recebimentos-compras",inventoryId])).status).toBe(400);
  expect((await forwardCatalog(browserRequest("http://localhost/api/recebimentos-compras/x?versao=2", { method:"DELETE" }),["recebimentos-compras",inventoryId])).status).toBe(200);
});
it("recebimentos: conclusão estreita, sem liberar ações em outras APIs",async () => {
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({})));
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST",body:"{}"}),["recebimentos-compras",inventoryId,"concluir"])).status).toBe(200);
  expect((await forwardCatalog(browserRequest("http://localhost/api/r"),["recebimentos-compras",inventoryId,"concluir"])).status).toBe(405);
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST"}),["compras",inventoryId,"concluir"])).status).toBe(404);
});

it("vendas permitem edição e ações explícitas com chave restrita à criação",async()=>{
  const fetch=vi.fn().mockImplementation(()=>Promise.resolve(Response.json({})));vi.stubGlobal("fetch",fetch);
  for(const action of ["concluir","cancelar"]) {
    expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST",body:"{}"}),["vendas",inventoryId,action])).status).toBe(200);
    expect((await forwardCatalog(browserRequest("http://localhost/api/r"),["vendas",inventoryId,action])).status).toBe(405);
  }
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"PUT",body:"{}"}),["vendas",inventoryId])).status).toBe(200);
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST",body:"{}"}),["vendas"])).status).toBe(400);
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST",headers:{"Idempotency-Key":inventoryId},body:"{}"}),["vendas"])).status).toBe(200);
  expect(fetch.mock.calls.at(-1)?.[1].headers["Idempotency-Key"]).toBe(inventoryId);
});

it.each(["devolucoes-clientes","devolucoes-fornecedores"])("devoluções %s: ciclo explícito, chave UUID e DELETE bloqueado",async(resource)=>{
  const fetch=vi.fn().mockImplementation(()=>Promise.resolve(Response.json({})));vi.stubGlobal("fetch",fetch);
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST",body:"{}"}),[resource])).status).toBe(400);
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST",headers:{"Idempotency-Key":inventoryId},body:"{}"}),[resource])).status).toBe(200);
  expect(fetch.mock.calls.at(-1)?.[1].headers["Idempotency-Key"]).toBe(inventoryId);
  for(const action of ["concluir","cancelar"]){expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST",body:"{}"}),[resource,inventoryId,action])).status).toBe(200);expect(fetch.mock.calls.at(-1)?.[1].headers["Idempotency-Key"]).toBeUndefined();expect((await forwardCatalog(browserRequest("http://localhost/api/r"),[resource,inventoryId,action])).status).toBe(405);}
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"DELETE"}),[resource,inventoryId])).status).toBe(405);
  expect((await forwardCatalog(browserRequest("http://localhost/api/r",{method:"POST"}),[resource,inventoryId,"estornar"])).status).toBe(404);
});

it.each([
  ["localidades", "estados", "REQUEST_TIMEOUT", "REQUEST_TIMEOUT"],
  ["localidades", "estados", "HTTP_403", "HTTP_403"],
  ["localidades", "estados", "sensitive exception text", null],
  ["produtos", undefined, "DNS", null],
])("relays only bounded IBGE diagnostics on locality failures", async (resource, id, code, expected) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Indisponível" }, { status: 503, headers: { "X-IBGE-Failure": code } })));
  const path = id ? [resource, id] : [resource];
  const result = await forwardCatalog(browserRequest(`http://localhost/api/${path.join("/")}`), path);
  expect(result.headers.get("X-IBGE-Failure")).toBe(expected);
});

it("preserves the administrative IBGE cause chain returned by the backend", async () => {
  const body = { status: 503, message: "Catálogo IBGE indisponível.", detalhes: ["java.net.http.HttpConnectTimeoutException: HTTP connect timed out", "Caused by: java.net.ConnectException: HTTP connect timed out"] };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body, { status: 503, headers: { "X-IBGE-Failure": "CONNECT_TIMEOUT" } })));
  const result = await forwardCatalog(browserRequest("http://localhost/api/localidades/estados"), ["localidades", "estados"]);
  expect(result.status).toBe(503);
  expect(await result.json()).toEqual(body);
  expect(result.headers.get("Cache-Control")).toBe("no-store");
});
