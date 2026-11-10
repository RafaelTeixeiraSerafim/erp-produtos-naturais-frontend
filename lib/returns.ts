import { z } from "zod";
import { listarVendas } from "@/generated/sdk/clients/listarVendas";
import { listarCompras } from "@/generated/sdk/clients/listarCompras";
import type { DevolucaoClienteResponseDTO } from "@/generated/sdk/types/DevolucaoClienteResponseDTO";
import type { DevolucaoFornecedorResponseDTO } from "@/generated/sdk/types/DevolucaoFornecedorResponseDTO";
import type { VendaResponseDTO } from "@/generated/sdk/types/VendaResponseDTO";
import type { CompraResponseDTO } from "@/generated/sdk/types/CompraResponseDTO";
import { listarDevolucoesClientes } from "@/generated/sdk/clients/listarDevolucoesClientes";
import { listarDevolucoesFornecedores } from "@/generated/sdk/clients/listarDevolucoesFornecedores";
import { buscarDevolucaoClientePorId } from "@/generated/sdk/clients/buscarDevolucaoClientePorId";
import { buscarDevolucaoFornecedorPorId } from "@/generated/sdk/clients/buscarDevolucaoFornecedorPorId";
import { criarDevolucaoCliente } from "@/generated/sdk/clients/criarDevolucaoCliente";
import { criarDevolucaoFornecedor } from "@/generated/sdk/clients/criarDevolucaoFornecedor";
import { atualizarDevolucaoCliente } from "@/generated/sdk/clients/atualizarDevolucaoCliente";
import { atualizarDevolucaoFornecedor } from "@/generated/sdk/clients/atualizarDevolucaoFornecedor";
import { concluirDevolucaoCliente } from "@/generated/sdk/clients/concluirDevolucaoCliente";
import { concluirDevolucaoFornecedor } from "@/generated/sdk/clients/concluirDevolucaoFornecedor";
import { cancelarDevolucaoCliente } from "@/generated/sdk/clients/cancelarDevolucaoCliente";
import { cancelarDevolucaoFornecedor } from "@/generated/sdk/clients/cancelarDevolucaoFornecedor";
export type ReturnKind = "clientes" | "fornecedores";
export const returnPath = (kind: ReturnKind) => `/${kind === "clientes" ? "vendas" : "compras"}/devolucoes`;
export const returnHint = "Registra quantidades e efeitos no estoque da loja de origem. Nenhum reembolso, crédito ou acerto financeiro é registrado.";
export type ReturnRecord = Omit<DevolucaoClienteResponseDTO | DevolucaoFornecedorResponseDTO,"itens"> & { idOrigem?: string; itens?: ReturnItem[] };
export type ReturnItem = { id?: string; idItemOrigem?: string; idProdutoSku?: string; skuCodigoSnapshot?:string; skuApresentacaoSnapshot?:string; unidadeSiglaSnapshot?:string; nomeProduto?: string; quantidade?: number; retornaAoEstoque?: boolean; observacao?: string; unidadeSigla?: string; unidadeOrigem?: string };
export function normalizeReturn(r: DevolucaoClienteResponseDTO | DevolucaoFornecedorResponseDTO): ReturnRecord {
  return { ...r, idOrigem: "idVenda" in r ? r.idVenda : (r as DevolucaoFornecedorResponseDTO).idCompra,
    itens: r.itens?.map(i => ({ ...i, idItemOrigem: "idItemVenda" in i ? i.idItemVenda : (i as NonNullable<DevolucaoFornecedorResponseDTO["itens"]>[number]).idItemCompra })) };
}
export async function listReturns(kind: ReturnKind, source?: string) {
  return (kind === "clientes" ? await listarDevolucoesClientes({ query: { idVenda: source } }).unwrap() : await listarDevolucoesFornecedores({ query: { idCompra: source } }).unwrap()).map(normalizeReturn);
}
export async function getReturn(kind: ReturnKind, id: string) {
  return normalizeReturn(await (kind === "clientes" ? buscarDevolucaoClientePorId({ path: { id } }) : buscarDevolucaoFornecedorPorId({ path: { id } })).unwrap());
}
const rowSchema = z.object({ id:z.string().optional(), idItemOrigem:z.string(), idProdutoSku:z.string(), quantidade:z.string(), retornaAoEstoque:z.boolean(), observacao:z.string() }).strict();
const bodyRow = z.object({ id:z.uuid().optional(), idItemOrigem:z.uuid(), idProdutoSku:z.uuid(), quantidade:z.number(), retornaAoEstoque:z.boolean(), observacao:z.string() }).strict();
const bodySchema = z.object({ idOrigem:z.uuid(), motivo:z.string(), observacao:z.string(), itens:z.array(bodyRow) }).strict();
export const returnDraftSchema = z.object({ idOrigem:z.string(), motivo:z.string(), observacao:z.string(), baseVersion:z.number().optional(), itens:z.array(rowSchema), pending:z.object({ key:z.uuid(), body:bodySchema }).strict().optional() }).strict();
export type ReturnDraft = z.infer<typeof returnDraftSchema>;
export type ReturnBody = z.infer<typeof bodySchema>;
export type ReturnSource = { id?:string; idLoja?:string; nomeLoja?:string; eligible:boolean; itens:{ id?:string; idProdutoSku?:string; skuCodigoSnapshot?:string; skuApresentacaoSnapshot?:string; unidadeSiglaSnapshot?:string; nomeProduto?:string; quantidade?:number; quantidadeDevolvida?:number; quantidadeDevolvivel?:number; devolucaoLegadaPendente?:boolean }[] };
export function returnSource(kind:ReturnKind, s:VendaResponseDTO | CompraResponseDTO): ReturnSource {
  return { id:s.id, idLoja:s.idLoja, nomeLoja:"nomeLoja" in s?s.nomeLoja:undefined, eligible:kind==="clientes" ? s.status==="CONCLUIDA" && !(s as VendaResponseDTO).legado : ["RECEBIDA","PARCIALMENTE_RECEBIDA"].includes(s.status || ""),
    itens:(s.itens || []).map(i=>({...i,quantidade:kind==="clientes"?i.quantidade:(i as NonNullable<CompraResponseDTO["itens"]>[number]).quantidadeRecebida})) };
}
export function returnValues(source:ReturnSource, record?:ReturnRecord): ReturnDraft {
  return { idOrigem:source.id || "", motivo:record?.motivo || "", observacao:record?.observacao || "", baseVersion:record?.versao,
    itens: record?.itens?.map(i=>({id:i.id,idItemOrigem:i.idItemOrigem || "",idProdutoSku:i.idProdutoSku || "",quantidade:String(i.quantidade ?? ""),retornaAoEstoque:i.retornaAoEstoque ?? true,observacao:i.observacao || ""})) || source.itens.map(i=>({idItemOrigem:i.id || "",idProdutoSku:i.idProdutoSku || "",quantidade:"",retornaAoEstoque:true,observacao:""})) };
}
export function returnPayload(d:ReturnDraft, kind:ReturnKind):ReturnBody {
  if(!d.motivo.trim() || d.motivo.length>255)throw new Error("Informe o motivo (até 255 caracteres).");
  const unique=new Set<string>();
  const itens=d.itens.filter(i=>i.quantidade.trim()).map(i=>{
    const q=i.quantidade.trim();
    if(!/^\d+(?:[.,]\d{1,3})?$/.test(q) || Number(q.replace(",","."))<=0 || Number(q.replace(",","."))>=1e11)throw new Error("Informe quantidades positivas, até três casas decimais.");
    if(kind==="clientes" && !i.retornaAoEstoque && !i.observacao.trim())throw new Error("Informe a observação para itens sem retorno ao estoque.");
    const key=i.idItemOrigem+(kind==="clientes"?i.retornaAoEstoque:"");if(unique.has(key))throw new Error("Item de origem e disposição duplicados.");unique.add(key);
    return {...i,quantidade:Number(q.replace(",","."))};
  });
  if(!itens.length)throw new Error("Informe ao menos uma quantidade para devolver.");
  return bodySchema.parse({idOrigem:d.idOrigem,motivo:d.motivo,observacao:d.observacao,itens});
}
export async function saveReturn(kind:ReturnKind,body:ReturnBody,id?:string,version?:number,key?:string) {
  const common={ motivo:body.motivo,observacao:body.observacao, ...(id?{versao:version}:{}) };
  if(kind==="clientes") {
    const data={...common,idVenda:body.idOrigem,itens:body.itens.map(({idItemOrigem,...i})=>({...i,idItemVenda:idItemOrigem}))};
    return normalizeReturn(await (id?atualizarDevolucaoCliente({path:{id},body:data}):criarDevolucaoCliente({headers:{"Idempotency-Key":key!},body:data})).unwrap());
  }
  const data={...common,idCompra:body.idOrigem,itens:body.itens.map(i=>({id:i.id,idItemCompra:i.idItemOrigem,idProdutoSku:i.idProdutoSku,quantidade:i.quantidade,observacao:i.observacao}))};
  return normalizeReturn(await (id?atualizarDevolucaoFornecedor({path:{id},body:data}):criarDevolucaoFornecedor({headers:{"Idempotency-Key":key!},body:data})).unwrap());
}
export async function actReturn(kind:ReturnKind,id:string,version:number,action:"concluir"|"cancelar",motivo:string) {
  const options={path:{id},body:{versao:version,motivo}};
  return normalizeReturn(await (kind==="clientes" ? action==="concluir"?concluirDevolucaoCliente(options):cancelarDevolucaoCliente(options) : action==="concluir"?concluirDevolucaoFornecedor(options):cancelarDevolucaoFornecedor(options)).unwrap());
}

// Keep source documents in their SDK shape in the shared cache. Only the
// observer for the source chooser projects them into return eligibility rows.
export function returnChoicesOptions(kind:ReturnKind) {
  return {
    queryKey:[{url:kind==="clientes"?"/api/vendas":"/api/compras"}],
    queryFn:async()=>kind==="clientes"?await listarVendas().unwrap():await listarCompras().unwrap(),
    select:(rows:(VendaResponseDTO|CompraResponseDTO)[])=>rows.map(s=>returnSource(kind,s)),
  };
}
