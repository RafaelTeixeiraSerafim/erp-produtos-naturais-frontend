import { test, expect, type Page } from "./auth-fixture";
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
type Row = Record<string, unknown>;
type Database = Record<string, Row[]>;
async function mockCatalog(page: Page, seed: Database = {}) {
  const db: Database = {
    produtos: [],
    categorias: [],
    "unidades-medida": [],
    lojas: [],
    "produtos-sku": [],
    "skus-loja": [],
    "skus-precos-loja": [],
    ...seed,
  };
  let count = 100;
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname.startsWith("/api/auth/")) return route.fallback();
    if(new URL(route.request().url()).pathname.startsWith("/api/localidades/"))return route.fulfill({json:{dados:new URL(route.request().url()).pathname.endsWith("municipios")?[{id:4204608,nome:"Criciúma"}]:[{id:42,nome:"Santa Catarina",sigla:"SC"}],desatualizado:false}});
    const req = route.request(),
      url = new URL(req.url()),
      [resource, id] = url.pathname.replace("/api/", "").split("/");
    const rows = db[resource];
    if (!rows)
      return route.fulfill({
        status: 404,
        json: { message: "Não encontrado" },
      });
    const body = () => req.postDataJSON() as Row;
    if (req.method() === "GET") {
      if (id) {
        const found = rows.find((x) => x.id === id);
        return route.fulfill({
          status: found ? 200 : 404,
          json: found || { message: "Registro não encontrado." },
        });
      }
      // Intentionally return all relations: UI must filter both IDs.
      return route.fulfill({ json: rows });
    }
    if (req.method() === "POST") {
      const v = body();
      if (resource === "produtos-sku" && rows.some((x) => x.sku === v.sku))
        return route.fulfill({
          status: 409,
          json: { message: "SKU já cadastrado." },
        });
      if (
        resource === "skus-loja" &&
        rows.some((x) => x.idProdutoSku === v.idProdutoSku && x.idLoja === v.idLoja)
      )
        return route.fulfill({
          status: 409,
          json: { message: "Produto já vinculado à loja." },
        });
      const row = { ...v, ...(v.idProdutoSku ? {idProduto:db["produtos-sku"].find(s=>s.id===v.idProdutoSku)?.idProduto}:{}), id: uid(count++) };
      rows.push(row);
      return route.fulfill({ status: 201, json: row });
    }
    if (req.method() === "PUT") {
      const index = rows.findIndex((x) => x.id === id);
      if (index < 0)
        return route.fulfill({
          status: 404,
          json: { message: "Não encontrado" },
        });
      const v=body();
      rows[index] = { ...v, ...(v.idProdutoSku ? {idProduto:db["produtos-sku"].find(s=>s.id===v.idProdutoSku)?.idProduto}:{}), id };
      return route.fulfill({ json: rows[index] });
    }
    if (req.method() === "DELETE") {
      if (
        resource === "produtos" &&
        db["produtos-sku"].some((x) => x.idProduto === id)
      )
        return route.fulfill({
          status: 409,
          json: {
            message: "Produto referenciado por SKU. Exclusão bloqueada.",
          },
        });
      db[resource] = rows.filter((x) => x.id !== id);
      return route.fulfill({ status: 204 });
    }
  });
  return db;
}
const category = { id: uid(1), nome: "Grãos" },
  unit = { id: uid(2), nome: "Quilograma", sigla: "kg" },
  store = {
    id: uid(3),
    nomeFantasia: "Loja Centro",
    razaoSocial: "Vila Verde LTDA",
    cnpj: "12345678000190",
    estado: "SC",
    cidade: "Criciúma",
    bairro: "Centro",
    numero: "10",
    complemento: "",
  },
  product = {
    id: uid(4),
    nome: "Aveia integral",
    idCategoria: uid(1),
    nomeCategoria: "Grãos",
    idUnidadeMedida: uid(2),
    siglaUnidadeMedida: "kg",
    status: "ATIVO",
    descricao: "",
  };
const seed = () => ({
  categorias: [{ ...category }],
  "unidades-medida": [{ ...unit }],
  lojas: [{ ...store }],
  produtos: [{ ...product }],
  "produtos-sku":[{id:uid(5),idProduto:product.id,sku:"SEED",descricaoApresentacao:"Granel",idUnidadeMedida:unit.id,tipoVenda:"PESO",status:"ATIVO"}],
});
async function navigate(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("main")).toBeVisible();
}
async function saveDialog(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test("fluxo completo: cadastros, produto, SKU, loja, preço, edição e persistência ao recarregar", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const db = await mockCatalog(page);
  await navigate(page, "/categorias");
  await page.getByRole("button", { name: "Nova categoria" }).click();
  await page.getByLabel("Nome", { exact: false }).fill("Grãos");
  await saveDialog(page);
  await navigate(page, "/unidades-medida");
  await page.getByRole("button", { name: "Nova unidade de medida" }).click();
  await page.getByLabel("Nome", { exact: false }).fill("Quilograma");
  await page.getByLabel("Sigla").fill("kg");
  await saveDialog(page);
  await navigate(page, "/lojas");
  await page.getByRole("button", { name: "Nova loja" }).click();
  for (const [label, value] of Object.entries({
    "Nome fantasia": "Loja Centro",
    "Razão social": "Vila Verde LTDA",
    CNPJ: "04252011000110",
    Bairro: "Centro",
    Número: "10",
  }))
    await page.getByLabel(label, { exact: false }).fill(value);
  await page.getByLabel("Estado",{exact:true}).selectOption("SC");
  await page.getByLabel("Cidade",{exact:true}).selectOption("4204608");
  await saveDialog(page);
  await navigate(page, "/produtos/novo");
  await page.getByLabel("Nome do produto").fill("Aveia integral");
  await page
    .getByRole("combobox", { name: "Categoria", exact: false })
    .selectOption({ label: "Grãos" });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Aveia integral", exact: true }),
  ).toBeVisible();
  expect(db.produtos[0]).toMatchObject({
    status: "ATIVO",
  });
  await page.getByRole("button", { name: "Novo SKU" }).click();
  await page.getByRole("textbox", { name: "SKU", exact: true }).fill("AVE-01");
  await page.getByLabel("Descrição da apresentação").fill("Granel");
  await page.getByRole("combobox", { name: "Unidade de medida", exact: false }).selectOption({label:"Quilograma (kg)"});
  await page.getByLabel("EAN-13").fill("7891234567890");
  await saveDialog(page);
  await expect(
    page.getByRole("cell", { name: "AVE-01", exact: true }),
  ).toBeVisible();
  expect(db["produtos-sku"][0]).not.toHaveProperty("idLoja");
  await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
  await page.getByRole("tab", { name: "Lojas", exact: true }).click();
  await page
    .getByRole("button", { name: "Vincular loja", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Loja", exact: false })
    .selectOption({ label: "Loja Centro" });
  await saveDialog(page);
  await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
  await page.getByRole("tab", { name: "Preços" }).click();
  await page.getByRole("button", { name: "Novo preço" }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Loja", exact: false })
    .selectOption({ label: "Loja Centro" });
  await page.getByLabel("Preço (R$)").fill("12,90");
  await page.getByLabel("Início da validade").fill("2026-11-03T12:00");
  await page.getByLabel("Fim da validade").fill("2026-11-10T12:00");
  await saveDialog(page);
  await expect(page.getByRole("cell", { name: /12,90/ })).toBeVisible();
  expect(db["skus-precos-loja"][0].dataInicio).toMatch(/Z$/);
  await page.getByRole("button", { name: "Editar preço", exact: true }).click();
  await page.getByLabel("Preço (R$)").fill("14,50");
  await saveDialog(page);
  await expect(page.getByRole("cell", { name: /14,50/ })).toBeVisible();
  await page.getByRole("link", { name: "Editar produto", exact: true }).click();
  await page.getByLabel("Status").selectOption("INATIVO");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/produtos/${db.produtos[0].id}$`));
  await page.reload();
  await expect(page.getByText("Inativo", { exact: true })).toBeVisible();
  await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
  await page.getByRole("tab", { name: "Preços" }).click();
  await expect(page.getByRole("cell", { name: /14,50/ })).toBeVisible();
  await page
    .getByRole("button", { name: "Excluir preço", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(page.getByText("Nenhum preço cadastrado")).toBeVisible();
  await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
  await page.getByRole("tab", { name: "Lojas", exact: true }).click();
  await page.getByRole("button", { name: "Desvincular Loja Centro" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Desvincular", exact: true })
    .click();
  await expect(page.getByText("Nenhuma loja vinculada")).toBeVisible();
  await page.getByRole("tab", { name: "SKUs", exact: true }).click();
  await page.getByRole("button", { name: "Excluir AVE-01" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(page.getByText("Nenhum SKU cadastrado")).toBeVisible();
  await navigate(page, "/produtos");
  await page.getByRole("button", { name: "Excluir Aveia integral" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(page.getByText("Nenhum produto encontrado")).toBeVisible();
});
test("SKU duplicado mantém os dados e o modal aberto", async ({ page }) => {
  await mockCatalog(page, {
    ...seed(),
    "produtos-sku": [
      { id: uid(5), idProduto: product.id, sku: "AVE-01", status: "ATIVO" },
    ],
  });
  await navigate(page, `/produtos/${product.id}`);
  await page.getByRole("button", { name: "Novo SKU" }).click();
  await page.getByRole("textbox", { name: "SKU", exact: true }).fill("AVE-01");
  await page.getByLabel("Descrição da apresentação").fill("Granel");
  await page.getByRole("combobox", { name: "Unidade de medida", exact: false }).selectOption({label:"Quilograma (kg)"});
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("SKU já cadastrado.");
  await expect(
    page.getByRole("textbox", { name: "SKU", exact: true }),
  ).toHaveValue("AVE-01");
});
test("vínculo duplicado exibe erro e permite tentar novamente", async ({
  page,
}) => {
  await mockCatalog(page, {
    ...seed(),
    "skus-loja": [{ id: uid(6), idProdutoSku:uid(5), idProduto: product.id, idLoja: store.id }],
  });
  await navigate(page, `/produtos/${product.id}`);
  await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
  await page.getByRole("tab", { name: "Lojas", exact: true }).click();
  await page
    .getByRole("button", { name: "Vincular loja", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("combobox", { name: "Loja", exact: false }).selectOption(store.id);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Produto já vinculado à loja.",
  );
});
test("exclusão bloqueada não remove o produto", async ({ page }) => {
  await mockCatalog(page, {
    ...seed(),
    "produtos-sku": [{ id: uid(5), idProduto: product.id, sku: "AVE-01" }],
  });
  await navigate(page, "/produtos");
  await page.getByRole("button", { name: "Excluir Aveia integral" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Exclusão bloqueada.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar" })
    .click();
  await expect(
    page.getByRole("link", { name: "Aveia integral", exact: true }),
  ).toBeVisible();
});
test("listas prévias vazias orientam o usuário e impedem salvar produto", async ({
  page,
}) => {
  await mockCatalog(page);
  await navigate(page, "/produtos/novo");
  await expect(
    page.getByText("Cadastre uma categoria para relacionar ao produto."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar", exact: true }),
  ).toBeDisabled();
});
test("backend indisponível exibe erro e permite recuperação", async ({
  page,
}) => {
  let offline = true;
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: offline ? 502 : 200,
      json: offline ? { message: "Não foi possível conectar ao backend." } : [],
    }),
  );
  await navigate(page, "/produtos");
  await expect(page.getByRole("alert").first()).toContainText(
    "Não foi possível conectar ao backend.",
  );
  offline = false;
  await page
    .getByRole("region", { name: "Catálogo de produtos" })
    .getByRole("button", { name: "Tentar novamente" })
    .click();
  await expect(page.getByText("Nenhum produto encontrado")).toBeVisible();
});
test("busca, ordenação, filtros e paginação persistem na URL", async ({
  page,
}) => {
  await mockCatalog(page, {
    ...seed(),
    produtos: Array.from({ length: 25 }, (_, index) => ({
      ...product,
      id: uid(index + 20),
      nome: `Produto ${String(index).padStart(2, "0")}`,
    })),
  });
  await navigate(page, "/produtos");
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await page.getByLabel("Buscar produtos").fill("Produto 24");
  await expect(page).toHaveURL(/busca=Produto/);
  await page.reload();
  await expect(page.getByLabel("Buscar produtos")).toHaveValue("Produto 24");
  await expect(
    page.getByRole("link", { name: "Produto 24", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Próxima" })).toBeDisabled();
});
test("filtra relações pelo produto e pela loja mesmo se a API retornar tudo", async ({
  page,
}) => {
  await mockCatalog(page, {
    ...seed(),
    "skus-precos-loja": [
      { id: uid(8), idProdutoSku:uid(5), idProduto: product.id, idLoja: store.id, preco: 10 },
      { id: uid(9), idProdutoSku:uid(55), idProduto: uid(99), idLoja: store.id, preco: 99 },
      { id: uid(10), idProdutoSku:uid(5), idProduto: product.id, idLoja: uid(98), preco: 88 },
    ],
  });
  await navigate(page, `/produtos/${product.id}`);
  await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
  await page.getByRole("tab", { name: "Preços" }).click();
  await page.getByLabel("Filtrar por loja").selectOption(store.id);
  await expect(page.getByRole("cell", { name: /10,00/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /99,00|88,00/ })).toHaveCount(0);
});
test("navegação móvel, teclado e foco dos modais", async ({
  page,
}, testInfo) => {
  await mockCatalog(page);
  await navigate(page, "/categorias");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Categorias", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await page.getByRole("button", { name: "Nova categoria" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Nome", { exact: false })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nova categoria" }),
  ).toBeFocused();
});
