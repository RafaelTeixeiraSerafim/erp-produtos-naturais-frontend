import { client } from "@/generated/sdk/.kubb/client";
import type { Identity } from "./auth";
import { internalDestination } from "./auth";
let csrf: Promise<{ token: string; headerName: string }> | undefined;
let expired = false;
export function renewCsrf() { csrf = undefined; }
export function csrfToken() {
  return csrf ??= fetch("/api/auth/csrf", { cache: "no-store" }).then(async response => {
    if (!response.ok) { csrf = undefined; throw new Error("Não foi possível obter proteção da sessão."); }
    return response.json();
  }).catch(error => { csrf = undefined; throw error; });
}
export async function authRequest<T = Identity>(path: string, body?: unknown, method = body === undefined ? "GET" : "POST"): Promise<T> {
  if (expired && method !== "GET" && path !== "auth/login") throw new Error("Sessão expirada. Entre novamente antes de salvar.");
  const token = method === "GET" ? undefined : await csrfToken();
  const response = await fetch(`/api/${path}`, { method, cache: "no-store", headers: { ...(token ? { [token.headerName]: token.token } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "auth/login") sessionExpired();
    throw new Error(error.message || "Não foi possível concluir a solicitação.");
  }
  return response.status === 204 ? undefined as T : response.json();
}
export function sessionExpired() {
  if (expired || location.pathname === "/login") return;
  expired = true; renewCsrf();
  // pagehide flushes eligible work before navigation; storage remains owned by the same identity.
  window.dispatchEvent(new Event("auth-expired"));
  location.assign(`/login?returnTo=${encodeURIComponent(internalDestination(location.pathname + location.search))}`);
}
if (typeof window !== "undefined") {
  client.interceptors.request.use(async config => {
    if (!["get", "head", "options"].includes(config.method || "get")) {
      if (expired) throw new Error("Sessão expirada. Entre novamente antes de salvar.");
      const token = await csrfToken(); config.headers.set(token.headerName, token.token);
    }
    return config;
  });
  client.interceptors.error.use(error => {
    if (error.response?.status === 401) sessionExpired();
    return error;
  });
}
