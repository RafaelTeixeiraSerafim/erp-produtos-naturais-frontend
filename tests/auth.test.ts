// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { internalDestination, sessionHeader, pagePermission } from "@/lib/auth";
import { forwardCatalog } from "@/lib/proxy";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/login", "/api/usuarios", "/\nevil"])("rejects unsafe login destination %s", destination => expect(internalDestination(destination)).toBe("/visao-geral"));
it("preserves internal destination and filters cookies", () => {
  expect(internalDestination("/compras/nova?idLoja=123")).toBe("/compras/nova?idLoja=123");
  expect(sessionHeader("other=secret; SESSION=abc%3D; tracking=private")).toBe("SESSION=abc%3D");
  expect(pagePermission("/usuarios")).toBe("users.manage");expect(pagePermission("/produtos/123/editar")).toBe("catalog.write");
});
it("relays only approved session, CSRF and request headers", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({id:1},{headers:{"Set-Cookie":"SESSION=rotated; Domain=backend.test; Path=/backend; SameSite=None"}}));vi.stubGlobal("fetch",fetch);
  const response = await forwardCatalog(new Request("https://frontend.test/api/auth/login",{method:"POST",headers:{Origin:"https://frontend.test",Cookie:"tracking=private; SESSION=original",Authorization:"Bearer secret","X-CSRF-TOKEN":"csrf"},body:"{}"}),["auth","login"]);
  expect(fetch.mock.calls[0][1].headers).toMatchObject({Cookie:"SESSION=original","X-CSRF-TOKEN":"csrf"});expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  expect(response.headers.get("set-cookie")).toBe("SESSION=rotated; Path=/; HttpOnly; SameSite=Lax; Secure");
});
it("relays session deletion and does not relay other cookies", async () => {
  const headers=new Headers();headers.append("Set-Cookie","SESSION=; Max-Age=0; Domain=upstream.test");headers.append("Set-Cookie","tracking=secret");
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(null,{status:204,headers})));
  const response=await forwardCatalog(new Request("http://localhost/api/auth/logout",{method:"POST",headers:{Origin:"http://localhost"}}),["auth","logout"]);
  expect(response.headers.getSetCookie()).toEqual(["SESSION=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"]);
});
it.each([undefined,"https://evil.test"])("blocks mutation with invalid origin %s before upstream",async origin=>{
  const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
  const r=await forwardCatalog(new Request("https://frontend.test/api/auth/login",{method:"POST",headers:origin ? {Origin:origin}: {}}),["auth","login"]);
  expect(r.status).toBe(403);expect(fetch).not.toHaveBeenCalled();
});
it("preserves upstream 401 and 403 without translating them into 502",async()=>{
  const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
  for(const status of [401,403]){fetch.mockResolvedValue(Response.json({message:"Denied"},{status}));expect((await forwardCatalog(new Request("http://localhost/api/categorias"),["categorias"])).status).toBe(status);}
});
