import { describe, it, expect } from "vitest";
import {
  productSchema,
  productPayload,
  skuSchema,
  pricePayload,
  priceSchema,
  parseMoney,
} from "@/lib/validation";
const product = "11111111-1111-4111-8111-111111111111",
  store = "22222222-2222-4222-8222-222222222222";
describe("validações do catálogo", () => {
  it("envia os enums exatos em um DTO completo", () => {
    expect(
      productPayload({
        nome: "Aveia",
        idCategoria: product,
          descricao: "Integral",
          status: "INATIVO",
      }),
    ).toEqual({
      nome: "Aveia",
      idCategoria: product,
      descricao: "Integral",
      status: "INATIVO",
    });
    expect(
      productSchema.safeParse({
        nome: " ",
        idCategoria: "",
        idUnidadeMedida: "",
      }).success,
    ).toBe(false);
  });
  it.each([
    ["12,90", 12.9],
    ["1.234,56", 1234.56],
    ["0", 0],
    ["1000,01", 1000.01],
  ])("converte %s sem perder centavos", (raw, value) =>
    expect(parseMoney(raw)).toBe(value),
  );
  it.each(["-1,00", "1,001", "1.25", "NaN", "", "1e3"])(
    "rejeita moeda inválida: %s",
    (raw) => expect(() => parseMoney(raw)).toThrow(),
  );
  it("serializa a validade em ISO com offset UTC e preserva o instante", () => {
    const dto = pricePayload({
      idProdutoSku: product,
      idLoja: store,
      preco: "12,90",
      dataInicio: "2026-11-03T12:00:00-03:00",
      dataFim: "2026-11-04T12:00:00-03:00",
    });
    expect(dto).toMatchObject({
      idProdutoSku: product,
      idLoja: store,
      preco: 12.9,
      dataInicio: "2026-11-03T15:00:00.000Z",
      dataFim: "2026-11-04T15:00:00.000Z",
    });
  });
  it("rejeita fim anterior ao início e datas inválidas", () => {
    for (const dataFim of ["2026-11-02T12:00", "inválida"])
      expect(
        priceSchema.safeParse({
          idProdutoSku: product,
          idLoja: store,
          preco: "0,00",
          dataInicio: "2026-11-03T12:00",
          dataFim,
        }).success,
      ).toBe(false);
  });
  it("mantém datas opcionais ausentes", () =>
    expect(
      pricePayload({
        idProdutoSku: product,
        idLoja: store,
        preco: "0",
        dataInicio: "",
        dataFim: "",
      }).dataInicio,
    ).toBeUndefined());
  it("SKU nunca recebe loja ou preço", () => {
    const dto = skuSchema.parse({
      idProduto: product,
      sku: "AV-01",
      status: "ATIVO",
      ean13: "",
      dun14: "",
      descricaoApresentacao: "Pacote 200 g",
      idUnidadeMedida:store,
      tipoVenda:"UNIDADE",
      idLoja: store,
      preco: 20,
    });
    expect(dto).not.toHaveProperty("idLoja");
    expect(dto).not.toHaveProperty("preco");
    expect(skuSchema.safeParse({ ...dto, ean13: "123" }).success).toBe(false);
  });
});
