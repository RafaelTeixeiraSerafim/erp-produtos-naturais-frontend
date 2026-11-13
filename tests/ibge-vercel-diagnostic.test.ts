// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/proxy", () => ({ forwardCatalog: mocks.auth }));
beforeEach(() => { vi.resetModules(); mocks.auth.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const request = () => new Request("https://frontend.test/api/localidades/diagnostico-vercel", { headers: { Cookie: "SESSION=private" } });
it.each([401, 403, 502])("preserves failed authentication %s without probing", async status => {
  mocks.auth.mockResolvedValue(Response.json({ message: "Denied" }, { status }));
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const { inspectIbgeFromVercel } = await import("@/lib/ibge-vercel-diagnostic");
  expect((await inspectIbgeFromVercel(request())).status).toBe(status);
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects non-admin accounts", async () => {
  mocks.auth.mockResolvedValue(Response.json({ cargo: "GER" }));
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const { inspectIbgeFromVercel } = await import("@/lib/ibge-vercel-diagnostic");
  expect((await inspectIbgeFromVercel(request())).status).toBe(403); expect(fetch).not.toHaveBeenCalled();
});
it("uses only fixed official URLs, omits credentials, caches and rechecks authorization", async () => {
  mocks.auth.mockImplementation(() => Promise.resolve(Response.json({ cargo: "ADMIN" })));
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json([{ id: 42, nome: "SC" }]))); vi.stubGlobal("fetch", fetch);
  const { inspectIbgeFromVercel } = await import("@/lib/ibge-vercel-diagnostic");
  vi.stubEnv("VERCEL_REGION", "gru1");
  const response = await inspectIbgeFromVercel(request());
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const report = await response.json();
  expect(report.region).toBe("gru1");
  expect(report.checks).toEqual([expect.objectContaining({ path: "estados", success: true, status: 200, count: 1 }), expect.objectContaining({ path: "estados/SC/municipios", success: true, count: 1 })]);
  expect(fetch.mock.calls.map(call => call[0])).toEqual(["https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome", "https://servicodados.ibge.gov.br/api/v1/localidades/estados/SC/municipios?orderBy=nome"]);
  for (const call of fetch.mock.calls) expect(call[1]).toMatchObject({ headers: { Accept: "application/json" }, redirect: "error", cache: "no-store" });
  expect(JSON.stringify(fetch.mock.calls)).not.toContain("SESSION");
  await inspectIbgeFromVercel(request()); expect(fetch).toHaveBeenCalledTimes(2); expect(mocks.auth).toHaveBeenCalledTimes(2);
  mocks.auth.mockResolvedValue(Response.json({ cargo: "FUNC" })); expect((await inspectIbgeFromVercel(request())).status).toBe(403);
});
it("reports failed transports and invalid catalog responses without hiding the cause", async () => {
  mocks.auth.mockResolvedValue(Response.json({ cargo: "ADMIN" }));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("fetch failed", { cause: new Error("connect timeout") })).mockResolvedValueOnce(Response.json({ invalid: true })));
  const { inspectIbgeFromVercel } = await import("@/lib/ibge-vercel-diagnostic");
  const report = await (await inspectIbgeFromVercel(request())).json();
  expect(report.checks[0]).toMatchObject({ success: false, status: null, errors: ["Error: fetch failed", "Error: connect timeout"] });
  expect(report.checks[1]).toMatchObject({ success: false, status: 200 });
});
