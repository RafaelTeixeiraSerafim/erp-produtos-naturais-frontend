import { describe, expect, it } from "vitest";
import { receiptValues, receiptPayload, receiptDraftSchema, outstanding } from "@/lib/receipts";
import { decodeRecovery } from "@/lib/recovery";
const id = (n:number) => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const purchase = { id:id(1), idLoja:id(2), status:"RASCUNHO" as const, itens:[{ id:id(3), idProdutoSku:id(4), quantidade:10, quantidadeRecebida:3 }] };
const edited = { id:id(5), idCompra:id(1), status:"RASCUNHO" as const, versao:2, idUsuario:id(6), itens:[{ id:id(7), idItemCompra:id(3), idProdutoSku:id(4), quantidade:2 }] };
const draft = () => ({ ...receiptValues(purchase), idUsuario:id(6), itens:receiptValues(purchase).itens.map(i => ({ ...i,selecionado:true,quantidade:"2,125" })) });
describe("recebimentos",() => {
  it("inicia quantidades vazias sem selecionar operador ou linhas e usa pendentes",() => { const d=receiptValues(purchase); expect(d.idUsuario).toBe(""); expect(d.itens[0].quantidade).toBe(""); expect(d.itens[0].selecionado).toBe(false); expect(outstanding(purchase.itens[0])).toBe(7); });
  it("gera rascunho parcial sem efeitos de estoque e mantém identidade na edição",() => {
    expect(receiptPayload(draft(),purchase).itens[0].quantidade).toBe(2.125);
    const d=receiptValues(purchase,edited); const p=receiptPayload(d,purchase,edited);
    expect(p.versao).toBe(2); expect(p.itens[0].id).toBe(id(7)); expect(p.status).toBe("RASCUNHO");
  });
  it.each(["0","-1","0,0001","100000000000","7,001",""])("rejeita quantidade inválida %s sem aparar", q => { const d=draft(); d.itens[0].quantidade=q; expect(() => receiptPayload(d,purchase)).toThrow(); expect(d.itens[0].quantidade).toBe(q); });
  it("valida seleção, duplicatas, relacionamentos e versão",() => {
    expect(() => receiptPayload({ ...draft(),idUsuario:"" },purchase)).toThrow(/operador/);
    expect(() => receiptPayload({ ...draft(),itens:[] },purchase)).toThrow(/Selecione/);
    const d=draft(); expect(() => receiptPayload({ ...d,itens:[...d.itens,...d.itens] },purchase)).toThrow(/duplicado/);
    expect(() => receiptPayload(d,{ ...purchase,itens:[] })).toThrow(/indisponível/);
    expect(() => receiptPayload(receiptValues(purchase,edited),purchase,{ ...edited,versao:3 })).toThrow(/mudou/);
  });
  it("retém chave e payload exatos na recuperação de sete dias",() => {
    const d=draft(); const pending={ key:id(9),body:{ ...receiptPayload(d,purchase),status:"RASCUNHO" as const } };
    const raw=JSON.stringify({ version:1,updatedAt:Date.now(),revision:id(8),baseline:"",values:{ ...d,pending } });
    expect(decodeRecovery(raw,receiptDraftSchema).values.pending).toEqual(pending);
  });
});
