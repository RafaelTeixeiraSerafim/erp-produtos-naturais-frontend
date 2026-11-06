import { expect, it } from "vitest";
import {
  blankItem,
  draftValues,
  itemCalculation,
  salePayload,
  totals,
} from "@/lib/sales";
import { customerSchema, calendarDateLabel } from "@/lib/validation";
const id = "11111111-1111-4111-8111-111111111111";
const item = {
  idProduto: id,
  quantidade: "0,001",
  precoUnitario: "5",
  desconto: "0",
};
it("preserva data civil, omite vazia e rejeita datas inexistentes", () => {
  expect(
    customerSchema.parse({ nome: " Ana ", dataNascimento: "2000-02-29" })
      .dataNascimento,
  ).toBe("2000-02-29");
  expect(calendarDateLabel("2000-02-29")).toBe("29/02/2000");
  expect(
    customerSchema.parse({ nome: "Ana", dataNascimento: "" }).dataNascimento,
  ).toBeUndefined();
  expect(
    customerSchema.safeParse({ nome: "Ana", dataNascimento: "2001-02-29" })
      .success,
  ).toBe(false);
});
it("HALF_UP por item e subtotal agregado distinto da soma das linhas", () => {
  expect(itemCalculation(item).cents).toBe(1n);
  expect(totals([item, item])).toEqual({
    subtotal: 0.01,
    discount: 0,
    total: 0.01,
    roundingDifference: true,
  });
  expect(
    totals([
      { ...item, quantidade: "1,125", precoUnitario: "2,35", desconto: "0,10" },
      item,
    ]).total,
  ).toBe(2.55);
});
it.each([
  { quantidade: "0" },
  { quantidade: "-1" },
  { quantidade: "0,0001" },
  { quantidade: "100000000000" },
  { precoUnitario: "1,001" },
  { precoUnitario: "-1" },
  { precoUnitario: "10000000000" },
  { desconto: "-1" },
  { desconto: "0,001" },
  { desconto: "0,01" },
])(
  "rejeita quantidade, preço, desconto ou precisão inválidos: %s",
  (invalid) => {
    expect(() => itemCalculation({ ...item, ...invalid })).toThrow();
  },
);
it("limites de totais e precisão de banco", () => {
  expect(() =>
    totals([
      {
        ...item,
        quantidade: "99999999999,999",
        precoUnitario: "9999999999,99",
      },
    ]),
  ).toThrow();
  expect(
    itemCalculation({
      ...item,
      quantidade: "1",
      precoUnitario: "9999999999,99",
    }).c,
  ).toBe(999999999999n);
});
it("exige cliente, operador, loja, produto e itens", () => {
  const valid = {
    ...draftValues(),
    idCliente: id,
    idUsuario: id,
    idLoja: id,
    itens: [item],
  };
  for (const key of ["idCliente", "idUsuario", "idLoja"] as const)
    expect(() => salePayload({ ...valid, [key]: "" })).toThrow();
  expect(() => salePayload({ ...valid, itens: [] })).toThrow();
  expect(() => salePayload({ ...valid, itens: [blankItem()] })).toThrow();
  expect(salePayload(valid)).toEqual({
    observacao:"",
    idCliente: id,
    idUsuario: id,
    idLoja: id,
    itens: [
      { idProduto: id, quantidade: 0.001, precoUnitario: 5, desconto: 0 },
    ],
  });
  expect(
    salePayload({ ...valid, dataVenda: "2026-11-04T23:59" }).dataVenda,
  ).toBe("2026-11-04T23:59-03:00");
});

it("envia observação, versão e identidades dos itens sem alterar os totais salvos", () => {
  const payload=salePayload({...draftValues(),idCliente:id,idLoja:id,idUsuario:id,observacao:"Conferir entrega",baseVersion:4,itens:[{...blankItem(),id,idProduto:id,quantidade:"1,125",precoUnitario:"2,35",desconto:"0,01"}]});
  expect(payload.versao).toBe(4);expect(payload.observacao).toBe("Conferir entrega");expect(payload.itens[0].id).toBe(id);expect(payload).not.toHaveProperty("status");
});
