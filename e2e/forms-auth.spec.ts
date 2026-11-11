import { test, expect } from "./auth-fixture";
test("account menu keyboard Escape and password visibility on both layouts",async({page})=>{
  await page.goto("/visao-geral");const account=page.locator("summary").filter({hasText:"Conta"});await account.focus();await page.keyboard.press("Enter");await expect(page.getByRole("link",{name:"Alterar senha"})).toBeVisible();await page.keyboard.press("Escape");await expect(account).toBeFocused();await expect(page.getByRole("link",{name:"Alterar senha"})).not.toBeVisible();
  await page.goto("/login");const password=page.getByLabel("Senha",{exact:true});await password.fill("Secret8291");await page.getByRole("button",{name:"Mostrar senha"}).click();await expect(password).toHaveAttribute("type","text");await expect(password).toHaveValue("Secret8291");await expect(password).toBeFocused();await page.getByRole("button",{name:"Ocultar senha"}).click();await expect(password).toHaveAttribute("type","password");
});
test("public recovery clears token fragments and uses an independent layout",async({page,context})=>{
  await context.clearCookies();await page.goto("/esqueci-senha");await expect(page.getByRole("banner")).toHaveCount(0);await page.getByLabel("E-mail ou usuário").fill("unknown");await page.getByRole("button",{name:"Enviar link"}).click();await expect(page.getByRole("status")).toContainText("Se a conta existir");
  await page.goto("/redefinir-senha#random-token");await expect(page).toHaveURL(/\/redefinir-senha$/);await expect(page.getByRole("navigation")).toHaveCount(0);await page.getByLabel("Nova senha",{exact:true}).fill("Password8291");await page.getByLabel("Confirmar nova senha").fill("Different8291");await page.getByRole("button",{name:"Salvar nova senha"}).click();await expect(page.locator("main").getByRole("alert")).toContainText("não coincidem");
});
test("IBGE ignores late state responses, resets city and supports field retry",async({page})=>{
  await page.route("**/api/lojas",r=>r.fulfill({json:[]}));
  await page.route("**/api/localidades/estados",r=>r.fulfill({json:{dados:[{id:42,sigla:"SC",nome:"Santa Catarina"},{id:43,sigla:"RS",nome:"Rio Grande do Sul"}],desatualizado:false}}));
  await page.route("**/api/localidades/estados/SC/municipios",async r=>{await new Promise(resolve=>setTimeout(resolve,700));await r.fulfill({json:{dados:[{id:4204608,nome:"Criciúma"}],desatualizado:false}});});
  let failed=true;await page.route("**/api/localidades/estados/RS/municipios",r=>r.fulfill(failed?{status:503,json:{message:"Indisponível"}}:{json:{dados:[{id:4314902,nome:"Porto Alegre"}],desatualizado:false}}));
  await page.goto("/lojas?novo=1");await expect(page.getByRole("dialog")).toBeVisible();const uf=page.getByLabel("Estado",{exact:true}),city=page.getByLabel("Cidade",{exact:true});await uf.selectOption("SC");await uf.selectOption("RS");await expect(city).toBeDisabled();failed=false;await page.getByRole("button",{name:"Atualizar municípios"}).click();await city.selectOption("4314902");await page.waitForTimeout(800);await expect(city).toHaveValue("4314902");await expect(city.locator("option")).not.toContainText(["Criciúma"]);
});
test("related shortcuts use new tabs and localized refresh preserves purchase values and selections",async({page,context})=>{
  const id="00000000-0000-4000-8000-000000000001";let suppliers=0;const requests:string[]=[];
  await page.route("**/api/**",async r=>{
    const path=new URL(r.request().url()).pathname;if(path.startsWith("/api/auth/"))return r.fallback();requests.push(path);
    const rows=path==="/api/fornecedores"?(suppliers++===0?[{id,nomeFantasia:"Fornecedor original"}]:[{id,nomeFantasia:"Fornecedor original"},{id:"00000000-0000-4000-8000-000000000002",nomeFantasia:"Novo fornecedor"}]):path==="/api/lojas"?[{id,nomeFantasia:"Loja"}]:path==="/api/produtos"?[{id,nome:"Produto",status:"ATIVO"}]:path==="/api/produtos-sku"?[{id,idProduto:id,nomeProduto:"Produto",sku:"CODE",descricaoApresentacao:"Granel",status:"ATIVO"}]:[];
    return r.fulfill({json:rows});
  });
  await page.goto("/compras/nova");await page.getByRole("combobox",{name:"Fornecedor *",exact:true}).selectOption(id);await page.getByLabel("Observação").fill("Preservar formulário original");
  const shortcut=page.getByRole("link",{name:"Cadastrar fornecedor em nova aba"});await expect(shortcut).toHaveAttribute("target","_blank");await expect(shortcut).toHaveAttribute("rel",/noopener/);
  const popupPromise=context.waitForEvent("page");await shortcut.click();const popup=await popupPromise;await expect(popup.getByRole("dialog")).toBeVisible();await popup.close();
  await expect(page.getByLabel("Observação")).toHaveValue("Preservar formulário original");const before=requests.length;await page.getByRole("button",{name:"Atualizar fornecedor",exact:true}).click();await expect(page.getByRole("option",{name:"Novo fornecedor"})).toHaveCount(1);expect(requests.slice(before)).toEqual(["/api/fornecedores"]);await expect(page.getByRole("combobox",{name:"Fornecedor *",exact:true})).toHaveValue(id);
  await expect(page.getByRole("link",{name:"Cadastrar SKU em nova aba"})).toHaveAttribute("href","/skus/novo");
  const discount=page.getByLabel("Desconto (R$)");await discount.click();await page.keyboard.type("7");await expect(discount).toHaveValue("7");await discount.fill("0,50");await discount.blur();await discount.focus();await expect(discount).toHaveValue("0,50");await expect(page.getByLabel("Data da compra")).toHaveAttribute("step","60");
});
test("employee sees customer shortcut and no catalog or store creation shortcuts",async({page,context})=>{
  await context.addCookies([{name:"SESSION",value:"fixture-func",domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Lax"}]);await page.goto("/vendas/nova");
  await expect(page.getByRole("link",{name:"Cadastrar cliente em nova aba"})).toBeVisible();await expect(page.getByRole("link",{name:"Cadastrar SKU em nova aba"})).toHaveCount(0);await expect(page.getByRole("link",{name:"Cadastrar loja em nova aba"})).toHaveCount(0);await expect(page.getByRole("button",{name:"Atualizar SKU"})).toBeVisible();expect((await page.goto("/skus/novo"))?.status()).toBe(403);
});

test("another reset link in the same tab replaces the consumed fragment",async({page})=>{
  const sent:string[]=[];await page.route("**/api/auth/redefinir-senha",r=>{sent.push(r.request().postDataJSON().token);return r.fulfill({json:{message:"Senha redefinida"}});});
  await page.goto("/redefinir-senha#first-local-token");await expect(page).toHaveURL(/\/redefinir-senha$/);
  async function submit(){await page.getByLabel("Nova senha",{exact:true}).fill("Password8291");await page.getByLabel("Confirmar nova senha").fill("Password8291");await page.getByRole("button",{name:"Salvar nova senha"}).click();await expect(page.getByRole("status")).toContainText("Senha redefinida");}
  await submit();await page.goto("/redefinir-senha#second-local-token");await expect(page).toHaveURL(/\/redefinir-senha$/);await submit();expect(sent).toEqual(["first-local-token","second-local-token"]);
});
test("standalone SKU reuses the variant form and selects a product group",async({page})=>{
  const id="00000000-0000-4000-8000-000000000001";let payload:Record<string,unknown>|undefined;
  await page.route("**/api/**",async r=>{
    const path=new URL(r.request().url()).pathname;if(path.startsWith("/api/auth/"))return r.fallback();
    if(r.request().method()==="POST" && path==="/api/produtos-sku"){payload=r.request().postDataJSON();return r.fulfill({status:201,json:{...payload,id:"00000000-0000-4000-8000-000000000002"}});}
    const product={id,nome:"Produto agrupador",status:"ATIVO"};return r.fulfill({json:path==="/api/produtos"?[product]:path===`/api/produtos/${id}`?product:path==="/api/unidades-medida"?[{id,nome:"Unidade",sigla:"UN"}]:[]});
  });
  await page.goto("/skus/novo");await page.getByRole("combobox",{name:"Produto agrupador"}).selectOption(id);await page.getByRole("combobox",{name:"Unidade de medida"}).selectOption(id);await page.getByRole("textbox",{name:"SKU",exact:false}).fill("SKU-NEW");await page.getByLabel("Descrição da apresentação").fill("Pacote");
  await expect(page.getByRole("link",{name:"Cadastrar produto agrupador em nova aba"})).toHaveAttribute("target","_blank");await expect(page.getByRole("link",{name:"Cadastrar unidade de medida em nova aba"})).toHaveAttribute("href","/unidades-medida?novo=1");await page.getByRole("button",{name:"Salvar",exact:true}).click();await expect(page).toHaveURL(`/produtos/${id}`);expect(payload).toMatchObject({idProduto:id,idUnidadeMedida:id,sku:"SKU-NEW",tipoVenda:"UNIDADE"});
});
test("SKU refresh includes a new product group and preserves the original purchase",async({page})=>{
  const a="00000000-0000-4000-8000-000000000001",b="00000000-0000-4000-8000-000000000002";let added=false;const calls:string[]=[];
  await page.route("**/api/**",r=>{
    const path=new URL(r.request().url()).pathname;if(path.startsWith("/api/auth/"))return r.fallback();calls.push(path);
    const groups=[{id:a,nome:"Original",status:"ATIVO"},...(added?[{id:b,nome:"Novo agrupador",status:"ATIVO"}]:[])];
    return r.fulfill({json:path==="/api/produtos"?groups:path==="/api/produtos-sku"?groups.map(p=>({id:p.id,idProduto:p.id,nomeProduto:p.nome,sku:p.id,descricaoApresentacao:"Pacote",status:"ATIVO"})):path==="/api/lojas"?[{id:a,nomeFantasia:"Loja"}]:path==="/api/fornecedores"?[{id:a,nomeFantasia:"Fornecedor"}]:[]});
  });
  await page.goto("/compras/nova");const select=page.getByRole("combobox",{name:"SKU *",exact:true});await select.selectOption(a);await page.getByLabel("Observação").fill("Original preservado");added=true;const start=calls.length;await page.getByRole("button",{name:"Atualizar SKU",exact:true}).click();await expect(select.getByRole("option",{name:/Novo agrupador/})).toHaveCount(1);await expect(select).toHaveValue(a);await expect(page.getByLabel("Observação")).toHaveValue("Original preservado");expect(calls.slice(start).sort()).toEqual(["/api/produtos","/api/produtos-sku"]);
});
