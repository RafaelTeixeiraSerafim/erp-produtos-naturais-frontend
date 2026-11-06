import { test, expect, type Page } from "./auth-fixture";
import { readFile } from "node:fs/promises";
const id = (n:number) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
async function setup(page: Page) {
  const db: Record<string, object[]> = {
    lojas:[{id:id(1),nomeFantasia:"Centro"},{id:id(2),nomeFantasia:"Outra"}], categorias:[{id:id(3),nome:"Grãos"}], "unidades-medida":[{id:id(4),sigla:"kg"}], clientes:[{id:id(5),nome:"Ana"}], usuarios:[{id:id(6),nome:"Operador"}], fornecedores:[{id:id(7),nomeFantasia:"Fornecedor"}],
    produtos:Array.from({length:25},(_,i)=>({id:id(100+i),nome:`Produto ${String(i).padStart(2,"0")}`,idCategoria:id(3),idUnidadeMedida:id(4),siglaUnidadeMedida:"kg",status:i===24?"INATIVO":"ATIVO",tipoVenda:"PESO"})),
    estoques:Array.from({length:25},(_,i)=>({id:id(200+i),idProduto:id(100+i),idLoja:id(1),quantidadeAtual:i-1,atualizadoEm:"2026-11-05T10:00:00"})),
    "movimentacoes-estoque":Array.from({length:25},(_,i)=>({id:id(300+i),idProduto:id(100+i),idLoja:id(1),tipo:"SAIDA_VENDA",quantidade:i+0.125,dataMovimentacao:"2026-11-05T10:00:00",observacao:i===0?'=SUM(A1)':'texto; "com aspas"',idVenda:id(400+i)})),
    vendas:Array.from({length:25},(_,i)=>({id:id(400+i),idLoja:id(1),idCliente:id(5),idUsuario:id(6),dataVenda:"2026-11-05T10:00:00",status:["ABERTA","CONCLUIDA","CANCELADA"][i%3],subtotal:0.1,descontoTotal:0,valorTotal:0.1})),
    compras:Array.from({length:25},(_,i)=>({id:id(500+i),idLoja:id(1),idFornecedor:id(7),dataCompra:"2026-11-05T10:00:00",status:["RASCUNHO","RECEBIDA","PARCIALMENTE_RECEBIDA","CANCELADA"][i%4],valorTotal:0.2})),
  };
  await page.route("**/api/**", route => route.fulfill({json:db[new URL(route.request().url()).pathname.replace("/api/","")] || []}));
}
test("início, filtros na URL, escopos, links e navegação", async ({page}, info) => {
  await setup(page); await page.goto("/"); await expect(page).toHaveURL(/\/visao-geral\?/);
  await expect(page.getByRole("heading",{name:"Visão geral",exact:true})).toBeVisible();
  if(info.project.name === "mobile") await page.getByRole("button",{name:"Abrir menu"}).click();
  await expect(page.getByRole("navigation").getByRole("link",{name:"Visão geral"})).toHaveAttribute("aria-current","page");
  if(info.project.name === "mobile") await page.keyboard.press("Escape");
  await page.goto(`/visao-geral?idLoja=${id(1)}&inicio=2026-11-05&fim=2026-11-05`);
  await page.reload(); await expect(page.getByLabel("Loja",{exact:true})).toHaveValue(id(1)); await expect(page.getByLabel("Data inicial")).toHaveValue("2026-11-05");
  await expect(page.getByRole("region",{name:"Catálogo"})).toContainText("Produtos ativos: 24");
  const sales = page.getByRole("region",{name:"Vendas no período"});
  await expect(sales.getByRole("row").filter({hasText:"Aberta"}).first()).toContainText("0,90");
  await expect(sales.getByRole("link",{name:/00000000/})).toHaveCount(5);
  await sales.getByRole("link",{name:"Aberta",exact:true}).click();
  await expect(page).toHaveURL(/status=ABERTA/); await expect(page.getByLabel("Status",{exact:true})).toHaveValue("ABERTA");
  await expect(page.getByRole("button",{name:"Exportar CSV (9)"})).toBeEnabled();
  await page.goto(`/visao-geral?idLoja=${id(2)}&inicio=2026-11-05&fim=2026-11-05`);
  await expect(page.getByRole("region",{name:"Catálogo"})).toContainText("Produtos ativos: 24");
  await expect(page.getByRole("region",{name:"Estoque atual"})).toContainText("Saldo positivo: 0");
  await page.getByLabel("Período",{exact:true}).selectOption("30dias"); await expect(page).toHaveURL(/periodo=30dias/);
  await page.getByLabel("Data final").fill("2000-01-01"); await expect(page.getByRole("main").getByRole("alert")).toContainText("Informe datas válidas");
});
test("falhas independentes retêm resultados e retry atualiza apenas sua seção", async ({page}) => {
  await setup(page); await page.goto("/visao-geral?inicio=2026-11-01&fim=2026-11-30");
  const sales = page.getByRole("region",{name:"Vendas no período"}); await expect(sales).toContainText("0,90");
  await page.route("**/api/vendas**",route=>route.fulfill({status:500,json:{message:"Falha vendas"}}));
  await page.getByRole("button",{name:"Atualizar",exact:true}).click();
  await expect(sales).toContainText("Dados desatualizados"); await expect(sales).toContainText("0,90");
  await expect(page.getByRole("region",{name:"Compras no período"})).not.toContainText("Dados desatualizados");
  await page.unroute("**/api/vendas**"); await sales.getByRole("button",{name:"Tentar novamente"}).click();
  await expect(sales).not.toContainText("Dados desatualizados");
});
for (const [path, header, expected] of [["/produtos?ordem=desc","Nome","Produto 24"],["/estoque?ordem=quantidade-asc","Quantidade","-1"],["/estoque/movimentacoes?ordem=quantidade-asc","Observação","'=SUM(A1)"],["/compras?ordem=total-asc","Total salvo","0,20"],["/vendas?ordem=total-asc","Subtotal salvo","0,10"]]) {
  test(`CSV completo de ${path}`,async ({page}) => {
    await setup(page); await page.goto(path);
    const button = page.getByRole("button",{name:"Exportar CSV (25)"}); await expect(button).toBeEnabled();
    const promise = page.waitForEvent("download"); await button.click(); const download = await promise;
    expect(download.suggestedFilename()).toMatch(/^vila-verde-[a-z]+-\d{4}-\d{2}-\d{2}\.csv$/);
    const bytes = await readFile((await download.path())!); expect([...bytes.subarray(0,3)]).toEqual([239,187,191]);
    const text = bytes.toString("utf8"); expect(text.split("\r\n").filter(Boolean)).toHaveLength(26); expect(text).toContain(`"${header}"`); expect(text).toContain(`"${expected}"`);
    if(path.startsWith("/produtos")) expect(text.split("\r\n")[1]).toContain("Produto 24");
  });
}
test("exportação bloqueada sem linhas e em fonte com falha; lookup usa IDs",async ({page}) => {
  await setup(page); await page.route("**/api/clientes",r=>r.fulfill({status:500,json:{message:"Clientes indisponíveis"}}));
  await page.goto("/vendas"); await expect(page.getByRole("button",{name:"Exportar CSV (25)"})).toBeEnabled(); await expect(page.getByText(/Rótulos incompletos/)).toBeVisible();
  await page.route("**/api/vendas**",r=>r.fulfill({status:500,json:{message:"Vendas indisponíveis"}}));
  await page.reload(); await expect(page.getByRole("button",{name:/Exportar CSV/})).toBeDisabled();
  await page.unroute("**/api/vendas**"); await page.goto("/vendas?status=INEXISTENTE"); await expect(page.getByRole("button",{name:"Exportar CSV (0)"})).toBeDisabled();
});
test("CSV bloqueado durante refresh e por fonte expirada",async ({page}) => {
  await setup(page); await page.clock.install(); await page.goto("/vendas");
  const button = page.getByRole("button",{name:"Exportar CSV (25)"}); await expect(button).toBeEnabled();
  await page.clock.fastForward(31000); await expect(button).toBeDisabled();
  let release!: () => void; const gate = new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/api/vendas**",async route=>{await gate;await route.fallback();});
  await page.getByRole("button",{name:"Atualizar dados"}).click(); await expect(button).toBeDisabled();
  release(); await expect(button).toBeEnabled();
});
