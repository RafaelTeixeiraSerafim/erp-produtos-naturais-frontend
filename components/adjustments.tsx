"use client";
import { SkuSelect } from "./sku-select";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useListarAjustesEstoque } from "@/generated/sdk/hooks/useListarAjustesEstoque";
import { useBuscarAjusteEstoquePorId } from "@/generated/sdk/hooks/useBuscarAjusteEstoquePorId";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { useSkuCatalog as useListarProdutos, snapshotLabel } from "@/lib/skus";
import { useListarEstoques } from "@/generated/sdk/hooks/useListarEstoques";
import { criarAjusteEstoque } from "@/generated/sdk/clients/criarAjusteEstoque";
import { atualizarAjusteEstoque } from "@/generated/sdk/clients/atualizarAjusteEstoque";
import { concluirAjusteEstoque } from "@/generated/sdk/clients/concluirAjusteEstoque";
import { cancelarAjusteEstoque } from "@/generated/sdk/clients/cancelarAjusteEstoque";
import type { AjusteResponseDTO } from "@/generated/sdk/types/AjusteResponseDTO";
import { useIdentity } from "./auth";
import {
  useDocumentRecovery,
  MissingSelection,
  selectedExists,
} from "./document-recovery";
import { ambiguousSave } from "@/lib/recovery";
import {
  adjustmentDraftSchema,
  adjustmentValues,
  adjustmentPayload,
  blankAdjustmentItem,
  adjustmentHint,
} from "@/lib/adjustments";
import { refreshCatalog } from "@/lib/queries";
import { timestamp, quantity } from "@/lib/inventory";
import { Heading, Loading, ErrorNotice, Empty } from "./feedback";
import { Button } from "./ui/button";
import { Input, Select, Textarea } from "./ui/input";
import { Panel } from "./ui/panel";
import { Table, TableRow, TableHead, TableCell } from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
const labels: Record<string, string> = {
  RASCUNHO: "Rascunho",
  CONCLUIDO: "Concluída",
  CANCELADO: "Cancelada",
};
const status = (s?: string) => (s ? labels[s] || s : "—");
const inputError = (message: string) => ({ status: 400, data: { message } });
export function AdjustmentList() {
  const query = useListarAjustesEstoque(),
    params = useSearchParams(),
    path = usePathname();
  const val = (key: string) => params.get(key) || "";
  function control(key: string, value: string) {
    const p = new URLSearchParams(window.location.search);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "pagina") p.delete("pagina");
    window.history.replaceState(null, "", `${path}?${p}`);
  }
  const rows = (query.data || []).filter(
    (r) =>
      (!val("origem") || r.idLoja === val("origem")) &&
      (!val("status") || r.status === val("status")) &&
      (!val("busca") || (r.justificativa || "").toLowerCase().includes(val("busca").toLowerCase())) &&
      (!val("inicio") || (r.criadoEm || "").slice(0,10) >= val("inicio")) &&
      (!val("fim") || (r.criadoEm || "").slice(0,10) <= val("fim")) &&
      (!val("criador") ||
        (r.usuarioNome || "")
          .toLocaleLowerCase()
          .includes(val("criador").toLocaleLowerCase())),
  );
  const [field, dir] = (val("ordem") || "criadoEm-desc").split("-");
  rows.sort((a, b) => {
    const get = (r: AjusteResponseDTO) =>
      String(r[field as keyof AjusteResponseDTO] || "");
    return (
      (dir === "asc" ? 1 : -1) *
      (get(a).localeCompare(get(b)) || String(a.id).localeCompare(String(b.id)))
    );
  });
  const pages = Math.max(1, Math.ceil(rows.length / 20)),
    page = Math.min(pages, Math.max(1, Math.trunc(Number(val("pagina"))) || 1));
  const stores = [
    ...new Map(
      (query.data || []).flatMap(
        (r) =>
          [
            [r.idLoja, r.lojaNome],
          ] as [string | undefined, string | undefined][],
      ),
    ).entries(),
  ];
  return (
    <>
      <Heading
        eyebrow="ESTOQUE"
        title="Ajustes"
        description={adjustmentHint}
        action={
          <Button asChild>
            <Link href="/estoque/ajustes/novo">Novo ajuste</Link>
          </Button>
        }
      />
      <Panel>
        <div className="grid grid-cols-3 gap-4 p-5 mobile:grid-cols-1">
          {["origem"].map((key) => (
            <label key={key}>
              {key === "origem" ? "Loja" : "Destino"}
              <Select
                value={val(key)}
                onChange={(e) => control(key, e.target.value)}
              >
                <option value="">Todas as lojas</option>
                {stores.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name || id}
                  </option>
                ))}
              </Select>
            </label>
          ))}
          <label>
            Status
            <Select
              value={val("status")}
              onChange={(e) => control("status", e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(labels).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          </label>
          <label>Buscar justificativa<Input value={val("busca")} onChange={e=>control("busca",e.target.value)}/></label>
          <label>De<Input type="date" value={val("inicio")} onChange={e=>control("inicio",e.target.value)}/></label>
          <label>Até<Input type="date" value={val("fim")} onChange={e=>control("fim",e.target.value)}/></label>
          <label>
            Criador
            <Input
              value={val("criador")}
              onChange={(e) => control("criador", e.target.value)}
            />
          </label>
          <label>
            Ordenar
            <Select
              value={val("ordem") || "criadoEm-desc"}
              onChange={(e) => control("ordem", e.target.value)}
            >
              {[
                ["criadoEm", "Data"],
                ["lojaNome", "Loja"],
                ["justificativa", "Justificativa"],
                ["status", "Status"],
                ["usuarioNome", "Criador"],
              ].flatMap(([key, label]) =>
                ["asc", "desc"].map((dir) => (
                  <option key={key + dir} value={`${key}-${dir}`}>
                    {label}: {dir === "asc" ? "crescente" : "decrescente"}
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
                  "Loja",
                  "Justificativa",
                  "Data",
                  "Status",
                  "Criador",
                  "Ações",
                ].map((t) => (
                  <TableHead key={t}>{t}</TableHead>
                ))}
              </TableRow>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 20, page * 20).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.lojaNome}</TableCell>
                  <TableCell>{r.justificativa}</TableCell>
                  <TableCell>{timestamp(r.criadoEm)}</TableCell>
                  <TableCell>{status(r.status)}</TableCell>
                  <TableCell>{r.usuarioNome || "—"}</TableCell>
                  <TableCell>
                    <Link href={`/estoque/ajustes/${r.id}`}>
                      Ver ajuste
                    </Link>
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
function AdjustmentItems({ row }: { row: AjusteResponseDTO }) {
  const stock = useListarEstoques();
  return (
    <Table>
      <thead>
        <TableRow>
          {["Produto", "Tipo", "Quantidade", "Unidade salva", "Saldo anterior / disponível", "Saldo final / projetado"].map((t) => (
            <TableHead key={t}>{t}</TableHead>
          ))}
        </TableRow>
      </thead>
      <tbody>
        {row.itens?.map((i) => (
          <TableRow key={i.id}>
            <TableCell>{row.status === "CONCLUIDO" ? <Link href={`/estoque/movimentacoes?idAjusteEstoque=${row.id}&idProdutoSku=${i.idProdutoSku}`}>{snapshotLabel(i, i.produtoNome)}</Link> : snapshotLabel(i, i.produtoNome)}</TableCell>
            <TableCell>{i.tipo}</TableCell><TableCell>{quantity(i.quantidade)}</TableCell>
            <TableCell>
              {i.unidadeSigla || "Histórico indisponível"}
            </TableCell><TableCell>{row.status === "CONCLUIDO" ? quantity(i.saldoAntes) : stock.isSuccess ? quantity(stock.data?.find(s=>s.idProdutoSku===i.idProdutoSku && s.idLoja===row.idLoja)?.quantidadeAtual ?? 0) : "Indisponível"}</TableCell><TableCell>{row.status === "CONCLUIDO" ? quantity(i.saldoDepois) : stock.isSuccess ? quantity((stock.data?.find(s=>s.idProdutoSku===i.idProdutoSku && s.idLoja===row.idLoja)?.quantidadeAtual ?? 0)+(i.tipo==="AJUSTE_ENTRADA"?1:-1)*(i.quantidade ?? 0)) : "Indisponível"}</TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
export function AdjustmentRecord({ id }: { id: string }) {
  const query = useBuscarAjusteEstoquePorId({ path: { id } });
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    );
  const r = query.data;
  return (
    <>
      <Heading
        eyebrow="ESTOQUE"
        title="Detalhes do ajuste"
        description={adjustmentHint}
      />
      {query.isError && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}
      <Panel className="space-y-3 p-5">
        <p>Loja: {r.lojaNome}</p>
        
        <p>Data: {timestamp(r.criadoEm)}</p>
        <p>Status: {status(r.status)}</p>
        <p>Versão: {r.versao}</p>
        <p>Observação: {r.justificativa || "—"}</p>
        <p>
          Criador: {r.usuarioNome || r.idUsuario || "—"} ·{" "}
          {timestamp(r.criadoEm)}
        </p>
        <p>
          Última alteração: {r.idModificador || "—"} ·{" "}
          {timestamp(r.atualizadoEm)}
        </p>
        {r.concluidoEm && (
          <p>
            Concluída por {r.idConfirmador || r.idConfirmador} em{" "}
            {timestamp(r.concluidoEm)}
          </p>
        )}
        {r.canceladoEm && (
          <p>
            Cancelada por {r.idCancelador || r.idCancelador} em{" "}
            {timestamp(r.canceladoEm)}. Motivo: {r.motivoCancelamento}
          </p>
        )}
        {r.legado && (
          <p>
            Registro histórico somente para consulta; efeitos de estoque exigem
            reconciliação.
          </p>
        )}
      </Panel>
      <AdjustmentItems row={r} />
      {r.status === "CONCLUIDO" && <Link href={`/estoque/movimentacoes?idAjusteEstoque=${r.id}`}>Consultar movimentos do ajuste</Link>}
      <AdjustmentActions
        row={r}
        unavailable={query.isError || query.isFetching}
        reload={async () => {
          await query.refetch();
        }}
      />
      <Link href="/estoque/ajustes">Voltar aos ajustes</Link>
    </>
  );
}
function AdjustmentActions({
  row,
  unavailable,
  reload,
}: {
  row: AjusteResponseDTO;
  unavailable: boolean;
  reload: () => Promise<void>;
}) {
  const client = useQueryClient();
  const [review, setReview] = useState<"concluir" | "cancelar" | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<AjusteResponseDTO>(),
    [refreshFailed, setRefreshFailed] = useState(false),
    [conflicted, setConflicted] = useState(false);
  async function perform() {
    if (!review || busy || unavailable || conflicted) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await (
        review === "concluir"
          ? concluirAjusteEstoque({
              path: { id: row.id! },
              body: { versao: row.versao! },
            })
          : cancelarAjusteEstoque({
              path: { id: row.id! },
              body: { versao: row.versao!, motivo: reason },
            })
      ).unwrap();
      setSaved(result);
      setReview(null);
      try {
        await refreshCatalog(client, true);
        await reload();
      } catch {
        setRefreshFailed(true);
      }
    } catch (e) {
      setError(e);
      setReview(null);
      setConflicted(true);
      try {
        await reload();
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="my-5 space-y-3">
      {!!error && <ErrorNotice error={error} />}{" "}
      {saved && (
        <p role="status">
          Operação concluída: {status(saved.status)}.{" "}
          {refreshFailed &&
            "Não foi possível atualizar a tela; recarregue para consultar o registro salvo."}
        </p>
      )}
      {conflicted && (
        <p role="alert">
          Confira o documento atual antes de tentar novamente.{" "}
          <Button
            variant="outline"
            onClick={() => {
              setConflicted(false);
              setError(undefined);
            }}
          >
            Revisei o documento atual
          </Button>
        </p>
      )}
      {row.status === "RASCUNHO" && !row.legado && !saved && (
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/estoque/ajustes/${row.id}/editar`}>
              Editar ajuste
            </Link>
          </Button>
          <Button
            disabled={busy || unavailable || conflicted}
            onClick={() => setReview("concluir")}
          >
            Concluir ajuste
          </Button>
          <Button
            variant="outline"
            disabled={busy || unavailable || conflicted}
            onClick={() => setReview("cancelar")}
          >
            Cancelar ajuste
          </Button>
        </div>
      )}
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !busy) setReview(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {review === "concluir"
              ? "Revisar ajuste"
              : "Cancelar rascunho"}
          </DialogTitle>
          <DialogDescription>
            {review === "concluir"
              ? adjustmentHint
              : "O cancelamento preserva o histórico e não movimenta estoque."}
          </DialogDescription>
          <p>
            Loja: {row.lojaNome} · Justificativa: {row.justificativa}
          </p>
          {review === "concluir" ? (
            <AdjustmentItems row={row} />
          ) : (
            <label>
              Motivo do cancelamento
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          <Button
            disabled={
              busy || unavailable || (review === "cancelar" && !reason.trim())
            }
            onClick={() => void perform()}
          >
            {review === "concluir"
              ? "Confirmar ajuste"
              : "Confirmar cancelamento"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setReview(null)}
          >
            Voltar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function AdjustmentEditRecord({ id }: { id: string }) {
  const query = useBuscarAjusteEstoquePorId(
    { path: { id } },
    { query: { staleTime: 0, refetchOnMount: "always" } },
  );
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    );
  return (
    <>
      {query.isError && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}
      <AdjustmentEditor
        key={id}
        row={query.data}
        unavailable={query.isError || query.isFetching}
        reload={async () => {
          await query.refetch();
        }}
      />
    </>
  );
}
export function AdjustmentEditor({
  row,
  unavailable = false,
  reload = async () => {},
}: {
  row?: AjusteResponseDTO;
  unavailable?: boolean;
  reload?: () => Promise<void>;
} = {}) {
  const stores = useListarLojas(),
    products = useListarProdutos(),
    stock = useListarEstoques(),
    user = useIdentity(),
    client = useQueryClient(),
    router = useRouter();
  const initial = adjustmentValues(row);
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [conflicted, setConflicted] = useState(false),
    [savedLink, setSavedLink] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const immutable = !!row && (row.status !== "RASCUNHO" || row.legado),
    changed = !!row && row.versao !== draft.baseVersion;
  const recovery = useDocumentRecovery({
    context: row ? `adjustment:${row.id}` : "adjustment:new",
    initial,
    values: draft,
    setValues: setDraft,
    schema: adjustmentDraftSchema,
    baseline: row ? String(row.versao) : "",
    applicable: !unavailable && !immutable,
  });
  const lookupsReady =
    stores.isSuccess &&
    products.isSuccess &&
    !stores.isFetching &&
    !products.isFetching;
  const selections =
    selectedExists(draft.idLoja, stores.data) &&
    draft.itens.every((i) => selectedExists(i.idProdutoSku, products.data));
  const blocked =
    unavailable ||
    immutable ||
    changed ||
    conflicted ||
    recovery.blocked ||
    busy ||
    !!savedLink;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked || !lookupsReady || !selections) return;
    setError(undefined);
    let body;
    try {
      body = draft.pending?.body || adjustmentPayload(draft);
    } catch (e) {
      setError(inputError(e instanceof Error ? e.message : "Revise os dados."));
      return;
    }
    let operation = draft.pending;
    if (!row) {
      operation ||= { key: crypto.randomUUID(), body };
      const next = { ...draft, pending: operation };
      setDraft(next);
      if (!recovery.persist(next)) {
        setError(
          inputError(
            "Não foi possível guardar a solicitação para repetição segura. Libere o armazenamento antes de enviar.",
          ),
        );
        return;
      }
    }
    setBusy(true);
    try {
      const saved = row
        ? await atualizarAjusteEstoque({
            path: { id: row.id! },
            body: { ...body, versao: draft.baseVersion },
          }).unwrap()
        : await criarAjusteEstoque({
            headers: { "Idempotency-Key": operation!.key },
            body: operation!.body,
          }).unwrap();
      recovery.commit();
      const link = `/estoque/ajustes/${saved.id}`;
      setSavedLink(link);
      try {
        await refreshCatalog(client, true);
        router.push(link);
      } catch {
        setError(
          inputError(
            "Documento salvo. Não foi possível atualizar a tela; use o link para consultá-lo.",
          ),
        );
      }
    } catch (e) {
      setError(e);
      setUncertain(ambiguousSave(e));
      if (row) {
        setConflicted(true);
        try {
          await reload();
        } catch {}
      } else if (!ambiguousSave(e))
        setDraft((current) => ({ ...current, pending: undefined }));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="ESTOQUE"
        title={row ? "Editar ajuste" : "Novo ajuste"}
        description={adjustmentHint}
      />
      {recovery.ui}
      {(changed || conflicted) && (
        <Panel className="space-y-3 p-4">
          <p role="alert">
            A versão salva precisa ser revisada. Seus valores foram preservados.
          </p>
          <p>
            Versão atual: {row?.versao}; {row?.lojaNome} →{" "}
            {row?.justificativa}; {row?.justificativa}
          </p>
          {row && <AdjustmentItems row={row} />}
          <Button
            disabled={unavailable || immutable}
            onClick={() => {
              recovery.rebase(String(row?.versao));
              setDraft({ ...draft, baseVersion: row?.versao });
              setConflicted(false);
            }}
          >
            Usar versão atual e revisar valores
          </Button>
        </Panel>
      )}
      {immutable && <p role="alert">Este ajuste é somente leitura.</p>}
      {!selections && (
        <p role="alert">
          Há seleções indisponíveis. Selecione novamente antes de salvar.
        </p>
      )}
      {savedLink && (
        <p role="status">
          Documento salvo. <Link href={savedLink}>Ver registro salvo</Link>
        </p>
      )}
      {uncertain && (
        <p role="alert">
          Não foi possível confirmar a gravação.{" "}
          {row
            ? "Revise a versão atual antes de reenviar."
            : "Repita o envio salvo com a mesma chave e conteúdo."}
        </p>
      )}
      {!!error && <ErrorNotice error={error} />}
      {stores.isError && (
        <ErrorNotice error={stores.error} retry={() => void stores.refetch()} />
      )}{" "}
      {products.isError && (
        <ErrorNotice
          error={products.error}
          retry={() => void products.refetch()}
        />
      )}
      <form onSubmit={submit} noValidate>
        <fieldset disabled={blocked || !!draft.pending} className="space-y-5">
          <Panel className="grid grid-cols-2 gap-5 p-5 mobile:grid-cols-1">
            {(["idLoja"] as const).map((key) => (
              <label key={key}>
                {key === "idLoja" ? "Loja *" : "Loja *"}
                <Select
                  aria-label={key === "idLoja" ? "Loja *" : "Loja *"}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                >
                  <option value="">Selecione…</option>
                  <MissingSelection value={draft[key]} rows={stores.data} />
                  {stores.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nomeFantasia}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
            <p>Operador: {user?.nome}</p>
            <label>
              Justificativa *
              <Textarea
                maxLength={255}
                value={draft.justificativa}
                onChange={(e) =>
                  setDraft({ ...draft, justificativa: e.target.value })
                }
              />
            </label>
          </Panel>
          {draft.itens.map((i, index) => (
            <Panel key={index} className="space-y-3 p-5">
              <fieldset
                aria-label={`Item ${index + 1}`}
                className="grid grid-cols-3 gap-4 mobile:grid-cols-1"
              >
                <div>
                  SKU *
                  <SkuSelect
                    aria-label="SKU *"
                    value={i.idProdutoSku}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        itens: draft.itens.map((r, n) =>
                          n === index ? { ...r, idProdutoSku: e.target.value } : r,
                        ),
                      })
                    }
                  >
                    <option value="">Selecione…</option>
                    <MissingSelection
                      value={i.idProdutoSku}
                      rows={products.data}
                    />
                    {products.data?.filter(p=>p.status === "ATIVO").map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </SkuSelect>
                </div>
                <label>Tipo<Select value={i.tipo} onChange={e=>setDraft({...draft,itens:draft.itens.map((r,n)=>n===index?{...r,tipo:e.target.value as "AJUSTE_ENTRADA"|"AJUSTE_SAIDA"}:r)})}><option value="AJUSTE_ENTRADA">Entrada</option><option value="AJUSTE_SAIDA">Saída</option></Select></label>
                <label>Observação<Input value={i.observacao} onChange={e=>setDraft({...draft,itens:draft.itens.map((r,n)=>n===index?{...r,observacao:e.target.value}:r)})}/></label>
                <label>
                  Quantidade *
                  <Input
                    inputMode="decimal"
                    value={i.quantidade}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        itens: draft.itens.map((r, n) =>
                          n === index
                            ? { ...r, quantidade: e.target.value }
                            : r,
                        ),
                      })
                    }
                  />
                </label>
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
              </fieldset>
              <p>Saldo projetado (informativo): {stock.isSuccess ? quantity((stock.data?.find(s=>s.idProdutoSku===i.idProdutoSku && s.idLoja===draft.idLoja)?.quantidadeAtual ?? 0) + (i.tipo==="AJUSTE_ENTRADA"?1:-1)*Number(i.quantidade.replace(",","."))) : "Indisponível"}</p>
              <p>
                Disponível na loja (informativo, sem reserva):{" "}
                {stock.isPending
                  ? "Carregando…"
                  : stock.isError
                    ? "Consulta indisponível"
                    : quantity(
                        stock.data?.find(
                          (s) =>
                            s.idProdutoSku === i.idProdutoSku &&
                            s.idLoja === draft.idLoja,
                        )?.quantidadeAtual ?? 0,
                      )}
              </p>
            </Panel>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDraft({
                ...draft,
                itens: [...draft.itens, blankAdjustmentItem()],
              })
            }
          >
            Adicionar item
          </Button>
        </fieldset>
        <div className="my-5 flex gap-3">
          <Button
            type="submit"
            disabled={blocked || !lookupsReady || !selections}
          >
            {draft.pending ? "Repetir envio salvo" : "Salvar rascunho"}
          </Button>
          <Link href="/estoque/ajustes">Voltar</Link>
        </div>
      </form>
    </>
  );
}
