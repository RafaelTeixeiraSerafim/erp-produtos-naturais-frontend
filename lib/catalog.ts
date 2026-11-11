import { customerSchema } from "./validation";
import { criarCliente } from "@/generated/sdk/clients/criarCliente";
import { atualizarCliente } from "@/generated/sdk/clients/atualizarCliente";
import { excluirCliente } from "@/generated/sdk/clients/excluirCliente";
import { criarFornecedor } from "@/generated/sdk/clients/criarFornecedor";
import { atualizarFornecedor } from "@/generated/sdk/clients/atualizarFornecedor";
import { excluirFornecedor } from "@/generated/sdk/clients/excluirFornecedor";
import {
  supplierSchema,
  categorySchema,
  unitSchema,
  storeSchema,
  productSchema,
  skuSchema,
  assignmentSchema,
  priceSchema,
  pricePayload,
} from "./validation";
import type { z } from "zod";
import { criarCategoria } from "@/generated/sdk/clients/criarCategoria";
import { excluirCategoria } from "@/generated/sdk/clients/excluirCategoria";
import { atualizarCategoria } from "@/generated/sdk/clients/atualizarCategoria";
import { criarUnidadeMedida } from "@/generated/sdk/clients/criarUnidadeMedida";
import { excluirUnidadeMedida } from "@/generated/sdk/clients/excluirUnidadeMedida";
import { atualizarUnidadeMedida } from "@/generated/sdk/clients/atualizarUnidadeMedida";
import { criarLoja } from "@/generated/sdk/clients/criarLoja";
import { excluirLoja } from "@/generated/sdk/clients/excluirLoja";
import { atualizarLoja } from "@/generated/sdk/clients/atualizarLoja";
import { criarProduto } from "@/generated/sdk/clients/criarProduto";
import { excluirProduto } from "@/generated/sdk/clients/excluirProduto";
import { atualizarProduto } from "@/generated/sdk/clients/atualizarProduto";
import { criarProdutoSku } from "@/generated/sdk/clients/criarProdutoSku";
import { excluirProdutoSku } from "@/generated/sdk/clients/excluirProdutoSku";
import { atualizarProdutoSku } from "@/generated/sdk/clients/atualizarProdutoSku";
import { criarProdutoLoja } from "@/generated/sdk/clients/criarProdutoLoja";
import { excluirProdutoLoja } from "@/generated/sdk/clients/excluirProdutoLoja";
import { criarPrecoProdutoLoja } from "@/generated/sdk/clients/criarPrecoProdutoLoja";
import { excluirPrecoProdutoLoja } from "@/generated/sdk/clients/excluirPrecoProdutoLoja";
import { atualizarPrecoProdutoLoja } from "@/generated/sdk/clients/atualizarPrecoProdutoLoja";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "datetime-local" | "date";
  optional?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
};
export type Values = Record<string, string>;
const status: Field = {
  name: "status",
  label: "Status",
  type: "select",
  options: [
    { value: "ATIVO", label: "Ativo" },
    { value: "INATIVO", label: "Inativo" },
  ],
};
export const fields = {
  customers: [
    { name: "nome", label: "Nome" },
    { name: "cpf", label: "CPF", optional: true },
    {
      name: "dataNascimento",
      label: "Data de nascimento",
      type: "date",
      optional: true,
    },
  ],
  suppliers: [
    { name: "nomeFantasia", label: "Nome fantasia" },
    { name: "razaoSocial", label: "Razão social" },
    { name: "estado", label: "Estado", hint: "UF com duas letras." },
    { name: "cidade", label: "Cidade" },
    { name: "bairro", label: "Bairro" },
    { name: "complemento", label: "Complemento", optional: true },
    { name: "cnpj", label: "CNPJ", optional: true },
    { name: "cpf", label: "CPF", optional: true },
  ],
  categories: [{ name: "nome", label: "Nome" }],
  units: [
    { name: "nome", label: "Nome" },
    { name: "sigla", label: "Sigla" },
  ],
  stores: [
    { name: "nomeFantasia", label: "Nome fantasia" },
    { name: "razaoSocial", label: "Razão social" },
    { name: "cnpj", label: "CNPJ" },
    { name: "estado", label: "Estado" },
    { name: "cidade", label: "Cidade" },
    { name: "bairro", label: "Bairro" },
    { name: "numero", label: "Número" },
    { name: "complemento", label: "Complemento", optional: true },
  ],
  products: [
    { name: "nome", label: "Nome do produto" },
    { name: "idCategoria", label: "Categoria", type: "select" },
    status,
    { name: "descricao", label: "Descrição", type: "textarea", optional: true },
  ],
  skus: [
    {name:"idProduto",label:"Produto agrupador",type:"select"},
    { name: "idUnidadeMedida", label: "Unidade de medida", type: "select" },
    {
      name: "tipoVenda",
      label: "Tipo de venda",
      type: "select",
      options: [
        { value: "UNIDADE", label: "Unidade" },
        { value: "PESO", label: "Peso" },
      ],
    },

    { name: "sku", label: "SKU" },
    status,
    {
      name: "ean13",
      label: "EAN-13",
      optional: true,
      hint: "13 dígitos, quando informado.",
    },
    {
      name: "dun14",
      label: "DUN-14",
      optional: true,
      hint: "14 dígitos, quando informado.",
    },
    {
      name: "descricaoApresentacao",
      label: "Descrição da apresentação",
      type: "textarea",
    },
  ],
  assignments: [{ name: "idLoja", label: "Loja", type: "select" }],
  prices: [
    { name: "idLoja", label: "Loja", type: "select" },
    {
      name: "preco",
      label: "Preço (R$)",
      hint: "Use vírgula para centavos. Ex.: 12,90.",
    },
    {
      name: "dataInicio",
      label: "Início da validade",
      type: "datetime-local",
      optional: true,
    },
    {
      name: "dataFim",
      label: "Fim da validade",
      type: "datetime-local",
      optional: true,
    },
  ],
} satisfies Record<string, Field[]>;
export type Resource = keyof typeof fields;
export const resourceNames: Record<
  Resource,
  { url: string; plural: string; singular: string }
> = {
  customers: { url: "clientes", plural: "Clientes", singular: "cliente" },
  suppliers: {
    url: "fornecedores",
    plural: "Fornecedores",
    singular: "fornecedor",
  },
  categories: {
    url: "categorias",
    plural: "Categorias",
    singular: "categoria",
  },
  units: {
    url: "unidades-medida",
    plural: "Unidades de medida",
    singular: "unidade de medida",
  },
  stores: { url: "lojas", plural: "Lojas", singular: "loja" },
  products: { url: "produtos", plural: "Produtos", singular: "produto" },
  skus: { url: "produtos-sku", plural: "SKUs", singular: "SKU" },
  assignments: {
    url: "skus-loja",
    plural: "Lojas vinculadas",
    singular: "vínculo",
  },
  prices: {
    url: "skus-precos-loja",
    plural: "Preços por loja",
    singular: "preço",
  },
};
export const schemas: Record<Resource, z.ZodType> = {
  customers: customerSchema,
  suppliers: supplierSchema,
  categories: categorySchema,
  units: unitSchema,
  stores: storeSchema,
  products: productSchema,
  skus: skuSchema,
  assignments: assignmentSchema,
  prices: priceSchema,
};
export function initialValues(
  resource: Resource,
  row?: Record<string, unknown>,
): Values {
  return Object.fromEntries(
    (fields[resource] as Field[]).map((f) => [
      f.name,
      row?.[f.name] === undefined
        ? f.name === "status"
          ? "ATIVO"
          : f.name === "tipoVenda"
            ? "UNIDADE"
            : ""
        : String(row[f.name] ?? ""),
    ]),
  );
}
export async function saveRecord(
  resource: Resource,
  values: Values,
  id?: string,
) {
  switch (resource) {
    case "customers": {
      const body = customerSchema.parse(values);
      return id
        ? atualizarCliente({ path: { id }, body }).unwrap()
        : criarCliente({ body }).unwrap();
    }
    case "suppliers": {
      const body = supplierSchema.parse(values);
      return id
        ? atualizarFornecedor({ path: { id }, body }).unwrap()
        : criarFornecedor({ body }).unwrap();
    }
    case "categories": {
      const body = categorySchema.parse(values);
      return id
        ? atualizarCategoria({ path: { id }, body }).unwrap()
        : criarCategoria({ body }).unwrap();
    }
    case "units": {
      const body = unitSchema.parse(values);
      return id
        ? atualizarUnidadeMedida({ path: { id }, body }).unwrap()
        : criarUnidadeMedida({ body }).unwrap();
    }
    case "stores": {
      const body = storeSchema.parse(values);
      return id
        ? atualizarLoja({ path: { id }, body }).unwrap()
        : criarLoja({ body }).unwrap();
    }
    case "products": {
      const body = productSchema.parse(values);
      return id
        ? atualizarProduto({ path: { id }, body }).unwrap()
        : criarProduto({ body }).unwrap();
    }
    case "skus": {
      const body = skuSchema.parse(values);
      return id
        ? atualizarProdutoSku({ path: { id }, body }).unwrap()
        : criarProdutoSku({ body }).unwrap();
    }
    case "assignments": {
      const body = assignmentSchema.parse(values);
      return criarProdutoLoja({ body }).unwrap();
    }
    case "prices": {
      const body = pricePayload(priceSchema.parse(values));
      return id
        ? atualizarPrecoProdutoLoja({ path: { id }, body }).unwrap()
        : criarPrecoProdutoLoja({ body }).unwrap();
    }
  }
}
export async function deleteRecord(resource: Resource, id: string) {
  switch (resource) {
    case "customers":
      return excluirCliente({ path: { id } }).unwrap();
    case "suppliers":
      return excluirFornecedor({ path: { id } }).unwrap();
    case "categories":
      return excluirCategoria({ path: { id } }).unwrap();
    case "units":
      return excluirUnidadeMedida({ path: { id } }).unwrap();
    case "stores":
      return excluirLoja({ path: { id } }).unwrap();
    case "products":
      return excluirProduto({ path: { id } }).unwrap();
    case "skus":
      return excluirProdutoSku({ path: { id } }).unwrap();
    case "assignments":
      return excluirProdutoLoja({ path: { id } }).unwrap();
    case "prices":
      return excluirPrecoProdutoLoja({ path: { id } }).unwrap();
  }
}
