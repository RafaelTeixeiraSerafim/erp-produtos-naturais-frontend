import { test, expect } from "./auth-fixture";
import { randomUUID } from "node:crypto";
test("real SMTP recovery consumes token and revokes other sessions",async({page,browser,request})=>{
  const usuario=`reset-${randomUUID().slice(0,8)}`,email=`${usuario}@example.test`,senha="Temporary8291",next="Recovered8291";
  const response=await request.post("/api/usuarios",{data:{nome:"Nome de exibição",usuario,email,senha,cargo:"FUNC",status:"ATIVO",lojas:[]}});expect(response.status()).toBe(201);const account=await response.json();
  const context=await browser.newContext({storageState:{cookies:[],origins:[]}});const person=await context.newPage();
  try {
    await person.goto("http://127.0.0.1:3100/login");await person.getByLabel("E-mail ou usuário").fill(usuario);await person.getByLabel("Senha",{exact:true}).fill(senha);await person.getByRole("button",{name:"Entrar",exact:true}).click();await expect(person).toHaveURL(/alterar-senha/);
    await person.getByLabel("Senha atual").fill(senha);await person.getByLabel("Nova senha",{exact:true}).fill("Permanent8291");await person.getByRole("button",{name:"Salvar nova senha"}).click();await expect(person).toHaveURL(/login/);
    await person.getByLabel("E-mail ou usuário").fill(usuario);await person.getByLabel("Senha",{exact:true}).fill("Permanent8291");await person.getByRole("button",{name:"Entrar",exact:true}).click();await expect(person).toHaveURL(/visao-geral/);
    await page.goto("/esqueci-senha");await expect(page.getByRole("banner")).toHaveCount(0);await page.getByLabel("E-mail ou usuário").fill(usuario);await page.getByRole("button",{name:"Enviar link"}).click();await expect(page.getByRole("status")).toContainText("Se a conta existir");
    const messages=await(await fetch(`${process.env.CONTROLLED_SERVICES_URL}/messages`)).json();
    const message=messages.findLast((m:{to:string})=>m.to.includes(email));expect(message).toBeTruthy();
    const body=message.body.replace(/=\n/g,"");const link=body.match(/http:\/\/127\.0\.0\.1:3100\/redefinir-senha#[A-Za-z0-9_-]{43}/)?.[0];expect(link).toBeTruthy();
    await page.goto(link);await expect(page).toHaveURL(/\/redefinir-senha$/);await page.getByLabel("Nova senha",{exact:true}).fill(next);await page.getByLabel("Confirmar nova senha").fill(next);await page.getByRole("button",{name:"Salvar nova senha"}).click();await expect(page.getByRole("status")).toContainText("Senha redefinida");
    expect((await context.request.get("http://127.0.0.1:3100/api/auth/me")).status()).toBe(401);
    await page.goto(link);await page.getByLabel("Nova senha",{exact:true}).fill(next);await page.getByLabel("Confirmar nova senha").fill(next);await page.getByRole("button",{name:"Salvar nova senha"}).click();await expect(page.locator("main").getByRole("alert")).toContainText("inválido ou expirado");
  } finally {await context.close();expect((await request.put(`/api/usuarios/${account.id}`,{data:{nome:"Nome de exibição",usuario,email,cargo:"FUNC",status:"INATIVO",lojas:[]}})).ok()).toBe(true);}
});
