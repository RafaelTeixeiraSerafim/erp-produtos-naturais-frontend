// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { PasswordInput } from "@/components/ui/password-input";
import { DocumentInput } from "@/components/ui/document-input";
import { validDocument, normalizeDocument, maskDocument } from "@/lib/documents";
import { draftValues, purchasePayload } from "@/lib/purchases";
import { supplierSchema, customerSchema } from "@/lib/validation";
afterEach(cleanup);
it("validates numeric and official alphanumeric CNPJ vectors and CPF",()=>{
  for(const v of ["04252011000110","04.252.011/0001-10","12ABC34501DE35","12.abc.345/01de-35"])expect(validDocument(v,true)).toBe(true);
  for(const v of ["00000000000000","12ABC34501DE34","12ABC34501DEAA","@4252011000110"])expect(validDocument(v,true)).toBe(false);
  expect(validDocument("529.982.247-25")).toBe(true);expect(validDocument("11111111111")).toBe(false);
  expect(normalizeDocument("12.abc.345/01de-35")).toBe("12ABC34501DE35");expect(maskDocument("04252011000110",true)).toBe("04.252.011/0001-10");
});
it("requires one supplier document while allowing customers without CPF",()=>{
  const fields={nomeFantasia:"A",razaoSocial:"A",estado:"SC",cidade:"C",bairro:"B"};
  const empty=supplierSchema.safeParse(fields);expect(empty.success).toBe(false);
  if(!empty.success){const errors=empty.error.flatten().fieldErrors;expect(errors.cpf?.length).toBeGreaterThan(0);expect(errors.cnpj?.length).toBeGreaterThan(0);}
  expect(supplierSchema.safeParse({...fields,cpf:"52998224725",cnpj:"04252011000110"}).success).toBe(false);
  expect(supplierSchema.safeParse({...fields,cnpj:"12.abc.345/01de-35"}).success).toBe(true);
  expect(customerSchema.parse({nome:"A",cpf:""}).cpf).toBeUndefined();
});
it("eye toggles preserve value, focus and selection without submitting",async()=>{
  const submit=vi.fn();render(<form onSubmit={submit}><label>Senha<PasswordInput defaultValue="Secret8291"/></label></form>);
  const input=screen.getByLabelText("Senha") as HTMLInputElement;input.focus();input.setSelectionRange(2,5);
  await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Mostrar senha"}));await new Promise(requestAnimationFrame);});
  expect(input.type).toBe("text");expect(input.value).toBe("Secret8291");expect(document.activeElement).toBe(input);expect(input.selectionStart).toBe(2);expect(input.selectionEnd).toBe(5);expect(submit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Ocultar senha"}));expect(input.type).toBe("password");
});
it("document input accepts pasted mask, keeps initial zeros and rejects incompatible chars",()=>{
  const change=vi.fn();render(<DocumentInput aria-label="CNPJ" cnpj value="" onChange={change}/>);
  fireEvent.change(screen.getByLabelText("CNPJ"),{target:{value:"04.252.011/0001-10"}});expect(change).toHaveBeenLastCalledWith("04.252.011/0001-10");
  fireEvent.change(screen.getByLabelText("CNPJ"),{target:{value:"@"}});expect(change).toHaveBeenCalledTimes(1);
});
it("purchase edits preserve original seconds and new minutes explicitly zero seconds",()=>{
  const id="11111111-1111-4111-8111-111111111111";
  const original={idFornecedor:id,idLoja:id,dataCompra:"2026-11-11T14:23:47Z",status:"RASCUNHO" as const,itens:[{idProdutoSku:id,quantidade:1,custoUnitario:1,desconto:0}]};
  const draft=draftValues(original);expect(draft.dataCompra).toBe("2026-11-11T11:23");expect(purchasePayload(draft,original).dataCompra).toBe(original.dataCompra);
  expect(purchasePayload({...draft,dataCompra:"2026-11-11T11:24"},original).dataCompra).toBe("2026-11-11T11:24:00-03:00");
  expect(()=>purchasePayload({...draft,dataCompra:"2026-11-11T11:24:30"},original)).toThrow();
});
