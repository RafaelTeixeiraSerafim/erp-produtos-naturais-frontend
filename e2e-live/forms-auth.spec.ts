import { test, expect } from "./auth-fixture";
import { randomUUID } from "node:crypto";
test("administrator resets a password, revokes old sessions and requires a new password",async({page,browser,request})=>{
  const usuario=`reset-${randomUUID().slice(0,8)}`,email=`${usuario}@example.test`,senha="Temporary8291",temporary="AdminTemporary8291",next="ChangedByPerson8291";
  const response=await request.post("/api/usuarios",{data:{nome:"Nome de exibição",usuario,email,senha,cargo:"FUNC",status:"ATIVO",lojas:[]}});expect(response.status()).toBe(201);const account=await response.json();
  const context=await browser.newContext({storageState:{cookies:[],origins:[]}});const person=await context.newPage();
  try {
    await person.goto("http://127.0.0.1:3100/login");await person.getByLabel("E-mail ou usuário").fill(usuario);await person.getByLabel("Senha",{exact:true}).fill(senha);await person.getByRole("button",{name:"Entrar",exact:true}).click();await expect(person).toHaveURL(/alterar-senha/);
    await person.getByLabel("Senha atual").fill(senha);await person.getByLabel("Nova senha",{exact:true}).fill("Permanent8291");await person.getByRole("button",{name:"Salvar nova senha"}).click();await expect(person).toHaveURL(/login/);
    await person.getByLabel("E-mail ou usuário").fill(usuario);await person.getByLabel("Senha",{exact:true}).fill("Permanent8291");await person.getByRole("button",{name:"Entrar",exact:true}).click();await expect(person).toHaveURL(/visao-geral/);
    await page.goto("/usuarios");await page.getByRole("textbox",{name:"Buscar usuários"}).fill(usuario);
    await page.getByRole("button",{name:"Editar Nome de exibição",exact:true}).click();await page.getByLabel("Senha temporária",{exact:true}).fill(temporary);await page.getByRole("button",{name:"Salvar conta"}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
    expect((await context.request.get("http://127.0.0.1:3100/api/auth/me")).status()).toBe(401);
    await person.goto("http://127.0.0.1:3100/login");await person.getByLabel("E-mail ou usuário").fill(usuario);await person.getByLabel("Senha",{exact:true}).fill(temporary);await person.getByRole("button",{name:"Entrar",exact:true}).click();await expect(person).toHaveURL(/alterar-senha/);
    await person.getByLabel("Senha atual").fill(temporary);await person.getByLabel("Nova senha",{exact:true}).fill(next);await person.getByRole("button",{name:"Salvar nova senha"}).click();await expect(person).toHaveURL(/login/);
    await person.getByLabel("E-mail ou usuário").fill(usuario);await person.getByLabel("Senha",{exact:true}).fill(next);await person.getByRole("button",{name:"Entrar",exact:true}).click();await expect(person).toHaveURL(/visao-geral/);
    expect((await request.get("/api/auth/me")).status()).toBe(200);
  } finally {await context.close();expect((await request.put(`/api/usuarios/${account.id}`,{data:{nome:"Nome de exibição",usuario,email,cargo:"FUNC",status:"INATIVO",lojas:[]}})).ok()).toBe(true);}
});
