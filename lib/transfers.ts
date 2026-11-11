import { z } from "zod";
import type { TransferenciaResponseDTO } from "@/generated/sdk/types/TransferenciaResponseDTO";
import { purchaseLocalDate, saoPauloTimestamp } from "./purchases";
const itemBody = z
  .object({
    id: z.uuid().optional(),
    idProdutoSku: z.uuid(),
    quantidade: z.number(),
  })
  .strict();
export const transferBodySchema = z
  .object({
    idLojaOrigem: z.uuid(),
    idLojaDestino: z.uuid(),
    dataTransferencia: z.string().optional(),
    observacao: z.string().optional(),
    itens: z.array(itemBody),
  })
  .strict();
export const transferDraftSchema = z
  .object({
    idLojaOrigem: z.string(),
    idLojaDestino: z.string(),
    dataTransferencia: z.string(),
    observacao: z.string(),
    baseVersion: z.number().optional(),
    itens: z.array(
      z
        .object({
          id: z.string().optional(),
          idProdutoSku: z.string(),
          quantidade: z.string(),
        })
        .strict(),
    ),
    pending: z
      .object({ key: z.uuid(), body: transferBodySchema })
      .strict()
      .optional(),
  })
  .strict();
export type TransferDraft = z.infer<typeof transferDraftSchema>;
export const blankTransferItem = () => ({ idProdutoSku: "", quantidade: "" });
export function transferValues(row?: TransferenciaResponseDTO): TransferDraft {
  return {
    idLojaOrigem: row?.idLojaOrigem || "",
    idLojaDestino: row?.idLojaDestino || "",
    dataTransferencia: row?.dataTransferencia
      ? purchaseLocalDate(row.dataTransferencia)
      : "",
    observacao: row?.observacao || "",
    baseVersion: row?.versao,
    itens: row?.itens?.map((i) => ({
      id: i.id,
      idProdutoSku: i.idProdutoSku || "",
      quantidade: String(i.quantidade ?? ""),
    })) || [blankTransferItem()],
  };
}
export function transferPayload(d: TransferDraft) {
  if (!d.idLojaOrigem || !d.idLojaDestino || d.idLojaOrigem === d.idLojaDestino)
    throw new Error("Selecione duas lojas distintas.");
  if (
    !d.itens.length ||
    new Set(d.itens.map((i) => i.idProdutoSku)).size !== d.itens.length
  )
    throw new Error("Informe itens com produtos únicos.");
  const itens = d.itens.map((i) => {
    if (!/^\d+(?:[.,]\d{1,3})?$/.test(i.quantidade))
      throw new Error("Quantidade positiva com até três casas decimais.");
    const quantidade = Number(i.quantidade.replace(",", "."));
    if (quantidade <= 0 || quantidade >= 100000000000)
      throw new Error("Quantidade fora do limite numeric(14,3).");
    return { id: i.id, idProdutoSku: i.idProdutoSku, quantidade };
  });
  return transferBodySchema.parse({
    idLojaOrigem: d.idLojaOrigem,
    idLojaDestino: d.idLojaDestino,
    dataTransferencia: d.dataTransferencia
      ? saoPauloTimestamp(d.dataTransferencia)
      : undefined,
    observacao: d.observacao,
    itens,
  });
}
export const transferHint =
  "Rascunhos não reservam estoque. A confirmação move o estoque imediatamente da origem para o destino e torna o documento somente leitura.";
