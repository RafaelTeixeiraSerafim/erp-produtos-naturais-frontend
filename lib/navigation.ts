/** Match complete route segments, preferring the most specific destination. */
export function resolveRoute<T extends { href: string }>(path: string, routes: readonly T[]): T | undefined {
  return routes.filter(route => path === route.href || path.startsWith(route.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
export function routeDetail(path: string, href?: string) {
  if (!href || path === href) return "";
  if (path.endsWith("/editar")) return href === "/produtos" ? " / Editar produto" : " / Editar rascunho";
  if (path.endsWith("/nova") || path.endsWith("/novo")) {
    if (href.endsWith("/devolucoes")) return " / Nova devolução";
    if (href === "/vendas") return " / Nova venda";
    if (href === "/compras") return " / Nova compra";
    if (href === "/estoque/transferencias") return " / Nova transferência";
    if (href === "/estoque/ajustes") return " / Novo ajuste";
    if (href === "/skus") return " / Novo SKU";
    if (href === "/produtos") return " / Novo produto";
    return " / Novo registro";
  }
  return " / Detalhes";
}
