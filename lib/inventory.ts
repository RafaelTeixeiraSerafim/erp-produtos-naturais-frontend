import type { MovimentacaoResponseDTOTipoEnumKey } from "@/generated/sdk/types/MovimentacaoResponseDTO";
export const movementLabels: Record<MovimentacaoResponseDTOTipoEnumKey, string> = {
  ENTRADA_COMPRA: "Entrada de compra", SAIDA_VENDA: "Saída de venda",
  AJUSTE_ENTRADA: "Ajuste de entrada", AJUSTE_SAIDA: "Ajuste de saída",
  TRANSFERENCIA_ENTRADA: "Transferência de entrada", TRANSFERENCIA_SAIDA: "Transferência de saída",
  DEVOLUCAO: "Devolução", DEVOLUCAO_FORNECEDOR: "Devolução ao fornecedor",
};
export function quantity(value?: number) {
  return value === undefined ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}
// Backend LocalDateTime values represent São Paulo wall time; offset timestamps
// are instants. Never let the browser's own timezone interpret an offsetless value.
export function inventoryInstant(value: string) {
  return new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}-03:00`);
}
export function inventoryDay(value?: string) {
  if (!value) return "";
  const date = inventoryInstant(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function timestamp(value?: string) {
  if (!value || !inventoryDay(value)) return "—";
  return inventoryInstant(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
export function matchesIds(row: { idProduto?: string; idProdutoSku?:string; idLoja?: string }, product: string, store: string, sku = "") {
  return (!product || row.idProduto === product) && (!store || row.idLoja === store) && (!sku || row.idProdutoSku === sku);
}
export function inDateRange(value: string | undefined, start: string, end: string) {
  if (!start && !end) return true;
  const day = inventoryDay(value);
  return !!day && (!start || day >= start) && (!end || day <= end);
}
export function matchesQuantity(value: number | undefined, filter: string) {
  return !filter || (value !== undefined && (filter === "positivo" ? value > 0 : filter === "zero" ? value === 0 : filter === "negativo" ? value < 0 : true));
}
export function inventoryLink(path: string, product?: string, store?: string, sku?: string) {
  const params = new URLSearchParams();
  if (product) params.set("idProduto", product);
  if (store) params.set("idLoja", store);
  if (sku) params.set("idProdutoSku", sku);
  return `${path}?${params}`;
}
