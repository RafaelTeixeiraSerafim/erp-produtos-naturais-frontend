import { test, expect } from "./auth-fixture";
import { readFile } from "node:fs/promises";
test("visão geral e CSVs confrontados com registros reais conhecidos",async ({page,request}) => {
  if(process.env.CATALOG_DISPOSABLE !== "1" || !process.env.SALES_FIXTURE || !process.env.PURCHASES_FIXTURE) throw new Error("Use npm run test:integration.");
  const sales = JSON.parse(process.env.SALES_FIXTURE), purchases = JSON.parse(process.env.PURCHASES_FIXTURE);
  await page.goto(`/visao-geral?idLoja=${sales.store}&inicio=2020-06-01&fim=2020-06-30`);
  for(const [section,fixture,labels] of [["Vendas no período",sales,{ABERTA:"Aberta",CONCLUIDA:"Concluída",CANCELADA:"Cancelada"}],["Compras no período",purchases,{RASCUNHO:"Rascunho",PARCIALMENTE_RECEBIDA:"Parcialmente recebida",RECEBIDA:"Recebida",CANCELADA:"Cancelada"}]] as const) {
    const region = page.getByRole("region",{name:section});
    for(const [status,label] of Object.entries(labels)) {
      const records = fixture.reports.filter((r:{status:string})=>r.status===status);
      const row = region.getByRole("row").filter({has:page.getByRole("link",{name:label,exact:true})});
      await expect(row.getByRole("cell").nth(1)).toHaveText(String(records.length));
      await expect(row.getByRole("cell").nth(2)).toContainText((records.reduce((sum:number,r:{total:number})=>sum+Math.round(r.total*100),0)/100).toLocaleString("pt-BR",{minimumFractionDigits:2}));
    }
  }
  const stocks = await (await request.get(`/api/estoques?idLoja=${sales.store}`)).json();
  const region = page.getByRole("region",{name:"Estoque atual"});
  await expect(region.getByRole("link",{name:/Saldo positivo/})).toHaveText(`Saldo positivo: ${stocks.filter((r:{idLoja:string;quantidadeAtual:number})=>r.idLoja===sales.store && r.quantidadeAtual>0).length}`);
  for (const [path,resource] of [["produtos","produtos"],["estoque","estoques"],["estoque/movimentacoes","movimentacoes-estoque"]]) {
    const known = await (await request.get(`/api/${resource}`)).json();
    await page.goto(`/${path}`);
    const button = page.getByRole("button", { name: `Exportar CSV (${known.length})` }); await expect(button).toBeEnabled();
    const promise = page.waitForEvent("download"); await button.click(); const download = await promise;
    const text = (await readFile((await download.path())!)).toString("utf8");
    for (const row of known) expect(text).toContain(`"${row.id}";`);
    if (resource === "estoques") expect(text).toContain('"-0,125"');
  }
  for(const [path,fixture,total] of [["vendas",sales,"1,23"],["compras",purchases,"2,34"]] as const) {
    await page.goto(`/${path}?idLoja=${sales.store}&inicio=2020-06-01&fim=2020-06-30&ordem=data-desc`);
    const button = page.getByRole("button",{name:"Exportar CSV (25)"}); await expect(button).toBeEnabled();
    const promise = page.waitForEvent("download");await button.click();const download = await promise;
    const bytes = await readFile((await download.path())!);expect([...bytes.subarray(0,3)]).toEqual([239,187,191]);
    const lines = bytes.toString("utf8").split("\r\n").filter(Boolean); expect(lines).toHaveLength(26);
    for(const record of fixture.reports) expect(lines.some(line=>line.startsWith(`"${record.id}";`) && line.endsWith(`;"${total}"`))).toBe(true);
    // Equal timestamps use descending ID as the stable tie-breaker.
    expect(lines.slice(1).map(line=>line.split(";")[0].replaceAll('"',''))).toEqual(fixture.reports.map((r:{id:string})=>r.id).sort().reverse());
  }
});
