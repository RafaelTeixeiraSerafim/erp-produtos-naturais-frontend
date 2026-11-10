import { expect, it } from "vitest";
import { skuSchema, productSchema } from "@/lib/validation";
import { decodeRecovery, purchaseDraftSchema } from "@/lib/recovery";
import { selectInventory } from "@/lib/report-selectors";
it("identifica cópias comerciais antigas sem SKU como incompatíveis", () => {
  const old={version:1,updatedAt:Date.now(),revision:"new",baseline:"",values:{idFornecedor:"",idLoja:"",dataCompra:"",observacao:"",itens:[{idProduto:"old-product",quantidade:"2",custoUnitario:"1",desconto:"0"}]}};
  expect(()=>decodeRecovery(JSON.stringify(old),purchaseDraftSchema)).toThrow();
});
it("produto pode existir sem variantes; apresentação e unidade são obrigatórias no SKU",()=>{
  const id="11111111-1111-4111-8111-111111111111";
  expect(productSchema.safeParse({nome:"Aveia",idCategoria:id,descricao:"",status:"ATIVO"}).success).toBe(true);
  expect(skuSchema.safeParse({idProduto:id,sku:"AVE",status:"ATIVO",ean13:"",dun14:"",descricaoApresentacao:""}).success).toBe(false);
});
it("combina produto, SKU e loja sem agregar saldos das variantes",()=>{
  const rows=[{id:"1",idProduto:"p",idProdutoSku:"a",idLoja:"l",quantidadeAtual:2},{id:"2",idProduto:"p",idProdutoSku:"b",idLoja:"l",quantidadeAtual:100}];
  const select=(f:Record<string,string>)=>selectInventory(rows,[],false,f,id=>id||"",id=>id||"");
  expect(select({idProduto:"p"}).map(r=>r.amount)).toEqual([2,100]);
  expect(select({idProduto:"p",idProdutoSku:"a",idLoja:"l"}).map(r=>r.amount)).toEqual([2]);
  expect(select({idProduto:"other",idProdutoSku:"a"})).toEqual([]);
});
