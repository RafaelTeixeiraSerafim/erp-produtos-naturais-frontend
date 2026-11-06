import { test,expect,type Page } from "./auth-fixture";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
async function setup(page:Page) {
  const purchase={id:id(1),idLoja:id(2),status:"RASCUNHO",itens:[{id:id(3),idProduto:id(4),quantidade:10,quantidadeRecebida:0}]};
  let receipt={id:id(5),idCompra:id(1),idUsuario:id(6),status:"RASCUNHO",versao:0,dataRecebimento:"2026-11-05T12:00:00Z",observacao:"",itens:[{id:id(7),idItemCompra:id(3),idProduto:id(4),quantidade:2,observacao:""}]};
  const operations:{key:string;body:unknown}[]=[];
  let loseResponse=false, failRefresh=false, deleted=false;
  await page.route("**/api/**",async route=>{
    const req=route.request(),parts=new URL(req.url()).pathname.slice(5).split("/"),resource=parts[0];
    if(req.method()==="GET") {
      if(deleted && resource === "recebimentos-compras" && parts[1]) return route.fulfill({status:404,json:{message:"Excluído"}});
      if(failRefresh) return route.fulfill({status:503,json:{message:"Refresh indisponível"}});
      const rows:Record<string,unknown>={compras:parts[1]?purchase:[purchase],lojas:[{id:id(2),nomeFantasia:"Loja Centro"}],produtos:[{id:id(4),nome:"Aveia"}],usuarios:[{id:id(6),nome:"Operador"}],"recebimentos-compras":parts[1]?receipt:[receipt]};
      return route.fulfill({json:rows[resource]||[]});
    }
    const body=req.postDataJSON();
    if(resource==="recebimentos-compras" && req.method()==="POST" && !parts[1]) {
      operations.push({key:req.headers()["idempotency-key"],body});
      receipt={...receipt,...body};
      if(loseResponse){loseResponse=false;return route.abort("failed");}
      return route.fulfill({status:201,json:receipt});
    }
    if(req.method()==="PUT") {
      if(body.versao!==receipt.versao)return route.fulfill({status:409,json:{message:"Versão desatualizada"}});
      receipt={...receipt,...body,versao:receipt.versao+1};return route.fulfill({json:receipt});
    }
    if(req.method()==="DELETE"){deleted=true;return route.fulfill({status:204});}
    return route.fulfill({json:receipt});
  });
  return {purchase,operations,receipt:()=>receipt,change:()=>{receipt={...receipt,versao:receipt.versao+1,observacao:"Outra aba"};},lose:()=>{loseResponse=true;},fail:()=>{failRefresh=true;}};
}
async function fill(page:Page) {
  await page.getByRole("checkbox").check();await page.getByLabel("Quantidade a receber").fill("3");
}
test("resultado incerto preserva chave e payload após reload e repete exatamente",async({page})=>{
  const state=await setup(page);state.lose();
  await page.goto(`/compras/${id(1)}/recebimentos/novo`);await fill(page);
  await page.getByRole("button",{name:"Salvar rascunho"}).click();
  await expect(page.getByRole("button",{name:"Repetir envio salvo"})).toBeEnabled();
  await page.reload();await page.getByRole("button",{name:"Restaurar",exact:true}).click();
  await expect(page.getByLabel("Quantidade a receber")).toBeDisabled();
  await page.getByRole("button",{name:"Repetir envio salvo"}).click();
  await expect(page).toHaveURL(`/recebimentos/${id(5)}`);
  expect(state.operations).toHaveLength(2);expect(state.operations[0]).toEqual(state.operations[1]);
});
test("versão conflitante recarrega dados e preserva valores para revisão explícita",async({page})=>{
  const state=await setup(page);await page.goto(`/recebimentos/${id(5)}/editar`);
  await page.getByLabel("Quantidade a receber").fill("4");state.change();
  await page.getByRole("button",{name:"Salvar rascunho"}).click();
  await expect(page.getByText(/Os dados salvos mudaram/)).toBeVisible();
  await expect(page.getByLabel("Quantidade a receber")).toHaveValue("4");
  await page.getByRole("button",{name:"Usar versão atual e revisar valores"}).click();
  await expect(page.getByText("Recuperação salva neste navegador",{exact:true})).toBeVisible();
  await page.reload(); await page.getByRole("button",{name:"Restaurar",exact:true}).click();
  await expect(page.getByLabel("Quantidade a receber")).toHaveValue("4");
  await page.getByRole("button",{name:"Salvar rascunho"}).click();await expect(page).toHaveURL(`/recebimentos/${id(5)}`);
  expect(state.receipt().itens[0].quantidade).toBe(4);
});
test("restauração de edição compara versão e oferece consulta manual quando mudou",async({page})=>{
  const state=await setup(page);await page.goto(`/recebimentos/${id(5)}/editar`);
  await page.getByLabel("Quantidade a receber").fill("4");
  await expect(page.getByText("Recuperação salva neste navegador",{exact:true})).toBeVisible();state.change();
  await page.reload();await expect(page.getByText(/apenas para consulta manual/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Restaurar",exact:true})).toHaveCount(0);await expect(page.locator("pre")).toContainText('"quantidade": "4"');
});
test("sucesso da criação continua reconhecido quando a atualização falha",async({page})=>{
  const state=await setup(page);await page.goto(`/compras/${id(1)}/recebimentos/novo`);await fill(page);
  // Fail only reads after the POST has succeeded.
  await page.route("**/api/recebimentos-compras",async route=>{if(route.request().method()==="POST"){await route.fallback();state.fail();}else await route.fallback();});
  await page.getByRole("button",{name:"Salvar rascunho"}).click();
  await expect(page.getByText(/Rascunho salvo\./)).toBeVisible();
  await expect(page.getByRole("link",{name:"Ver registro salvo"})).toHaveAttribute("href",`/recebimentos/${id(5)}`);
  await expect(page.getByRole("button",{name:"Salvar rascunho"})).toBeDisabled();expect(state.operations).toHaveLength(1);
});
test("falha de armazenamento bloqueia tanto o primeiro envio quanto a repetição",async({page})=>{
  const state=await setup(page);
  await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith("vila:recovery:"))throw new DOMException("Quota","QuotaExceededError");return original.call(this,key,value);};});
  await page.goto(`/compras/${id(1)}/recebimentos/novo`);await fill(page);
  await page.getByRole("button",{name:"Salvar rascunho"}).click();
  await expect(page.getByText(/Não foi possível guardar a solicitação/)).toBeVisible();
  await page.getByRole("button",{name:"Repetir envio salvo"}).click();
  await expect(page.getByText(/Não foi possível guardar a solicitação/)).toBeVisible();expect(state.operations).toHaveLength(0);
});

test("exclusão reconhecida remove detalhe do cache antes de atualizar e navega à compra",async({page})=>{
  await setup(page); await page.goto(`/recebimentos/${id(5)}`);
  await page.getByRole("button",{name:"Excluir rascunho"}).click();
  await page.getByRole("button",{name:"Confirmar exclusão"}).click();
  await expect(page).toHaveURL(`/compras/${id(1)}`);
});
