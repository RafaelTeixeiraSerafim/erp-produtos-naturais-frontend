import { randomUUID } from "node:crypto";
import { test, expect } from "./auth-fixture";
test("real account administration, forced change, assigned stores and session logout",async({page,browser,request})=>{
  const fixture=JSON.parse(process.env.SALES_FIXTURE!);
  const name=`auth-${randomUUID().slice(0,8)}`, email=`${name}@example.test`, temporary=`Temporary-${randomUUID()}`, permanent="newpass8";
  await page.goto("/usuarios");await page.getByRole("button",{name:"Novo usuário",exact:true}).click();await page.getByLabel("Nome",{exact:true}).fill(name);await page.getByLabel("E-mail",{exact:true}).fill(email);await page.getByLabel("Cargo",{exact:true}).selectOption("FUNC");
  const stores=await(await request.get("/api/lojas")).json();const store=stores.find((s:{id:string})=>s.id===fixture.store);
  await page.getByRole("checkbox",{name:store.nomeFantasia,exact:true}).check();await page.getByLabel("Senha temporária",{exact:true}).fill(temporary);await page.getByRole("button",{name:"Salvar conta"}).click();await expect(page.getByRole("button",{name:`Editar ${name}`})).toBeVisible();
  const context=await browser.newContext({baseURL:"http://127.0.0.1:3100",storageState:{cookies:[],origins:[]}});const person=await context.newPage();
  try {
    await person.goto("/login?returnTo=%2Festoque");await person.getByLabel("E-mail ou usuário",{exact:true}).fill(email);await person.getByLabel("Senha",{exact:true}).fill(temporary);await person.getByRole("button",{name:"Entrar",exact:true}).click();await expect(person).toHaveURL(/\/alterar-senha/);
    await expect(person.getByRole("complementary")).toHaveCount(0);
    await expect(person.getByRole("banner")).toHaveCount(0);
    await expect(person.getByText(name,{exact:true})).toHaveCount(0);
    expect((await context.request.get("/api/estoques")).status()).toBe(403);
    await person.getByLabel("Senha atual",{exact:true}).fill(temporary);await person.getByLabel("Nova senha",{exact:false}).fill(permanent);await person.getByRole("button",{name:"Salvar nova senha"}).click();await expect(person).toHaveURL(/\/login/);
    await person.getByLabel("E-mail ou usuário",{exact:true}).fill(email);await person.getByLabel("Senha",{exact:true}).fill(permanent);await person.getByRole("button",{name:"Entrar",exact:true}).click();await expect(person).toHaveURL(/\/estoque$/);
    await expect(person.getByRole("link",{name:"Usuários",exact:true})).toHaveCount(0);await expect(person.getByRole("link",{name:"Pedidos",exact:true})).toHaveCount(0);
    const allowed=await(await context.request.get("/api/lojas")).json();expect(allowed.map((s:{id:string})=>s.id)).toEqual([fixture.store]);
    expect((await context.request.get("/api/compras")).status()).toBe(403);expect((await person.goto("/usuarios"))?.status()).toBe(403);
    await person.goto("/estoque");person.once("dialog",dialog=>dialog.accept());await person.getByRole("button",{name:"Sair",exact:true}).click();await expect(person).toHaveURL(/\/login/);expect((await context.request.get("/api/estoques")).status()).toBe(401);
  } finally {
    await context.close();
    const accounts=await(await request.get("/api/usuarios")).json();
    const account=accounts.find((u:{email:string})=>u.email===email);
    if(account) {
      const cleanup=await request.put(`/api/usuarios/${account.id}`,{data:{nome:name,email,cargo:"FUNC",status:"INATIVO",lojas:[]}});
      expect(cleanup.ok()).toBe(true);
    }
  }
  expect((await request.get("/api/auth/me")).status()).toBe(200);
});
