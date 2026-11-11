import type { CompraRequestDTO } from "@/generated/sdk/types/CompraRequestDTO";
import type { CompraResponseDTO } from "@/generated/sdk/types/CompraResponseDTO";
import { uuid } from "./validation";
import { inventoryInstant } from "./inventory";
export type DraftItem = {
  id?: string;
  idProdutoSku: string;
  quantidade: string;
  custoUnitario: string;
  desconto: string;
};
export type Draft = {
  idFornecedor: string;
  idLoja: string;
  dataCompra: string;
  observacao: string;
  itens: DraftItem[];
};
export const blankItem = (): DraftItem => ({
  idProdutoSku: "",
  quantidade: "",
  custoUnitario: "",
  desconto: "0",
});
const limit = 99999999999999n;
// Inputs use Brazilian notation; scaled integers keep all seven product decimals.
export function decimal(
  value: string,
  scale: number,
  positive = false,
): bigint {
  const input = value.trim();
  const pattern = new RegExp(
    `^(?:\\d+|\\d{1,3}(?:\\.\\d{3})+)(?:,\\d{1,${scale}})?$`,
  );
  if (!pattern.test(input))
    throw new Error(
      `Informe um valor ${positive ? "positivo" : "não negativo"} com até ${scale} casas decimais.`,
    );
  const [whole, fraction = ""] = input.replaceAll(".", "").split(",");
  const scaled =
    BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0"));
  if ((positive && scaled === 0n) || scaled > limit)
    throw new Error("Valor fora do limite permitido.");
  return scaled;
}
export function itemCalculation(item: DraftItem) {
  const q = decimal(item.quantidade, 3, true),
    c = decimal(item.custoUnitario, 4),
    d = decimal(item.desconto || "0", 2);
  const gross = q * c,
    discount = d * 100000n;
  if (discount > gross)
    throw new Error("O desconto não pode superar o valor bruto do item.");
  const cents = (gross - discount + 50000n) / 100000n;
  if (cents > limit)
    throw new Error("Total do item excede o limite permitido.");
  return { q, c, d, cents };
}
export function preview(items: DraftItem[]) {
  const cents = items.reduce(
    (sum, item) => sum + itemCalculation(item).cents,
    0n,
  );
  if (cents > limit)
    throw new Error("Total da compra excede o limite permitido.");
  return Number(cents) / 100;
}
export function purchasePayload(
  draft: Draft,
  existing?: CompraResponseDTO,
): CompraRequestDTO {
  if (existing && existing.status !== "RASCUNHO")
    throw new Error("Somente compras em rascunho podem ser alteradas.");
  if (!uuid.safeParse(draft.idFornecedor).success)
    throw new Error("Selecione um fornecedor válido.");
  if (!uuid.safeParse(draft.idLoja).success)
    throw new Error("Selecione uma loja válida.");
  if (!draft.itens.length) throw new Error("Adicione pelo menos um item.");
  preview(draft.itens);
  if (
    draft.dataCompra &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(draft.dataCompra)
  )
    throw new Error("Data inválida.");
  const dataCompra = draft.dataCompra
    ? saoPauloTimestamp(`${draft.dataCompra}:00`)
    : undefined;
  if (dataCompra && !Number.isFinite(new Date(dataCompra).getTime()))
    throw new Error("Data inválida.");
  return {
    idFornecedor: draft.idFornecedor,
    idLoja: draft.idLoja,
    ...(dataCompra
      ? {
          dataCompra:
            existing?.dataCompra &&
            draft.dataCompra === purchaseLocalDate(existing.dataCompra).slice(0,16)
              ? existing.dataCompra
              : dataCompra,
        }
      : {}),
    status: "RASCUNHO",
    observacao: draft.observacao,
    itens: draft.itens.map((item) => {
      if (!uuid.safeParse(item.idProdutoSku).success)
        throw new Error("Selecione um produto válido em cada item.");
      const { q, c, d } = itemCalculation(item);
      return {
        ...(item.id ? { id: item.id } : {}),
        idProdutoSku: item.idProdutoSku,
        quantidade: Number(q) / 1000,
        custoUnitario: Number(c) / 10000,
        desconto: Number(d) / 100,
      };
    }),
  };
}
export function purchaseLocalDate(value?: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(inventoryInstant(value));
  return parts.replace(" ", "T");
}
export function draftValues(row?: CompraResponseDTO): Draft {
  const format = (v: number | undefined, scale: number) =>
    v === undefined
      ? ""
      : v.toLocaleString("pt-BR", {
          useGrouping: false,
          maximumFractionDigits: scale,
        });
  return {
    idFornecedor: row?.idFornecedor || "",
    idLoja: row?.idLoja || "",
    dataCompra: purchaseLocalDate(row?.dataCompra).slice(0,16),
    observacao: row?.observacao || "",
    itens: row
      ? (row.itens || []).map((i) => ({
          id: i.id,
          idProdutoSku: i.idProdutoSku || "",
          quantidade: format(i.quantidade, 3),
          custoUnitario: format(i.custoUnitario, 4),
          desconto: format(i.desconto ?? 0, 2),
        }))
      : [blankItem()],
  };
}
export const statusLabels: Record<string, string> = {
  RASCUNHO: "Rascunho",
  PARCIALMENTE_RECEBIDA: "Parcialmente recebida",
  RECEBIDA: "Recebida",
  CANCELADA: "Cancelada",
};
export const purchaseStatus = (status?: string) =>
  status ? statusLabels[status] || status : "—";
export const unitCost = (value?: number) =>
  value === undefined
    ? "—"
    : value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });

// Resolve wall time using the named timezone, including historical DST offsets.
// A round-trip rejects nonexistent local times and calendar dates.
export function saoPauloTimestamp(wall: string) {
  const local = new Date(`${wall}Z`);
  if (!Number.isFinite(local.getTime())) throw new Error("Data inválida.");
  let instant = local.getTime();
  for (let attempt = 0; attempt < 3; attempt++) {
    const displayed = purchaseLocalDate(new Date(instant).toISOString());
    const delta = local.getTime() - Date.parse(`${displayed}Z`);
    instant += delta;
    if (!delta) break;
  }
  const expected = wall.length === 16 ? `${wall}:00` : wall;
  if (purchaseLocalDate(new Date(instant).toISOString()) !== expected)
    throw new Error("Data ou horário inválido em São Paulo.");
  const offset = Math.round((local.getTime() - instant) / 60000);
  const sign = offset < 0 ? "-" : "+";
  return `${wall}${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
}
