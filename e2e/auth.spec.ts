import { test, expect } from "playwright/test";
async function login(page: import("playwright/test").Page, email = "admin@example.test") {
  await page.goto("/login");await page.getByLabel("E-mail ou usuário",{exact:true}).fill(email);await page.getByLabel("Senha",{exact:true}).fill("Fixture-password-123");await page.getByRole("button",{name:"Entrar",exact:true}).click();
}
test("anonymous pages redirect, failed login stays generic and internal return destination is preserved",async({page})=>{
  await page.goto("/vendas/nova");await expect(page).toHaveURL(/\/login\?returnTo=/);
  await page.getByLabel("E-mail ou usuário").fill("admin@example.test");await page.getByLabel("Senha",{exact:true}).fill("wrong");await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page.getByText("E-mail ou senha inválidos.", { exact: true })).toBeVisible();
  await page.getByLabel("Senha",{exact:true}).fill("Fixture-password-123");await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page).toHaveURL(/\/vendas\/nova$/);
});
test("temporary password blocks business access until replacement",async({page})=>{
  await login(page,"temporary@example.test");await expect(page).toHaveURL(/\/alterar-senha/);
  await page.goto("/produtos");await expect(page).toHaveURL(/\/alterar-senha/);
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"Alterar senha",exact:true})).toBeVisible();
  await expect(page.getByText("Operador",{exact:true})).toHaveCount(0);
  await expect(page.getByText("Use ao menos 8 caracteres.",{exact:true})).toBeVisible();
  const currentPassword=page.getByLabel("Senha atual");
  await currentPassword.fill("Fixture-password-123");
  expect(await currentPassword.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe("none");
  expect(await currentPassword.evaluate(el=>getComputedStyle(el).borderColor)).toBe("rgb(103, 166, 129)");
  await page.getByLabel("Nova senha").fill("newpass8");await page.getByRole("button",{name:"Salvar nova senha"}).click();await expect(page).toHaveURL(/\/login/);
});
test("employee navigation excludes purchases, users and catalog writes and server denies forbidden pages",async({page})=>{
  const requested:string[]=[];page.on("request",r=>requested.push(new URL(r.url()).pathname));
  await login(page,"func@example.test");await expect(page).toHaveURL(/\/visao-geral/);
  await expect(page.getByRole("heading",{name:"Visão geral"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Usuários",exact:true})).toHaveCount(0);await expect(page.getByRole("link",{name:"Pedidos",exact:true})).toHaveCount(0);await expect(page.getByRole("heading",{name:"Compras no período"})).toHaveCount(0);
  expect(requested.filter(p=>p==="/api/compras" || p==="/api/usuarios" || p==="/api/fornecedores")).toEqual([]);
  await page.goto("/produtos");await expect(page.getByRole("link",{name:"Novo produto"})).toHaveCount(0);
  const response=await page.goto("/usuarios");expect(response?.status()).toBe(403);await expect(page.getByText(/Acesso negado/)).toBeVisible();
});
test("admin creates an account and logout clears only their recovery",async({page})=>{
  await login(page);await expect(page).toHaveURL(/\/visao-geral/);await page.goto("/usuarios");const name=`Conta ${Date.now()}`;
  const navLink=page.getByRole("link",{name:"Usuários",exact:true});
  const mobileMenu=page.getByRole("button",{name:"Abrir menu"});
  if(await mobileMenu.isVisible())await mobileMenu.click();
  await expect(navLink).toHaveAttribute("aria-current","page");
  await expect(navLink.locator("svg")).toHaveCount(1);
  await navLink.click();
  await expect(page.getByRole("banner")).toContainText("Administração");
  await expect(page.getByRole("banner")).toContainText("Usuários");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("columnheader",{name:"CARGO",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Novo usuário",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Novo usuário",exact:true})).toBeVisible();
  await expect(page.getByText(/Nenhuma loja cadastrada/)).toBeVisible();
  await page.getByLabel("Nome",{exact:true}).fill(name);await page.getByLabel("Usuário",{exact:true}).fill(`account-${Date.now()}`);await page.getByLabel("E-mail",{exact:true}).fill(`account-${Date.now()}@example.test`);await page.getByLabel("Senha temporária",{exact:true}).fill("Temporary-password-123");await page.getByRole("button",{name:"Salvar conta"}).click();await expect(page.getByRole("button",{name:`Editar ${name}`})).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button",{name:`Editar ${name}`,exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Editar usuário",exact:true})).toBeVisible();
  await page.getByLabel("Nome",{exact:true}).fill(`${name} editado`);
  await page.getByLabel("Cargo",{exact:true}).selectOption("GER");
  await page.getByLabel("Status",{exact:true}).selectOption("INATIVO");
  await page.getByRole("button",{name:"Salvar conta",exact:true}).click();
  await expect(page.getByRole("button",{name:`Editar ${name} editado`,exact:true})).toBeVisible();
  await page.getByLabel("Buscar usuários").fill(name);
  await page.getByLabel("Filtrar por status").selectOption("ATIVO");
  await expect(page.getByText("Nenhum usuário encontrado",{exact:true})).toBeVisible();
  await page.getByLabel("Filtrar por status").selectOption("INATIVO");
  await expect(page.getByRole("cell",{name:"Gerente",exact:true})).toBeVisible();
  await page.evaluate(()=>{const env=document.querySelector('meta[name="recovery-environment"]')!.getAttribute("content");localStorage.setItem(`vila:recovery:v2:${env}:11111111-1111-4111-8111-111111111111:sale:new`,"own");localStorage.setItem(`vila:recovery:v2:${env}:22222222-2222-4222-8222-222222222222:sale:new`,"other");});
  page.once("dialog",dialog=>dialog.accept());if(await page.getByText(/^Conta ·/).count())await page.getByText(/^Conta ·/).click();await page.getByRole("button",{name:"Sair",exact:true}).click();await expect(page).toHaveURL(/\/login/);
  const copies=await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.startsWith("vila:recovery:")));expect(copies).toHaveLength(1);expect(copies[0][1]).toBe("other");
  await page.goto("/produtos");await expect(page).toHaveURL(/\/login\?/);
});
test("external return destination is rejected",async({page})=>{
  await page.goto("/login?returnTo=https://evil.example");await page.getByLabel("E-mail ou usuário").fill("admin@example.test");await page.getByLabel("Senha",{exact:true}).fill("Fixture-password-123");await page.getByRole("button",{name:"Entrar",exact:true}).click();await expect(page).toHaveURL(/\/visao-geral/);
});

test("session expiry preserves the account's draft and another account cannot restore it",async({page,context})=>{
  await login(page);await expect(page).toHaveURL(/\/visao-geral/);await page.goto("/compras/nova");
  await page.getByRole("textbox",{name:"Observação",exact:true}).fill("Rascunho privado da primeira conta");await expect(page.getByText("Recuperação salva neste navegador",{exact:true})).toBeVisible();
  await page.route("**/api/compras",route=>route.fulfill({status:401,json:{message:"Sessão expirada"}}));
  // A business request returning 401 follows the same SDK interceptor as mutations.
  if (!await page.getByRole("link",{name:"Pedidos",exact:true}).isVisible()) await page.getByRole("button",{name:"Abrir menu"}).click();
  await page.getByRole("link",{name:"Pedidos",exact:true}).click();
  await page.getByRole("button",{name:"Sair e manter recuperação",exact:true}).click();
  await expect(page).toHaveURL(/\/login\?/);
  const preserved=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith("vila:recovery:v2:")));expect(preserved).toHaveLength(1);
  await page.unroute("**/api/compras");
  await login(page,"other@example.test");await expect(page).toHaveURL(/\/visao-geral/);await page.goto("/compras/nova");await expect(page.getByRole("button",{name:"Restaurar",exact:true})).toHaveCount(0);await expect(page.getByRole("textbox",{name:"Observação",exact:true})).toHaveValue("");
  await context.clearCookies();await page.goto("/login");await login(page);await expect(page).toHaveURL(/\/visao-geral/);await page.goto("/compras/nova");await page.getByRole("button",{name:"Restaurar",exact:true}).click();await expect(page.getByRole("textbox",{name:"Observação",exact:true})).toHaveValue("Rascunho privado da primeira conta");
});

test("default admin username accepts the temporary admin password",async({page})=>{
  await page.goto("/login");
  await page.getByLabel("E-mail ou usuário",{exact:true}).fill("admin");
  await page.getByLabel("Senha",{exact:true}).fill("admin");
  await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await expect(page).toHaveURL(/\/alterar-senha/);
  await expect(page.getByRole("complementary")).toHaveCount(0);
  await expect(page.getByRole("banner")).toHaveCount(0);
  page.once("dialog",dialog=>dialog.accept());
  if(await page.getByText(/^Conta ·/).count())await page.getByText(/^Conta ·/).click();await page.getByRole("button",{name:"Sair",exact:true}).click();
  await expect(page).toHaveURL(/\/login/);
});
