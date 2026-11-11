import { test, expect, type Page } from "./auth-fixture";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
type Row = Record<string, unknown>;
async function setup(page: Page, empty = false) {
  const supplier = {
    id: id(1),
    nomeFantasia: "Fornecedor Natural",
    razaoSocial: "Natural LTDA",
    estado: "SC",
    cidade: "Criciúma",
    bairro: "Centro",
    complemento: "",
    cnpj: "04252011000110",
    cpf: "",
  };
  const db: Record<string, Row[]> = {
    fornecedores: empty ? [] : [supplier],
    lojas: empty ? [] : [{ id: id(2), nomeFantasia: "Loja Centro" }],
    produtos: empty
      ? []
      : [
          { id: id(3), nome: "Aveia",status:"ATIVO" },
          { id: id(4), nome: "Castanha",status:"ATIVO" },
        ],
    compras: [],
  };
  db["produtos-sku"] = db.produtos.map(p=>({id:p.id,idProduto:p.id,nomeProduto:p.nome,sku:String(p.id),descricaoApresentacao:"Granel",tipoVenda:"PESO",status:"ATIVO"}));
  let count = 100;
  const writes: Row[] = [];
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).pathname.startsWith("/api/auth/")) return route.fallback();
    if(new URL(route.request().url()).pathname.startsWith("/api/localidades/"))return route.fulfill({json:{dados:new URL(route.request().url()).pathname.endsWith("municipios")?[{id:4204608,nome:"Criciúma"}]:[{id:42,nome:"Santa Catarina",sigla:"SC"}],desatualizado:false}});
    const req = route.request(),
      [resource, key] = new URL(req.url()).pathname
        .replace("/api/", "")
        .split("/");
    const rows = db[resource] || [];
    if (req.method() === "GET") {
      const row = key ? rows.find((r) => r.id === key) : rows;
      return route.fulfill({
        status: row ? 200 : 404,
        json: row || { message: "Registro não encontrado" },
      });
    }
    if (req.method() === "DELETE") {
      db[resource] = rows.filter((r) => r.id !== key);
      return route.fulfill({ status: 204 });
    }
    const body = req.postDataJSON() as Row;
    writes.push(body);
    const row = { ...body, id: key || id(count++) };
    if (resource === "compras") {
      Object.assign(row, {
        dataCompra: body.dataCompra || "2026-11-05T02:00:00Z",
        valorTotal: 6.19,
        itens: (body.itens as Row[]).map((i, n) => ({
          ...i,
          id: id(count++),
          totalItem: n ? 3.65 : 2.54,
          quantidadeRecebida: 0,
        })),
      });
    }
    const index = rows.findIndex((r) => r.id === key);
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    return route.fulfill({ status: key ? 200 : 201, json: row });
  });
  return { db, writes, supplier };
}
async function fillItem(page: Page, n: number, product = id(3)) {
  const row = page.getByLabel(`Item ${n}`, { exact: true });
  await row.getByRole("combobox", { name: "SKU", exact: false }).selectOption(product);
  await row.getByLabel("Quantidade").fill("1,125");
  await row.getByLabel("Custo unitário").fill("2,3456");
  await row.getByLabel("Desconto").fill("0,10");
}
test("fornecedor: CRUD, normalização de UF, filtro e referência bloqueada", async ({
  page,
}) => {
  const { db, writes } = await setup(page);
  await page.goto("/fornecedores");
  await page.getByRole("button", { name: "Novo fornecedor" }).click();
  for (const [label, value] of Object.entries({
    "Nome fantasia": "Novo natural",
    "Razão social": "Novo LTDA",
    CNPJ: "04252011000110",
    Bairro: "Centro",
  }))
    await page
      .getByRole("dialog")
      .getByLabel(label, { exact: false })
      .fill(value);
  await page.getByLabel("Estado",{exact:true}).selectOption("SC");
  await page.getByLabel("Cidade",{exact:true}).selectOption("4204608");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(writes[0].estado).toBe("SC");
  await page.getByRole("button", { name: "Editar Novo natural" }).click();
  await page.getByLabel("Nome fantasia").fill("Novo editado");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "Novo editado" });
  await row.getByRole("link", { name: "Ver compras" }).click();
  await expect(page).toHaveURL(/compras\?idFornecedor=/);
  await page.goto("/fornecedores");
  await page.route("**/api/fornecedores/*", (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill({
          status: 409,
          json: { message: "Fornecedor referenciado por compra" },
        })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "Excluir Novo editado" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Excluir/ })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Fornecedor referenciado",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.unroute("**/api/fornecedores/*");
  await page.getByRole("button", { name: "Excluir Novo editado" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Excluir/ })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(db.fornecedores).toHaveLength(1);
});
test("rascunho com vários itens, erro preserva valores, edição e totais salvos", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.goto("/compras/nova");
  await page.getByRole("combobox", { name: "Fornecedor *", exact: true }).selectOption(id(1));
  await page.getByRole("combobox", { name: "Loja *", exact: true }).selectOption(id(2));
  await fillItem(page, 1);
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await fillItem(page, 2, id(4));
  await page.getByLabel("Observação").fill("Entrega combinada");
  await expect(page.getByText("Prévia total:")).toContainText("5,08");
  await page.route("**/api/compras", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 400,
          json: { message: "Falha de validação da compra" },
        })
      : route.fallback(),
  );
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.locator("main").getByRole("alert").first()).toContainText(
    "Falha de validação",
  );
  await expect(page.getByLabel("Observação")).toHaveValue("Entrega combinada");
  await page.unroute("**/api/compras");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Total salvo:", { exact: false })).toContainText(
    "6,19",
  );
  expect(writes[0]).toMatchObject({
    status: "RASCUNHO",
    itens: [
      { quantidade: 1.125, custoUnitario: 2.3456 },
      { quantidade: 1.125, custoUnitario: 2.3456 },
    ],
  });
  expect(writes[0]).not.toHaveProperty("idUsuario");
  await page.reload();
  await page.getByRole("link", { name: "Editar rascunho" }).click();
  await expect(page.getByLabel("Quantidade").first()).toHaveValue("1,125");
  await page.getByRole("button", { name: "Remover item 2" }).click();
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/);
  expect(writes[1].itens).toHaveLength(1);
  expect((writes[1].itens as Row[])[0].id).toBeTruthy();
});
test("filtros restauráveis, datas São Paulo, ordenação e paginação", async ({
  page,
}) => {
  const { db } = await setup(page);
  db.compras = Array.from({ length: 25 }, (_, i) => ({
    id: id(100 + i),
    idFornecedor: id(1),
    idLoja: id(2),
    status: "RASCUNHO",
    dataCompra: `2026-11-05T02:${String(i).padStart(2, "0")}:00Z`,
    valorTotal: i,
  }));
  db.compras.push({
    id: id(200),
    idFornecedor: id(9),
    status: "RECEBIDA",
    dataCompra: "2026-11-06T12:00:00Z",
    valorTotal: 90,
  });
  await page.goto(
    `/compras?idFornecedor=${id(1)}&idLoja=${id(2)}&status=RASCUNHO&inicio=2026-11-04&fim=2026-11-04&ordem=total-asc&pagina=2`,
  );
  await expect(page.getByText("Página 2 de 2")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(6);
  await expect(page.getByRole("row").nth(1)).toContainText("20,00");
  await page.reload();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "RASCUNHO",
  );
  await expect(page.getByLabel("Data inicial")).toHaveValue("2026-11-04");
  await page.getByLabel("Ordenar compras").selectOption("total-desc");
  await expect(page.getByText("Página 1 de 2")).toBeVisible();
  await expect(page.getByRole("row").nth(1)).toContainText("24,00");
});
test("pré-requisitos ausentes e falhas de lookup impedem gravação", async ({
  page,
}) => {
  await setup(page, true);
  await page.goto("/compras/nova");
  await expect(
    page.getByRole("button", { name: "Salvar rascunho" }),
  ).toBeDisabled();
  for (const name of [
    "Cadastrar fornecedor em nova aba",
    "Cadastrar loja em nova aba",
    "Cadastrar SKU em nova aba",
  ])
    await expect(page.getByRole("link", { name })).toBeVisible();
  await page.route("**/api/fornecedores", (route) =>
    route.fulfill({ status: 500, json: { message: "Falha fornecedores" } }),
  );
  await page.reload();
  await expect(page.locator("main").getByRole("alert").first()).toContainText(
    "Verifique a conexão",
  );
  await expect(
    page.getByRole("button", { name: "Salvar rascunho" }),
  ).toBeDisabled();
});
test("compra fora de rascunho é somente leitura e status concorrente bloqueia novo envio", async ({
  page,
}) => {
  const { db } = await setup(page);
  db.compras.push({
    id: id(100),
    idFornecedor: id(1),
    idLoja: id(2),
    status: "RECEBIDA",
    dataCompra: "2026-11-05T12:00:00Z",
    valorTotal: 2,
    itens: [
      {
        id: id(101),
        idProdutoSku: id(3),
        quantidade: 1,
        custoUnitario: 2,
        desconto: 0,
        totalItem: 2,
        quantidadeRecebida: 1,
      },
    ],
  });
  await page.goto(`/compras/${id(100)}`);
  await expect(page.getByText("Status: Recebida")).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar rascunho" })).toHaveCount(
    0,
  );
  await page.goto(`/compras/${id(100)}/editar`);
  await expect(
    page.getByRole("button", { name: "Salvar rascunho" }),
  ).toBeDisabled();
  db.compras[0].status = "RASCUNHO";
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Salvar rascunho" }),
  ).toBeEnabled();
  await page.getByLabel("Observação").fill("Preservar");
  await page.route("**/api/compras/*", (route) => {
    if (route.request().method() === "PUT") {
      db.compras[0].status = "RECEBIDA";
      return route.fulfill({
        status: 400,
        json: { message: "Somente compras em rascunho podem ser alteradas" },
      });
    }
    return route.fallback();
  });
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText(/Status salvo: Recebida/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar rascunho" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Observação")).toHaveValue("Preservar");
});
test("falha de fornecedor mantém formulário e compra ausente tem retry", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/fornecedores");
  await page.getByRole("button", { name: "Editar Fornecedor Natural" }).click();
  await page.getByLabel("Nome fantasia").fill("Preservado");
  await page.route("**/api/fornecedores/*", (route) =>
    route.fulfill({ status: 400, json: { message: "Documento inválido" } }),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Documento inválido",
  );
  await expect(page.getByLabel("Nome fantasia")).toHaveValue("Preservado");
  await page.goto(`/compras/${id(999)}`);
  await expect(page.locator("main").getByRole("alert").first()).toContainText(
    "Registro não encontrado",
  );
  await expect(
    page.getByRole("button", { name: "Tentar novamente" }),
  ).toBeVisible();
});
test("navegação de compras em desktop/mobile e breadcrumbs", async ({
  page,
}, testInfo) => {
  await setup(page);
  await page.goto("/produtos");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Pedidos", exact: true })
    .click();
  await expect(page).toHaveURL(/\/compras$/);
  await expect(
    page
      .getByRole("banner")
      .getByText("Compras", { exact: true }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Fornecedores", exact: true })
    .click();
  await expect(page).toHaveURL(/\/fornecedores$/);
  await expect(page.getByRole("banner")).toContainText("Fornecedores");
});

test("recupera valores incompletos e linhas após navegação protegida e permite descarte", async ({ page }) => {
  await setup(page);
  await page.goto("/compras/nova");
  await page.getByLabel("Quantidade").fill("1,");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.getByLabel("Observação").fill("Entrega local");
  if(await page.getByRole("button",{name:"Abrir menu"}).isVisible())await page.getByRole("button",{name:"Abrir menu"}).click();
  await page.getByRole("navigation").getByRole("link",{name:"Fornecedores",exact:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando" }).click();
  await expect(page.getByLabel("Observação")).toHaveValue("Entrega local");
  if(await page.getByRole("button",{name:"Abrir menu"}).isVisible())await page.getByRole("button",{name:"Abrir menu"}).click();
  await page.getByRole("navigation").getByRole("link",{name:"Fornecedores",exact:true}).click();
  await page.getByRole("button", { name: "Sair e manter recuperação" }).click();
  await expect(page).toHaveURL(/\/fornecedores$/);
  await page.goto("/compras/nova");
  await expect(page.getByLabel("Observação")).toBeDisabled();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByLabel("Quantidade").first()).toHaveValue("1,");
  await expect(page.getByLabel("Item 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Descartar alterações", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar descarte" }).click();
  await expect(page.getByLabel("Observação")).toHaveValue("");
  await expect(page.getByLabel("Quantidade")).toHaveValue("");
});

test("restauração mantém seleção ausente visível e impede envio", async ({ page }) => {
  const { db } = await setup(page);
  await page.goto("/compras/nova");
  await page.getByRole("combobox", { name: "Fornecedor *", exact: true }).selectOption(id(1));
  await page.getByRole("combobox", { name: "Loja *", exact: true }).selectOption(id(2));
  await fillItem(page, 1);
  await expect(page.getByText("Recuperação salva neste navegador", { exact: true })).toBeVisible();
  db.produtos = [{ id: id(4), nome: "Castanha",status:"ATIVO" }];
  db["produtos-sku"] = db["produtos-sku"].filter(s=>s.id!==id(3));
  await page.reload();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "SKU *", exact: true })).toHaveValue(id(3));
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toBeDisabled();
  await expect(page.locator('option:checked').filter({ hasText: 'Indisponível:' })).toHaveCount(1);
});

test("compra alterada no servidor preserva recuperação somente para consulta", async ({ page }) => {
  const { db } = await setup(page);
  db.compras.push({ id: id(100), status: "RASCUNHO", idFornecedor: id(1), idLoja: id(2), observacao: "original", itens: [] });
  await page.goto(`/compras/${id(100)}/editar`);
  await page.getByLabel("Observação").fill("local");
  await expect(page.getByText("Recuperação salva neste navegador", { exact: true })).toBeVisible();
  db.compras[0].observacao = "servidor";
  await page.reload();
  await expect(page.getByText(/apenas para consulta manual/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Restaurar", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Observação")).toBeDisabled();
  await expect(page.locator("pre")).toContainText("local");
});

test("duas abas exigem decisão explícita sem mesclar itens", async ({ page, context }) => {
  await setup(page);
  await page.goto("/compras/nova");
  const second = await context.newPage();
  await setup(second);
  await second.goto("/compras/nova");
  await expect(second.getByLabel("Observação")).toBeEnabled();
  await page.getByLabel("Observação").fill("Primeira aba");
  await expect(page.getByText("Recuperação salva neste navegador", { exact: true })).toBeVisible();
  await expect(second.getByText("Recuperação alterada em outra aba", { exact: true })).toBeVisible();
  await expect(second.getByLabel("Observação")).toBeDisabled();
  await second.getByRole("button", { name: "Carregar cópia da outra aba" }).click();
  await expect(second.getByLabel("Observação")).toHaveValue("Primeira aba");
  await second.getByRole("button", { name: "Adicionar item" }).click();
  await expect(page.getByText("Recuperação alterada em outra aba", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Carregar cópia da outra aba" }).click();
  await expect(page.getByLabel("Item 2", { exact: true })).toBeVisible();
  await second.close();
});

test("compra salva com falha de atualização mantém link e impede reenvio", async ({ page }) => {
  const { writes } = await setup(page);
  await page.goto("/compras/nova");
  await page.getByRole("combobox", { name: "Fornecedor *", exact: true }).selectOption(id(1));
  await page.getByRole("combobox", { name: "Loja *", exact: true }).selectOption(id(2));
  await fillItem(page, 1);
  await page.route("**/api/fornecedores", route => route.fulfill({ status: 500, json: {} }));
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText(/Não foi possível atualizar a tela/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar rascunho" })).toBeDisabled();
  expect(writes).toHaveLength(1);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("vila:recovery:")))).toEqual([]);
  await page.getByRole("link", { name: "Ver registro salvo" }).click();
  await expect(page).toHaveURL(/\/compras\/[0-9a-f-]{36}$/);
  expect(writes).toHaveLength(1);
});
