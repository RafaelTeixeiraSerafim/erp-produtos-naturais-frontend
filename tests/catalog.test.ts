import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultTransport, client } from "@/generated/sdk/.kubb/client";
import { initialValues, saveRecord } from "@/lib/catalog";
const product = "11111111-1111-4111-8111-111111111111",
  store = "22222222-2222-4222-8222-222222222222";
beforeEach(() => client.setConfig({ baseURL: "" }));
afterEach(() => vi.restoreAllMocks());
function transport() {
  return vi.spyOn(defaultTransport, "request").mockResolvedValue({
    status: 201,
    data: { id: product },
    headers: { "content-type": "application/json" },
    config: {},
  });
}
function parseRequestBody(data: unknown) {
  if (typeof data !== "string")
    throw new Error("Expected a serialized JSON request body.");
  return JSON.parse(data);
}

describe("integração com os clientes gerados", () => {
  it("aplica status ATIVO ao criar produto sem variante", async () => {
    const request = transport();
    await saveRecord("products", {
      ...initialValues("products"),
      nome: "Aveia",
      idCategoria: product,
    });
    expect(request).toHaveBeenCalledOnce();
    const config = request.mock.calls[0][0];
    expect(config.url).toBe("/api/produtos");
    expect(config.baseURL).toBe("");
    expect(config.method).toBe("POST");
    expect(parseRequestBody(config.data)).toMatchObject({
      status: "ATIVO",
    });
  });
  it("envia DTO completo em PUT", async () => {
    const request = transport();
    const values = {
      nome: "Aveia nova",
      idCategoria: product,
      descricao: "Integral",
      status: "INATIVO",
    };
    await saveRecord("products", values, product);
    const config = request.mock.calls[0][0];
    expect(config.method).toBe("PUT");
    expect(config.url).toBe(`/api/produtos/${product}`);
    expect(parseRequestBody(config.data)).toEqual(values);
  });
  it("salva preço e validade em operação própria", async () => {
    const request = transport();
    await saveRecord("prices", {
      idProdutoSku: product,
      idLoja: store,
      preco: "1.234,56",
      dataInicio: "2026-11-03T12:00:00-03:00",
      dataFim: "",
    });
    const config = request.mock.calls[0][0];
    expect(config.url).toBe("/api/skus-precos-loja");
    expect(parseRequestBody(config.data)).toEqual({
      idProdutoSku: product,
      idLoja: store,
      preco: 1234.56,
      dataInicio: "2026-11-03T15:00:00.000Z",
    });
  });
  it("rejeita submissão inválida antes de chamar o cliente", async () => {
    const request = transport();
    await expect(saveRecord("categories", { nome: " " })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
