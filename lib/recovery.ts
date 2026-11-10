import { z } from "zod";
import type { CompraResponseDTO } from "@/generated/sdk/types/CompraResponseDTO";
import { draftValues } from "./purchases";
const text = z.string();
const item = { idProdutoSku: text, quantidade: text, desconto: text };
export const purchaseDraftSchema = z.object({
  idFornecedor: text, idLoja: text, dataCompra: text, observacao: text,
  itens: z.array(z.object({ ...item, id: text.optional(), custoUnitario: text }).strict()),
}).strict();
export const saleDraftSchema = z.object({
  idCliente: text, idUsuario: text, idLoja: text, dataVenda: text, observacao: text.optional(), baseVersion: z.number().int().nonnegative().optional(),
  pending: z.object({ key:z.uuid(), body:z.object({ idCliente:z.uuid(), idUsuario:z.uuid().optional(), idLoja:z.uuid(), dataVenda:text.optional(), observacao:text.optional(), itens:z.array(z.object({ id:z.uuid().optional(), idProdutoSku:z.uuid(), quantidade:z.number(), precoUnitario:z.number(), desconto:z.number().optional() }).strict()) }).strict() }).strict().optional(),
  itens: z.array(z.object({ ...item, id:text.optional(), precoUnitario: text }).strict()),
}).strict();
export const lifetime = 7 * 24 * 60 * 60 * 1000;
export const recoveryKey = (environment: string, user: string, context: string) => `vila:recovery:v2:${environment}:${user}:${context}`;
export function purchaseFingerprint(row: CompraResponseDTO) {
  return JSON.stringify({ status: row.status, idUsuario: row.idUsuario, ...draftValues(row) });
}
export type Recovery<T> = { version: 1; updatedAt: number; revision: string; baseline: string; values: T };
export function decodeRecovery<T>(raw: string, schema: z.ZodType<T>, now = Date.now()): Recovery<T> {
  const record = z.object({ version: z.literal(1), updatedAt: z.number().finite(), revision: text,
    baseline: text, values: schema }).strict().parse(JSON.parse(raw));
  if (record.updatedAt > now || now - record.updatedAt >= lifetime) throw new Error("Cópia expirada ou inválida");
  return record;
}
export function ambiguousSave(error: unknown) {
  const e = error as { status?: number; response?: { status?: number } };
  const status = e?.status || e?.response?.status;
  return !status || status >= 500;
}
