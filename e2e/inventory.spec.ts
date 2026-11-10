import { test, expect, type Page } from "./auth-fixture";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function mock(page: Page) {
  const state = { offline: false, lookupOffline: false, empty: false, calls: 0, amount: 1234.567, requests: [] as string[] };
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    const resource = url.pathname.split("/")[2];
    state.requests.push(url.pathname + url.search);
    const stocks = Array.from({ length: 25 }, (_, i) => ({ id: id(i + 100), idProduto: id(i + 1), idProdutoSku:id(i+1), idLoja: id(i % 2 + 50), quantidadeAtual: i === 0 ? state.amount : i === 1 ? 0 : -0.125, atualizadoEm: "2026-11-04T03:00:00Z" }));
    const lookups: Record<string, unknown> = {
      produtos: stocks.map((s, i) => ({ id: s.idProduto, nome: `Produto ${String(i).padStart(2, "0")}`, idUnidadeMedida: id(70) })),
      "produtos-sku":stocks.map((s,i)=>({id:s.idProdutoSku,idProduto:s.idProduto,nomeProduto:`Produto ${String(i).padStart(2,"0")}`,sku:`SKU${i}`,descricaoApresentacao:"Granel",idUnidadeMedida:id(70),siglaUnidadeMedida:"kg",tipoVenda:"PESO",status:"ATIVO"})),
      lojas: [{ id: id(50), nomeFantasia: "Centro" }, { id: id(51), nomeFantasia: "Bairro" }],
      "unidades-medida": [{ id: id(70), sigla: "kg" }],
    };
    if (lookups[resource]) return route.fulfill({ status: state.lookupOffline ? 502 : 200, json: state.lookupOffline ? { message: "Consulta indisponível" } : lookups[resource] });
    state.calls++;
    if (state.offline) return route.fulfill({ status: 502, json: { message: "Estoque indisponível" } });
    if (url.pathname.endsWith("/saldo")) return route.fulfill({ json: { quantidadeAtual: url.searchParams.get("idProdutoSku") === id(1) && url.searchParams.get("idLoja") === id(50) ? state.amount : 0 } });
    return route.fulfill({ json: state.empty ? [] : resource === "estoques" ? stocks : stocks.map((s, i) => ({ ...s, quantidade: s.quantidadeAtual, tipo: "AJUSTE_ENTRADA", observacao: `Observação completa ${i}`, idUsuario: id(80), dataMovimentacao: ["2026-11-04T02:59:59Z", "2026-11-04T03:00:00Z", "2026-11-05T02:59:59Z", "2026-11-05T03:00:00Z"][i % 4] })) });
  });
  return state;
}
test("saldos: paginação, filtros locais, URL, links, saldo exato e atualização", async ({ page }) => {
  const state = await mock(page);
  await page.goto("/estoque");
  await expect(page.getByRole("cell", { name: "1.234,567", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await page.reload();
  await expect(page.getByText("Página 2 de 2", { exact: false })).toBeVisible();
  await page.getByLabel("Buscar por nome").fill("Produto 00");
  await expect(page).not.toHaveURL(/pagina=/);
  await expect(page.getByRole("link", { name: /^Produto 00/ })).toHaveAttribute("href", `/produtos/${id(1)}`);
  await page.getByLabel("Buscar por nome").fill("");
  await page.getByLabel("Quantidade", { exact: true }).selectOption("zero");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Quantidade", { exact: true }).selectOption("negativo");
  await expect(page.getByText("23 registros", { exact: false })).toBeVisible();
  await page.getByLabel("Quantidade", { exact: true }).selectOption("");
  await page.getByLabel("Ordenar", { exact: true }).selectOption("nome-desc");
  await expect(page.locator("tbody tr").first()).toContainText("Produto 24");
  await page.getByLabel("SKU", { exact: true }).selectOption(id(1));
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Loja", { exact: true }).selectOption(id(50));
  await expect(page.getByLabel("Saldo exato")).toContainText("1.234,567");
  expect(state.requests).toContain(`/api/estoques?idProdutoSku=${id(1)}`);
  const calls = state.calls;
  state.amount = 1234.125;
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect.poll(() => state.calls).toBeGreaterThan(calls);
  await expect(page.getByLabel("Saldo exato")).toContainText("1.234,125");
  await expect(page.getByRole("status")).toContainText("Última atualização bem-sucedida");
  await page.getByRole("cell").getByRole("link", { name: "Ver movimentações" }).click();
  await expect(page).toHaveURL(new RegExp(`movimentacoes.*idLoja=${id(50)}.*idProdutoSku=${id(1)}`));
  await page.reload();
  await expect(page.getByLabel("Produto", { exact: true })).toHaveValue(id(1));
  await expect(page.locator("tbody tr")).toHaveCount(1);
});
test("movimentações: loja isolada, datas inclusivas, tipo e detalhes", async ({ page }) => {
  await mock(page);
  await page.goto("/estoque/movimentacoes");
  await page.getByLabel("Loja", { exact: true }).selectOption(id(51));
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByLabel("Loja", { exact: true }).selectOption("");
  await page.getByLabel("Data inicial").fill("2026-11-04");
  await page.getByLabel("Data final").fill("2026-11-04");
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await page.getByLabel("Tipo de movimentação").selectOption("AJUSTE_ENTRADA");
  await page.getByRole("button", { name: "Ver detalhes" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Observação completa");
  await expect(page.getByRole("dialog")).toContainText(id(80));
  await expect(page.getByRole("dialog").getByText("Venda", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Data inicial")).toHaveValue("2026-11-04");
  await page.getByLabel("Tipo de movimentação").selectOption("SAIDA_VENDA");
  await expect(page.getByText("Nenhuma movimentação encontrada")).toBeVisible();
});
test("zero, ausência, falha e retry preservam resultados independentes", async ({ page }) => {
  const state = await mock(page);
  await page.goto(`/estoque?idProdutoSku=${id(2)}&idLoja=${id(51)}`);
  await expect(page.getByRole("cell", { name: "0", exact: true })).toBeVisible();
  await expect(page.getByText("Sem registro de estoque")).toHaveCount(0);
  await page.getByLabel("Loja", { exact: true }).selectOption(id(50));
  await expect(page.getByText("Sem registro de estoque")).toBeVisible();
  await expect(page.getByLabel("Saldo exato")).toContainText("0 kg");
  state.offline = true;
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText("Estoque indisponível");
  await expect(page.getByLabel("Saldo exato")).toContainText("0 kg");
  state.offline = false; state.empty = true;
  await page.getByRole("button", { name: "Tentar novamente" }).last().click();
  await expect(page.getByText("Nenhum registro de estoque encontrado")).toBeVisible();
});
test("navegação desktop/mobile conecta catálogo e estoque", async ({ page }, info) => {
  await mock(page);
  await page.goto("/estoque");
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Movimentações", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Movimentações", exact: true })).toBeVisible();
  if (info.project.name === "mobile") await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("header")).toContainText("Estoque");
});
test("falha inicial recuperável e IDs com lookup indisponível", async ({ page }) => {
  const state = await mock(page); state.offline = true; state.lookupOffline = true;
  await page.goto("/estoque");
  await expect(page.getByRole("region").getByRole("alert")).toContainText("Estoque indisponível");
  state.offline = false;
  await page.getByRole("region").getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator(`a[href="/produtos/${id(1)}"]`)).toBeVisible();
});
