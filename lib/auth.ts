export type Identity = { id: string; nome: string; email: string; cargo: "ADMIN" | "GER" | "FUNC"; lojas: string[]; permissions: string[]; alterarSenha: boolean };
export const sessionCookie = "SESSION";
export function sessionHeader(cookie: string | null) {
  const value = cookie?.split(";").map(c => c.trim()).find(c => c.startsWith(`${sessionCookie}=`));
  return value && /^SESSION=[A-Za-z0-9%_+/=.-]+$/.test(value) ? value : "";
}
export function internalDestination(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return "/visao-geral";
  const url = new URL(value, "https://internal.invalid");
  if (url.origin !== "https://internal.invalid" || url.pathname.startsWith("/api") || ["/login", "/alterar-senha"].includes(url.pathname)) return "/visao-geral";
  return url.pathname + url.search;
}
export function pagePermission(path: string) {
  if (path.startsWith("/estoque/ajustes")) return "transfers.read";
  if (path.startsWith("/estoque/transferencias")) return "transfers.read";
  if (path.startsWith("/usuarios")) return "users.manage";
  if (path.startsWith("/lojas")) return "stores.manage";
  if (path.startsWith("/compras") || path.startsWith("/recebimentos")) return "purchases.read";
  if (path.startsWith("/fornecedores")) return "suppliers.read";
  if ((path.startsWith("/produtos") && (/\/(novo|editar)$/.test(path)))) return "catalog.write";
  return undefined;
}
