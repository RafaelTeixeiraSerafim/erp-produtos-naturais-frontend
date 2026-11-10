"use client";
import { SkuSelect } from "./sku-select";
import { SourceReturns } from "./returns";
import { useCan } from "./auth";
import Link from "next/link";
import { ReceiptList } from "./receipts";
import { canReceive, outstanding } from "@/lib/receipts";
import { useDocumentRecovery, MissingSelection, selectedExists } from "./document-recovery";
import { purchaseDraftSchema, purchaseFingerprint, ambiguousSave } from "@/lib/recovery";
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useListarRecebimentosCompra } from "@/generated/sdk/hooks/useListarRecebimentosCompra";
import { useListarCompras } from "@/generated/sdk/hooks/useListarCompras";
import { useBuscarCompraPorId } from "@/generated/sdk/hooks/useBuscarCompraPorId";
import { useListarFornecedores } from "@/generated/sdk/hooks/useListarFornecedores";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { useSkuCatalog as useListarProdutos, snapshotLabel } from "@/lib/skus";
import { criarCompra } from "@/generated/sdk/clients/criarCompra";
import { atualizarCompra } from "@/generated/sdk/clients/atualizarCompra";
import type { CompraResponseDTO } from "@/generated/sdk/types/CompraResponseDTO";
import { Heading, Loading, Empty, ErrorNotice } from "./feedback";
import { Button } from "./ui/button";
import { Input, Select, Textarea } from "./ui/input";
import { Panel } from "./ui/panel";
import { Table, TableRow, TableHead, TableCell } from "./ui/table";
import { errorMessage } from "@/lib/errors";
import { refreshCatalog } from "@/lib/queries";
import { currency } from "@/lib/validation";
import { timestamp, quantity } from "@/lib/inventory";
import {
  blankItem,
  draftValues,
  preview,
  itemCalculation,
  purchasePayload,
  purchaseStatus,
  statusLabels,
  unitCost,
} from "@/lib/purchases";
import { selectDocuments } from "@/lib/report-selectors";
import { ExportCsv } from "./export-csv";
import { csvNumber, isoTimestamp } from "@/lib/reports";
const inventoryHint = "Salvar um rascunho não altera o estoque.";
function useLookups(fresh = false) {
  const options = fresh ? { query: { refetchOnMount: "always" as const, staleTime: 0 } } : {};
  const suppliers = useListarFornecedores(options),
    stores = useListarLojas(options),
    products = useListarProdutos(options);
  return { suppliers, stores, products };
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
                    suppliers: "Fornecedores",
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
export function PurchaseList() {
  const query = useListarCompras(),
    lookups = useLookups();
  const params = useSearchParams(),
    path = usePathname();
  const value = (key: string) => params.get(key) || "";
  function control(key: string, v: string) {
    const next = new URLSearchParams(window.location.search);
    if (v) next.set(key, v);
    else next.delete(key);
    if (key !== "pagina") next.delete("pagina");
    window.history.replaceState(null, "", `${path}?${next}`);
  }
  const suppliers = lookups.suppliers.data || [],
    stores = lookups.stores.data || [];
  const supplierName = (id?: string) =>
    suppliers.find((s) => s.id === id)?.nomeFantasia || id || "—";
  const storeName = (id?: string) =>
    stores.find((s) => s.id === id)?.nomeFantasia || id || "—";
  const sort = value("ordem") || "data-desc";
  const rows = selectDocuments(query.data || [], Object.fromEntries(params), "purchases", supplierName, storeName);
  const pages = Math.max(1, Math.ceil(rows.length / 20)),
    page = Math.min(
      pages,
      Math.max(1, Math.trunc(Number(value("pagina"))) || 1),
    );
  return (
    <>
      <Heading
        eyebrow="COMPRAS"
        title="Pedidos de compra"
        description="Prepare compras e consulte os totais salvos."
        action={
          <Button asChild>
            <Link href="/compras/nova">Nova compra</Link>
          </Button>
        }
      />
      <ExportCsv name="compras" source={query} invalid={!!value("inicio") && !!value("fim") && value("inicio") > value("fim")} incomplete={[lookups.suppliers, lookups.stores].some(q => !q.isSuccess)} headers={["ID", "ID fornecedor", "Fornecedor", "ID loja", "Loja", "Data", "Status", "Total salvo"]} rows={rows.map(r => [r.id, r.idFornecedor, supplierName(r.idFornecedor), r.idLoja, storeName(r.idLoja), isoTimestamp(r.dataCompra), purchaseStatus(r.status), csvNumber(r.valorTotal, 2)])} />
      <LookupErrors lookups={lookups} />
      <Panel>
        <div className="grid grid-cols-3 gap-4 p-5 mobile:grid-cols-1">
          <label>
            Fornecedor
            <Select
              aria-label="Fornecedor"
              value={value("idFornecedor")}
              onChange={(e) => control("idFornecedor", e.target.value)}
            >
              <option value="">Todos os fornecedores</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nomeFantasia}
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
                  {purchaseStatus(s)}
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
            Ordenar compras
            <Select
              aria-label="Ordenar compras"
              value={sort}
              onChange={(e) => control("ordem", e.target.value)}
            >
              {[
                ["data", "Data"],
                ["fornecedor", "Fornecedor"],
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
        ) : query.isError ? (
          <ErrorNotice error={query.error} retry={() => void query.refetch()} />
        ) : !rows.length ? (
          <Empty />
        ) : (
          <Table>
            <thead>
              <TableRow>
                {[
                  "FORNECEDOR",
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
                  <TableCell>{supplierName(r.idFornecedor)}</TableCell>
                  <TableCell>{storeName(r.idLoja)}</TableCell>
                  <TableCell>{timestamp(r.dataCompra)}</TableCell>
                  <TableCell>{purchaseStatus(r.status)}</TableCell>
                  <TableCell>{currency(r.valorTotal)}</TableCell>
                  <TableCell>
                    <Link href={`/compras/${r.id}`}>Ver compra</Link>
                    {r.status === "RASCUNHO" && (
                      <Link className="ml-3" href={`/compras/${r.id}/editar`}>
                        Editar
                      </Link>
                    )}
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
export function PurchaseRecord({
  id,
  edit = false,
}: {
  id: string;
  edit?: boolean;
}) {
  const query = useBuscarCompraPorId({ path: { id } }, { query: { refetchOnMount: edit ? "always" : true, staleTime: edit ? 0 : 30000 } });
  const lookups = useLookups();
  const receipts = useListarRecebimentosCompra({ query: { idCompra:id } });
  if (query.isPending || (edit && query.isFetchedAfterMount === false && !query.isError)) return <Loading />;
  if (query.isError && !query.data)
    return <><ErrorNotice error={query.error} retry={() => void query.refetch()} />{edit && <UnavailablePurchaseRecovery id={id} />}</>;
  if (!query.data) return <><Empty title="Compra não encontrada" />{edit && <UnavailablePurchaseRecovery id={id} />}</>;
  const row = query.data;
  const refreshError = query.isError ? (
    <ErrorNotice error={query.error} retry={() => void query.refetch()} />
  ) : null;
  if (edit)
    return (
      <>
        {refreshError}
        <PurchaseEditor key={id} initial={row} verificationError={query.isError} />
      </>
    );
  return (
    <>
      <Heading
        eyebrow="COMPRAS"
        title="Detalhes da compra"
        description={inventoryHint}
        action={
          row.status === "RASCUNHO" && receipts.isSuccess && !receipts.data?.length && (
            <Button asChild>
              <Link href={`/compras/${id}/editar`}>Editar rascunho</Link>
            </Button>
          )
        }
      />
      {refreshError}
      <LookupErrors lookups={lookups} />
      <Panel className="space-y-4 p-5">
        <p>
          Fornecedor:{" "}
          {lookups.suppliers.data?.find((s) => s.id === row.idFornecedor)
            ?.nomeFantasia ||
            row.idFornecedor ||
            "—"}
        </p>
        <p>
          Loja:{" "}
          {lookups.stores.data?.find((s) => s.id === row.idLoja)
            ?.nomeFantasia ||
            row.idLoja ||
            "—"}
        </p>
        <p>Operador: {row.nomeUsuario || row.idUsuario || "—"}</p>
        <p>Última alteração: {row.nomeModificador || "—"}</p>
        <p>Data: {timestamp(row.dataCompra)}</p>
        <p>Status: {purchaseStatus(row.status)}</p>
        <p>Observação: {row.observacao || "—"}</p>
        <p>
          Total salvo: <strong>{currency(row.valorTotal)}</strong>
        </p>
      </Panel>
      <Table>
        <thead>
          <TableRow>
            {[
              "PRODUTO",
              "QUANTIDADE",
              "CUSTO UNITÁRIO",
              "DESCONTO",
              "TOTAL SALVO",
              "RECEBIDA",
              "PENDENTE",
            ].map((t) => (
              <TableHead key={t}>{t}</TableHead>
            ))}
          </TableRow>
        </thead>
        <tbody>
          {row.itens?.map((i, index) => (
            <TableRow key={i.id || index}>
              <TableCell>
                {snapshotLabel(i,lookups.products.data?.find(p=>p.id===i.idProdutoSku)?.nomeProduto)}
              </TableCell>
              <TableCell>{quantity(i.quantidade)}</TableCell>
              <TableCell>{unitCost(i.custoUnitario)}</TableCell>
              <TableCell>{currency(i.desconto)}</TableCell>
              <TableCell>{currency(i.totalItem)}</TableCell>
              <TableCell>{quantity(i.quantidadeRecebida)}</TableCell>
              <TableCell>{quantity(outstanding(i))}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      <SourceReturns kind="fornecedores" id={id} />
      {canReceive(row) && <Button asChild><Link href={`/compras/${id}/recebimentos/novo`}>Novo recebimento</Link></Button>}
      {!!receipts.data?.length && <p className="my-3">A compra possui recebimentos. Para editar um rascunho de compra, exclua todos os recebimentos em rascunho. Recebimentos confirmados mantêm a compra bloqueada.</p>}
      <ReceiptList purchaseId={id} />
      <Link href="/compras">Voltar aos pedidos</Link>
    </>
  );
}
function UnavailablePurchaseRecovery({ id }: { id: string }) {
  const [draft, setDraft] = useState(() => draftValues());
  const recovery = useDocumentRecovery({ context: `purchase:${id}`, initial: draft, values: draft, setValues: setDraft, schema: purchaseDraftSchema, applicable: false });
  return recovery.ui;
}
export function PurchaseEditor({ initial, verificationError = false }: { initial?: CompraResponseDTO; verificationError?: boolean }) {
  const canManageStores = useCan("stores.manage");
  const lookups = useLookups(true),
    client = useQueryClient(),
    router = useRouter();
  const receiptReferences = useListarRecebimentosCompra({ query: { idCompra:initial?.id } }, { query: { enabled:!!initial?.id, refetchOnMount:"always", staleTime:0 } });
  const referenced = !!initial?.id && !!receiptReferences.data?.length;
  const [draft, setDraft] = useState(() => draftValues(initial));
  const [originalFingerprint] = useState(() => initial ? purchaseFingerprint(initial) : "");
  const recovery = useDocumentRecovery({ context: initial?.id ? `purchase:${initial.id}` : "purchase:new", initial: draftValues(initial), values: draft, setValues: setDraft, schema: purchaseDraftSchema, baseline: initial ? purchaseFingerprint(initial) : "", applicable: !verificationError && (!initial || initial.status === "RASCUNHO") });
  const [savedLink, setSavedLink] = useState("");
  const [postSaveError, setPostSaveError] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<unknown>(),
    [statusError, setStatusError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(initial?.status);
  const savedStatus = initial?.status !== "RASCUNHO" ? initial?.status : status;
  const changedBaseline = !!initial && purchaseFingerprint(initial) !== originalFingerprint;
  const locked = referenced || verificationError || (!!initial && (savedStatus !== "RASCUNHO" || changedBaseline));
  const prerequisites = Object.values(lookups).every(
    (q) => q.isSuccess && !q.isFetching && !!q.data?.length,
  );
  const selectionsValid = selectedExists(draft.idFornecedor, lookups.suppliers.data) && selectedExists(draft.idLoja, lookups.stores.data) && draft.itens.every(i => selectedExists(i.idProdutoSku, lookups.products.data));
  let total: number | undefined;
  try {
    total = preview(draft.itens);
  } catch {}
  async function refreshSavedStatus() {
    if (!initial?.id) return;
    setStatusError(undefined);
    try {
      const { buscarCompraPorId } = await import(
        "@/generated/sdk/clients/buscarCompraPorId"
      );
      const saved = await buscarCompraPorId({
        path: { id: initial.id },
      }).unwrap();
      setStatus(saved.status);
      await refreshCatalog(client);
    } catch (err) {
      setStatusError(err);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || locked || recovery.blocked || savedLink || !prerequisites || !selectionsValid) return;
    setError(undefined);
    let body;
    try {
      body = purchasePayload(draft, initial);
    } catch (err) {
      setError({
        status: 400,
        data: {
          message:
            err instanceof Error ? err.message : "Revise os dados informados.",
        },
      });
      return;
    }
    setBusy(true);
    try {
      const saved = initial?.id
        ? await atualizarCompra({ path: { id: initial.id }, body }).unwrap()
        : await criarCompra({ body }).unwrap();
      recovery.commit();
      const link = `/compras/${saved.id}`;
      setSavedLink(link);
      try {
        await refreshCatalog(client, true);
        router.push(link);
      } catch { setPostSaveError(true); }
    } catch (err) {
      setError(err);
      setUncertain(ambiguousSave(err));
      if (initial?.id) {
        if (
          errorMessage(err)
            .toLowerCase()
            .includes("somente compras em rascunho")
        )
          setStatus(undefined);
        await refreshSavedStatus();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="COMPRAS"
        title={initial ? "Editar rascunho" : "Nova compra"}
        description={inventoryHint}
      />
      <LookupErrors lookups={lookups} />
      {recovery.ui}
      {!selectionsValid && <p role="alert">Há seleções indisponíveis. Selecione novamente os cadastros indicados antes de salvar.</p>}
      {savedLink && <p role="status">Documento salvo. {postSaveError && "Não foi possível atualizar a tela."} <Link href={savedLink}>Ver registro salvo</Link></p>}
      {uncertain && <p role="alert">Não foi possível confirmar a gravação. Confira a <Link href="/compras">lista de registros</Link> antes de tentar novamente. A solicitação não será reenviada automaticamente.</p>}

      <div className="mb-5 flex flex-wrap gap-4">
        <Link href="/fornecedores">Cadastrar fornecedor</Link>
        {canManageStores && <Link href="/lojas">Cadastrar loja</Link>}
        <Link href="/produtos/novo">Cadastrar produto</Link>
      </div>
      {!prerequisites && (
        <p role="status" className="mb-4">
          Para salvar, é necessário carregar e cadastrar pelo menos um
          fornecedor, uma loja e um produto.
        </p>
      )}
      {referenced && <p role="alert">A compra possui recebimentos e não pode ser editada. <Link href={`/compras/${initial?.id}`}>Ver histórico da compra</Link></p>}
      {changedBaseline && !savedLink && <p role="alert">A compra salva mudou desde a abertura. Reabra a edição para comparar a recuperação local com o registro atual.</p>}
      {!!initial && savedStatus !== "RASCUNHO" && (
        <p role="alert" className="mb-4">
          Somente compras em rascunho podem ser alteradas. Status salvo:{" "}
          {purchaseStatus(savedStatus)}.{" "}
          <Link href={`/compras/${initial?.id}`}>Ver compra salva</Link>
        </p>
      )}
      {!!error && <ErrorNotice error={error} />}
      {!!statusError && (
        <div>
          <p>Não foi possível consultar o status salvo.</p>
          <ErrorNotice
            error={statusError}
            retry={() => void refreshSavedStatus()}
          />
        </div>
      )}
      <form onSubmit={submit} noValidate aria-busy={busy}>
        <fieldset disabled={busy || locked || recovery.blocked || !!savedLink} className="space-y-5">
          <Panel className="grid grid-cols-2 gap-5 p-5 mobile:grid-cols-1">
            <label>
              Fornecedor *
              <Select
                aria-label="Fornecedor *"
                required
                value={draft.idFornecedor}
                onChange={(e) =>
                  setDraft({ ...draft, idFornecedor: e.target.value })
                }
              >
                <option value="">Selecione…</option>
                <MissingSelection value={draft.idFornecedor} rows={lookups.suppliers.data} />
                {lookups.suppliers.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeFantasia}
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
              Data da compra
              <Input
                type="datetime-local"
                step="1"
                value={draft.dataCompra}
                onChange={(e) =>
                  setDraft({ ...draft, dataCompra: e.target.value })
                }
              />
              <small>
                Horário de São Paulo. Em branco, usa a data do servidor.
              </small>
            </label>
            <label>
              Observação
              <Textarea
                value={draft.observacao}
                onChange={(e) =>
                  setDraft({ ...draft, observacao: e.target.value })
                }
              />
            </label>
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
                {(["quantidade", "custoUnitario", "desconto"] as const).map(
                  (key) => (
                    <label key={key}>
                      {
                        {
                          quantidade: "Quantidade *",
                          custoUnitario: "Custo unitário (R$) *",
                          desconto: "Desconto (R$)",
                        }[key]
                      }
                      <Input
                        inputMode="decimal"
                        value={item[key]}
                        onChange={(e) => change(key, e.target.value)}
                      />
                      <small>
                        Até{" "}
                        {key === "quantidade"
                          ? 3
                          : key === "custoUnitario"
                            ? 4
                            : 2}{" "}
                        casas decimais.
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
          <p className="text-lg">
            Prévia total: <strong>{currency(total)}</strong>
          </p>
          <div className="flex flex-wrap gap-4">
            <Button type="submit" disabled={busy || locked || recovery.blocked || !!savedLink || !prerequisites || !selectionsValid}>
              {busy ? "Salvando…" : "Salvar rascunho"}
            </Button>
            <Button asChild variant="outline">
              <Link href={initial?.id ? `/compras/${initial.id}` : "/compras"}>
                Voltar
              </Link>
            </Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
