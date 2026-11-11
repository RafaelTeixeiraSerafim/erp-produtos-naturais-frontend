import { test, expect } from "./auth-fixture";
test("transferência real: recebimento, recuperação, edição, movimentos pareados e venda no destino", async ({
  page,
  request,
}) => {
  const f = JSON.parse(process.env.SALES_FIXTURE!),
    p = JSON.parse(process.env.PURCHASES_FIXTURE!);
  const post = async (path: string, data: unknown, key?: string) => {
    const r = await request.post(`/api/${path}`, {
      data,
      headers: key ? { "Idempotency-Key": key } : {},
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    return r.json();
  };
  const balance = async (store: string) =>
    Number(
      (
        await (
          await request.get(
            `/api/estoques/saldo?idProdutoSku=${f.product}&idLoja=${store}`,
          )
        ).json()
      ).quantidadeAtual,
    );
  const initialA = await balance(f.store),
    initialB = await balance(f.otherStore);
  const purchase = await post("compras", {
    idFornecedor: p.supplier,
    idLoja: f.store,
    status: "RASCUNHO",
    itens: [
      { idProdutoSku: f.product, quantidade: 10, custoUnitario: 1, desconto: 0 },
    ],
  });
  const receipt = await post(
    "recebimentos-compras",
    {
      idCompra: purchase.id,
      idUsuario: f.operator,
      status: "RASCUNHO",
      itens: [
        {
          idItemCompra: purchase.itens[0].id,
          idProdutoSku: f.product,
          quantidade: 10,
        },
      ],
    },
    crypto.randomUUID(),
  );
  await post(`recebimentos-compras/${receipt.id}/concluir`, {
    versao: receipt.versao,
  });
  await page.goto("/estoque/transferencias/nova");
  await page.getByLabel("Origem *", { exact: true }).selectOption(f.store);
  await page
    .getByLabel("Destino *", { exact: true })
    .selectOption(f.otherStore);
  await page.getByRole("combobox", { name: "SKU *", exact: true }).selectOption(f.product);
  await page.getByLabel("Quantidade *", { exact: true }).fill("2,125");
  await page
    .getByLabel("Observação", { exact: true })
    .fill("Transferência integrada");
  await expect(
    page.getByText("Recuperação salva neste navegador", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page).toHaveURL(/\/estoque\/transferencias\/[0-9a-f-]{36}$/);
  const url = page.url(),
    id = url.split("/").pop();
  const before = await (
    await request.get(`/api/transferencias-estoque/${id}`)
  ).json();
  expect(await balance(f.store)).toBeCloseTo(initialA + 10, 3);
  await page
    .getByRole("link", { name: "Editar transferência", exact: true })
    .click();
  await page.getByLabel("Quantidade *", { exact: true }).fill("3,125");
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page).toHaveURL(url);
  const edited = await (
    await request.get(`/api/transferencias-estoque/${id}`)
  ).json();
  expect(edited.itens[0].id).toBe(before.itens[0].id);
  expect(edited.versao).toBeGreaterThan(before.versao);
  await page
    .getByRole("button", { name: "Concluir transferência", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("imediatamente");
  await page
    .getByRole("button", {
      name: "Confirmar transferência imediata",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Status: Concluída", { exact: true }),
  ).toBeVisible();
  await page.reload();
  expect(await balance(f.store)).toBeCloseTo(initialA + 6.875, 3);
  expect(await balance(f.otherStore)).toBeCloseTo(initialB + 3.125, 3);
  const movements = (
    await (await request.get("/api/movimentacoes-estoque")).json()
  ).filter((m: { idTransferencia: string }) => m.idTransferencia === id);
  expect(movements).toHaveLength(2);
  expect(movements.map((m: { tipo: string }) => m.tipo).sort()).toEqual([
    "TRANSFERENCIA_ENTRADA",
    "TRANSFERENCIA_SAIDA",
  ]);
  for (const m of movements) {
    expect(m.quantidade).toBe(3.125);
    expect(m.idUsuario).toBe(f.operator);
  }
  const done = await post(`transferencias-estoque/${id}/concluir`, {
    versao: 0,
  });
  expect(done.idConfirmador).toBe(f.operator);
  expect(await balance(f.otherStore)).toBeCloseTo(initialB + 3.125, 3);
  const sale = await post(
    "vendas",
    {
      idCliente: f.customer,
      idLoja: f.otherStore,
      itens: [
        {
          idProdutoSku: f.product,
          quantidade: 1.125,
          precoUnitario: 2,
          desconto: 0,
        },
      ],
    },
    crypto.randomUUID(),
  );
  await post(`vendas/${sale.id}/concluir`, { versao: sale.versao });
  expect(await balance(f.otherStore)).toBeCloseTo(initialB + 2, 3);
});
test("rascunho preservado na falta; cancelamento, replay perdido e revisão explícita de versão", async ({
  page,
  request,
}) => {
  const f = JSON.parse(process.env.SALES_FIXTURE!);
  const body = {
    idLojaOrigem: f.store,
    idLojaDestino: f.otherStore,
    itens: [{ idProdutoSku: f.product, quantidade: 99999999999 }],
  };
  const key = crypto.randomUUID();
  const create = async () => {
    const r = await request.post("/api/transferencias-estoque", {
      data: body,
      headers: { "Idempotency-Key": key },
    });
    expect(r.ok()).toBe(true);
    return r.json();
  };
  const a = await create();
  expect((await create()).id).toBe(a.id);
  const before = await (await request.get("/api/estoques")).json();
  await page.goto(`/estoque/transferencias/${a.id}`);
  await page
    .getByRole("button", { name: "Concluir transferência", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Confirmar transferência imediata",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert").first()).toContainText("disponível");
  expect(await (await request.get("/api/estoques")).json()).toEqual(before);
  await page.goto(`/estoque/transferencias/${a.id}/editar`);
  await page.getByLabel("Quantidade *", { exact: true }).fill("1");
  const external = await request.put(`/api/transferencias-estoque/${a.id}`, {
    data: {
      ...body,
      versao: a.versao,
      observacao: "Outra aba",
      itens: a.itens.map((i: { id: string; idProdutoSku: string }) => ({
        ...i,
        quantidade: 2,
      })),
    },
  });
  expect(external.ok()).toBe(true);
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByText(
      "A versão salva precisa ser revisada. Seus valores foram preservados.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Quantidade *", { exact: true })).toHaveValue(
    "1",
  );
  await page
    .getByRole("button", { name: "Usar versão atual e revisar valores" })
    .click();
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/estoque/transferencias/${a.id}$`));
  await page
    .getByRole("button", { name: "Cancelar transferência", exact: true })
    .click();
  await page
    .getByLabel("Motivo do cancelamento")
    .fill("Cancelamento integrado");
  await page
    .getByRole("button", { name: "Confirmar cancelamento", exact: true })
    .click();
  await expect(
    page.getByText("Status: Cancelada", { exact: true }),
  ).toBeVisible();
  expect(await (await request.get("/api/estoques")).json()).toEqual(before);
});
test("resposta perdida na criação repete chave e conteúdo após recarregar", async ({
  page,
  request,
}) => {
  const f = JSON.parse(process.env.SALES_FIXTURE!);
  let lost = true;
  await page.route("**/api/transferencias-estoque", async (route) => {
    if (route.request().method() === "POST" && lost) {
      lost = false;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/estoque/transferencias/nova");
  await page.getByLabel("Origem *", { exact: true }).selectOption(f.store);
  await page
    .getByLabel("Destino *", { exact: true })
    .selectOption(f.otherStore);
  await page.getByRole("combobox", { name: "SKU *", exact: true }).selectOption(f.product);
  await page.getByLabel("Quantidade *", { exact: true }).fill("1");
  const before = (
    await (await request.get("/api/transferencias-estoque")).json()
  ).length;
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Repetir envio salvo", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await page
    .getByRole("button", { name: "Repetir envio salvo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/estoque\/transferencias\/[0-9a-f-]{36}$/);
  expect(
    (await (await request.get("/api/transferencias-estoque")).json()).length,
  ).toBe(before + 1);
});
test("gerente precisa das duas lojas; funcionário consulta movimentos sem link do documento", async ({
  browser,
  request,
}) => {
  const f = JSON.parse(process.env.SALES_FIXTURE!);
  const temporary = crypto.randomUUID(),
    permanent = crypto.randomUUID(),
    email = `transfer-${crypto.randomUUID()}@example.test`;
  const accountResponse = await request.post("/api/usuarios", {
    data: {
      nome: "Transfer scope",
      email,
      usuario:email.split("@")[0].slice(0,32),
      cargo: "GER",
      status: "ATIVO",
      lojas: [f.store],
      senha: temporary,
    },
  });
  expect(accountResponse.ok()).toBe(true);
  const account = await accountResponse.json();
  const key = crypto.randomUUID(),
    body = {
      idLojaOrigem: f.store,
      idLojaDestino: f.otherStore,
      itens: [{ idProdutoSku: f.product, quantidade: 1 }],
    };
  const a = await (
    await request.post("/api/transferencias-estoque", {
      data: body,
      headers: { "Idempotency-Key": key },
    })
  ).json();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    storageState: { cookies: [], origins: [] },
  });
  async function mutate(path: string, data: unknown) {
    const token = await (await context.request.get("/api/auth/csrf")).json();
    return context.request.post(`/api/${path}`, {
      data,
      headers: {
        Origin: "http://127.0.0.1:3100",
        [token.headerName]: token.token,
      },
    });
  }
  try {
    expect((await mutate("auth/login", { login:email, senha: temporary })).ok()).toBe(
      true,
    );
    expect(
      (
        await mutate("auth/alterar-senha", {
          senhaAtual: temporary,
          novaSenha: permanent,
        })
      ).ok(),
    ).toBe(true);
    expect((await mutate("auth/login", { login:email, senha: permanent })).ok()).toBe(
      true,
    );
    expect(
      (
        await context.request.get(`/api/transferencias-estoque/${a.id}`)
      ).status(),
    ).toBe(404);
    expect(
      await (await context.request.get("/api/transferencias-estoque")).json(),
    ).toEqual([]);
    expect(
      (
        await mutate(`transferencias-estoque/${a.id}/concluir`, {
          versao: a.versao,
        })
      ).status(),
    ).toBe(404);
    const token = await (await context.request.get("/api/auth/csrf")).json();
    expect(
      (
        await context.request.post("/api/transferencias-estoque", {
          data: body,
          headers: {
            Origin: "http://127.0.0.1:3100",
            [token.headerName]: token.token,
            "Idempotency-Key": key,
          },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await request.put(`/api/usuarios/${account.id}`, {
          data: {
            nome: "Transfer scope",
            email,
            usuario:email.split("@")[0].slice(0,32),
            cargo: "FUNC",
            status: "ATIVO",
            lojas: [f.store],
          },
        })
      ).ok(),
    ).toBe(true);
    expect((await mutate("auth/login", { login:email, senha: permanent })).ok()).toBe(
      true,
    );
    expect(
      (await context.request.get("/api/transferencias-estoque")).status(),
    ).toBe(403);
    expect((await context.request.get("/api/movimentacoes-estoque")).ok()).toBe(
      true,
    );
    const person = await context.newPage();
    await person.goto(
      `/estoque/movimentacoes?idProdutoSku=${f.product}&idLoja=${f.store}`,
    );
    await expect(
      person.getByRole("link", { name: "Transferências", exact: true }),
    ).toHaveCount(0);
    await person.getByRole("button", { name: "Ver detalhes" }).first().click();
    await expect(
      person.getByRole("dialog").getByRole("link", { name: /[0-9a-f-]{36}/ }),
    ).toHaveCount(0);
  } finally {
    await context.close();
    await request.put(`/api/usuarios/${account.id}`, {
      data: {
        nome: "Transfer scope",
        email,
      usuario:email.split("@")[0].slice(0,32),
        cargo: "FUNC",
        status: "INATIVO",
        lojas: [],
      },
    });
  }
});
