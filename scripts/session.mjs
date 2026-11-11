// Explicit credentials are supplied only by an owned disposable test environment.
export async function authenticatedSession(base, email, password, transport = globalThis.fetch) {
  if (process.env.CATALOG_DISPOSABLE !== "1") throw new Error("Authentication seed requires CATALOG_DISPOSABLE=1");
  const origin = new URL(base).origin;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)) throw new Error("Test sessions require loopback");
  if (!email || !password) throw new Error("Test account credentials missing");
  let cookie = "", token;
  async function call(input, options = {}) {
    const url = new URL(input, origin);
    if (url.origin !== origin) throw new Error("Refusing to forward test credentials to another origin");
    const headers = new Headers(options.headers);
    headers.set("Origin", origin);
    if (cookie) headers.set("Cookie", cookie);
    if (!["GET", "HEAD", "OPTIONS"].includes(options.method || "GET") && token) headers.set(token.headerName, token.token);
    const result = await transport(url, { ...options, headers });
    for (const entry of result.headers.getSetCookie()) if (entry.startsWith("SESSION=")) cookie = entry.split(";", 1)[0];
    return result;
  }
  token = await (await call("/api/auth/csrf")).json();
  const response = await call("/api/auth/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login:email,senha:password})});
  if (!response.ok) throw new Error(`Disposable login failed: ${response.status}`);
  const identity = await response.json();
  token = await (await call("/api/auth/csrf")).json();
  return { fetch:call, identity, storageState: {cookies:[{name:"SESSION",value:cookie.slice("SESSION=".length),domain:new URL(origin).hostname,path:"/",httpOnly:true,secure:false,sameSite:"Lax",expires:-1}],origins:[]}, headers: { Cookie:cookie, Origin:origin, [token.headerName]:token.token } };
}
