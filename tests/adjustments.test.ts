import { describe,it,expect } from "vitest";
import { adjustmentPayload,adjustmentValues } from "@/lib/adjustments";
describe("adjustments",()=>{
 it("requires justification and prevents rounding",()=>{
 const d=adjustmentValues();expect(()=>adjustmentPayload(d)).toThrow();
 d.idLoja="11111111-1111-4111-8111-111111111111";d.justificativa="Correção";d.itens[0].idProdutoSku="22222222-2222-4222-8222-222222222222";d.itens[0].quantidade="1,125";
 expect(adjustmentPayload(d).itens[0].quantidade).toBe(1.125);d.itens[0].quantidade="1.0001";expect(()=>adjustmentPayload(d)).toThrow();
 });
});
