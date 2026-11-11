"use client";
import { useListarProdutosSku } from "@/generated/sdk/hooks/useListarProdutosSku";
import { useListarProdutos } from "@/generated/sdk/hooks/useListarProdutos";
import type { ProdutoSkuResponseDTO } from "@/generated/sdk/types/ProdutoSkuResponseDTO";
export function skuLabel(s: ProdutoSkuResponseDTO) {
  return [s.nomeProduto, s.descricaoApresentacao, s.sku, s.siglaUnidadeMedida].filter(Boolean).join(" · ");
}
export function snapshotLabel(s: {idProdutoSku?:string;nomeProduto?:string;produtoNome?:string; skuCodigoSnapshot?:string; skuApresentacaoSnapshot?:string; unidadeSiglaSnapshot?:string}, name?:string) {
  return [name || s.nomeProduto || s.produtoNome,s.skuApresentacaoSnapshot,s.skuCodigoSnapshot,s.unidadeSiglaSnapshot].filter(Boolean).join(" · ") || s.idProdutoSku || "SKU indisponível";
}
export function useSkuCatalog(options: {query?:{enabled?:boolean;refetchOnMount?:"always" | boolean;staleTime?:number}} = {}) {
  const query = useListarProdutosSku({}, options);
  const products = useListarProdutos(options);
  return {...query, refetch: async()=>{const [result]=await Promise.all([query.refetch(),products.refetch()]);return result;}, isFetching:query.isFetching || products.isFetching, isPending:query.isPending || products.isPending, isSuccess:query.isSuccess && products.isSuccess, isError:query.isError || products.isError, error:query.error || products.error, data:query.data?.map(s=>({...s, nome:skuLabel(s), status:products.data?.find(p=>p.id===s.idProduto)?.status === "ATIVO" ? s.status : "INATIVO"}))};
}
