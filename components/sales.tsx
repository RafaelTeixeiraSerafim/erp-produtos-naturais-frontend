"use client";
import { SkuSelect } from "./sku-select";
import { SourceReturns } from "./returns";
import Link from "next/link";
import { useDocumentRecovery, MissingSelection, selectedExists } from "./document-recovery";
import { saleDraftSchema, ambiguousSave } from "@/lib/recovery";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useListarVendas } from "@/generated/sdk/hooks/useListarVendas";
import { useBuscarVendaPorId } from "@/generated/sdk/hooks/useBuscarVendaPorId";
import { useOperator, useIdentity, useCan } from "./auth";
import { useListarUnidadesMedida } from "@/generated/sdk/hooks/useListarUnidadesMedida";
import { useListarClientes } from "@/generated/sdk/hooks/useListarClientes";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { useSkuCatalog as useListarProdutos, snapshotLabel } from "@/lib/skus";
import type { VendaResponseDTO } from "@/generated/sdk/types/VendaResponseDTO";
import { atualizarVenda } from "@/generated/sdk/clients/atualizarVenda";
import { concluirVenda } from "@/generated/sdk/clients/concluirVenda";
import { cancelarVenda } from "@/generated/sdk/clients/cancelarVenda";
import { useListarEstoques } from "@/generated/sdk/hooks/useListarEstoques";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { criarVenda } from "@/generated/sdk/clients/criarVenda";
import { Heading, Loading, Empty, ErrorNotice } from "./feedback";
import { Button } from "./ui/button";
import { Input, Select, Textarea } from "./ui/input";
import { Panel } from "./ui/panel";
import { Table, TableRow, TableHead, TableCell } from "./ui/table";
import { refreshCatalog } from "@/lib/queries";
import { currency } from "@/lib/validation";
import {
  timestamp,
  quantity,
} from "@/lib/inventory";
import {
  savedSaleValues,
  blankItem,
  draftValues,
  itemCalculation,
  salePayload,
  saleStatus,
  statusLabels,
  totals,
} from "@/lib/sales";
import { selectDocuments } from "@/lib/report-selectors";
import { ExportCsv } from "./export-csv";
import { csvNumber, isoTimestamp } from "@/lib/reports";
const inventoryHint =
  "Uma venda aberta não reserva estoque. A conclusão baixa o estoque e preserva os valores salvos; não registra pagamento.";
function useLookups(fresh = false) {
  const options = fresh ? { query: { refetchOnMount: "always" as const, staleTime: 0 } } : {};
  const users = useOperator(),
    units = useListarUnidadesMedida(options),
    customers = useListarClientes(options),
    stores = useListarLojas(options),
    products = useListarProdutos(options);
  return { customers, stores, products, users, units };
}
function LookupErrors({ lookups }: { lookups: ReturnType<typeof useLookups> }) {
  return (
    <>
      {Object.entries(lookups).map(
        ([name, query]) =>
          query.isError && (
            <div key={name}>
              <p>
                {
                  {
                    users: "Operadores",
                    units: "Unidades de medida",
                    customers: "Clientes",
                    stores: "Lojas",
                    products: "Produtos",
                  }[name]
                }
              </p>
              <ErrorNotice
                error={query.error}
                retry={() => void query.refetch()}
              />
            </div>
          ),
      )}
    </>
  );
}
export function SaleList() {
  const lookups = useLookups();
  const params = useSearchParams(),
    path = usePathname();
  const value = (key: string) => params.get(key) || "";
  const query = useListarVendas({
    query: {
      ...(value("idCliente") ? { idCliente: value("idCliente") } : {}),
      ...(value("idLoja") ? { idLoja: value("idLoja") } : {}),
    },
  });
  function control(key: string, v: string) {
    const next = new URLSearchParams(window.location.search);
    if (v) next.set(key, v);
    else next.delete(key);
    if (key !== "pagina") next.delete("pagina");
    window.history.replaceState(null, "", `${path}?${next}`);
  }
  const customers = lookups.customers.data || [],
    stores = lookups.stores.data || [];
  const customerName = (id?: string) =>
    customers.find((s) => s.id === id)?.nome || id || "—";
  const storeName = (id?: string) =>
    stores.find((s) => s.id === id)?.nomeFantasia || id || "—";
  const sort = value("ordem") || "data-desc";
  const rows = selectDocuments(query.data || [], Object.fromEntries(params), "sales", customerName, storeName);
  const pages = Math.max(1, Math.ceil(rows.length / 20)),
    page = Math.min(
      pages,
      Math.max(1, Math.trunc(Number(value("pagina"))) || 1),
    );
  return (
    <>
      <Heading
        eyebrow="VENDAS"
        title="Registros de vendas"
        description="Prepare vendas e consulte os totais salvos."
        action={
          <Button asChild>
            <Link href="/vendas/nova">Nova venda</Link>
          </Button>
        }
      />
      <ExportCsv name="vendas" source={query} invalid={!!value("inicio") && !!value("fim") && value("inicio") > value("fim")} incomplete={[lookups.customers, lookups.stores, lookups.users].some(q => !q.isSuccess)} headers={["ID", "ID cliente", "Cliente", "ID operador", "Operador", "ID loja", "Loja", "Data", "Status", "Subtotal salvo", "Descontos", "Total final salvo"]} rows={rows.map(r => [r.id, r.idCliente, customerName(r.idCliente), r.idUsuario, lookups.users.data?.find(u => u.id === r.idUsuario)?.nome || r.nomeUsuario || r.idUsuario, r.idLoja, storeName(r.idLoja), isoTimestamp(r.dataVenda), saleStatus(r.status), csvNumber(r.subtotal, 2), csvNumber(r.descontoTotal, 2), csvNumber(r.valorTotal, 2)])} />
      <LookupErrors lookups={lookups} />
      <Panel>
        <div className="grid grid-cols-3 gap-4 p-5 mobile:grid-cols-1">
          <label>
            Cliente
            <Select
              aria-label="Cliente"
              value={value("idCliente")}
              onChange={(e) => control("idCliente", e.target.value)}
            >
              <option value="">Todos os clientes</option>
              {customers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Loja
            <Select
              aria-label="Loja"
              value={value("idLoja")}
              onChange={(e) => control("idLoja", e.target.value)}
            >
              <option value="">Todas as lojas</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nomeFantasia}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Status
            <Select
              aria-label="Status"
              value={value("status")}
              onChange={(e) => control("status", e.target.value)}
            >
              <option value="">Todos os status</option>
              {value("status") === "SEM_STATUS" && <option value="SEM_STATUS">Sem status</option>}
              {[
                ...new Set([
                  ...Object.keys(statusLabels),
                  ...(query.data || []).flatMap((r) =>
                    r.status ? [r.status] : [],
                  ),
                ]),
              ].map((s) => (
                <option key={s} value={s}>
                  {saleStatus(s)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Data inicial
            <Input
              type="date"
              value={value("inicio")}
              onChange={(e) => control("inicio", e.target.value)}
            />
          </label>
          <label>
            Data final
            <Input
              type="date"
              value={value("fim")}
              onChange={(e) => control("fim", e.target.value)}
            />
          </label>
          <label>
            Ordenar vendas
            <Select
              aria-label="Ordenar vendas"
              value={sort}
              onChange={(e) => control("ordem", e.target.value)}
            >
              {[
                ["data", "Data"],
                ["cliente", "Cliente"],
                ["loja", "Loja"],
                ["status", "Status"],
                ["total", "Total"],
              ].flatMap(([key, label]) =>
                ["desc", "asc"].map((dir) => (
                  <option key={key + dir} value={`${key}-${dir}`}>
                    {label}: {dir === "desc" ? "decrescente" : "crescente"}
                  </option>
                )),
              )}
            </Select>
          </label>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.isError && !query.data ? (
          <ErrorNotice error={query.error} retry={() => void query.refetch()} />
        ) : !rows.length ? (
          <Empty />
        ) : (
          <Table>
            <thead>
              <TableRow>
                {[
                  "CLIENTE",
                  "OPERADOR",
                  "LOJA",
                  "DATA",
                  "STATUS",
                  "TOTAL SALVO",
                  "AÇÕES",
                ].map((t) => (
                  <TableHead key={t}>{t}</TableHead>
                ))}
              </TableRow>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 20, page * 20).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{customerName(r.idCliente)}</TableCell>
                  <TableCell>
                    {r.nomeUsuario ||
                      lookups.users.data?.find((u) => u.id === r.idUsuario)
                        ?.nome ||
                      r.idUsuario ||
                      "—"}
                  </TableCell>
                  <TableCell>{storeName(r.idLoja)}</TableCell>
                  <TableCell>{timestamp(r.dataVenda)}</TableCell>
                  <TableCell>{saleStatus(r.status)}</TableCell>
                  <TableCell>{currency(r.valorTotal)}</TableCell>
                  <TableCell>
                    <Link href={`/vendas/${r.id}`}>Ver venda</Link>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
        <div className="flex items-center justify-end gap-4 p-5">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => control("pagina", String(page - 1))}
          >
            Anterior
          </Button>
          <span>
            Página {page} de {pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pages}
            onClick={() => control("pagina", String(page + 1))}
          >
            Próxima
          </Button>
        </div>
      </Panel>
    </>
  );
}
export function SaleRecord({ id }: { id: string }) {
  const query = useBuscarVendaPorId({ path: { id } });
  const lookups = useLookups();
  if (query.isPending) return <Loading />;
  if (query.isError && !query.data)
    return (
      <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    );
  if (!query.data) return <Empty title="Venda não encontrada" />;
  const row = query.data;
  const refreshError = query.isError ? (
    <ErrorNotice error={query.error} retry={() => void query.refetch()} />
  ) : null;
  return (
    <>
      <Heading
        eyebrow="VENDAS"
        title="Detalhes da venda"
        description={inventoryHint}
      />
      {refreshError}
      <LookupErrors lookups={lookups} />
      <SourceReturns kind="clientes" id={id} />
      <Panel className="space-y-4 p-5">
        <p>
          Cliente:{" "}
          {lookups.customers.data?.find((s) => s.id === row.idCliente)?.nome ||
            row.idCliente ||
            "—"}
        </p>
        <p>
          Loja:{" "}
          {lookups.stores.data?.find((s) => s.id === row.idLoja)
            ?.nomeFantasia ||
            row.idLoja ||
            "—"}
        </p>
        <p>Data: {timestamp(row.dataVenda)}</p>
        <p>Status: {saleStatus(row.status)}</p>
        <p>Observação: {row.observacao || "—"}</p>
        <p>Última alteração: {row.nomeModificador || "—"}</p>
        {row.concluidoEm && <p>Concluída por {row.nomeConfirmador || row.idConfirmador} em {timestamp(row.concluidoEm)}</p>}
        {row.canceladoEm && <p>Cancelada por {row.nomeCancelador || row.idCancelador} em {timestamp(row.canceladoEm)}. Motivo: {row.motivoCancelamento}</p>}
        {row.legado && <p>Registro histórico somente para consulta. Efeitos de estoque exigem reconciliação; não serão repetidos.</p>}
        <p>
          Operador:{" "}
          {row.nomeUsuario ||
            lookups.users.data?.find((u) => u.id === row.idUsuario)?.nome ||
            row.idUsuario ||
            "—"}
        </p>
        <p>Subtotal salvo: {currency(row.subtotal)}</p>
        <p>Desconto total salvo: {currency(row.descontoTotal)}</p>
        <p>
          Total salvo: <strong>{currency(row.valorTotal)}</strong>
        </p>
      </Panel>
      <p className="my-4">Totais e unidades históricas são os valores persistidos. Quando a unidade histórica não está disponível, o catálogo atual é identificado apenas como referência.</p>
      <SaleActions row={row} reload={async () => { await query.refetch(); }} unavailable={query.isError || query.isFetching} />
      <Table>
        <thead>
          <TableRow>
            {[
              "PRODUTO",
              "QUANTIDADE",
              "PREÇO UNITÁRIO",
              "DESCONTO",
              "TOTAL SALVO",
              "UNIDADE HISTÓRICA",
            ].map((t) => (
              <TableHead key={t}>{t}</TableHead>
            ))}
          </TableRow>
        </thead>
        <tbody>
          {row.itens?.map((i, index) => (
            <TableRow key={i.id || index}>
              <TableCell>
                {snapshotLabel(i)}
              </TableCell>
              <TableCell>{quantity(i.quantidade)}</TableCell>
              <TableCell>{currency(i.precoUnitario)}</TableCell>
              <TableCell>{currency(i.desconto)}</TableCell>
              <TableCell>{currency(i.totalItem)}</TableCell>
              <TableCell>
                {i.unidadeSiglaSnapshot || `Histórico indisponível; catálogo atual: ${lookups.units.data?.find(
                  (u) =>
                    u.id ===
                    lookups.products.data?.find((p) => p.id === i.idProdutoSku)
                      ?.idUnidadeMedida,
                )?.sigla || "—"}`}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      <Link href="/vendas">Voltar aos registros</Link>
    </>
  );
}
export function SaleEditRecord({ id }: { id:string }) {
  const query=useBuscarVendaPorId({path:{id}}, {query:{refetchOnMount:"always",staleTime:0}});
  if(query.isPending) return <Loading />;
  if(!query.data) return <ErrorNotice error={query.error} retry={() => void query.refetch()} />;
  return <SaleEditor key={id} row={query.data} unavailable={query.isError || query.isFetching} reload={async () => { await query.refetch(); }} />;
}
export function SaleEditor({ row, unavailable=false, reload=async () => {} }: { row?:VendaResponseDTO; unavailable?:boolean; reload?:()=>Promise<void> } = {}) {
  const lookups = useLookups(true),
    client = useQueryClient(),
    router = useRouter();
  const user = useIdentity();
  const canManageStores = useCan("stores.manage"), canWriteCatalog = useCan("catalog.write");
  const initial = { ...(row ? savedSaleValues(row) : draftValues()), idUsuario: user?.id || "" };
  const [draft, setDraft] = useState(initial);
  const recovery = useDocumentRecovery({ context: row ? `sale:${row.id}` : "sale:new", initial, values: draft, setValues: setDraft, schema: saleDraftSchema, baseline:row ? String(row.versao) : "", applicable: !unavailable && (!row || row.status === "ABERTA") });
  const [conflicted,setConflicted] = useState(false);
  const changed=!!row && row.versao!==draft.baseVersion;
  const immutable=!!row && (row.status!=="ABERTA" || row.legado);
  const blocked=unavailable || changed || conflicted || immutable;
  const [savedLink, setSavedLink] = useState("");
  const [postSaveError, setPostSaveError] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  const prerequisites = [
    lookups.customers,
    lookups.stores,
    lookups.products,
    lookups.users,
  ].every((q) => q.isSuccess && !q.isFetching && !!q.data?.length);
  const selectionsValid = selectedExists(draft.idCliente, lookups.customers.data) && selectedExists(draft.idUsuario, lookups.users.data) && selectedExists(draft.idLoja, lookups.stores.data) && draft.itens.every(i => selectedExists(i.idProdutoSku, lookups.products.data));
  let total: number | undefined,
    roundingDifference = false;
  try {
    const calculated = totals(draft.itens);
    total = calculated.total;
    roundingDifference = calculated.roundingDifference;
  } catch {}
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || busy || recovery.blocked || savedLink || !prerequisites || !selectionsValid) return;
    setError(undefined);
    let body;
    try {
      body = draft.pending?.body || salePayload(draft);
    } catch (err) {
      setError({
        status: 400,
        data: {
          message: err instanceof Error ? err.message : "Revise os dados.",
        },
      });
      return;
    }
    let operation=draft.pending;
    if(!row) {
      operation ||= { key:crypto.randomUUID(), body };
      const next={...draft,pending:operation}; setDraft(next);
      if(!recovery.persist(next)) { setError({status:400,data:{message:"Não foi possível guardar a solicitação para repetição segura. Libere o armazenamento antes de enviar."}}); return; }
    }
    setBusy(true);
    try {
      const saved = row ? await atualizarVenda({path:{id:row.id!},body}).unwrap() : await criarVenda({ headers:{"Idempotency-Key":operation!.key}, body:operation!.body }).unwrap();
      recovery.commit();
      const link = `/vendas/${saved.id}`;
      setSavedLink(link);
      try {
        await refreshCatalog(client, true);
        router.push(link);
      } catch { setPostSaveError(true); }
    } catch (err) {
      setError(err);
      setUncertain(ambiguousSave(err));
      if(row && ambiguousSave(err)) { setConflicted(true); await reload(); }
      if(!ambiguousSave(err)) {
        setDraft(current=>({...current,pending:undefined}));
        if(row && ((err as {status?:number})?.status===409 || (err as {response?:{status:number}})?.response?.status===409)) {setConflicted(true); await reload();}
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="VENDAS"
        title={row ? "Editar venda" : "Nova venda"}
        description={inventoryHint}
      />
      <LookupErrors lookups={lookups} />
      {recovery.ui}
      {(changed || conflicted) && <Panel className="space-y-3 p-4"><p role="alert">A venda salva mudou. Os valores digitados foram preservados. Compare os dados atuais antes de reenviar.</p><p>Salvo no servidor: cliente {row?.nomeCliente || row?.idCliente}, loja {row?.nomeLoja || row?.idLoja}. Total: {currency(row?.valorTotal)}.</p><p>Observação salva: {row?.observacao || "—"}</p><ul>{row?.itens?.map(i=><li key={i.id}>{snapshotLabel(i, i.nomeProduto)}: {quantity(i.quantidade)} × {currency(i.precoUnitario)}, desconto {currency(i.desconto)}.</li>)}</ul><Button disabled={unavailable || immutable} onClick={() => { recovery.rebase(String(row?.versao)); setDraft({...draft,baseVersion:row?.versao});setConflicted(false); }}>Usar versão atual e revisar valores</Button></Panel>}
      {immutable && <p role="alert">Esta venda é somente leitura. <Link href={`/vendas/${row?.id}`}>Ver venda</Link></p>}
      {draft.pending && !savedLink && <p role="status">Solicitação guardada para repetição segura com a mesma chave e os mesmos dados.</p>}
      {!selectionsValid && <p role="alert">Há seleções indisponíveis. Selecione novamente os cadastros indicados antes de salvar.</p>}
      {savedLink && <p role="status">Documento salvo. {postSaveError && "Não foi possível atualizar a tela."} <Link href={savedLink}>Ver registro salvo</Link></p>}
      {uncertain && <p role="alert">{row ? "Não foi possível confirmar a edição. Confira a versão salva e revise os valores preservados antes de reenviar." : "Não foi possível confirmar a gravação. Use Repetir envio salvo para consultar ou concluir a mesma solicitação com segurança."}</p>}

      <div className="mb-5 flex flex-wrap gap-4">
        <Link href="/clientes">Cadastrar cliente</Link>
        {canManageStores && <Link href="/lojas">Cadastrar loja</Link>}
        {canWriteCatalog && <Link href="/produtos/novo">Cadastrar produto</Link>}
      </div>
      {!prerequisites && (
        <p role="status" className="mb-4">
          Para salvar, é necessário carregar e cadastrar pelo menos um cliente,
          uma loja atribuída e um produto. Solicite a um administrador a atribuição
          de lojas ou o cadastro dos pré-requisitos quando necessário.
        </p>
      )}
      {!!error && <ErrorNotice error={error} />}
      <form onSubmit={submit} noValidate aria-busy={busy}>
        <fieldset disabled={blocked || busy || recovery.blocked || !!savedLink || !!draft.pending} className="space-y-5">
          <Panel className="grid grid-cols-2 gap-5 p-5 mobile:grid-cols-1">
            <label>
              Cliente *
              <Select
                aria-label="Cliente *"
                required
                value={draft.idCliente}
                onChange={(e) =>
                  setDraft({ ...draft, idCliente: e.target.value })
                }
              >
                <option value="">Selecione…</option>
                <MissingSelection value={draft.idCliente} rows={lookups.customers.data} />
                {lookups.customers.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Loja *
              <Select
                aria-label="Loja *"
                required
                value={draft.idLoja}
                onChange={(e) => setDraft({ ...draft, idLoja: e.target.value })}
              >
                <option value="">Selecione…</option>
                <MissingSelection value={draft.idLoja} rows={lookups.stores.data} />
                {lookups.stores.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeFantasia}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Data da venda
              <Input
                type="datetime-local"
                step="1"
                value={draft.dataVenda}
                onChange={(e) =>
                  setDraft({ ...draft, dataVenda: e.target.value })
                }
              />
              <small>
                Horário de São Paulo. Em branco, usa a data do servidor.
              </small>
            </label>
            <p>Operador: {user?.nome}</p>
            <label>Observação<Textarea maxLength={255} value={draft.observacao || ""} onChange={e=>setDraft({...draft,observacao:e.target.value})} /></label>
          </Panel>
          {draft.itens.map((item, index) => {
            function change(key: keyof typeof item, value: string) {
              setDraft({
                ...draft,
                itens: draft.itens.map((i, n) =>
                  n === index ? { ...i, [key]: value } : i,
                ),
              });
            }
            let rowTotal: number | undefined;
            try {
              rowTotal = Number(itemCalculation(item).cents) / 100;
            } catch {}
            return (
              <Panel
                key={index}
                className="grid grid-cols-3 gap-4 p-5 mobile:grid-cols-1"
                aria-label={`Item ${index + 1}`}
              >
                <h2 className="col-span-full font-semibold">
                  Item {index + 1}
                </h2>
                <div>
                  SKU *
                  <SkuSelect
                    aria-label="SKU *"
                    required
                    value={item.idProdutoSku}
                    onChange={(e) => change("idProdutoSku", e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    <MissingSelection value={item.idProdutoSku} rows={lookups.products.data} />
                    {lookups.products.data?.filter(p=>p.status === "ATIVO").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </SkuSelect>
                </div>
                {(["quantidade", "precoUnitario", "desconto"] as const).map(
                  (key) => (
                    <label key={key}>
                      {
                        {
                          quantidade: "Quantidade *",
                          precoUnitario: "Preço unitário (R$) *",
                          desconto: "Desconto (R$)",
                        }[key]
                      }
                      <Input
                        inputMode="decimal"
                        value={item[key]}
                        onChange={(e) => change(key, e.target.value)}
                      />
                      <small>
                        Até {key === "quantidade" ? 3 : 2} casas decimais.
                      </small>
                    </label>
                  ),
                )}
                <p>Prévia do item: {currency(rowTotal)}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      itens: draft.itens.filter((_, n) => n !== index),
                    })
                  }
                >
                  Remover item {index + 1}
                </Button>
              </Panel>
            );
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDraft({ ...draft, itens: [...draft.itens, blankItem()] })
            }
          >
            Adicionar item
          </Button>
          {roundingDifference && (
            <p>
              O total arredonda a soma dos valores brutos; pode diferir da soma
              das prévias arredondadas dos itens.
            </p>
          )}
          <p className="text-lg">
            Prévia total: <strong>{currency(total)}</strong>
          </p>
        </fieldset>
          <div className="flex flex-wrap gap-4">
            <Button type="submit" disabled={blocked || busy || recovery.blocked || !!savedLink || !prerequisites || !selectionsValid}>
              {busy ? "Salvando…" : draft.pending && !savedLink ? "Repetir envio salvo" : "Salvar venda aberta"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/vendas">Voltar</Link>
            </Button>
          </div>
      </form>
    </>
  );
}
function SaleActions({ row, reload, unavailable }: {row:VendaResponseDTO;reload:()=>Promise<void>;unavailable:boolean}) {
  const client=useQueryClient();
  const stock=useListarEstoques({query:{idLoja:row.idLoja}});
  const [review,setReview]=useState<"concluir"|"cancelar"|null>(null), [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false), [error,setError]=useState<unknown>(), [saved,setSaved]=useState<VendaResponseDTO>();
  const [refreshFailed,setRefreshFailed]=useState(false);
  async function perform() {
    if(busy || unavailable || saved || row.versao===undefined || !review) return;
    setBusy(true);setError(undefined);
    try {
      const args={path:{id:row.id!},body:{versao:row.versao,motivo:reason}};
      const result=review==="concluir" ? await concluirVenda(args).unwrap() : await cancelarVenda(args).unwrap();
      setSaved(result);setReview(null);
      try {await refreshCatalog(client,true);await reload();} catch {setRefreshFailed(true);}
    } catch(e) {setError(e);setReview(null);await reload();}
    finally {setBusy(false);}
  }
  const current=saved || row;
  return <div className="my-5 space-y-4">
    {!!error && <ErrorNotice error={error} />}
    {saved && <p role="status">Operação concluída: {saleStatus(saved.status)}. {refreshFailed && "Não foi possível atualizar a tela; recarregue para consultar o registro salvo."}</p>}
    {current.status==="ABERTA" && !row.legado ? <>
      <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href={`/vendas/${row.id}/editar`}>Editar venda</Link></Button><Button disabled={busy || unavailable || !!saved} onClick={()=>setReview("concluir")}>Concluir venda</Button><Button variant="outline" disabled={busy || unavailable || !!saved} onClick={()=>setReview("cancelar")}>Cancelar venda</Button></div>
      <p>Estoque atual por SKU nesta loja (consulta informativa, sem reserva; a disponibilidade será validada na confirmação):</p>
      {stock.isPending ? <Loading /> : stock.isError ? <ErrorNotice error={stock.error} retry={()=>void stock.refetch()} /> : <ul>{[...new Set(row.itens?.map(i=>i.idProdutoSku))].map(id=><li key={id}>{row.itens?.find(i=>i.idProdutoSku===id)?.nomeProduto || id}: {quantity(stock.data?.find(s=>s.idProdutoSku===id && s.idLoja===row.idLoja)?.quantidadeAtual ?? 0)}</li>)}</ul>}
    </> : <p>Venda {saleStatus(current.status).toLocaleLowerCase()}: somente leitura.</p>}
    <Dialog open={!!review} onOpenChange={open=>{if(!open && !busy)setReview(null);}}><DialogContent><DialogTitle>{review==="concluir" ? "Revisar e concluir venda" : "Cancelar venda aberta"}</DialogTitle><DialogDescription>{review==="concluir" ? "A confirmação registra a venda e a saída do estoque. Nenhum pagamento está sendo registrado. Após concluir, a venda será somente leitura." : "O cancelamento preserva o histórico e não movimenta o estoque."}</DialogDescription>
      <p>Loja: {row.nomeLoja || row.idLoja}</p>
      {review==="concluir" ? <><ul>{row.itens?.map(i=><li key={i.id}>{snapshotLabel(i, i.nomeProduto)}: {quantity(i.quantidade)} {i.unidadeSiglaSnapshot || "(unidade histórica indisponível)"} · {currency(i.totalItem)}</li>)}</ul><p>Subtotal salvo: {currency(row.subtotal)} · Descontos: {currency(row.descontoTotal)}</p><p>Total salvo: {currency(row.valorTotal)}</p></> : <label>Motivo do cancelamento<Textarea value={reason} onChange={e=>setReason(e.target.value)} /></label>}
      <div className="flex gap-3"><Button disabled={busy || unavailable || (review==="cancelar" && !reason.trim())} onClick={()=>void perform()}>{review==="concluir" ? "Confirmar saída de estoque" : "Confirmar cancelamento"}</Button><Button variant="outline" disabled={busy} onClick={()=>setReview(null)}>Voltar</Button></div>
    </DialogContent></Dialog>
  </div>;
}
