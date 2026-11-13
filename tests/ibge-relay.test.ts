// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/proxy", () => ({ forwardCatalog: mocks.auth }));
import { relayOfficialIbge } from "@/lib/ibge-relay";
afterEach(() => { mocks.auth.mockReset(); vi.unstubAllGlobals(); });
const request = () => new Request("https://frontend.test/api/localidades/ibge/estados", { headers: { Cookie: "SESSION=private" } });
it.each([401, 403, 502])("preserves authentication failures %s", async status => {
  mocks.auth.mockResolvedValue(Response.json({ message: "Denied" }, { status }));
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect((await relayOfficialIbge(request())).status).toBe(status); expect(fetch).not.toHaveBeenCalled();
});
it("blocks mandatory password changes and invalid UF before calling IBGE", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  mocks.auth.mockResolvedValue(Response.json({ cargo: "FUNC", alterarSenha: true }));
  expect((await relayOfficialIbge(request())).status).toBe(403);
  mocks.auth.mockResolvedValue(Response.json({ cargo: "FUNC", alterarSenha: false }));
  expect((await relayOfficialIbge(request(), "../evil")).status).toBe(400); expect(fetch).not.toHaveBeenCalled();
});
it.each([undefined, "SC"])("relays official raw JSON for active users without forwarding credentials to IBGE %s", async uf => {
  mocks.auth.mockResolvedValue(Response.json({ cargo: "FUNC", alterarSenha: false }));
  const data = [{ id: 42, nome: "Santa Catarina", sigla: "SC", regiao: { id: 4 } }];
  const fetch = vi.fn().mockResolvedValue(Response.json(data)); vi.stubGlobal("fetch", fetch);
  const response = await relayOfficialIbge(request(), uf);
  expect(response.status).toBe(200); expect(await response.json()).toEqual(data);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(fetch.mock.calls[0][0]).toBe(`https://servicodados.ibge.gov.br/api/v1/localidades/${uf ? `estados/${uf}/municipios` : "estados"}?orderBy=nome`);
  expect(fetch.mock.calls[0][1]).toMatchObject({ headers: { Accept: "application/json" }, redirect: "error", cache: "no-store" });
  expect(JSON.stringify(fetch.mock.calls)).not.toContain("SESSION");
});
it("preserves upstream status and Retry-After instead of immediately repeating a throttled request", async () => {
  mocks.auth.mockResolvedValue(Response.json({ cargo: "ADMIN", alterarSenha: false }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 429, headers: { "Retry-After": "120" } })));
  const response = await relayOfficialIbge(request()); expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("120");
});
it("returns unavailable for an invalid catalog or transport failure", async () => {
  mocks.auth.mockImplementation(() => Promise.resolve(Response.json({ cargo: "GER", alterarSenha: false })));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ invalid: true })).mockRejectedValueOnce(new Error("timeout")));
  expect((await relayOfficialIbge(request())).status).toBe(503); expect((await relayOfficialIbge(request())).status).toBe(503);
});
