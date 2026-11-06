import type { ProdutoResponseDTO } from "@/generated/sdk/types/ProdutoResponseDTO";
import type { CompraResponseDTO } from "@/generated/sdk/types/CompraResponseDTO";
import type { VendaResponseDTO } from "@/generated/sdk/types/VendaResponseDTO";
import type { EstoqueResponseDTO } from "@/generated/sdk/types/EstoqueResponseDTO";
import type { MovimentacaoResponseDTO } from "@/generated/sdk/types/MovimentacaoResponseDTO";
import { inDateRange, inventoryInstant, matchesIds, matchesQuantity } from "./inventory";
import { purchaseStatus } from "./purchases";
import { saleStatus } from "./sales";
export type Filters = Record<string, string>;
export function selectProducts(data: ProdutoResponseDTO[], f: Filters) {
  return data.filter(r => (r.nome || "").toLocaleLowerCase("pt-BR").includes((f.busca || "").toLocaleLowerCase("pt-BR")) && (!f.categoria || r.idCategoria === f.categoria) && (!f.status || r.status === f.status))
    .sort((a,b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR") * (f.ordem === "desc" ? -1 : 1) || (a.id || "").localeCompare(b.id || ""));
}
export function selectDocuments<T extends CompraResponseDTO | VendaResponseDTO>(data: T[], f: Filters, kind: "sales" | "purchases", partyName: (id?: string) => string = id => id || "", storeName: (id?: string) => string = id => id || "") {
  const date = (r: T) => kind === "sales" ? (r as VendaResponseDTO).dataVenda : (r as CompraResponseDTO).dataCompra;
  const party = (r: T) => kind === "sales" ? (r as VendaResponseDTO).idCliente : (r as CompraResponseDTO).idFornecedor;
  const status = kind === "sales" ? saleStatus : purchaseStatus;
  const sort = f.ordem || "data-desc";
  return data.filter(r => (!f.idLoja || r.idLoja === f.idLoja) && (!(kind === "sales" ? f.idCliente : f.idFornecedor) || party(r) === (kind === "sales" ? f.idCliente : f.idFornecedor)) && (!f.status || (r.status || "SEM_STATUS") === f.status) && inDateRange(date(r), f.inicio || "", f.fim || ""))
    .sort((a,b) => {
      const diff = sort.startsWith("total") ? (a.valorTotal ?? 0) - (b.valorTotal ?? 0)
        : /^(cliente|fornecedor)/.test(sort) ? partyName(party(a)).localeCompare(partyName(party(b)), "pt-BR")
        : sort.startsWith("loja") ? storeName(a.idLoja).localeCompare(storeName(b.idLoja), "pt-BR")
        : sort.startsWith("status") ? status(a.status).localeCompare(status(b.status), "pt-BR")
        : (date(a) ? inventoryInstant(date(a)!).getTime() : 0) - (date(b) ? inventoryInstant(date(b)!).getTime() : 0);
      return (sort.endsWith("asc") ? 1 : -1) * (diff || (a.id || "").localeCompare(b.id || ""));
    });
}
export function selectInventory(stocks: EstoqueResponseDTO[], movements: MovimentacaoResponseDTO[], history: boolean, f: Filters, productName: (id?: string, fallback?: string) => string, storeName: (id?: string, fallback?: string) => string) {
  const source = history ? movements.filter(r => (!f.idAjusteEstoque || r.idAjusteEstoque === f.idAjusteEstoque) && matchesIds(r, f.idProduto || "", f.idLoja || "") && (!f.tipo || r.tipo === f.tipo) && inDateRange(r.dataMovimentacao, f.inicio || "", f.fim || ""))
    : stocks.filter(r => matchesIds(r, f.idProduto || "", f.idLoja || "") && productName(r.idProduto, r.nomeProduto).toLocaleLowerCase("pt-BR").includes((f.busca || "").toLocaleLowerCase("pt-BR")) && matchesQuantity(r.quantidadeAtual, f.quantidade || ""));
  const sort = f.ordem || (history ? "data-desc" : "nome-asc");
  return source.map(r => ({ ...r, name: productName(r.idProduto, "nomeProduto" in r ? r.nomeProduto : undefined), storeName: storeName(r.idLoja, "nomeLoja" in r ? r.nomeLoja : undefined), date: "dataMovimentacao" in r ? r.dataMovimentacao : "atualizadoEm" in r ? r.atualizadoEm : undefined, amount: "quantidadeAtual" in r ? r.quantidadeAtual : "quantidade" in r ? r.quantidade : undefined }))
    .sort((a,b) => {
      const diff = sort.startsWith("data") ? (a.date ? inventoryInstant(a.date).getTime() : 0) - (b.date ? inventoryInstant(b.date).getTime() : 0) : sort.startsWith("quantidade") ? (a.amount ?? 0) - (b.amount ?? 0) : a.name.localeCompare(b.name, "pt-BR");
      return diff * (sort.endsWith("desc") ? -1 : 1) || (a.id || "").localeCompare(b.id || "");
    });
}
