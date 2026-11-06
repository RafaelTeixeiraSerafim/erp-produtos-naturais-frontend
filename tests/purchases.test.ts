import { expect, it } from "vitest";
import { supplierSchema } from "@/lib/validation";
import {
  decimal,
  draftValues,
  itemCalculation,
  preview,
  purchasePayload,
  purchaseLocalDate,
  saoPauloTimestamp,
} from "@/lib/purchases";
const id = "11111111-1111-4111-8111-111111111111";
const item = {
  idProduto: id,
  quantidade: "1,125",
  custoUnitario: "2,3456",
  desconto: "0,10",
};
const draft = () => ({
  idFornecedor: id,
  idLoja: id,
  dataCompra: "",
  observacao: "Teste",
  itens: [{ ...item }],
});
it("valida o DTO de fornecedor, normaliza UF e mantém documentos opcionais", () => {
  const values = {
    nomeFantasia: " A ",
    razaoSocial: "B",
    estado: " sc ",
    cidade: "C",
    bairro: "D",
  };
  expect(supplierSchema.parse(values)).toEqual({
    ...values,
    nomeFantasia: "A",
    estado: "SC",
  });
  for (const field of [
    "nomeFantasia",
    "razaoSocial",
    "estado",
    "cidade",
    "bairro",
  ])
    expect(supplierSchema.safeParse({ ...values, [field]: "" }).success).toBe(
      false,
    );
  expect(
    supplierSchema.safeParse({ ...values, estado: "Santa Catarina" }).success,
  ).toBe(false);
});
it("aceita agrupamento brasileiro e até três/quatro casas sem ponto flutuante", () => {
  expect(decimal("1.234,567", 3, true)).toBe(1234567n);
  expect(itemCalculation(item)).toEqual({
    q: 1125n,
    c: 23456n,
    d: 10n,
    cents: 254n,
  });
  expect(preview([item, item])).toBe(5.08);
});
it.each(["0", "-1", "1,0001", "1.2", "NaN", "100000000000"])(
  "rejeita quantidade inválida %s",
  (quantidade) =>
    expect(() => itemCalculation({ ...item, quantidade })).toThrow(),
);
it.each(["-1", "1,00001", "10000000000"])(
  "rejeita custo inválido %s",
  (custoUnitario) =>
    expect(() => itemCalculation({ ...item, custoUnitario })).toThrow(),
);
it("arredonda HALF_UP cada item antes da soma", () => {
  const half = {
    ...item,
    quantidade: "0,001",
    custoUnitario: "5",
    desconto: "0",
  };
  expect(preview([half, half])).toBe(0.02);
  expect(preview([{ ...half, custoUnitario: "4,9999" }])).toBe(0);
  expect(preview([{ ...half, custoUnitario: "5,0001" }])).toBe(0.01);
});
it("compara desconto com bruto antes de arredondar", () => {
  expect(() =>
    itemCalculation({
      ...item,
      quantidade: "0,001",
      custoUnitario: "9,9999",
      desconto: "0,01",
    }),
  ).toThrow(/desconto/);
  expect(
    preview([{ ...item, quantidade: "1", custoUnitario: "2", desconto: "2" }]),
  ).toBe(0);
  for (const desconto of ["-1", "0,001", "1000000000000"])
    expect(() => itemCalculation({ ...item, desconto })).toThrow();
});
it("limita itens e soma à precisão numeric(14,2)", () => {
  const large = {
    ...item,
    quantidade: "99999999999,999",
    custoUnitario: "10",
    desconto: "0",
  };
  expect(preview([large])).toBe(999999999999.99);
  expect(() => preview([large, large])).toThrow(/compra/);
  expect(() => preview([{ ...large, custoUnitario: "11" }])).toThrow(/item/);
});
it("monta criação e PUT completo, preservando IDs e deixando operador ao servidor sem derivar preços", () => {
  expect(purchasePayload(draft())).toEqual({
    idFornecedor: id,
    idLoja: id,
    status: "RASCUNHO",
    observacao: "Teste",
    itens: [
      {
        idProduto: id,
        quantidade: 1.125,
        custoUnitario: 2.3456,
        desconto: 0.1,
      },
    ],
  });
  const row = {
    id,
    idFornecedor: id,
    idLoja: id,

    status: "RASCUNHO" as const,
    dataCompra: "2026-11-05T02:59:59Z",
    itens: [
      {
        id,
        idProduto: id,
        quantidade: 1.125,
        custoUnitario: 2.3456,
        desconto: 0.1,
      },
    ],
  };
  const body = purchasePayload(draftValues(row), row);
  expect(body.idUsuario).toBeUndefined();
  expect(body.itens[0].id).toBe(id);
  expect(body.dataCompra).toBe(row.dataCompra);
  expect(purchaseLocalDate(row.dataCompra)).toBe("2026-11-04T23:59:59");
  expect(() =>
    purchasePayload(draft(), { ...row, status: "RECEBIDA" }),
  ).toThrow(/rascunho/);
  expect(() => purchasePayload({ ...draft(), itens: [] })).toThrow(/item/);
  expect(() => purchasePayload({ ...draft(), idFornecedor: "bad" })).toThrow();
  expect(() => purchasePayload({ ...draft(), dataCompra: "bad" })).toThrow(
    /Data/,
  );
});

it("converte São Paulo sem depender do fuso do navegador e rejeita dias inexistentes", () => {
  expect(saoPauloTimestamp("2026-11-04T23:59")).toBe("2026-11-04T23:59-03:00");
  expect(saoPauloTimestamp("2018-12-01T12:00")).toBe("2018-12-01T12:00-02:00");
  expect(() => saoPauloTimestamp("2026-02-30T12:00")).toThrow(/inválid/);
  expect(() => saoPauloTimestamp("2018-11-04T00:30")).toThrow(/inválid/);
});
