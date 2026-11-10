// @vitest-environment jsdom
import "./setup";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Inventory } from "@/components/inventory";
const state = vi.hoisted(() => ({ stockError: false, balanceError: false, rows: [] as object[] }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("idProduto=produto&idProdutoSku=sku&idLoja=loja&quantidade=zero&ordem=nome-desc"), useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/estoque" }));
const result = (data: unknown) => ({ data, isPending: false, isError: false, refetch: vi.fn(), dataUpdatedAt: 0 });
vi.mock("@/lib/skus", () => ({useSkuCatalog: () => result(undefined)}));
vi.mock("@/generated/sdk/hooks/useListarProdutos", () => ({ useListarProdutos: () => result(undefined) }));
vi.mock("@/generated/sdk/hooks/useListarLojas", () => ({ useListarLojas: () => result(undefined) }));
vi.mock("@/generated/sdk/hooks/useListarUnidadesMedida", () => ({ useListarUnidadesMedida: () => result(undefined) }));
vi.mock("@/generated/sdk/hooks/useListarEstoques", () => ({ useListarEstoques: () => ({ ...result(state.stockError ? undefined : state.rows), isError: state.stockError, error: new Error("Lista indisponível") }) }));
vi.mock("@/generated/sdk/hooks/useConsultarSaldoEstoque", () => ({ useConsultarSaldoEstoque: () => ({ ...result(state.balanceError ? undefined : { quantidadeAtual: 0 }), isError: state.balanceError, error: new Error("Saldo indisponível") }) }));
vi.mock("@/generated/sdk/hooks/useListarMovimentacoesEstoque", () => ({ useListarMovimentacoesEstoque: () => result([]) }));
it("restaura filtros e distingue ausência de registro de saldo zero", () => {
  state.stockError = false; state.balanceError = false; state.rows = [];
  render(<Inventory />);
  expect(screen.getByLabelText("Produto")).toHaveValue("produto");
  expect(screen.getByLabelText("Quantidade")).toHaveValue("zero");
  expect(screen.getByLabelText("Ordenar")).toHaveValue("nome-desc");
  expect(screen.getByLabelText("Saldo exato")).toHaveTextContent("0");
  expect(screen.getByText("Sem registro de estoque")).toBeVisible();
});
it("mantém linhas com IDs quando faltam consultas de nomes e o saldo falha", () => {
  state.balanceError = true; state.rows = [{ id: "estoque", idProduto: "produto", idProdutoSku:"sku", idLoja: "loja", quantidadeAtual: 0 }];
  render(<Inventory />);
  expect(screen.getByRole("link", { name: /^produto · sku$/ })).toHaveAttribute("href", "/produtos/produto");
  expect(screen.queryByText("Sem registro de estoque")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Saldo exato")).not.toHaveTextContent("0");
});
it("mantém saldo bem-sucedido quando a lista falha, sem afirmar registro ausente", () => {
  state.balanceError = false; state.stockError = true;
  render(<Inventory />);
  expect(screen.getByLabelText("Saldo exato")).toHaveTextContent("0");
  expect(screen.queryByText("Sem registro de estoque")).not.toBeInTheDocument();
  state.stockError = false;
});
