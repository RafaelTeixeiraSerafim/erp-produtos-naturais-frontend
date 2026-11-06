import { expect, it } from "vitest";
import { decodeRecovery, recoveryKey, lifetime, purchaseDraftSchema, saleDraftSchema, purchaseFingerprint } from "@/lib/recovery";
import { draftValues } from "@/lib/purchases";
import { draftValues as saleValues } from "@/lib/sales";
const now = 1000000000;
const record = (values: unknown) => ({ version: 1, updatedAt: now, revision: "one", baseline: "", values });
it("round trips incomplete raw strings and added/removed item rows", () => {
  const draft = draftValues();
  draft.itens.push({ ...draft.itens[0], quantidade: "1,", custoUnitario: "0," });
  draft.observacao = "  texto  ";
  expect(decodeRecovery(JSON.stringify(record(draft)), purchaseDraftSchema, now).values).toEqual(draft);
  expect(decodeRecovery(JSON.stringify(record(saleValues())), saleDraftSchema, now).values).toEqual(saleValues());
});
it("rejects expired, future, malformed, incompatible and invalid records", () => {
  const valid = record(draftValues());
  for (const value of ["{", JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, values: {} }), JSON.stringify({ ...valid, updatedAt: now + 1 })])
    expect(() => decodeRecovery(value, purchaseDraftSchema, now)).toThrow();
  expect(() => decodeRecovery(JSON.stringify(valid), purchaseDraftSchema, now + lifetime)).toThrow();
});
it("isolates environments and document contexts", () => {
  expect(new Set([recoveryKey("a", "user", "purchase:new"), recoveryKey("b", "user", "purchase:new"), recoveryKey("a", "user", "purchase:id"), recoveryKey("a", "user", "sale:new")]).size).toBe(4);
});
it("purchase baseline covers editable fields, status, operator and item identities", () => {
  const row = { status: "RASCUNHO" as const, observacao: "a", itens: [{ id: "one", quantidade: 1 }] };
  for (const changed of [{ ...row, observacao: "b" }, { ...row, idUsuario: "other" }, { ...row, status: "RECEBIDA" as const }, { ...row, itens: [{ id: "two", quantidade: 1 }] }])
    expect(purchaseFingerprint(changed)).not.toBe(purchaseFingerprint(row));
});
it("restaura a criação de venda com a mesma serialização do payload submetido", async () => {
  const {salePayload}=await import("@/lib/sales");
  const id="11111111-1111-4111-8111-111111111111";
  const draft={...saleValues(),idCliente:id,idUsuario:id,idLoja:id,observacao:"Conferida",itens:[{idProduto:id,quantidade:"1",precoUnitario:"2",desconto:"0"}]};
  const body=salePayload(draft);
  const recovered=decodeRecovery(JSON.stringify(record({...draft,pending:{key:id,body}})),saleDraftSchema,now);
  expect(JSON.stringify(recovered.values.pending?.body)).toBe(JSON.stringify(body));
});
