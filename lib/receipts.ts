import { z } from "zod";
import type { CompraResponseDTO } from "@/generated/sdk/types/CompraResponseDTO";
import type { RecebimentoCompraResponseDTO } from "@/generated/sdk/types/RecebimentoCompraResponseDTO";
import type { RecebimentoCompraRequestDTO } from "@/generated/sdk/types/RecebimentoCompraRequestDTO";
import { decimal, purchaseLocalDate, saoPauloTimestamp } from "./purchases";
import { uuid } from "./validation";
const text = z.string();
const payloadSchema = z.object({ idCompra: text, idUsuario: text, versao: z.number().int().nonnegative().optional(), dataRecebimento: text.optional(), status: z.literal("RASCUNHO"), observacao: text.optional(), itens: z.array(z.object({ id: text.optional(), idItemCompra: text, idProdutoSku: text, quantidade: z.number().positive(), observacao: text.optional() }).strict()) }).strict();
export const receiptDraftSchema = z.object({
  idUsuario: text, dataRecebimento: text, observacao: text, baseVersion: z.number().int().optional(),
  itens: z.array(z.object({ id: text.optional(), idItemCompra: text, idProdutoSku: text, selecionado: z.boolean(), quantidade: text, observacao: text }).strict()),
  pending: z.object({ key: text, body: payloadSchema }).strict().optional(),
}).strict();
export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;
export const receiptStatus = (s?: string) => s === "RASCUNHO" ? "Rascunho" : s === "CONCLUIDO" ? "Concluído" : s || "—";
export const canReceive = (c: CompraResponseDTO) => ["RASCUNHO", "PARCIALMENTE_RECEBIDA"].includes(c.status || "");
export const formatQuantityInput = (n: number) => n.toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 3 });
export const outstanding = (i: NonNullable<CompraResponseDTO["itens"]>[number]) => Math.round(((i.quantidade || 0) - (i.quantidadeRecebida || 0)) * 1000) / 1000;
export function receiptValues(c: CompraResponseDTO, r?: RecebimentoCompraResponseDTO): ReceiptDraft {
  return { idUsuario: r?.idUsuario || "", dataRecebimento: purchaseLocalDate(r?.dataRecebimento), observacao: r?.observacao || "", ...(r ? { baseVersion: r.versao } : {}),
    itens: (c.itens || []).filter(i => outstanding(i) > 0 || r?.itens?.some(x => x.idItemCompra === i.id)).map(i => {
      const saved = r?.itens?.find(x => x.idItemCompra === i.id);
      return { ...(saved?.id ? { id: saved.id } : {}), idItemCompra: i.id || "", idProdutoSku: i.idProdutoSku || "", selecionado: !!saved,
        quantidade: saved?.quantidade === undefined ? "" : formatQuantityInput(saved.quantidade), observacao: saved?.observacao || "" };
    }) };
}
export function receiptPayload(d: ReceiptDraft, c: CompraResponseDTO, r?: RecebimentoCompraResponseDTO): RecebimentoCompraRequestDTO {
  if (!canReceive(c)) throw new Error("Compra cancelada ou totalmente recebida.");
  if (!uuid.safeParse(d.idUsuario).success) throw new Error("Selecione um operador válido.");
  if (r && (r.status !== "RASCUNHO" || r.versao !== d.baseVersion)) throw new Error("O recebimento mudou. Compare a versão atual antes de salvar.");
  if (d.observacao.length > 255) throw new Error("A observação deve ter até 255 caracteres.");
  const selected = d.itens.filter(i => i.selecionado);
  if (!selected.length) throw new Error("Selecione pelo menos um item.");
  const seen = new Set<string>();
  return { idCompra: c.id!, idUsuario: d.idUsuario, ...(r ? { versao: d.baseVersion } : {}), status: "RASCUNHO", observacao: d.observacao,
    ...(d.dataRecebimento ? { dataRecebimento: r?.dataRecebimento && d.dataRecebimento === purchaseLocalDate(r.dataRecebimento) ? r.dataRecebimento : saoPauloTimestamp(d.dataRecebimento) } : {}),
    itens: selected.map(i => {
      const ordered = c.itens?.find(x => x.id === i.idItemCompra && x.idProdutoSku === i.idProdutoSku);
      if (!ordered || seen.has(i.idItemCompra)) throw new Error("Item indisponível ou duplicado. Recarregue a compra e revise os valores.");
      seen.add(i.idItemCompra);
      const q = decimal(i.quantidade, 3, true);
      if (q > BigInt(Math.round(outstanding(ordered) * 1000))) throw new Error("Quantidade excede o pendente. Revise os valores preservados.");
      if (i.observacao.length > 255) throw new Error("A observação do item deve ter até 255 caracteres.");
      return { ...(i.id ? { id: i.id } : {}), idItemCompra: i.idItemCompra, idProdutoSku: i.idProdutoSku, quantidade: Number(q) / 1000, observacao: i.observacao };
    }) };
}
