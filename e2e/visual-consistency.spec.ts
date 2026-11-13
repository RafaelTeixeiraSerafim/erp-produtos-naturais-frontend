import { test, expect, type Page } from "./auth-fixture";
const id="00000000-0000-4000-8000-000000000001";
async function catalog(page:Page) {
  const suppliers=[{id,nomeFantasia:"Pessoa física",razaoSocial:"Pessoa física",cpf:"01234567890",estado:"SC",cidade:"Criciúma",bairro:"Centro"},{id:id.replace(/1$/,"2"),nomeFantasia:"Empresa",cnpj:"12ABC34501DE35"}];
  await page.route("**/api/**",r=>{
    const path=new URL(r.request().url()).pathname;
    if(path.startsWith("/api/auth/"))return r.fallback();
    if(path.startsWith("/api/localidades/"))return r.fulfill({json:{dados:path.endsWith("municipios")?[{id:4204608,nome:"Criciúma"}]:[{id:42,sigla:"SC",nome:"Santa Catarina"}],desatualizado:true}});
    if(path==="/api/fornecedores")return r.fulfill({json:suppliers});
    if(path==="/api/lojas")return r.fulfill({json:[{id,nomeFantasia:"Loja"}]});
    if(path==="/api/produtos")return r.fulfill({json:[{id,nome:"Produto",status:"ATIVO"}]});
    if(path==="/api/produtos-sku")return r.fulfill({json:[{id,idProduto:id,nomeProduto:"Produto",sku:"CODE",descricaoApresentacao:"Granel",status:"ATIVO"}]});
    if(path.split("/").length>3)return r.fulfill({status:404,json:{message:"Registro não encontrado"}});
    return r.fulfill({json:[]});
  });
}
test("only the specific sales or purchase destination is selected in desktop and mobile navigation",async({page,isMobile})=>{
  test.setTimeout(90000);
  await catalog(page);
  for(const prefix of ["/vendas","/compras"])for(const returns of [false,true])for(const suffix of ["","/nova",`/${id}`]) {
    const base=prefix+(returns?"/devolucoes":"");await page.goto(base+suffix);
    await expect(page.locator("header")).toContainText(returns?"Devoluções":prefix==="/vendas"?"Registros":"Pedidos");
    if(returns && suffix==="")await expect(page.locator("header")).not.toContainText("/ Detalhes");
    if(returns && suffix==="/nova")await expect(page.locator("header")).toContainText("Nova devolução");
    if(isMobile)await page.getByRole("button",{name:"Abrir menu"}).click();
    const nav=isMobile?page.getByRole("dialog").getByRole("navigation"):page.locator("aside nav");
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.locator('[aria-current="page"]')).toHaveAttribute("href",base);
    if(isMobile)await page.keyboard.press("Escape");
  }
});
test("supplier documents are formatted and type stays beside its field when editing",async({page,isMobile},testInfo)=>{
  await catalog(page);await page.goto("/fornecedores");
  await expect(page.getByRole("columnheader",{name:"CPF/CNPJ"})).toBeVisible();
  await expect(page.getByRole("cell",{name:"012.345.678-90"})).toBeVisible();
  await expect(page.getByRole("cell",{name:"12.ABC.345/01DE-35"})).toBeVisible();
  await page.getByRole("button",{name:"Editar Pessoa física"}).click();
  const type=page.getByLabel("Tipo de documento");
  await expect(type).toHaveValue("cpf");
  const input=page.getByRole("textbox",{name:"CPF",exact:false});await expect(input).toHaveValue("012.345.678-90");
  const a=await type.boundingBox(),b=await input.boundingBox();expect(a&&b).toBeTruthy();
  if(isMobile)expect(b!.y).toBeGreaterThan(a!.y+a!.height);else {expect(a!.y).toBe(b!.y);expect(a!.width).toBeLessThan(b!.width);}
  await expect(page.getByText("Usando catálogo em cache durante indisponibilidade do IBGE.").first()).toBeVisible();
  await type.selectOption("cnpj");await expect(page.getByRole("textbox",{name:"CNPJ",exact:false})).toHaveValue("");
  await page.getByRole("textbox",{name:"CNPJ",exact:false}).fill("12ABC34501DE35");await type.selectOption("cpf");await expect(input).toHaveValue("");
  await page.screenshot({path:testInfo.outputPath("supplier.png"),fullPage:true});
});
test("related controls align with plain neighbors through loading, failure and retry",async({page},testInfo)=>{
  await catalog(page);await page.goto("/compras/nova");
  const supplier=page.getByRole("combobox",{name:"Fornecedor *",exact:true}),store=page.getByRole("combobox",{name:"Loja *",exact:true});
  await supplier.selectOption(id);await page.getByLabel("Observação").fill("Preservar");
  const offset=()=>supplier.evaluate(el=>el.getBoundingClientRect().top-el.parentElement!.querySelector("[data-field-header]")!.getBoundingClientRect().top);
  const initial=await offset();
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);
  await page.route("**/api/fornecedores",async r=>{await gate;await r.fulfill({status:503,json:{message:"Indisponível"}});});
  await page.getByRole("button",{name:"Atualizar fornecedor",exact:true}).click();
  await expect(page.getByRole("button",{name:"Atualizar fornecedor",exact:true})).toBeDisabled();
  expect(await offset()).toBe(initial);
  expect(await page.locator('[data-field-header] [role="status"]').count()).toBe(0);
  release();await expect(page.getByText("Falha ao carregar. Atualize este campo.").first()).toBeVisible({timeout:20000});
  expect(await offset()).toBe(initial);
  await page.route("**/api/fornecedores",r=>r.fulfill({json:[{id,nomeFantasia:"Pessoa física"}]}));
  await page.getByRole("button",{name:"Atualizar fornecedor",exact:true}).click();await expect(supplier).toHaveValue(id);
  await expect(page.getByLabel("Observação")).toHaveValue("Preservar");
  if(testInfo.project.name === "desktop") {
    const sku=page.getByRole("combobox",{name:"SKU *",exact:true}),quantity=page.getByRole("textbox",{name:"Quantidade *",exact:true});
    expect((await sku.boundingBox())!.y).toBe((await quantity.boundingBox())!.y);
  }
  const isSameRow=(await supplier.boundingBox())!.y===(await store.boundingBox())!.y;
  if(testInfo.project.name==="desktop")expect(isSameRow).toBe(true);
  await page.screenshot({path:testInfo.outputPath("purchase.png"),fullPage:true});
  const back=page.getByRole("link",{name:"Voltar",exact:true});await back.focus();await expect(back).toBeFocused();await page.keyboard.press("Enter");await expect(page.getByRole("dialog")).toBeVisible();
});
