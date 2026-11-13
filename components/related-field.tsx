"use client";
import { useCan } from "./auth";
import { Button } from "./ui/button";
import { Plus, RefreshCw } from "lucide-react";
export type LookupState = {isFetching:boolean;isError:boolean;refetch:()=>unknown};
export const related = {
  idCliente: {href:"/clientes?novo=1",permission:"customers.write",label:"cliente"},
  idFornecedor: {href:"/fornecedores?novo=1",permission:"suppliers.write",label:"fornecedor"},
  idLoja: {href:"/lojas?novo=1",permission:"stores.manage",label:"loja"},
  idCategoria: {href:"/categorias?novo=1",permission:"catalog.write",label:"categoria"},
  idUnidadeMedida: {href:"/unidades-medida?novo=1",permission:"catalog.write",label:"unidade de medida"},
  idProduto: {href:"/produtos/novo",permission:"catalog.write",label:"produto agrupador"},
  idProdutoSku: {href:"/skus/novo",permission:"catalog.write",label:"SKU"},
} as const;
export function RelatedField({field,query}:{field:keyof typeof related;query:LookupState}) {
  const config=related[field],can=useCan(config.permission);
  return <span className="inline-flex shrink-0 items-center gap-1">
    {can && <Button asChild variant="ghost" size="icon"><a href={config.href} target="_blank" rel="noopener noreferrer" aria-label={`Cadastrar ${config.label} em nova aba`}><Plus size={15}/></a></Button>}
    <Button type="button" variant="ghost" size="icon" aria-label={`Atualizar ${config.label}`} disabled={query.isFetching} onClick={e=>{e.preventDefault();void query.refetch();}}><RefreshCw size={14} className={query.isFetching?"animate-spin":""}/></Button>
  </span>;
}
export function RelatedStatus({query}:{query:LookupState}) {
  return <>{query.isFetching && <small role="status" className="block">Carregando…</small>}{query.isError && <small role="alert" className="block">Falha ao carregar. Atualize este campo.</small>}</>;
}
