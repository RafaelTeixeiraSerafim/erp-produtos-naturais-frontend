"use client";
import { useCan } from "./auth";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useListarProdutos } from "@/generated/sdk/hooks/useListarProdutos";
import { useListarEstoques } from "@/generated/sdk/hooks/useListarEstoques";
import { useListarVendas } from "@/generated/sdk/hooks/useListarVendas";
import { useListarCompras } from "@/generated/sdk/hooks/useListarCompras";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { Heading, Loading, ErrorNotice } from "./feedback";
import { Panel } from "./ui/panel";
import { Input, Select } from "./ui/input";
import { Button } from "./ui/button";
import { Table, TableHead, TableRow, TableCell } from "./ui/table";
import { selectDocuments } from "@/lib/report-selectors";
import { centsLabel, moneyCents, periodDates, summarize, validDateRange } from "@/lib/reports";
import { timestamp, matchesQuantity } from "@/lib/inventory";
import { statusLabels as salesStatuses, saleStatus } from "@/lib/sales";
import { statusLabels as purchaseStatuses, purchaseStatus } from "@/lib/purchases";
type QueryState = { isPending: boolean; isFetching: boolean; isError: boolean; error: unknown; dataUpdatedAt: number; refetch: () => unknown; data?: unknown };
function Section({ title, scope, query, children }: { title: string; scope: string; query: QueryState; children: ReactNode }) {
  return <Panel as="section" aria-label={title} className="mb-6 p-5 mobile:p-3">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{title}</h2><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>Atualizar {title.toLocaleLowerCase("pt-BR")}</Button></div>
    <p className="mb-3 text-sm text-muted">{scope}</p>
    <p role="status" className="mb-3 text-xs">{query.dataUpdatedAt ? `Última atualização bem-sucedida: ${timestamp(new Date(query.dataUpdatedAt).toISOString())}` : "Aguardando primeira consulta"}{query.isFetching ? " · Atualizando…" : ""}</p>
    {query.isError && <><p role="alert" className="mb-2 text-sm text-red-700">{query.data ? "Dados desatualizados. A última atualização falhou." : "Não foi possível carregar esta seção."}</p><ErrorNotice error={query.error} retry={() => void query.refetch()} /></>}
    {query.isPending ? <Loading /> : query.data !== undefined ? children : null}
  </Panel>;
}
function Summary({ rows, path, filters, label }: { rows: ReturnType<typeof summarize>; path: string; filters: Record<string,string>; label: (status?: string) => string }) {
  return <Table><thead><TableRow>{["Status", "Documentos", "Total salvo"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></thead><tbody>{rows.map(r => <TableRow key={r.status}><TableCell><Link className="text-primary underline" href={`${path}?${new URLSearchParams({...filters, status: r.status})}`}>{r.status === "SEM_STATUS" ? "Sem status (incompleto)" : label(r.status)}</Link></TableCell><TableCell>{r.count}</TableCell><TableCell>{r.missing ? `Incompleto: ${r.missing} documento(s) sem total válido` : centsLabel(r.cents)}</TableCell></TableRow>)}</tbody></Table>;
}
function Recent({ rows, path, label }: { rows: { id?: string; date?: string; status?: string; valorTotal?: number }[]; path: string; label: (s?: string) => string }) {
  return <><h3 className="mt-5 mb-2 font-semibold">Cinco registros mais recentes</h3>{!rows.length ? <p className="text-sm">Nenhum documento no período.</p> : <Table><thead><TableRow>{["Documento", "Data", "Status", "Total salvo"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></thead><tbody>{rows.slice(0,5).map((r,i) => { const cents = moneyCents(r.valorTotal); return <TableRow key={r.id || i}><TableCell>{r.id ? <Link className="text-primary underline" href={`${path}/${r.id}`}>{r.id}</Link> : "Sem ID"}</TableCell><TableCell>{timestamp(r.date)}</TableCell><TableCell>{label(r.status)}</TableCell><TableCell>{cents === undefined ? "Total indisponível" : centsLabel(cents)}</TableCell></TableRow>; })}</tbody></Table>}</>;
}
export function Overview() {
  const canPurchase = useCan("purchases.read");
  const params = useSearchParams();
  const [now] = useState(() => new Date());
  const preset = params.get("periodo") || (params.has("inicio") || params.has("fim") ? "personalizado" : "mes");
  const defaults = periodDates(preset, now);
  const start = params.get("inicio") ?? defaults.inicio, end = params.get("fim") ?? defaults.fim, store = params.get("idLoja") || "";
  const products = useListarProdutos(), stocks = useListarEstoques({ query: { idLoja: store || undefined } }), sales = useListarVendas({ query: { idLoja: store || undefined } }), purchases = useListarCompras({ query: { enabled: canPurchase } }), stores = useListarLojas();
  const valid = validDateRange(start, end);
  // Materialize defaults so reloads and copied URLs preserve the exact period.
  useEffect(() => {
    if (params.has("inicio") && params.has("fim") && params.has("periodo")) return;
    const next = new URLSearchParams(params); next.set("inicio", start); next.set("fim", end); next.set("periodo", preset);
    window.history.replaceState(null, "", `/visao-geral?${next}`);
  }, [params, start, end, preset]);
  function control(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    next.set(key, value);
    if (key === "periodo" && value !== "personalizado") { const range = periodDates(value, now); next.set("inicio", range.inicio); next.set("fim", range.fim); }
    if (key === "inicio" || key === "fim") next.set("periodo", "personalizado");
    window.history.replaceState(null, "", `/visao-geral?${next}`);
  }
  const filters = { idLoja: store, inicio: start, fim: end };
  const saleRows = selectDocuments(sales.data || [], filters, "sales"), purchaseRows = selectDocuments(purchases.data || [], filters, "purchases");
  const stockRows = (stocks.data || []).filter(r => !store || r.idLoja === store);
  return <>
    <Heading eyebrow="INÍCIO" title="Visão geral" description="Catálogo, estoque atual e documentos salvos por status." action={<Button disabled={[products, stocks, sales, purchases, stores].some(q => q.isFetching)} onClick={() => { for (const q of [products, stocks, sales, ...(canPurchase ? [purchases] : []), stores]) void q.refetch(); }}>Atualizar</Button>} />
    <p className="mb-5 text-sm text-muted">As seções usam consultas separadas e não representam uma fotografia transacional. Valores salvos de vendas abertas e compras em rascunho não representam receita ou despesa concluída.</p>
    <Panel className="mb-6 grid grid-cols-4 gap-4 p-5 compact:grid-cols-2 mobile:grid-cols-1">
      <label>Loja<Select aria-label="Loja" value={store} onChange={e => control("idLoja", e.target.value)}><option value="">Todas as lojas</option>{store && !stores.data?.some(r => r.id === store) && <option value={store}>{store}</option>}{stores.data?.map(r => <option key={r.id} value={r.id}>{r.nomeFantasia || r.id}</option>)}</Select></label>
      <label>Período<Select aria-label="Período" value={preset} onChange={e => control("periodo", e.target.value)}><option value="mes">Mês atual</option><option value="30dias">Últimos 30 dias</option><option value="personalizado">Datas personalizadas</option></Select></label>
      <label>Data inicial<Input type="date" value={start} onChange={e => control("inicio", e.target.value)} /></label><label>Data final<Input type="date" value={end} onChange={e => control("fim", e.target.value)} /></label>
    </Panel>
    {stores.isError && <ErrorNotice error={stores.error} retry={() => void stores.refetch()} />}
    {!valid && <p role="alert" className="mb-5 text-red-700">Informe datas válidas; a data final deve ser igual ou posterior à inicial.</p>}
    <Section title="Catálogo" scope="Contagens globais: independem da loja e das datas selecionadas." query={products}>
      <div className="flex flex-wrap gap-6">{[["ATIVO", "Produtos ativos"], ["INATIVO", "Produtos inativos"]].map(([status,label]) => <Link className="rounded border border-border p-4 text-primary underline" href={`/produtos?status=${status}`} key={status}>{label}: {(products.data || []).filter(r => r.status === status).length}</Link>)}</div>
    </Section>
    <Section title="Estoque atual" scope="Registros de produto/loja retornados, filtrados pela loja. Independem das datas; não incluem produtos sem registro de estoque." query={stocks}>
      <div className="flex flex-wrap gap-6">{[["positivo", "Saldo positivo"], ["zero", "Saldo zero"], ["negativo", "Saldo negativo"]].map(([value,label]) => <Link className="rounded border border-border p-4 text-primary underline" href={`/estoque?${new URLSearchParams({idLoja: store, quantidade: value})}`} key={value}>{label}: {stockRows.filter(r => Number.isFinite(r.quantidadeAtual) && matchesQuantity(r.quantidadeAtual, value)).length}</Link>)}</div>
      {stockRows.some(r => r.quantidadeAtual === undefined || !Number.isFinite(r.quantidadeAtual)) && <p role="status">Contagem incompleta: há registros sem saldo válido.</p>}
    </Section>
    <Section title="Vendas no período" scope="Totais salvos por status, filtrados por loja e data da venda em America/Sao_Paulo." query={sales}>
      {valid && <><Summary rows={summarize(saleRows, Object.keys(salesStatuses))} path="/vendas" filters={filters} label={saleStatus} /><Recent rows={saleRows.map(r => ({...r, date: r.dataVenda}))} path="/vendas" label={saleStatus} /></>}
    </Section>
    {canPurchase && <Section title="Compras no período" scope="Totais salvos por status, filtrados por loja e data da compra em America/Sao_Paulo." query={purchases}>
      {valid && <><Summary rows={summarize(purchaseRows, Object.keys(purchaseStatuses))} path="/compras" filters={filters} label={purchaseStatus} /><Recent rows={purchaseRows.map(r => ({...r, date: r.dataCompra}))} path="/compras" label={purchaseStatus} /></>}
    </Section>}
  </>;
}
