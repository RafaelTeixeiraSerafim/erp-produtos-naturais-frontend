import { test, expect } from "./auth-fixture";
test("vendas reais: cliente e venda aberta com total agregado, reload e estoque inalterado", async ({
  page,
  request,
}, testInfo) => {
  if (process.env.CATALOG_DISPOSABLE !== "1" || !process.env.SALES_FIXTURE)
    throw new Error("Use npm run test:integration.");
  const fixture = JSON.parse(process.env.SALES_FIXTURE);
  const name = `${fixture.prefix}-${testInfo.project.name}`;
  const stock = await (await request.get("/api/estoques")).json();
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Novo cliente" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: false })
    .fill(name);
  await page.getByLabel("Data de nascimento").fill("2000-02-29");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/vendas/nova");
  await page
    .getByRole("combobox", { name: "Cliente *", exact: true })
    .selectOption({ label: name });
  await page.getByRole("combobox", { name: "Loja *", exact: true }).selectOption(fixture.store);
  const fill = async (
    n: number,
    product: string,
    q: string,
    cost: string,
    discount: string,
  ) => {
    const row = page.getByLabel(`Item ${n}`, { exact: true });
    await row.getByRole("combobox", { name: "SKU", exact: false }).selectOption(product);
    await row.getByLabel("Quantidade").fill(q);
    await row.getByLabel("Preço unitário").fill(cost);
    await row.getByLabel("Desconto").fill(discount);
  };

  await fill(1, fixture.product, "0,001", "5", "0");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await fill(2, fixture.otherProduct, "0,001", "5", "0");
  await expect(page.getByText("Recuperação salva neste navegador", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await page.getByRole("button", { name: "Salvar venda aberta" }).click();
  await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]{36}$/);
  await page.reload();
  await expect(page.getByText("Status: Aberta")).toBeVisible();
  await expect(page.getByText(/^Total salvo:/)).toContainText("0,01");
  await expect(page.getByText("Subtotal salvo:")).toContainText("0,01");
  await expect(page.getByRole("table").filter({has:page.getByRole("columnheader",{name:"PREÇO UNITÁRIO",exact:true})}).getByRole("row")).toHaveCount(3);
  await expect(page.getByRole("button", { name:"Concluir venda" })).toBeVisible();
  await expect(page.getByRole("link", { name:"Editar venda" })).toBeVisible();
  expect(await (await request.get("/api/estoques")).json()).toEqual(stock);
});

test("venda real: recebimento, edição, conclusão, saída vinculada, falta e cancelamento",async ({page,request})=>{
  if(process.env.CATALOG_DISPOSABLE!=="1")throw new Error("Use npm run test:integration.");
  const f=JSON.parse(process.env.SALES_FIXTURE!),p=JSON.parse(process.env.PURCHASES_FIXTURE!);
  const post=async(path:string,data:unknown,key?:string)=>{const response=await request.post(`/api/${path}`,{data,headers:key ? {"Idempotency-Key":key} : {}});expect(response.ok(),await response.text()).toBeTruthy();return response.json();};
  const saldo=async()=>Number((await (await request.get(`/api/estoques/saldo?idProdutoSku=${f.product}&idLoja=${f.store}`)).json()).quantidadeAtual);
  const initial=await saldo();
  const purchase=await post("compras",{idFornecedor:p.supplier,idLoja:f.store,status:"RASCUNHO",itens:[{idProdutoSku:f.product,quantidade:10,custoUnitario:2,desconto:0}]});
  const receipt=await post("recebimentos-compras",{idCompra:purchase.id,idUsuario:f.operator,status:"RASCUNHO",itens:[{idItemCompra:purchase.itens[0].id,idProdutoSku:f.product,quantidade:10}]},crypto.randomUUID());
  await post(`recebimentos-compras/${receipt.id}/concluir`,{versao:receipt.versao});expect(await saldo()).toBeCloseTo(initial+10,3);
  await page.goto("/vendas/nova");
  await page.getByRole("combobox", { name: "Cliente *", exact: true }).selectOption(f.customer);await page.getByRole("combobox", { name: "Loja *", exact: true }).selectOption(f.store);
  await page.getByRole("combobox", { name: "SKU *", exact: true }).selectOption(f.product);await page.getByLabel(/^Quantidade/).fill("2");await page.getByLabel(/^Preço unitário/).fill("3,50");await page.getByLabel("Observação",{exact:true}).fill("Venda conferida");
  await page.getByRole("button",{name:"Salvar venda aberta"}).click();await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]{36}$/);const url=page.url(),id=url.split("/").pop();
  const beforeEdit=await (await request.get(`/api/vendas/${id}`)).json();
  await page.getByRole("link",{name:"Editar venda"}).click();await page.getByLabel(/^Quantidade/).fill("3");
  await expect(page.getByText("Recuperação salva neste navegador",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Restaurar",exact:true}).click();
  await page.getByRole("button",{name:"Salvar venda aberta"}).click();await expect(page).toHaveURL(url);
  const edited=await (await request.get(`/api/vendas/${id}`)).json();expect(edited.itens[0].id).toBe(beforeEdit.itens[0].id);expect(edited.observacao).toBe("Venda conferida");expect(edited.valorTotal).toBe(10.5);
  await page.getByRole("button",{name:"Concluir venda"}).click();await expect(page.getByRole("dialog")).toContainText("Nenhum pagamento está sendo registrado");await expect(page.getByRole("dialog")).toContainText("10,50");
  await page.getByRole("button",{name:"Confirmar saída de estoque"}).click();await expect(page.getByText("Status: Concluída",{exact:true})).toBeVisible();await page.reload();expect(await saldo()).toBeCloseTo(initial+7,3);
  const done=await (await request.get(`/api/vendas/${id}`)).json();expect(done.idConfirmador).toBeTruthy();expect(done.concluidoEm).toBeTruthy();
  const movements=await (await request.get(`/api/movimentacoes-estoque?idProdutoSku=${f.product}&idLoja=${f.store}`)).json();const saleMovements=movements.filter((m:{idVenda:string})=>m.idVenda===id);expect(saleMovements).toHaveLength(1);expect(saleMovements[0].quantidade).toBe(3);
  await post(`vendas/${id}/concluir`,{versao:edited.versao});expect(await saldo()).toBeCloseTo(initial+7,3);
  await page.goto(`/estoque/movimentacoes?idProdutoSku=${f.product}&idLoja=${f.store}`);
  // The persisted movement identity selects its detail even if other sales have equal quantities.
  const rows=page.getByRole("row").filter({hasText:"Saída de venda"});await rows.first().getByRole("button",{name:"Ver detalhes"}).click();await expect(page.getByRole("link",{name:id,exact:true})).toHaveAttribute("href",`/vendas/${id}`);await page.keyboard.press("Escape");
  const open=await post("vendas",{idCliente:f.customer,idLoja:f.store,itens:[{idProdutoSku:f.product,quantidade:999999,precoUnitario:1}]},crypto.randomUUID());
  const balance=await saldo();await page.goto(`/vendas/${open.id}`);await page.getByRole("button",{name:"Concluir venda"}).click();await page.getByRole("button",{name:"Confirmar saída de estoque"}).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Estoque insuficiente");await expect(page.getByText("Status: Aberta",{exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"Editar venda"})).toBeVisible();expect(await saldo()).toBe(balance);
  await page.getByRole("button",{name:"Cancelar venda"}).click();await page.getByLabel("Motivo do cancelamento").fill("Sem estoque");await page.getByRole("button",{name:"Confirmar cancelamento"}).click();await expect(page.getByText("Status: Cancelada",{exact:true})).toBeVisible();await page.reload();await expect(page.getByText(/Motivo: Sem estoque/)).toBeVisible();expect(await saldo()).toBe(balance);
});
test("venda real: resposta perdida repete a mesma identidade e conflito preserva valores",async ({page,request})=>{
  const f=JSON.parse(process.env.SALES_FIXTURE!);
  await page.goto("/vendas/nova");await page.getByRole("combobox", { name: "Cliente *", exact: true }).selectOption(f.customer);await page.getByRole("combobox", { name: "Loja *", exact: true }).selectOption(f.store);await page.getByRole("combobox", { name: "SKU *", exact: true }).selectOption(f.product);await page.getByLabel(/^Quantidade/).fill("1");await page.getByLabel(/^Preço unitário/).fill("2");
  let persisted:string|undefined,key:string|undefined,payload:string|undefined;
  await page.route("**/api/vendas",async route=>{
    if(route.request().method()!=="POST")return route.fallback();
    key=route.request().headers()["idempotency-key"];payload=route.request().postData()!;
    const response=await route.fetch();expect(response.status()).toBe(201);persisted=(await response.json()).id;
    await route.abort("failed");
  });
  await page.getByRole("button",{name:"Salvar venda aberta"}).click();await expect(page.getByRole("button",{name:"Repetir envio salvo"})).toBeEnabled();expect(persisted).toBeTruthy();expect(key).toBeTruthy();
  await page.unroute("**/api/vendas");await page.reload();await page.getByRole("button",{name:"Restaurar",exact:true}).click();
  const replay=page.waitForRequest(r=>r.url().endsWith("/api/vendas") && r.method()==="POST");await page.getByRole("button",{name:"Repetir envio salvo"}).click();const sent=await replay;expect(sent.headers()["idempotency-key"]).toBe(key);expect(sent.postData()).toBe(payload);
  await expect(page).toHaveURL(new RegExp(`/vendas/${persisted}$`));const url=page.url();await page.getByRole("link",{name:"Editar venda"}).click();await page.getByLabel(/^Quantidade/).fill("4");
  const current=await (await request.get(`/api/vendas/${persisted}`)).json();
  const external=await request.put(`/api/vendas/${persisted}`,{data:{idCliente:current.idCliente,idLoja:current.idLoja,versao:current.versao,observacao:"Outra aba",itens:current.itens.map((i:{id:string;idProdutoSku:string;quantidade:number;precoUnitario:number;desconto:number})=>({id:i.id,idProdutoSku:i.idProdutoSku,quantidade:i.quantidade,precoUnitario:i.precoUnitario,desconto:i.desconto}))}});expect(external.ok(),await external.text()).toBeTruthy();
  await page.getByRole("button",{name:"Salvar venda aberta"}).click();await expect(page.getByText("A venda salva mudou.",{exact:false})).toBeVisible();await expect(page.getByLabel(/^Quantidade/)).toHaveValue("4");await expect(page.getByRole("button",{name:"Salvar venda aberta"})).toBeDisabled();
  await page.getByRole("button",{name:"Usar versão atual e revisar valores"}).click();await page.getByRole("button",{name:"Salvar venda aberta"}).click();await expect(page).toHaveURL(url);const final=await (await request.get(`/api/vendas/${persisted}`)).json();expect(final.itens[0].quantidade).toBe(4);expect(final.itens[0].id).toBe(current.itens[0].id);
});
