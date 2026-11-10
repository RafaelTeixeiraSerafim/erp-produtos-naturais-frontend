import { z } from "zod";
import type { ProdutoRequestDTO } from "@/generated/sdk/types/ProdutoRequestDTO";
import type { ProdutoPrecoLojaRequestDTO } from "@/generated/sdk/types/ProdutoPrecoLojaRequestDTO";
export const required = z.string().trim().min(1, "Campo obrigatório.");
export const uuid = z.string().uuid("Selecione um registro válido.");
export const productSchema = z.object({
  nome: required,
  idCategoria: uuid,
  descricao: z.string(),
  status: z.enum(["ATIVO", "INATIVO"]),
});
export const skuSchema = z.object({
  idProduto: uuid,
  sku: required,
  status: z.enum(["ATIVO", "INATIVO"]),
  ean13: z
    .string()
    .refine((v) => !v || /^\d{13}$/.test(v), "Informe 13 dígitos."),
  dun14: z
    .string()
    .refine((v) => !v || /^\d{14}$/.test(v), "Informe 14 dígitos."),
  descricaoApresentacao: required,
  idUnidadeMedida: uuid,
  tipoVenda: z.enum(["UNIDADE", "PESO"]),
});
export const storeSchema = z.object({
  nomeFantasia: required,
  razaoSocial: required,
  estado: required,
  cidade: required,
  bairro: required,
  numero: required,
  complemento: z.string(),
  cnpj: required,
});
export const categorySchema = z.object({ nome: required });
export const unitSchema = z.object({ nome: required, sigla: required });
export const assignmentSchema = z.object({ idProdutoSku: uuid, idLoja: uuid });
export function parseMoney(value: string): number {
  const v = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(v))
    throw new Error(
      "Informe um valor não negativo, com até duas casas decimais (ex.: 12,90).",
    );
  const result = Number(v.replaceAll(".", "").replace(",", "."));
  if (
    !Number.isFinite(result) ||
    !Number.isSafeInteger(Math.round(result * 100))
  )
    throw new Error("Valor inválido.");
  return Math.round(result * 100) / 100;
}
export const priceSchema = z
  .object({
    idProdutoSku: uuid,
    idLoja: uuid,
    preco: required.refine((v) => {
      try {
        parseMoney(v);
        return true;
      } catch {
        return false;
      }
    }, "Informe um valor não negativo (ex.: 12,90)."),
    dataInicio: z.string(),
    dataFim: z.string(),
  })
  .superRefine((v, ctx) => {
    for (const field of ["dataInicio", "dataFim"] as const)
      if (v[field] && !Number.isFinite(new Date(v[field]).getTime()))
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "Data inválida.",
        });
    if (
      v.dataInicio &&
      v.dataFim &&
      new Date(v.dataFim) < new Date(v.dataInicio)
    )
      ctx.addIssue({
        code: "custom",
        path: ["dataFim"],
        message: "O fim deve ser igual ou posterior ao início.",
      });
  });
export function productPayload(
  v: z.infer<typeof productSchema>,
): ProdutoRequestDTO {
  return productSchema.parse(v);
}
export function pricePayload(
  v: z.infer<typeof priceSchema>,
): ProdutoPrecoLojaRequestDTO {
  const parsed = priceSchema.parse(v);
  return {
    ...parsed,
    preco: parseMoney(parsed.preco),
    dataInicio: parsed.dataInicio
      ? new Date(parsed.dataInicio).toISOString()
      : undefined,
    dataFim: parsed.dataFim
      ? new Date(parsed.dataFim).toISOString()
      : undefined,
  };
}
export const currency = (v?: number) =>
  v === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);
export const dateLabel = (v?: string) =>
  v ? new Date(v).toLocaleString("pt-BR") : "Sem limite";
export function localDate(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export const supplierSchema = z.object({
  nomeFantasia: required,
  razaoSocial: required,
  estado: required
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/, "Informe a UF com duas letras.")),
  cidade: required,
  bairro: required,
  complemento: z.string().trim().optional(),
  cnpj: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
});

// Calendar dates remain strings throughout the customer workflow.
export const customerSchema = z.object({
  nome: required,
  cpf: z.string().trim().optional(),
  dataNascimento: z
    .string()
    .optional()
    .refine(
      (v) =>
        !v ||
        (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
          Number.isFinite(Date.parse(`${v}T00:00:00Z`)) &&
          new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v),
      "Data inválida.",
    )
    .transform((v) => v || undefined),
});
export const calendarDateLabel = (v?: string) =>
  v ? v.split("-").reverse().join("/") : "—";
