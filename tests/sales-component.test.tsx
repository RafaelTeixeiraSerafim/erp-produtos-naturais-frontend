// @vitest-environment jsdom
import "./setup";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { SaleEditor, SaleRecord } from "@/components/sales";
const state = vi.hoisted(() => ({
  empty: false,
  lookupError: false,
  create: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
const id = "11111111-1111-4111-8111-111111111111";
const result = () => ({
  data: [{ id, nome: "Ana", nomeFantasia: "Centro" }],
  isSuccess: true,
  isError: false,
});
vi.mock("@/generated/sdk/hooks/useListarClientes", () => ({
  useListarClientes: () => ({ ...result(), data: state.empty ? [] : result().data, isSuccess: !state.lookupError, isError: state.lookupError }),
}));
vi.mock("@/generated/sdk/hooks/useListarLojas", () => ({
  useListarLojas: () => result(),
}));
vi.mock("@/generated/sdk/hooks/useListarProdutos", () => ({
  useListarProdutos: () => result(),
}));
vi.mock("@/generated/sdk/hooks/useListarUnidadesMedida", () => ({
  useListarUnidadesMedida: () => result(),
}));
vi.mock("@/generated/sdk/hooks/useListarUsuarios", () => ({
  useListarUsuarios: () => ({
    ...result(),
    data: state.empty ? [] : result().data,
    isSuccess: !state.lookupError,
    isError: state.lookupError,
    error: { status: 502 },
    refetch: vi.fn(),
  }),
}));
vi.mock("@/generated/sdk/hooks/useBuscarVendaPorId", () => ({
  useBuscarVendaPorId: () => ({
    data: {
      id,
      idCliente: id,
      idUsuario: id,
      status: "CONCLUIDA",
      subtotal: 12,
      descontoTotal: 2,
      valorTotal: 10,
      itens: [],
    },
    isPending: false,
    isError: false,
  }),
}));
vi.mock("@/generated/sdk/clients/criarVenda", () => ({
  criarVenda: (...args: unknown[]) => ({ unwrap: () => state.create(...args) }),
}));
function mount(record = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      {record ? <SaleRecord id={id} /> : <SaleEditor />}
    </QueryClientProvider>,
  );
  return client;
}
function fill() {
  for (const label of ["Cliente *", "Loja *", "Produto *"])
    fireEvent.change(screen.getByLabelText(label), { target: { value: id } });
  fireEvent.change(screen.getByLabelText(/Quantidade/), {
    target: { value: "1,125" },
  });
  fireEvent.change(screen.getByLabelText(/Preço unitário/), {
    target: { value: "2,35" },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  state.empty = false;
  state.lookupError = false;
});
it("preserva campos em falha de gravação e impede envio duplicado", async () => {
  let reject!: (error: unknown) => void;
  state.create.mockImplementation(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  mount();
  fill();
  const button = screen.getByRole("button", { name: "Salvar venda aberta" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(state.create).toHaveBeenCalledOnce();
  expect(button).toBeDisabled();
  reject({ status: 409, data: { message: "Falha ao salvar" } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao salvar");
  expect(screen.getByLabelText(/Quantidade/)).toHaveValue("1,125");
  expect(button).toBeEnabled();
});
it("salva DTO gerado, invalida queries e navega para consulta", async () => {
  state.create.mockResolvedValue({ id });
  const client = mount();
  const refresh = vi.spyOn(client, "invalidateQueries");
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Salvar venda aberta" }));
  await waitFor(() => expect(state.push).toHaveBeenCalledWith(`/vendas/${id}`));
  expect(refresh).toHaveBeenCalledOnce();
  expect(state.create.mock.calls[0][0].body).not.toHaveProperty("status");
});
it.each(["empty", "lookupError"] as const)(
  "bloqueia gravação sem clientes disponíveis: %s",
  (key) => {
    state[key] = true;
    mount();
    expect(
      screen.getByRole("button", { name: "Salvar venda aberta" }),
    ).toBeDisabled();
  },
);
it("detalhe retém venda concluída quando lookup falha e usa totais autoritativos", () => {
  state.lookupError = true;
  mount(true);
  expect(screen.getByText("Status: Concluída")).toBeVisible();
  expect(screen.getByText(/^Total salvo:/)).toHaveTextContent("10,00");
  expect(
    screen.queryByRole("button", { name: /Editar|Excluir|Concluir/ }),
  ).toBeNull();
});

it("não reenvia venda persistida quando navegação falha depois do refresh", async () => {
  state.create.mockResolvedValue({ id });
  state.push.mockImplementationOnce(() => { throw new Error("navigation"); });
  mount(); fill();
  fireEvent.click(screen.getByRole("button", { name: "Salvar venda aberta" }));
  expect(await screen.findByRole("link", { name: "Ver registro salvo" })).toHaveAttribute("href", `/vendas/${id}`);
  await screen.findByText(/Não foi possível atualizar a tela/);
  expect(screen.getByRole("button", { name: "Salvar venda aberta" })).toBeDisabled();
  expect(localStorage.length).toBe(0);
  expect(state.create).toHaveBeenCalledTimes(1);
});

it("falha de rede mantém chave e payload para repetição segura", async () => {
  state.create.mockRejectedValue(new Error("network"));
  mount(); fill();
  fireEvent.click(screen.getByRole("button", { name: "Salvar venda aberta" }));
  const repeat=await screen.findByRole("button",{name:"Repetir envio salvo"});
  await waitFor(()=>expect(repeat).toBeEnabled());
  const first=state.create.mock.calls[0][0];
  fireEvent.click(repeat);
  await waitFor(()=>expect(state.create).toHaveBeenCalledTimes(2));
  expect(state.create.mock.calls[1][0]).toEqual(first);
  expect(screen.getByLabelText(/Quantidade/)).toHaveValue("1,125");
  await waitFor(() => expect(localStorage.length).toBe(1));
  expect(state.create).toHaveBeenCalledTimes(2);
});
