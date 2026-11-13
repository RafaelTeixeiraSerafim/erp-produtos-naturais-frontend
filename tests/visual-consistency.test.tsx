// @vitest-environment jsdom
import "./setup";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { formatDocument } from "@/lib/documents";
import { resolveRoute, routeDetail } from "@/lib/navigation";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BackLink } from "@/components/ui/back-link";
afterEach(cleanup);
it("formats documents for display without losing zeros or letters", () => {
  for (const [value, expected] of [["01234567890","012.345.678-90"],["04.252.011/0001-10","04.252.011/0001-10"],["04252011000110","04.252.011/0001-10"],["12abc34501de35","12.ABC.345/01DE-35"],["12.abc.345/01de-35","12.ABC.345/01DE-35"],[null,"—"],[undefined,"—"],["","—"],["  ","—"]]) expect(formatDocument(value)).toBe(expected);
});
it("resolves only the longest complete route segment for lists, new forms, details and edits", () => {
  const routes = ["/vendas", "/compras", "/vendas/devolucoes", "/compras/devolucoes", "/estoque", "/estoque/transferencias"].map(href=>({href}));
  for (const prefix of ["/vendas", "/compras"]) {
    for (const suffix of ["", "/nova", "/123", "/123/editar"]) {
      expect(resolveRoute(prefix+suffix,routes)?.href).toBe(prefix);
      expect(resolveRoute(prefix+"/devolucoes"+suffix,routes)?.href).toBe(prefix+"/devolucoes");
    }
    expect(resolveRoute(prefix+"-outra",routes)).toBeUndefined();
    expect(routeDetail(prefix+"/devolucoes",prefix+"/devolucoes")).toBe("");
    expect(routeDetail(prefix+"/devolucoes/nova",prefix+"/devolucoes")).toBe(" / Nova devolução");
  }
  expect(resolveRoute("/estoque/transferencias/123",routes)?.href).toBe("/estoque/transferencias");
});
it("keeps actions separate from the associated label and feedback below the input", () => {
  render(<Field label="Nome" actions={<button>Atualizar</button>}><Input/><small role="status">Carregando…</small></Field>);
  const input=screen.getByLabelText("Nome");
  expect(input.tagName).toBe("INPUT");
  expect(screen.getByRole("button").closest("label")).toBeNull();
  expect(screen.getByRole("status").closest("[data-field-header]")).toBeNull();
  expect(input.nextElementSibling).toBe(screen.getByRole("status"));
});
it("back navigation remains an accessible link styled as an outline button", () => {
  render(<BackLink href="/compras">Voltar aos pedidos</BackLink>);
  const link=screen.getByRole("link",{name:"Voltar aos pedidos"});
  expect(link).toHaveAttribute("href","/compras");
  expect(link).toHaveAttribute("data-slot","button");
  expect(link.querySelector("svg")).not.toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
