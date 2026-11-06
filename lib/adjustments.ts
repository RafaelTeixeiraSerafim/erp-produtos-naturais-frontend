import { z } from "zod";
import type { AjusteResponseDTO } from "@/generated/sdk/types/AjusteResponseDTO";

const itemBody = z
  .object({
    id: z.uuid().optional(),
    idProduto: z.uuid(),
    quantidade: z.number(),
    tipo: z.enum(["AJUSTE_ENTRADA","AJUSTE_SAIDA"]),
    observacao: z.string(),
  })
  .strict();
export const adjustmentBodySchema = z
  .object({
    idLoja: z.uuid(),
    justificativa: z.string(),
    itens: z.array(itemBody),
  })
  .strict();
export const adjustmentDraftSchema = z
  .object({
    idLoja: z.string(),
    justificativa: z.string(),
    baseVersion: z.number().optional(),
    itens: z.array(
      z
        .object({
          id: z.string().optional(),
          idProduto: z.string(),
          quantidade: z.string(),
          tipo: z.enum(["AJUSTE_ENTRADA","AJUSTE_SAIDA"]),
          observacao: z.string(),
        })
        .strict(),
    ),
    pending: z
      .object({ key: z.uuid(), body: adjustmentBodySchema })
      .strict()
      .optional(),
  })
  .strict();
export type AdjustmentDraft = z.infer<typeof adjustmentDraftSchema>;
export const blankAdjustmentItem = () => ({ idProduto: "", quantidade: "", tipo: "AJUSTE_ENTRADA" as const, observacao: "" });
export function adjustmentValues(row?: AjusteResponseDTO): AdjustmentDraft {
  return {
    idLoja: row?.idLoja || "",
    justificativa: row?.justificativa || "",
    baseVersion: row?.versao,
    itens: row?.itens?.map((i) => ({
      id: i.id,
      idProduto: i.idProduto || "",
      quantidade: String(i.quantidade ?? ""),
      tipo: i.tipo === "AJUSTE_SAIDA" ? "AJUSTE_SAIDA" : "AJUSTE_ENTRADA",
      observacao: i.observacao || "",
    })) || [blankAdjustmentItem()],
  };
}
export function adjustmentPayload(d: AdjustmentDraft) {
  if (!d.idLoja || !d.justificativa.trim()) throw new Error("Selecione loja e informe justificativa.");
  if (
    !d.itens.length ||
    new Set(d.itens.map((i) => i.idProduto)).size !== d.itens.length
  )
    throw new Error("Informe itens com produtos únicos.");
  const itens = d.itens.map((i) => {
    if (!/^\d+(?:[.,]\d{1,3})?$/.test(i.quantidade))
      throw new Error("Quantidade positiva com até três casas decimais.");
    const quantidade = Number(i.quantidade.replace(",", "."));
    if (quantidade <= 0 || quantidade >= 100000000000)
      throw new Error("Quantidade fora do limite numeric(14,3).");
    return { id: i.id, idProduto: i.idProduto, quantidade, tipo: i.tipo, observacao: i.observacao };
  });
  return adjustmentBodySchema.parse({
    idLoja: d.idLoja,
    justificativa: d.justificativa,
    itens,
  });
}
export const adjustmentHint = "Rascunhos não reservam estoque. A confirmação revalida os saldos atuais e torna o ajuste somente leitura.";
