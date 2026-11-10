import type { VendaRequestDTO } from "@/generated/sdk/types/VendaRequestDTO";
import type { VendaResponseDTO } from "@/generated/sdk/types/VendaResponseDTO";
import { decimal, purchaseLocalDate, saoPauloTimestamp } from "./purchases";
import { uuid } from "./validation";
export type SaleItem = {
  id?: string;
  idProdutoSku: string;
  quantidade: string;
  precoUnitario: string;
  desconto: string;
};
export type SaleDraft = {
  idCliente: string;
  idUsuario: string;
  idLoja: string;
  dataVenda: string;
  observacao?: string;
  baseVersion?: number;
  pending?: { key: string; body: VendaRequestDTO };
  itens: SaleItem[];
};
export const blankItem = (): SaleItem => ({
  idProdutoSku: "",
  quantidade: "",
  precoUnitario: "",
  desconto: "0",
});
export const draftValues = (): SaleDraft => ({
  idCliente: "",
  idUsuario: "",
  idLoja: "",
  dataVenda: "",
  observacao: "",
  itens: [blankItem()],
});
const limit = 99999999999999n;
export function itemCalculation(item: SaleItem) {
  const q = decimal(item.quantidade, 3, true),
    c = decimal(item.precoUnitario, 2),
    d = decimal(item.desconto || "0", 2);
  if (c > 999999999999n) throw new Error("Preço fora do limite permitido.");
  const gross = q * c;
  if (d * 1000n > gross)
    throw new Error("O desconto não pode superar o valor bruto do item.");
  const cents = (gross - d * 1000n + 500n) / 1000n;
  if (cents > limit)
    throw new Error("Total do item excede o limite permitido.");
  return { q, c, d, gross, cents };
}
export function totals(items: SaleItem[]) {
  const calculated = items.map(itemCalculation);
  const subtotal =
    (calculated.reduce((s, i) => s + i.gross, 0n) + 500n) / 1000n;
  const discount = calculated.reduce((s, i) => s + i.d, 0n);
  const total = subtotal - discount;
  if ([subtotal, discount, total].some((v) => v > limit))
    throw new Error("Total da venda excede o limite permitido.");
  return {
    subtotal: Number(subtotal) / 100,
    discount: Number(discount) / 100,
    total: Number(total) / 100,
    roundingDifference: total !== calculated.reduce((s, i) => s + i.cents, 0n),
  };
}
export const preview = (items: SaleItem[]) => totals(items).total;
export function salePayload(draft: SaleDraft): VendaRequestDTO {
  for (const [key, label] of [
    ["idCliente", "cliente"],
    ["idUsuario", "operador"],
    ["idLoja", "loja"],
  ] as const)
    if (!uuid.safeParse(draft[key]).success)
      throw new Error(`Selecione ${label} válido.`);
  if (!draft.itens.length) throw new Error("Adicione pelo menos um item.");
  totals(draft.itens);
  if (
    draft.dataVenda &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(draft.dataVenda)
  )
    throw new Error("Data inválida.");
  return {
    ...(draft.baseVersion === undefined ? {} : { versao: draft.baseVersion }),
    idCliente: draft.idCliente,
    idUsuario: draft.idUsuario,
    idLoja: draft.idLoja,
    ...(draft.dataVenda
      ? { dataVenda: saoPauloTimestamp(draft.dataVenda) }
      : {}),
    observacao: draft.observacao || "",
    itens: draft.itens.map((i) => {
      if (!uuid.safeParse(i.idProdutoSku).success)
        throw new Error("Selecione um produto válido em cada item.");
      const { q, c, d } = itemCalculation(i);
      return {
        ...(i.id ? { id:i.id } : {}),
        idProdutoSku: i.idProdutoSku,
        quantidade: Number(q) / 1000,
        precoUnitario: Number(c) / 100,
        desconto: Number(d) / 100,
      };
    }),
  };
}
export const statusLabels: Record<string, string> = {
  ABERTA: "Aberta",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};
export const saleStatus = (v?: string) => (v ? statusLabels[v] || v : "—");

export function savedSaleValues(row: VendaResponseDTO): SaleDraft {
  const format = (n?: number) => n === undefined ? "" : n.toLocaleString("pt-BR", { useGrouping:false, maximumFractionDigits:3 });
  return { idCliente:row.idCliente || "", idUsuario:row.idUsuario || "", idLoja:row.idLoja || "", dataVenda:purchaseLocalDate(row.dataVenda), observacao:row.observacao || "", baseVersion:row.versao,
    itens:(row.itens || []).map(i => ({ id:i.id, idProdutoSku:i.idProdutoSku || "", quantidade:format(i.quantidade), precoUnitario:format(i.precoUnitario), desconto:format(i.desconto) })) };
}
