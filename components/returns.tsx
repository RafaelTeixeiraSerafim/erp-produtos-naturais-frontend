"use client";
import { BackLink } from "@/components/ui/back-link";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buscarVendaPorId } from "@/generated/sdk/clients/buscarVendaPorId";
import { buscarCompraPorId } from "@/generated/sdk/clients/buscarCompraPorId";
import { useListarEstoques } from "@/generated/sdk/hooks/useListarEstoques";
import { snapshotLabel } from "@/lib/skus";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { useIdentity } from "./auth";
import { useDocumentRecovery } from "./document-recovery";
import { ambiguousSave } from "@/lib/recovery";
import { listReturns, getReturn, actReturn, saveReturn, returnChoicesOptions, returnSource, returnPath, returnValues, returnPayload, returnDraftSchema, returnHint, type ReturnKind, type ReturnSource, type ReturnRecord, type ReturnDraft } from "@/lib/returns";
import { refreshCatalog } from "@/lib/queries";
import { quantity, timestamp } from "@/lib/inventory";
import { Heading, Loading, Empty, ErrorNotice } from "./feedback";
import { Button } from "./ui/button";
import { Input, Select, Textarea } from "./ui/input";
import { Panel } from "./ui/panel";
import { Table, TableRow, TableHead, TableCell } from "./ui/table";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
const labels:Record<string,string>={RASCUNHO:"Rascunho",CONCLUIDA:"Concluída",CANCELADA:"Cancelada"};
const key=(kind:ReturnKind,id?:string)=>[{url:`/api/devolucoes-${kind}`,id}];
const sourcePath=(kind:ReturnKind,id?:string)=>`/${kind==="clientes"?"vendas":"compras"}/${id}`;
const inputError=(e:unknown)=>e instanceof Error?{status:400,data:{message:e.message}}:e;
function useReturnSource(kind:ReturnKind,id?:string) {
  return useQuery({queryKey:[{url:`/api/${kind==="clientes"?"vendas":"compras"}/${id}`}],enabled:!!id,staleTime:0,refetchOnMount:"always",queryFn:async()=>returnSource(kind,kind==="clientes"?await buscarVendaPorId({path:{id:id!}}).unwrap():await buscarCompraPorId({path:{id:id!}}).unwrap())});
}
export function ReturnList({kind}:{kind:ReturnKind}) {
  const query=useQuery({queryKey:key(kind),queryFn:()=>listReturns(kind)}),params=useSearchParams(),path=usePathname();
  const val=(k:string)=>params.get(k)||"";
  function control(k:string,v:string) {const p=new URLSearchParams(params);if(v)p.set(k,v);else p.delete(k);if(k!=="pagina")p.delete("pagina");window.history.replaceState(null,"",`${path}?${p}`);}
  const rows=(query.data||[]).filter(r=>(!val("status")||r.status===val("status"))&&(!val("loja")||r.idLoja===val("loja"))&&(!val("origem")||r.idOrigem===val("origem"))&&(!val("busca")||(r.motivo||"").toLowerCase().includes(val("busca").toLowerCase())));
  rows.sort((a,b)=>(val("ordem")==="asc"?1:-1)*(String(a.criadoEm).localeCompare(String(b.criadoEm))||String(a.id).localeCompare(String(b.id))));
  const pages=Math.max(1,Math.ceil(rows.length/20)),page=Math.min(pages,Math.max(1,Number(val("pagina"))||1));
  return <><Heading eyebrow={kind==="clientes"?"VENDAS":"COMPRAS"} title="Devoluções" description={returnHint} action={<Button asChild><Link href={`${returnPath(kind)}/nova`}>Nova devolução</Link></Button>}/>
    <Panel><div className="grid grid-cols-3 gap-4 p-5 mobile:grid-cols-1">
      <label>Status<Select value={val("status")} onChange={e=>control("status",e.target.value)}><option value="">Todos</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</Select></label>
      <label>Loja<Select value={val("loja")} onChange={e=>control("loja",e.target.value)}><option value="">Todas</option>{[...new Map(query.data?.map(r=>[r.idLoja,r.lojaNome])).entries()].map(([v,l])=><option key={v} value={v}>{l||v}</option>)}</Select></label>
      <label>Buscar motivo<Input value={val("busca")} onChange={e=>control("busca",e.target.value)}/></label>
      <label>Ordenar por data<Select value={val("ordem")||"desc"} onChange={e=>control("ordem",e.target.value)}><option value="desc">Mais recentes</option><option value="asc">Mais antigas</option></Select></label>
    </div>{query.isPending?<Loading/>:query.isError?<ErrorNotice error={query.error} retry={()=>void query.refetch()}/>:!rows.length?<Empty/>:<Table><thead><TableRow>{["Origem","Loja","Motivo","Status","Data","Ações"].map(x=><TableHead key={x}>{x}</TableHead>)}</TableRow></thead><tbody>{rows.slice((page-1)*20,page*20).map(r=><TableRow key={r.id}><TableCell><Link href={sourcePath(kind,r.idOrigem)}>{r.idOrigem}</Link></TableCell><TableCell>{r.lojaNome}</TableCell><TableCell>{r.motivo}</TableCell><TableCell>{labels[r.status||""]||r.status}{r.legado?" · Legada":""}</TableCell><TableCell>{timestamp(r.criadoEm)}</TableCell><TableCell><Link href={`${returnPath(kind)}/${r.id}`}>Ver devolução</Link></TableCell></TableRow>)}</tbody></Table>}
    <div className="flex items-center justify-end gap-4 p-5"><Button variant="outline" disabled={page<=1} onClick={()=>control("pagina",String(page-1))}>Anterior</Button><span>Página {page} de {pages}</span><Button variant="outline" disabled={page>=pages} onClick={()=>control("pagina",String(page+1))}>Próxima</Button></div></Panel></>;
}
export function SourceReturns({kind,id}:{kind:ReturnKind;id:string}) {
  const user=useIdentity(),allowed=!!user && user.cargo!=="FUNC";
  const source=useReturnSource(kind,allowed?id:undefined),history=useQuery({queryKey:[...key(kind),{source:id}],enabled:allowed,queryFn:()=>listReturns(kind,id)});
  if(!allowed)return null;
  return <section className="my-5 space-y-3" aria-label="Devoluções da origem"><h2 className="text-lg font-semibold">Devoluções</h2>{source.isPending?<Loading/>:source.isError?<ErrorNotice error={source.error} retry={()=>void source.refetch()}/>:source.data&&<><SourceAllowance source={source.data}/>{source.data.eligible&&!source.data.itens.some(i=>i.devolucaoLegadaPendente)&&<Button asChild><Link href={`${returnPath(kind)}/nova?origem=${id}`}>Nova devolução</Link></Button>}</>}
    {history.isError?<ErrorNotice error={history.error} retry={()=>void history.refetch()}/>:history.isPending?<Loading/>:history.data?.length?<ul>{history.data.map(r=><li key={r.id}><Link href={`${returnPath(kind)}/${r.id}`}>{r.motivo} · {labels[r.status||""]} · {timestamp(r.criadoEm)}{r.legado?" · Legada":""}</Link></li>)}</ul>:<p>Nenhuma devolução registrada.</p>}</section>;
}
function SourceAllowance({source}:{source:ReturnSource}) {
  return <><Table><thead><TableRow>{["Item de origem","Vendida / recebida","Devolvida confirmada","Restante devolvível"].map(x=><TableHead key={x}>{x}</TableHead>)}</TableRow></thead><tbody>{source.itens.map(i=><TableRow key={i.id}><TableCell>{snapshotLabel(i,i.nomeProduto)}<small className="block">{i.id}</small></TableCell><TableCell>{quantity(i.quantidade)}</TableCell><TableCell>{quantity(i.quantidadeDevolvida)}</TableCell><TableCell>{i.devolucaoLegadaPendente?"Reconciliação de devolução legada pendente":quantity(i.quantidadeDevolvivel)}</TableCell></TableRow>)}</tbody></Table>{!source.eligible&&<p>Documento de origem ainda não elegível para devolução.</p>}</>;
}
export function ReturnNew({kind}:{kind:ReturnKind}) {
  const params=useSearchParams(),id=params.get("origem")||"";
  const choices=useQuery({...returnChoicesOptions(kind),enabled:!id});
  const source=useReturnSource(kind,id);
  if(!id)return <><Heading title="Selecionar origem da devolução" description="Abra uma venda concluída ou uma compra com recebimento para conferir seus itens e histórico."/>{choices.isPending?<Loading/>:choices.isError?<ErrorNotice error={choices.error}/>:<ul className="space-y-4">{choices.data?.filter(s=>s.eligible).map(s=><li key={s.id}><Link href={sourcePath(kind,s.id)}>Consultar {s.id} · Loja {s.nomeLoja||s.idLoja}</Link></li>)}</ul>}</>;
  if(source.isPending)return <Loading/>;
  if(source.isError)return <ErrorNotice error={source.error} retry={()=>void source.refetch()}/>;
  return source.data?<ReturnEditor key={`${kind}:${id}`} kind={kind} source={source.data} reload={async()=>{const r=await source.refetch();if(r.isError)throw r.error;return r.data!;}} unavailable={source.isFetching||source.isError}/>:<Empty/>;
}
function ReturnItems({row,kind}:{row:ReturnRecord;kind:ReturnKind}) {
  return <Table><thead><TableRow>{["Produto / item de origem","Quantidade","Unidade salva","Efeito no estoque","Observação"].map(x=><TableHead key={x}>{x}</TableHead>)}</TableRow></thead><tbody>{row.itens?.map(i=><TableRow key={i.id}><TableCell>{snapshotLabel(i, i.nomeProduto)}<small className="block">{i.idItemOrigem}</small></TableCell><TableCell>{quantity(i.quantidade)}</TableCell><TableCell>{i.unidadeSigla||"Não disponível"}{i.unidadeOrigem==="UNIDADE_NA_CRIACAO_DEVOLUCAO"&&<small className="block">Unidade na criação da devolução</small>}</TableCell><TableCell>{kind==="fornecedores"?`Saída: −${quantity(i.quantidade)}`:i.retornaAoEstoque?`Entrada: +${quantity(i.quantidade)}`:"Sem entrada no estoque disponível"}</TableCell><TableCell>{i.observacao||"—"}</TableCell></TableRow>)}</tbody></Table>;
}
export function ReturnRecordScreen({kind,id,edit=false}:{kind:ReturnKind;id:string;edit?:boolean}) {
  const q=useQuery({queryKey:key(kind,id),queryFn:()=>getReturn(kind,id),staleTime:0,refetchOnMount:"always"});
  const source=useReturnSource(kind,q.data?.idOrigem),client=useQueryClient();
  const [action,setAction]=useState<"concluir"|"cancelar"|null>(null),[reason,setReason]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[conflict,setConflict]=useState(false),[saved,setSaved]=useState<ReturnRecord>(),[refreshed,setRefreshed]=useState(true);
  if(q.isPending)return <Loading/>;
  if(q.isError&&!q.data)return <ErrorNotice error={q.error} retry={()=>void q.refetch()}/>;
  const r=saved||q.data;if(!r)return <Empty/>;
  const unavailable=q.isFetching||q.isError||source.isFetching||source.isError||!source.data;
  async function reload() {const [a,b]=await Promise.all([q.refetch(),source.refetch()]);if(a.isError||b.isError)throw a.error||b.error;return b.data!;}
  async function perform() {
    if(!action||busy||unavailable||conflict)return;
    setBusy(true);setError(undefined);
    try {const done=await actReturn(kind,r!.id!,r!.versao!,action,reason);setSaved(done);setAction(null);try{await refreshCatalog(client,true);await reload();}catch{setRefreshed(false);}}
    catch(e){setError(e);setConflict(true);setAction(null);try{await reload();}catch{setRefreshed(false);}}
    finally{setBusy(false);}
  }
  if(edit&&source.data&&r.status==="RASCUNHO"&&!r.legado)return <ReturnEditor key={id} kind={kind} source={source.data} initial={r} unavailable={unavailable} reload={reload}/>;
  return <><Heading title="Detalhes da devolução" description={returnHint}/>{q.isError&&<ErrorNotice error={q.error} retry={()=>void q.refetch()}/>}{source.isError&&<ErrorNotice error={source.error} retry={()=>void source.refetch()}/>}
    <Panel className="space-y-3 p-5"><p>Origem: <Link href={sourcePath(kind,r.idOrigem)}>{r.idOrigem}</Link></p><p>Loja: {r.lojaNome}</p><p>Motivo: {r.motivo}</p><p>Observação: {r.observacao||"—"}</p><p>Status: {labels[r.status||""]} · Versão {r.versao}</p><p>Criada por {r.usuarioNome||r.idUsuario} em {timestamp(r.criadoEm)}</p><p>Modificada por {r.nomeModificador||r.idModificador} em {timestamp(r.atualizadoEm)}</p>{r.concluidoEm&&<p>Confirmada por {r.nomeConfirmador||r.idConfirmador} em {timestamp(r.concluidoEm)}</p>}{r.canceladoEm&&<p>Cancelada por {r.nomeCancelador||r.idCancelador} em {timestamp(r.canceladoEm)} · {r.motivoCancelamento}</p>}{r.legado&&<p>Devolução legada somente para consulta. Reconciliação necessária; efeitos não serão repetidos.</p>}</Panel>
    <ReturnItems row={r} kind={kind}/>{source.data&&<SourceAllowance source={source.data}/>}
    {!!error&&<ErrorNotice error={error}/>}{!refreshed&&<p role="alert">A atualização falhou. Recarregue para conferir o documento salvo e as quantidades atuais.</p>}
    {conflict&&<Button disabled={busy||unavailable} variant="outline" onClick={async()=>{try{await reload();setConflict(false);setRefreshed(true);setError(undefined);}catch(e){setError(e);}}}>Revisei as quantidades atualizadas</Button>}
    {r.status==="RASCUNHO"&&!r.legado&&<div className="my-5 flex flex-wrap gap-3"><Button asChild variant="outline"><Link href={`${returnPath(kind)}/${id}/editar`}>Editar rascunho</Link></Button><Button disabled={busy||unavailable||conflict} onClick={()=>setAction("concluir")}>Revisar devolução</Button><Button variant="outline" disabled={busy||unavailable||conflict} onClick={()=>setAction("cancelar")}>Cancelar rascunho</Button></div>}
    {r.status==="CONCLUIDA"&&<Link href={`/estoque/movimentacoes?${kind==="clientes"?"idDevolucaoCliente":"idDevolucaoFornecedor"}=${id}`}>Consultar movimentos da devolução</Link>}
    <Dialog open={!!action} onOpenChange={open=>{if(!open&&!busy)setAction(null);}}><DialogContent className="max-w-4xl"><DialogTitle>{action==="concluir"?"Revisar devolução":"Cancelar rascunho"}</DialogTitle><DialogDescription>{returnHint}</DialogDescription><p>Origem: {r.idOrigem} · Loja: {r.lojaNome} · Motivo: {r.motivo}</p>{action==="concluir"?<ReturnItems row={r} kind={kind}/>:<label>Motivo do cancelamento<Textarea value={reason} onChange={e=>setReason(e.target.value)}/></label>}<Button disabled={busy||unavailable||conflict||(action==="cancelar"&&!reason.trim())} onClick={()=>void perform()}>{action==="concluir"?"Confirmar devolução":"Confirmar cancelamento"}</Button><Button variant="outline" disabled={busy} onClick={()=>setAction(null)}>Voltar</Button></DialogContent></Dialog>
    <p className="my-4"><BackLink href={returnPath(kind)}>Voltar às devoluções</BackLink></p></>;
}
function ReturnEditor({kind,source,initial,unavailable,reload}:{kind:ReturnKind;source:ReturnSource;initial?:ReturnRecord;unavailable:boolean;reload:()=>Promise<ReturnSource>}) {
  const [original]=useState(()=>returnValues(source,initial)),[draft,setDraft]=useState<ReturnDraft>(original),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(),[conflict,setConflict]=useState(false),[latest,setLatest]=useState(source),[version,setVersion]=useState(initial?.versao),[saved,setSaved]=useState<ReturnRecord>();
  const client=useQueryClient(),router=useRouter(),stock=useListarEstoques(),stores=useListarLojas();
  const recovery=useDocumentRecovery({context:`return:${kind}:${initial?.id||source.id+":new"}`,initial:original,values:draft,setValues:setDraft,schema:returnDraftSchema,baseline:String(initial?.versao??"new"),applicable:!initial||initial.status==="RASCUNHO"&&!initial.legado});
  const blocked=busy||unavailable||recovery.blocked||conflict||!!saved||!source.eligible||source.itens.some(i=>i.devolucaoLegadaPendente);
  function update(index:number,patch:Partial<ReturnDraft["itens"][number]>) {setDraft({...draft,itens:draft.itens.map((r,n)=>n===index?{...r,...patch}:r)});}
  async function submit() {
    if(blocked)return;setError(undefined);setBusy(true);
    try {
      const body=draft.pending?.body||returnPayload(draft,kind);
      if(body.idOrigem!==source.id)throw new Error("A origem da recuperação não corresponde ao documento atual.");
      let key=draft.pending?.key;
      if(!initial){key=key||crypto.randomUUID();const next={...draft,pending:{key,body}};setDraft(next);if(!recovery.persist(next))throw new Error("Não foi possível persistir a chave de criação. Tente novamente.");}
      const result=await saveReturn(kind,body,initial?.id,version,key);setSaved(result);recovery.commit();
      try{await refreshCatalog(client,true);}catch{setError({data:{message:"Rascunho salvo; atualização das consultas falhou."}});return;}
      router.push(`${returnPath(kind)}/${result.id}`);
    } catch(e) {
      setError(inputError(e));
      const status=(e as {status?:number;response?:{status?:number}})?.status||(e as {response?:{status?:number}})?.response?.status;
      if(status===409){setConflict(true);try{setLatest(await reload());}catch{} }
      if(!initial&&!ambiguousSave(e)){setDraft(d=>({...d,pending:undefined}));}
    } finally{setBusy(false);}
  }
  async function acknowledge() {
    try{const fresh=await reload();setLatest(fresh);if(initial){const r=await getReturn(kind,initial.id!);if(r.status!=="RASCUNHO"||r.legado)throw new Error("Documento não está mais editável.");setVersion(r.versao);setDraft(d=>({...d,baseVersion:r.versao}));recovery.rebase(String(r.versao));}setConflict(false);setError(undefined);}catch(e){setError(inputError(e));}
  }
  return <><Heading title={initial?"Editar devolução":"Nova devolução"} description={returnHint}/>{recovery.ui}<p>Origem: <Link href={sourcePath(kind,source.id)}>{source.id}</Link> · Loja: {source.nomeLoja||stores.data?.find(l=>l.id===source.idLoja)?.nomeFantasia||source.idLoja}</p><SourceAllowance source={latest}/>
    {!!error&&<ErrorNotice error={error}/>}{conflict&&<p role="alert">Os valores digitados foram preservados. Confira o documento e as quantidades atuais antes de salvar. <Button variant="outline" onClick={()=>void acknowledge()}>Revisei as quantidades atualizadas</Button></p>}{saved&&<p role="status">Rascunho salvo. <Link href={`${returnPath(kind)}/${saved.id}`}>Abrir devolução salva</Link></p>}
    <form onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={blocked||!!draft.pending} className="space-y-4"><label>Motivo *<Textarea maxLength={255} value={draft.motivo} onChange={e=>setDraft({...draft,motivo:e.target.value})}/></label><label>Observação<Textarea maxLength={255} value={draft.observacao} onChange={e=>setDraft({...draft,observacao:e.target.value})}/></label>
      {draft.itens.map((i,n)=><Panel key={n} className="space-y-3 p-5"><fieldset aria-label={`Item ${n+1}`} className="grid grid-cols-3 gap-4 mobile:grid-cols-1"><p>{snapshotLabel(source.itens.find(s=>s.id===i.idItemOrigem) || i)}<small className="block">Item de origem: {i.idItemOrigem}</small></p><label>Quantidade a devolver<Input inputMode="decimal" value={i.quantidade} onChange={e=>update(n,{quantidade:e.target.value})}/></label>{kind==="clientes"&&<label>Disposição<Select value={String(i.retornaAoEstoque)} onChange={e=>update(n,{retornaAoEstoque:e.target.value==="true"})}><option value="true">Retorna ao estoque</option><option value="false">Sem retorno ao estoque</option></Select></label>}<label>Observação do item{kind==="clientes"&&!i.retornaAoEstoque?" *":""}<Input maxLength={255} value={i.observacao} onChange={e=>update(n,{observacao:e.target.value})}/></label>
        {kind==="clientes"&&<Button type="button" variant="outline" disabled={draft.itens.some((r,index)=>index!==n&&r.idItemOrigem===i.idItemOrigem&&r.retornaAoEstoque!==i.retornaAoEstoque)} onClick={()=>setDraft({...draft,itens:[...draft.itens,{...i,id:undefined,quantidade:"",retornaAoEstoque:!i.retornaAoEstoque,observacao:""}]})}>Adicionar outra condição</Button>}
        <Button type="button" variant="outline" onClick={()=>setDraft({...draft,itens:draft.itens.filter((_,index)=>index!==n)})}>Remover item {n+1}</Button></fieldset>
        {kind==="fornecedores"&&<p>Disponível na loja (informativo, sem reserva): {stock.isPending?"Carregando…":stock.isError?"Consulta indisponível":quantity(stock.data?.find(s=>s.idLoja===source.idLoja&&s.idProdutoSku===i.idProdutoSku)?.quantidadeAtual??0)}</p>}</Panel>)}
    </fieldset><div className="my-5 flex gap-3"><Button disabled={blocked} type="submit">{draft.pending?"Repetir envio salvo":"Salvar rascunho"}</Button><BackLink href={returnPath(kind)}>Voltar</BackLink></div></form></>;
}
