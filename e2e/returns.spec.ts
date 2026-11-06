import { test,expect,type Page } from "./auth-fixture";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
async function setup(page:Page) {
  const source={id:id(1),idLoja:id(2),nomeLoja:"Centro",status:"CONCLUIDA",legado:false,itens:[{id:id(3),idProduto:id(4),nomeProduto:"Aveia",quantidade:10,quantidadeDevolvida:2,quantidadeDevolvivel:8}]};
  let record={id:id(5),idVenda:id(1),idLoja:id(2),lojaNome:"Centro",status:"RASCUNHO",versao:0,motivo:"Teste",observacao:"",itens:[{id:id(6),idItemVenda:id(3),idProduto:id(4),nomeProduto:"Aveia",quantidade:1,retornaAoEstoque:true,observacao:"",unidadeSigla:"KG",unidadeOrigem:"VENDA"}]};
  const operations:{key:string;body:unknown}[]=[];let lose=false;
  await page.route("**/api/**",async route=>{
    const req=route.request(),parts=new URL(req.url()).pathname.slice(5).split("/"),resource=parts[0];
    if(resource==="auth")return route.continue();
    if(req.method()==="GET") {
      const rows:Record<string,unknown>={vendas:parts[1]?source:[source],lojas:[{id:id(2),nomeFantasia:"Centro"}],produtos:[{id:id(4),nome:"Aveia"}],estoques:[{idProduto:id(4),idLoja:id(2),quantidadeAtual:7}],"devolucoes-clientes":parts[1]?record:[record]};
      return route.fulfill({json:rows[resource]||[]});
    }
    const body=req.postDataJSON();
    if(resource==="devolucoes-clientes"&&req.method()==="POST"&&!parts[1]) {
      operations.push({key:req.headers()["idempotency-key"],body});record={...record,...body,itens:body.itens.map((i:object)=>({...record.itens[0],...i}))};
      if(lose){lose=false;return route.abort("failed");}return route.fulfill({status:201,json:record});
    }
    if(req.method()==="PUT") {
      if(body.versao!==record.versao)return route.fulfill({status:409,json:{message:"Versão desatualizada"}});
      record={...record,...body,versao:record.versao+1};return route.fulfill({json:record});
    }
    if(parts[2]==="concluir"){record={...record,status:"CONCLUIDA"};return route.fulfill({json:record});}
    return route.fulfill({json:record});
  });
  return {operations,lose:()=>{lose=true;},change:()=>{record={...record,versao:record.versao+1,motivo:"Outra aba"};}};
}
test("devolução: envio incerto conserva chave/payload e repete após recuperar",async({page})=>{
  const state=await setup(page);state.lose();await page.goto(`/vendas/devolucoes/nova?origem=${id(1)}`);await expect(page.getByLabel("Quantidade a devolver")).toHaveValue("");await page.getByLabel("Motivo *",{exact:true}).fill("Avaria");await page.getByLabel("Quantidade a devolver").fill("1,125");await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();await expect(page.getByRole("button",{name:"Repetir envio salvo"})).toBeVisible();
  await page.reload();await page.getByRole("button",{name:"Restaurar",exact:true}).click();await expect(page.getByLabel("Quantidade a devolver")).toHaveValue("1,125");await page.getByRole("button",{name:"Repetir envio salvo"}).click();await expect(page).toHaveURL(`/vendas/devolucoes/${id(5)}`);expect(state.operations).toHaveLength(2);expect(state.operations[0]).toEqual(state.operations[1]);
  await page.getByRole("button",{name:"Revisar devolução",exact:true}).click();await expect(page.getByRole("dialog")).toContainText("Entrada: +1,125");await expect(page.getByRole("dialog")).toContainText("Nenhum reembolso");
});
test("devolução: falta de armazenamento bloqueia primeiro envio e repetição",async({page})=>{
  const state=await setup(page);await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error("Storage unavailable");};});await page.goto(`/vendas/devolucoes/nova?origem=${id(1)}`);await page.getByLabel("Motivo *",{exact:true}).fill("Teste");await page.getByLabel("Quantidade a devolver").fill("1");await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();await expect(page.getByText(/Não foi possível persistir a chave/)).toBeVisible();await page.getByRole("button",{name:"Repetir envio salvo"}).click();expect(state.operations).toHaveLength(0);
});
test("devolução: conflito preserva digitação e exige revisão explícita",async({page})=>{
  const state=await setup(page);await page.goto(`/vendas/devolucoes/${id(5)}/editar`);await page.getByLabel("Motivo *",{exact:true}).fill("Meu motivo");state.change();await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();await expect(page.getByText(/Os valores digitados foram preservados/)).toBeVisible();await expect(page.getByLabel("Motivo *",{exact:true})).toHaveValue("Meu motivo");await expect(page.getByRole("button",{name:"Salvar rascunho",exact:true})).toBeDisabled();await page.getByRole("button",{name:"Revisei as quantidades atualizadas"}).click();await page.getByRole("button",{name:"Salvar rascunho",exact:true}).click();await expect(page).toHaveURL(`/vendas/devolucoes/${id(5)}`);
});
