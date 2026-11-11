"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useBuscarCompraPorId } from "@/generated/sdk/hooks/useBuscarCompraPorId";
import { useBuscarRecebimentoCompraPorId, buscarRecebimentoCompraPorIdQueryKey } from "@/generated/sdk/hooks/useBuscarRecebimentoCompraPorId";
import { useListarRecebimentosCompra } from "@/generated/sdk/hooks/useListarRecebimentosCompra";
import { useOperator, useIdentity } from "./auth";
import { snapshotLabel } from "@/lib/skus";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { criarRecebimentoCompra } from "@/generated/sdk/clients/criarRecebimentoCompra";
import { atualizarRecebimentoCompra } from "@/generated/sdk/clients/atualizarRecebimentoCompra";
import { excluirRecebimentoCompra } from "@/generated/sdk/clients/excluirRecebimentoCompra";
import { concluirRecebimentoCompra } from "@/generated/sdk/clients/concluirRecebimentoCompra";
import type { CompraResponseDTO } from "@/generated/sdk/types/CompraResponseDTO";
import type { RecebimentoCompraResponseDTO } from "@/generated/sdk/types/RecebimentoCompraResponseDTO";
import { Heading, Loading, Empty, ErrorNotice } from "./feedback";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { Panel } from "./ui/panel";
import { Table, TableRow, TableHead, TableCell } from "./ui/table";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { selectedExists, useDocumentRecovery } from "./document-recovery";
import { refreshCatalog } from "@/lib/queries";
import { ambiguousSave } from "@/lib/recovery";
import { timestamp, quantity, inventoryLink } from "@/lib/inventory";
import { canReceive, receiptStatus, outstanding, receiptValues, receiptDraftSchema, receiptPayload, formatQuantityInput, type ReceiptDraft } from "@/lib/receipts";
const fresh = { query: { staleTime: 0, refetchOnMount: "always" as const } };
function conflict(error: unknown) { const e = error as { status?: number; response?: { status?: number } }; return (e.status || e.response?.status) === 409; }

export function ReceiptList({ purchaseId }: { purchaseId?: string }) {
  const query = useListarRecebimentosCompra({ query: purchaseId ? { idCompra: purchaseId } : {} });
  const rows = [...(query.data || [])].sort((a,b) => (b.dataRecebimento || "").localeCompare(a.dataRecebimento || "") || (a.id || "").localeCompare(b.id || ""));
  return <>
    {purchaseId ? <h2 className="mt-6 text-xl font-semibold">Histórico de recebimentos</h2> : <Heading eyebrow="COMPRAS" title="Recebimentos" description="Salve o rascunho, revise os itens e confirme a entrada no estoque." />}
    {query.isPending ? <Loading /> : query.isError ? <ErrorNotice error={query.error} retry={() => void query.refetch()} /> : !rows.length ? <Empty title="Nenhum recebimento" /> : <Table><thead><TableRow>{["RECEBIMENTO", "COMPRA", "DATA", "STATUS"].map(t => <TableHead key={t}>{t}</TableHead>)}</TableRow></thead><tbody>{rows.map(r => <TableRow key={r.id}>
      <TableCell><Link href={`/recebimentos/${r.id}`}>Ver recebimento {r.id?.slice(0,8)}</Link></TableCell><TableCell><Link href={`/compras/${r.idCompra}`}>{r.idCompra?.slice(0,8)}</Link></TableCell><TableCell>{timestamp(r.dataRecebimento)}</TableCell><TableCell>{receiptStatus(r.status)}</TableCell>
    </TableRow>)}</tbody></Table>}
  </>;
}
export function NewReceipt({ purchaseId }: { purchaseId: string }) {
  const c = useBuscarCompraPorId({ path: { id: purchaseId } }, fresh);
  if (c.isPending || (!c.isFetchedAfterMount && !c.isError)) return <Loading />;
  if (!c.data) return <><ErrorNotice error={c.error} retry={() => void c.refetch()} /><UnavailableReceiptRecovery id={`new:${purchaseId}`} /></>;
  return <>{c.isError && <ErrorNotice error={c.error} retry={() => void c.refetch()} />}<ReceiptEditor purchase={c.data} unavailable={c.isError || c.isFetching} reload={async () => { await c.refetch(); }} /></>;
}
export function ReceiptRecord({ id, edit = false }: { id: string; edit?: boolean }) {
  const r = useBuscarRecebimentoCompraPorId({ path: { id } }, fresh);
  if (r.isPending || (!r.isFetchedAfterMount && !r.isError)) return <Loading />;
  if (!r.data) return <><ErrorNotice error={r.error} retry={() => void r.refetch()} />{edit && <UnavailableReceiptRecovery id={id} />}</>;
  return <ReceiptWithPurchase receipt={r.data} edit={edit} unavailable={r.isError || r.isFetching} reloadReceipt={async () => { await r.refetch(); }} />;
}
function UnavailableReceiptRecovery({ id }: { id: string }) {
  const [draft,setDraft] = useState<ReceiptDraft>({ idUsuario: "", dataRecebimento: "", observacao: "", itens: [] });
  const recovery = useDocumentRecovery({ context: `receipt:${id}`, initial: draft, values: draft, setValues: setDraft, schema: receiptDraftSchema, applicable: false });
  return recovery.ui;
}
function ReceiptWithPurchase({ receipt: r, edit, unavailable, reloadReceipt }: { receipt: RecebimentoCompraResponseDTO; edit: boolean; unavailable: boolean; reloadReceipt: () => Promise<void> }) {
  const c = useBuscarCompraPorId({ path: { id: r.idCompra! } }, fresh);
  async function reload() { await Promise.all([reloadReceipt(), c.refetch()]); }
  if (c.isPending) return <Loading />;
  if (!c.data) return <><ErrorNotice error={c.error} retry={() => void reload()} />{edit && <UnavailableReceiptRecovery id={r.id!} />}</>;
  return <>{(unavailable || c.isError) && <p role="alert">Não foi possível verificar os dados atuais. <Button onClick={() => void reload()}>Recarregar dados</Button></p>}
    {edit ? <ReceiptEditor key={r.id} purchase={c.data} receipt={r} unavailable={unavailable || c.isError || c.isFetching} reload={reload} /> : <ReceiptDetail purchase={c.data} receipt={r} unavailable={unavailable || c.isError || c.isFetching} reload={reload} />}
  </>;
}
function ReceiptDetail({ purchase: c, receipt: r, unavailable, reload }: { purchase: CompraResponseDTO; receipt: RecebimentoCompraResponseDTO; unavailable: boolean; reload: () => Promise<void> }) {
  const stores = useListarLojas(), client = useQueryClient(), router = useRouter();
  const [review,setReview] = useState<"confirm" | "delete" | null>(null), [busy,setBusy] = useState(false), [error,setError] = useState<unknown>(), [saved,setSaved] = useState(false), [refreshFailed,setRefreshFailed] = useState(false);
  const store = stores.data?.find(s => s.id === c.idLoja)?.nomeFantasia || c.idLoja;
  async function perform() {
    if (busy || unavailable || saved || r.versao === undefined) return;
    setBusy(true); setError(undefined);
    try {
      if (review === "delete") {
        await excluirRecebimentoCompra({ path: { id: r.id! }, query: { versao: r.versao } }).unwrap();
        // A deleted detail must leave the cache before refreshing the remaining views.
        const queryKey = buscarRecebimentoCompraPorIdQueryKey({ path:{ id:r.id! } });
        await client.cancelQueries({ queryKey, exact:true });
        client.removeQueries({ queryKey, exact:true });
      }
      else await concluirRecebimentoCompra({ path: { id: r.id! }, body: { versao: r.versao } }).unwrap();
      setSaved(true); setReview(null);
      try { await refreshCatalog(client,true); if (review === "delete") router.push(`/compras/${r.idCompra}`); else { await reload(); setSaved(false); } }
      catch { setRefreshFailed(true); }
    } catch(e) { setError(e); setReview(null); await reload(); }
    finally { setBusy(false); }
  }
  return <>
    <Heading eyebrow="COMPRAS" title="Detalhes do recebimento" description="A confirmação registra a entrada na loja da compra." />
    {!!error && <ErrorNotice error={error} />}
    {saved && <p role="status">Operação concluída. {refreshFailed && "Não foi possível atualizar a tela."} <Link href={`/compras/${r.idCompra}`}>Ver compra salva</Link></p>}
    <Panel className="space-y-3 p-5"><p>Status: {receiptStatus(r.status)}</p><p>Loja de destino: {store}</p><p>Operador: {r.nomeUsuario || r.idUsuario}</p><p>Última alteração: {r.nomeModificador || "—"}</p>{r.nomeConfirmador && <p>Confirmado por: {r.nomeConfirmador}</p>}<p>Data do recebimento: {timestamp(r.dataRecebimento)}</p><p>Observação: {r.observacao || "—"}</p><p>Versão: {r.versao}</p>{r.concluidoEm && <p>Concluído em: {timestamp(r.concluidoEm)}</p>}<Link href={`/compras/${r.idCompra}`}>Ver compra</Link></Panel>
    <ReceiptItems receipt={r} />
    {r.status === "RASCUNHO" ? <div className="my-5 flex flex-wrap gap-3">
      <Button asChild variant="outline"><Link href={`/recebimentos/${r.id}/editar`}>Editar rascunho</Link></Button>
      <Button disabled={busy || unavailable || saved || !canReceive(c)} onClick={() => setReview("confirm")}>Concluir recebimento</Button>
      <Button variant="outline" disabled={busy || unavailable || saved} onClick={() => setReview("delete")}>Excluir rascunho</Button>
    </div> : <p className="my-5">Recebimento confirmado: somente leitura.</p>}
    <div className="my-5 flex flex-wrap gap-4"><Link href={inventoryLink("/estoque", "", c.idLoja || "")}>Consultar saldos da loja</Link><Link href={inventoryLink("/estoque/movimentacoes", "", c.idLoja || "")}>Ver movimentações da loja</Link><Link href="/recebimentos">Todos os recebimentos</Link></div>
    <Dialog open={!!review} onOpenChange={open => { if (!open && !busy) setReview(null); }}><DialogContent><DialogTitle>{review === "delete" ? "Excluir rascunho?" : "Revisar entrada no estoque"}</DialogTitle><DialogDescription>{review === "delete" ? "O rascunho e seus itens serão excluídos. Ele não possui efeitos no estoque." : `Destino: ${store}. Confira os itens e as quantidades. Após confirmar, o recebimento será imutável.`}</DialogDescription>{review === "confirm" && <ReceiptItems receipt={r} />}<div className="flex gap-3"><Button disabled={busy || unavailable} onClick={() => void perform()}>{review === "delete" ? "Confirmar exclusão" : "Confirmar entrada"}</Button><Button variant="outline" disabled={busy} onClick={() => setReview(null)}>Voltar</Button></div></DialogContent></Dialog>
  </>;
}
function ReceiptItems({ receipt }: { receipt: RecebimentoCompraResponseDTO }) {
  return <Table><thead><TableRow>{["PRODUTO", "QUANTIDADE", "OBSERVAÇÃO"].map(t => <TableHead key={t}>{t}</TableHead>)}</TableRow></thead><tbody>{receipt.itens?.map(i => <TableRow key={i.id}><TableCell>{snapshotLabel(i)}</TableCell><TableCell>{quantity(i.quantidade)}</TableCell><TableCell>{i.observacao || "—"}</TableCell></TableRow>)}</tbody></Table>;
}
export function ReceiptEditor({ purchase: c, receipt: r, unavailable = false, reload }: { purchase: CompraResponseDTO; receipt?: RecebimentoCompraResponseDTO; unavailable?: boolean; reload: () => Promise<void> }) {
  const users = useOperator(), stores = useListarLojas(), client = useQueryClient(), router = useRouter();
  const user = useIdentity();
  const initial = { ...receiptValues(c,r), idUsuario: user?.id || "" };
  const [draft,setDraft] = useState(() => initial), [busy,setBusy] = useState(false), [error,setError] = useState<unknown>(), [savedLink,setSavedLink] = useState(""), [refreshFailed,setRefreshFailed] = useState(false), [conflicted,setConflicted] = useState(false);
  const recovery = useDocumentRecovery({ context: r ? `receipt:${r.id}` : `receipt:new:${c.id}`, initial, values: draft, setValues: setDraft, schema: receiptDraftSchema, baseline: r ? String(r.versao) : "", applicable: !unavailable && (!r || r.status === "RASCUNHO") });
  const changed = !!r && r.versao !== draft.baseVersion;
  const locked = unavailable || busy || recovery.blocked || !!savedLink || (!draft.pending && !canReceive(c)) || (!!r && r.status !== "RASCUNHO");
  const operatorValid = !!draft.idUsuario && selectedExists(draft.idUsuario,users.data) && users.isSuccess && !users.isFetching;
  async function send() {
    if (locked || changed || conflicted || !operatorValid) return;
    setError(undefined);
    let body;
    try { body = draft.pending?.body || receiptPayload(draft,c,r); }
    catch(e) { setError({ status:400, data:{ message: (e as Error).message } }); return; }
    let operation = draft.pending;
    if (!r) {
      operation ||= { key: crypto.randomUUID(), body: { ...body, status:"RASCUNHO" } };
      const next = { ...draft, pending:operation }; setDraft(next);
      if (!recovery.persist(next)) { setError({ status:400, data:{ message:"Não foi possível guardar a solicitação para repetição segura. Libere o armazenamento do navegador antes de enviar." } }); return; }
    }
    setBusy(true);
    try {
      const result = r
        ? await atualizarRecebimentoCompra({ path:{ id:r.id! }, body }).unwrap()
        : await criarRecebimentoCompra({ headers:{ "Idempotency-Key": operation!.key }, body: operation!.body }).unwrap();
      recovery.commit(); const link = `/recebimentos/${result.id}`; setSavedLink(link);
      try { await refreshCatalog(client,true); router.push(link); } catch { setRefreshFailed(true); }
    } catch(e) {
      setError(e);
      if (!ambiguousSave(e)) {
        setDraft(current => ({ ...current, pending:undefined }));
        if (conflict(e)) { setConflicted(true); await reload(); }
      }
    } finally { setBusy(false); }
  }
  function patch(index: number, key: keyof ReceiptDraft["itens"][number], value: string | boolean) { setDraft({ ...draft, itens: draft.itens.map((i,n) => n === index ? { ...i, [key]:value } : i) }); }
  return <>
    <Heading eyebrow="COMPRAS" title={r ? "Editar recebimento" : "Novo recebimento"} description="O rascunho não altera estoque nem reserva quantidades pendentes." />
    <p className="mb-4">Loja de destino: {stores.data?.find(s => s.id === c.idLoja)?.nomeFantasia || c.idLoja}. <Link href={`/compras/${c.id}`}>Ver compra</Link></p>
    {recovery.ui}
    {!!error && <ErrorNotice error={error} />}
    {users.isError && <ErrorNotice error={users.error} retry={() => void users.refetch()} />}
    {savedLink && <p role="status">Rascunho salvo. {refreshFailed && "Não foi possível atualizar a tela."} <Link href={savedLink}>Ver registro salvo</Link></p>}
    {(changed || conflicted) && <Panel className="my-4 space-y-3 p-4"><p role="alert">Os dados salvos mudaram ou a quantidade está em conflito. Os valores digitados foram preservados. Confira os pendentes atuais antes de salvar.</p><Button disabled={unavailable || (!!r && r.status !== "RASCUNHO")} onClick={() => { recovery.rebase(r ? String(r.versao) : ""); setDraft({ ...draft, baseVersion:r?.versao, pending:undefined }); setConflicted(false); }}>Usar versão atual e revisar valores</Button></Panel>}
    {!canReceive(c) && <p role="alert">Compra cancelada ou totalmente recebida.</p>}
    {r && r.status !== "RASCUNHO" && <p role="alert">Recebimento confirmado é somente leitura. <Link href={`/recebimentos/${r.id}`}>Ver recebimento</Link></p>}
    {draft.pending && !savedLink && <p role="alert">Há uma solicitação salva para repetição segura. O reenvio usará a mesma chave e os mesmos dados, inclusive após perda de resposta.</p>}
    <form onSubmit={e => { e.preventDefault(); void send(); }} noValidate aria-busy={busy}>
      <fieldset disabled={locked || !!draft.pending || changed || conflicted} className="space-y-5">
        <Panel className="grid grid-cols-2 gap-5 p-5 mobile:grid-cols-1"><p>Operador: {user?.nome}</p><label>Data do recebimento<Input type="datetime-local" step="1" value={draft.dataRecebimento} onChange={e => setDraft({ ...draft,dataRecebimento:e.target.value })} /><small>Horário de São Paulo. Em branco, usa a data do servidor.</small></label><label>Observação<Textarea maxLength={255} value={draft.observacao} onChange={e => setDraft({ ...draft,observacao:e.target.value })} /></label></Panel>
        <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, itens:draft.itens.map(i => { const item = c.itens?.find(x => x.id === i.idItemCompra); const pending = item ? outstanding(item) : 0; return { ...i, selecionado:pending > 0, quantidade:pending > 0 ? formatQuantityInput(pending) : "" }; }) })}>Preencher pendentes</Button>
        {draft.itens.map((i,index) => { const ordered = c.itens?.find(x => x.id === i.idItemCompra); return <Panel key={i.idItemCompra} className="space-y-3 p-5" aria-label={`Item ${index+1}`}><label className="flex gap-3"><input type="checkbox" checked={i.selecionado} onChange={e => patch(index,"selecionado",e.target.checked)} />{snapshotLabel(ordered || i)}</label><p>Pedida: {quantity(ordered?.quantidade)} · Recebida: {quantity(ordered?.quantidadeRecebida)} · Pendente: {quantity(ordered ? outstanding(ordered) : undefined)}</p><label>Quantidade a receber<Input inputMode="decimal" value={i.quantidade} onChange={e => patch(index,"quantidade",e.target.value)} /><small>Até três casas decimais.</small></label><label>Observação do item<Textarea maxLength={255} value={i.observacao} onChange={e => patch(index,"observacao",e.target.value)} /></label></Panel>; })}
      </fieldset>
      <div className="my-5 flex flex-wrap gap-4"><Button type="submit" disabled={locked || changed || conflicted || !operatorValid}>{busy ? "Salvando…" : draft.pending && !savedLink ? "Repetir envio salvo" : "Salvar rascunho"}</Button><Button asChild variant="outline"><Link href={r ? `/recebimentos/${r.id}` : `/compras/${c.id}`}>Voltar</Link></Button></div>
    </form>
  </>;
}
