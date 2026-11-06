"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useListarTransferenciasEstoque } from "@/generated/sdk/hooks/useListarTransferenciasEstoque";
import { useBuscarTransferenciaEstoquePorId } from "@/generated/sdk/hooks/useBuscarTransferenciaEstoquePorId";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { useListarProdutos } from "@/generated/sdk/hooks/useListarProdutos";
import { useListarEstoques } from "@/generated/sdk/hooks/useListarEstoques";
import { criarTransferenciaEstoque } from "@/generated/sdk/clients/criarTransferenciaEstoque";
import { atualizarTransferenciaEstoque } from "@/generated/sdk/clients/atualizarTransferenciaEstoque";
import { concluirTransferenciaEstoque } from "@/generated/sdk/clients/concluirTransferenciaEstoque";
import { cancelarTransferenciaEstoque } from "@/generated/sdk/clients/cancelarTransferenciaEstoque";
import type { TransferenciaResponseDTO } from "@/generated/sdk/types/TransferenciaResponseDTO";
import { useIdentity } from "./auth";
import {
  useDocumentRecovery,
  MissingSelection,
  selectedExists,
} from "./document-recovery";
import { ambiguousSave } from "@/lib/recovery";
import {
  transferDraftSchema,
  transferValues,
  transferPayload,
  blankTransferItem,
  transferHint,
} from "@/lib/transfers";
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
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};
const status = (s?: string) => (s ? labels[s] || s : "—");
const inputError = (message: string) => ({ status: 400, data: { message } });
export function TransferList() {
  const query = useListarTransferenciasEstoque(),
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
      (!val("origem") || r.idLojaOrigem === val("origem")) &&
      (!val("destino") || r.idLojaDestino === val("destino")) &&
      (!val("status") || r.status === val("status")) &&
      (!val("criador") ||
        (r.nomeUsuario || "")
          .toLocaleLowerCase()
          .includes(val("criador").toLocaleLowerCase())),
  );
  const [field, dir] = (val("ordem") || "dataTransferencia-desc").split("-");
  rows.sort((a, b) => {
    const get = (r: TransferenciaResponseDTO) =>
      String(r[field as keyof TransferenciaResponseDTO] || "");
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
            [r.idLojaOrigem, r.nomeLojaOrigem],
            [r.idLojaDestino, r.nomeLojaDestino],
          ] as [string | undefined, string | undefined][],
      ),
    ).entries(),
  ];
  return (
    <>
      <Heading
        eyebrow="ESTOQUE"
        title="Transferências"
        description={transferHint}
        action={
          <Button asChild>
            <Link href="/estoque/transferencias/nova">Nova transferência</Link>
          </Button>
        }
      />
      <Panel>
        <div className="grid grid-cols-3 gap-4 p-5 mobile:grid-cols-1">
          {["origem", "destino"].map((key) => (
            <label key={key}>
              {key === "origem" ? "Origem" : "Destino"}
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
              value={val("ordem") || "dataTransferencia-desc"}
              onChange={(e) => control("ordem", e.target.value)}
            >
              {[
                ["dataTransferencia", "Data"],
                ["nomeLojaOrigem", "Origem"],
                ["nomeLojaDestino", "Destino"],
                ["status", "Status"],
                ["nomeUsuario", "Criador"],
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
                  "Origem",
                  "Destino",
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
                  <TableCell>{r.nomeLojaOrigem}</TableCell>
                  <TableCell>{r.nomeLojaDestino}</TableCell>
                  <TableCell>{timestamp(r.dataTransferencia)}</TableCell>
                  <TableCell>{status(r.status)}</TableCell>
                  <TableCell>{r.nomeUsuario || "—"}</TableCell>
                  <TableCell>
                    <Link href={`/estoque/transferencias/${r.id}`}>
                      Ver transferência
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
function TransferItems({ row }: { row: TransferenciaResponseDTO }) {
  return (
    <Table>
      <thead>
        <TableRow>
          {["Produto", "Quantidade", "Unidade salva"].map((t) => (
            <TableHead key={t}>{t}</TableHead>
          ))}
        </TableRow>
      </thead>
      <tbody>
        {row.itens?.map((i) => (
          <TableRow key={i.id}>
            <TableCell>{i.nomeProduto || i.idProduto}</TableCell>
            <TableCell>{quantity(i.quantidade)}</TableCell>
            <TableCell>
              {i.unidadeSiglaSnapshot || "Histórico indisponível"}
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </Table>
  );
}
export function TransferRecord({ id }: { id: string }) {
  const query = useBuscarTransferenciaEstoquePorId({ path: { id } });
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
        title="Detalhes da transferência"
        description={transferHint}
      />
      {query.isError && (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      )}
      <Panel className="space-y-3 p-5">
        <p>Origem: {r.nomeLojaOrigem}</p>
        <p>Destino: {r.nomeLojaDestino}</p>
        <p>Data: {timestamp(r.dataTransferencia)}</p>
        <p>Status: {status(r.status)}</p>
        <p>Versão: {r.versao}</p>
        <p>Observação: {r.observacao || "—"}</p>
        <p>
          Criador: {r.nomeUsuario || r.idUsuario || "—"} ·{" "}
          {timestamp(r.criadoEm)}
        </p>
        <p>
          Última alteração: {r.nomeModificador || "—"} ·{" "}
          {timestamp(r.atualizadoEm)}
        </p>
        {r.concluidoEm && (
          <p>
            Concluída por {r.nomeConfirmador || r.idConfirmador} em{" "}
            {timestamp(r.concluidoEm)}
          </p>
        )}
        {r.canceladoEm && (
          <p>
            Cancelada por {r.nomeCancelador || r.idCancelador} em{" "}
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
      <TransferItems row={r} />
      <TransferActions
        row={r}
        unavailable={query.isError || query.isFetching}
        reload={async () => {
          await query.refetch();
        }}
      />
      <Link href="/estoque/transferencias">Voltar às transferências</Link>
    </>
  );
}
function TransferActions({
  row,
  unavailable,
  reload,
}: {
  row: TransferenciaResponseDTO;
  unavailable: boolean;
  reload: () => Promise<void>;
}) {
  const client = useQueryClient();
  const [review, setReview] = useState<"concluir" | "cancelar" | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<TransferenciaResponseDTO>(),
    [refreshFailed, setRefreshFailed] = useState(false),
    [conflicted, setConflicted] = useState(false);
  async function perform() {
    if (!review || busy || unavailable || conflicted) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await (
        review === "concluir"
          ? concluirTransferenciaEstoque({
              path: { id: row.id! },
              body: { versao: row.versao! },
            })
          : cancelarTransferenciaEstoque({
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
            <Link href={`/estoque/transferencias/${row.id}/editar`}>
              Editar transferência
            </Link>
          </Button>
          <Button
            disabled={busy || unavailable || conflicted}
            onClick={() => setReview("concluir")}
          >
            Concluir transferência
          </Button>
          <Button
            variant="outline"
            disabled={busy || unavailable || conflicted}
            onClick={() => setReview("cancelar")}
          >
            Cancelar transferência
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
              ? "Revisar transferência"
              : "Cancelar rascunho"}
          </DialogTitle>
          <DialogDescription>
            {review === "concluir"
              ? transferHint
              : "O cancelamento preserva o histórico e não movimenta estoque."}
          </DialogDescription>
          <p>
            Origem: {row.nomeLojaOrigem} → Destino: {row.nomeLojaDestino}
          </p>
          {review === "concluir" ? (
            <TransferItems row={row} />
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
              ? "Confirmar transferência imediata"
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
export function TransferEditRecord({ id }: { id: string }) {
  const query = useBuscarTransferenciaEstoquePorId(
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
      <TransferEditor
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
export function TransferEditor({
  row,
  unavailable = false,
  reload = async () => {},
}: {
  row?: TransferenciaResponseDTO;
  unavailable?: boolean;
  reload?: () => Promise<void>;
} = {}) {
  const stores = useListarLojas(),
    products = useListarProdutos(),
    stock = useListarEstoques(),
    user = useIdentity(),
    client = useQueryClient(),
    router = useRouter();
  const initial = transferValues(row);
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [conflicted, setConflicted] = useState(false),
    [savedLink, setSavedLink] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const immutable = !!row && (row.status !== "RASCUNHO" || row.legado),
    changed = !!row && row.versao !== draft.baseVersion;
  const recovery = useDocumentRecovery({
    context: row ? `transfer:${row.id}` : "transfer:new",
    initial,
    values: draft,
    setValues: setDraft,
    schema: transferDraftSchema,
    baseline: row ? String(row.versao) : "",
    applicable: !unavailable && !immutable,
  });
  const lookupsReady =
    stores.isSuccess &&
    products.isSuccess &&
    !stores.isFetching &&
    !products.isFetching;
  const selections =
    selectedExists(draft.idLojaOrigem, stores.data) &&
    selectedExists(draft.idLojaDestino, stores.data) &&
    draft.itens.every((i) => selectedExists(i.idProduto, products.data));
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
      body = draft.pending?.body || transferPayload(draft);
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
        ? await atualizarTransferenciaEstoque({
            path: { id: row.id! },
            body: { ...body, versao: draft.baseVersion },
          }).unwrap()
        : await criarTransferenciaEstoque({
            headers: { "Idempotency-Key": operation!.key },
            body: operation!.body,
          }).unwrap();
      recovery.commit();
      const link = `/estoque/transferencias/${saved.id}`;
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
        title={row ? "Editar transferência" : "Nova transferência"}
        description={transferHint}
      />
      {recovery.ui}
      {(changed || conflicted) && (
        <Panel className="space-y-3 p-4">
          <p role="alert">
            A versão salva precisa ser revisada. Seus valores foram preservados.
          </p>
          <p>
            Versão atual: {row?.versao}; {row?.nomeLojaOrigem} →{" "}
            {row?.nomeLojaDestino}; {row?.observacao}
          </p>
          {row && <TransferItems row={row} />}
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
      {immutable && <p role="alert">Esta transferência é somente leitura.</p>}
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
            {(["idLojaOrigem", "idLojaDestino"] as const).map((key) => (
              <label key={key}>
                {key === "idLojaOrigem" ? "Origem *" : "Destino *"}
                <Select
                  aria-label={key === "idLojaOrigem" ? "Origem *" : "Destino *"}
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
            <label>
              Data da transferência
              <Input
                type="datetime-local"
                step="1"
                value={draft.dataTransferencia}
                onChange={(e) =>
                  setDraft({ ...draft, dataTransferencia: e.target.value })
                }
              />
              <small>Horário de São Paulo. Em branco, usa o servidor.</small>
            </label>
            <p>Operador: {user?.nome}</p>
            <label>
              Observação
              <Textarea
                maxLength={255}
                value={draft.observacao}
                onChange={(e) =>
                  setDraft({ ...draft, observacao: e.target.value })
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
                <label>
                  Produto *
                  <Select
                    aria-label="Produto *"
                    value={i.idProduto}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        itens: draft.itens.map((r, n) =>
                          n === index ? { ...r, idProduto: e.target.value } : r,
                        ),
                      })
                    }
                  >
                    <option value="">Selecione…</option>
                    <MissingSelection
                      value={i.idProduto}
                      rows={products.data}
                    />
                    {products.data?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </Select>
                </label>
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
              <p>
                Disponível na origem (informativo, sem reserva):{" "}
                {stock.isPending
                  ? "Carregando…"
                  : stock.isError
                    ? "Consulta indisponível"
                    : quantity(
                        stock.data?.find(
                          (s) =>
                            s.idProduto === i.idProduto &&
                            s.idLoja === draft.idLojaOrigem,
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
                itens: [...draft.itens, blankTransferItem()],
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
          <Link href="/estoque/transferencias">Voltar</Link>
        </div>
      </form>
    </>
  );
}
