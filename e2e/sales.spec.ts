import { test, expect, type Page } from "./auth-fixture";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
type Row = Record<string, unknown>;
async function setup(page: Page, empty = false) {
  const db: Record<string, Row[]> = {
    clientes: [{ id: id(1), nome: "Ana", dataNascimento: "2000-02-29" }],
    lojas: empty ? [] : [{ id: id(2), nomeFantasia: "Centro" }],
    usuarios: empty ? [] : [{ id: id(3), nome: "Operador" }],
    produtos: [{ id: id(4), nome: "Aveia" }],
    vendas: [],
  };
  const writes: Row[] = [];
  let count = 100;
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname.startsWith("/api/auth/")) return route.fallback();
    const req = route.request();
    const [resource, key] = new URL(req.url()).pathname
      .replace("/api/", "")
      .split("/");
    const rows = db[resource] || [];
    if (req.method() === "GET")
      return route.fulfill({
        json: key ? rows.find((r) => r.id === key) : rows,
      });
    if (req.method() === "DELETE") {
      db[resource] = rows.filter((r) => r.id !== key);
      return route.fulfill({ status: 204 });
    }
    const body = req.postDataJSON() as Row;
    writes.push(body);
    const row = { ...body, id: key || id(count++) };
    if (resource === "vendas")
      Object.assign(row, {
        status: "ABERTA",
        subtotal: 0.01,
        descontoTotal: 0,
        valorTotal: 0.01,
        dataVenda: "2026-11-05T02:00:00Z",
      });
    const index = rows.findIndex((r) => r.id === key);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    return route.fulfill({ status: key ? 200 : 201, json: row });
  });
  return { db, writes };
}
test("clientes: data civil, CRUD, falha preserva entrada e referência bloqueada", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.goto("/clientes");
  await expect(page.getByText("29/02/2000")).toBeVisible();
  await page.getByRole("button", { name: "Novo cliente" }).click();
  await page.getByLabel("Nome", { exact: false }).fill("Beatriz");
  await page.getByLabel("Data de nascimento").fill("1999-12-31");
  await page.route("**/api/clientes", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 500, json: { message: "Falha temporária" } })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Data de nascimento")).toHaveValue("1999-12-31");
  await page.unroute("**/api/clientes");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(writes[0].dataNascimento).toBe("1999-12-31");
  await page.getByRole("button", { name: "Editar Beatriz" }).click();
  await page.getByLabel("Nome", { exact: false }).fill("Bia");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Bia" })
    .getByRole("link", { name: "Ver vendas" })
    .click();
  await expect(page).toHaveURL(/vendas\?idCliente=/);
  await page.goto("/clientes");
  await page.route("**/api/clientes/*", (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill({
          status: 409,
          json: { message: "Cliente vinculado a vendas" },
        })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "Excluir Bia" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Cliente vinculado a vendas",
  );
  await page.unroute("**/api/clientes/*");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Bia", { exact: true })).toHaveCount(0);
});
test("venda: seleções obrigatórias, precisão, vários itens, arredondamento e detalhe persistido", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.goto("/vendas/nova");
  await page.getByRole("button", { name: "Salvar venda aberta" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "cliente",
  );
  await page.getByLabel("Cliente *", { exact: true }).selectOption(id(1));
  await page.getByLabel("Loja *", { exact: true }).selectOption(id(2));
  const fill = async (n: number) => {
    const item = page.getByLabel(`Item ${n}`, { exact: true });
    await item.getByLabel("Produto").selectOption(id(4));
    await item.getByLabel("Quantidade").fill("0,001");
    await item.getByLabel("Preço unitário").fill("5");
  };
  await fill(1);
  await page.getByLabel("Preço unitário").fill("5,001");
  await page.getByRole("button", { name: "Salvar venda aberta" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "2 casas",
  );
  await page.getByLabel("Preço unitário").fill("5");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await fill(2);
  await expect(
    page.getByText("O total arredonda", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.getByRole("button", { name: "Remover item 3" }).click();
  await page.getByRole("button", { name: "Salvar venda aberta" }).click();
  await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]{36}$/);
  expect(writes[0]).not.toHaveProperty("status");
  expect(writes[0]).not.toHaveProperty("dataVenda");
  await page.reload();
  await expect(page.getByText(/^Total salvo:/)).toContainText("0,01");
  await expect(page.getByText("Status: Aberta")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Editar|Excluir|Concluir|Cancelar/ }),
  ).toHaveCount(0);
});
test("lojas ausentes bloqueiam gravação com explicação e links", async ({
  page,
}) => {
  await setup(page, true);
  await page.goto("/vendas/nova");
  await expect(
    page.getByRole("button", { name: "Salvar venda aberta" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Solicite a um administrador", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Cadastrar cliente" }),
  ).toHaveAttribute("href", "/clientes");
});
test("lista combina filtros locais, datas inclusivas, ordem e conserva dados em falha de lookup", async ({
  page,
}) => {
  const { db } = await setup(page);
  db.vendas = Array.from({ length: 23 }, (_, n) => ({
    id: id(100 + n),
    idCliente: id(1),
    idLoja: n === 0 ? id(99) : id(2),
    idUsuario: id(3),
    dataVenda: "2026-11-05T02:00:00Z",
    status: n === 1 ? "CONCLUIDA" : "CANCELADA",
    valorTotal: n,
  }));
  await page.route("**/api/usuarios", (route) =>
    route.fulfill({ status: 502, json: { message: "Lookup indisponível" } }),
  );
  await page.goto(
    `/vendas?idCliente=${id(1)}&idLoja=${id(2)}&inicio=2026-11-04&fim=2026-11-04&ordem=total-desc`,
  );
  await expect(
    page.getByRole("columnheader", { name: "CLIENTE", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver venda", exact: true }),
  ).toHaveCount(20);
  await expect(page.getByRole("row").nth(1)).toContainText("22,00");
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(
    page.getByRole("link", { name: "Ver venda", exact: true }),
  ).toHaveCount(2);
  await page.getByLabel("Status", { exact: true }).selectOption("CONCLUIDA");
  await expect(
    page.getByRole("link", { name: "Ver venda", exact: true }),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "CONCLUIDA",
  );
});

test("venda recupera entradas e itens no reload e descarta ao sair", async ({ page }) => {
  await setup(page);
  await page.goto("/vendas/nova");
  await page.getByLabel("Cliente *", { exact: true }).selectOption(id(1));
  await page.getByLabel("Quantidade").fill("0,");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await expect(page.getByText("Recuperação salva neste navegador", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByLabel("Quantidade").first()).toHaveValue("0,");
  await expect(page.getByLabel("Cliente *", { exact: true })).toHaveValue(id(1));
  await expect(page.getByLabel("Item 2", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Voltar", exact: true }).click();
  await page.getByRole("button", { name: "Descartar e sair" }).click();
  await expect(page).toHaveURL(/\/vendas$/);
  await page.goto("/vendas/nova");
  await expect(page.getByRole("button", { name: "Restaurar", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Quantidade")).toHaveValue("");
});
