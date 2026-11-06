import { describe,it,expect } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { returnValues,returnPayload,returnDraftSchema,returnChoicesOptions,type ReturnSource } from "@/lib/returns";
import { decodeRecovery,lifetime } from "@/lib/recovery";
import { pagePermission } from "@/lib/auth";
import { selectInventory } from "@/lib/report-selectors";
const id="11111111-1111-4111-8111-111111111111",item="22222222-2222-4222-8222-222222222222",product="33333333-3333-4333-8333-333333333333";
const source:ReturnSource={id,idLoja:id,eligible:true,itens:[{id:item,idProduto:product,quantidade:10,quantidadeDevolvida:2,quantidadeDevolvivel:8}]};
describe("returns",()=>{
 it("prepopulates identities, leaves quantities blank and requires a reason",()=>{const d=returnValues(source);expect(d.itens[0].quantidade).toBe("");expect(()=>returnPayload(d,"clientes")).toThrow();d.motivo="Avaria";d.itens[0].quantidade="1,125";expect(returnPayload(d,"clientes").itens[0]).toMatchObject({idItemOrigem:item,idProduto:product,quantidade:1.125});});
 it("permits mixed dispositions and requires the non-restockable observation",()=>{const d=returnValues(source);d.motivo="Condição";d.itens[0].quantidade="2";d.itens.push({...d.itens[0],retornaAoEstoque:false});expect(()=>returnPayload(d,"clientes")).toThrow(/observação/);d.itens[1].observacao="Quebrado";expect(returnPayload(d,"clientes").itens).toHaveLength(2);expect(()=>returnPayload(d,"fornecedores")).toThrow(/duplicad/);d.itens[1].retornaAoEstoque=true;expect(()=>returnPayload(d,"clientes")).toThrow(/duplicad/);});
 it("rejects rounding, zero, overflow and ignores blank rows",()=>{const d=returnValues(source);d.motivo="Teste";for(const q of ["0","-1","1.0001","100000000000","NaN","1e3"]){d.itens[0].quantidade=q;expect(()=>returnPayload(d,"fornecedores")).toThrow();}d.itens[0].quantidade="0,001";d.itens.push({...d.itens[0],quantidade:""});expect(returnPayload(d,"fornecedores").itens).toHaveLength(1);});
 it("recovers an exact persisted creation key/body for seven days",()=>{const d=returnValues(source);d.motivo="Recuperar";d.itens[0].quantidade="1";d.pending={key:id,body:returnPayload(d,"clientes")};const record={version:1,updatedAt:100,revision:"r",baseline:"new",values:d};expect(decodeRecovery(JSON.stringify(record),returnDraftSchema,101).values.pending).toEqual(d.pending);expect(()=>decodeRecovery(JSON.stringify(record),returnDraftSchema,100+lifetime)).toThrow();});
 it("guards both workflows and keeps movement references separate",()=>{expect(pagePermission("/vendas/devolucoes/nova")).toBe("purchases.read");expect(pagePermission("/compras/devolucoes/123")).toBe("purchases.read");const rows=selectInventory([],[{id:"a",idDevolucaoCliente:id},{id:"b",idDevolucaoFornecedor:id}],true,{idDevolucaoCliente:id},()=>"P",()=>"L");expect(rows.map(r=>r.id)).toEqual(["a"]);});
 it("projects eligible choices from an existing SDK cache without changing sale or purchase records",()=>{
   const client=new QueryClient({defaultOptions:{queries:{staleTime:Infinity}}});
   for(const kind of ["clientes","fornecedores"] as const){
     const options=returnChoicesOptions(kind);
     const raw={id,idLoja:id,status:kind==="clientes"?"CONCLUIDA":"RECEBIDA",legado:false,valorTotal:30,idCliente:product,idFornecedor:product,itens:[{id:item,idProduto:product,quantidade:10,quantidadeRecebida:8,quantidadeDevolvida:2,quantidadeDevolvivel:6}]};
     client.setQueryData(options.queryKey,[raw]);
     const observer=new QueryObserver(client,{...options,enabled:false});
     expect(observer.getCurrentResult().data?.[0]).toMatchObject({id,eligible:true});
     expect(client.getQueryData(options.queryKey)).toEqual([raw]);
     expect(client.getQueryData<{valorTotal:number}[]>(options.queryKey)?.[0].valorTotal).toBe(30);
     observer.destroy();
   }
   client.clear();
 });
});
