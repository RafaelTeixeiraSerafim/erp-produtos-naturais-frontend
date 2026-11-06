// @vitest-environment jsdom
import "./setup";
import { useState } from "react";
import Link from "next/link";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useDocumentRecovery } from "@/components/document-recovery";
import { draftValues } from "@/lib/purchases";
import { purchaseDraftSchema, recoveryKey } from "@/lib/recovery";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const key = recoveryKey("test-backend", "11111111-1111-4111-8111-111111111111", "purchase:new");
function copy(baseline = "", text = "1,") {
  return JSON.stringify({ version: 1, updatedAt: Date.now(), revision: Math.random().toString(), baseline, values: { ...draftValues(), observacao: text } });
}
function Editor({ baseline = "" }) {
  const [draft, setDraft] = useState(draftValues);
  const recovery = useDocumentRecovery({ context: "purchase:new", initial: draftValues(), values: draft, setValues: setDraft, schema: purchaseDraftSchema, baseline });
  return <>{recovery.ui}<fieldset disabled={recovery.blocked}><label>Text<input value={draft.observacao} onChange={e => setDraft({ ...draft, observacao: e.target.value })} /></label><Link href="/compras">Voltar</Link></fieldset><span>{recovery.dirty ? "dirty" : "clean"}</span></>;
}
it("requires restore decision, preserves raw values and resets to original", async () => {
  localStorage.setItem(key, copy()); render(<Editor />);
  expect(screen.getByLabelText("Text")).toBeDisabled();
  fireEvent.click(screen.getByText("Restaurar"));
  expect(screen.getByLabelText("Text")).toHaveValue("1,");
  fireEvent.click(screen.getByText("Descartar alterações"));
  fireEvent.click(screen.getByText("Confirmar descarte"));
  expect(screen.getByLabelText("Text")).toHaveValue("");
  expect(localStorage.getItem(key)).toBeNull();
  expect(screen.getByText("clean")).toBeVisible();
});
it("debounces persistence, flushes on unload and registers native protection only while dirty", async () => {
  render(<Editor />);
  fireEvent.change(screen.getByLabelText("Text"), { target: { value: "raw," } });
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(JSON.parse(localStorage.getItem(key)!).values.observacao).toBe("raw,");
  await waitFor(() => expect(screen.getByText("Recuperação salva neste navegador")).toBeVisible());
});
it("detects another tab before writing and requires explicit replacement", async () => {
  render(<Editor />);
  fireEvent.change(screen.getByLabelText("Text"), { target: { value: "local" } });
  const remote = copy("", "remote"); localStorage.setItem(key, remote);
  fireEvent(window, new StorageEvent("storage", { key, newValue: remote }));
  expect(screen.getByLabelText("Text")).toBeDisabled();
  expect(localStorage.getItem(key)).toBe(remote);
  fireEvent.click(screen.getByText("Substituir pela edição desta aba"));
  await waitFor(() => expect(JSON.parse(localStorage.getItem(key)!).values.observacao).toBe("local"));
});
it("changed purchase baseline blocks restoration and retains readable copy", () => {
  localStorage.setItem(key, copy("old")); render(<Editor baseline="new" />);
  expect(screen.queryByRole("button", { name: "Restaurar" })).toBeNull();
  expect(screen.getByText(/apenas para consulta manual/)).toBeVisible();
  expect(localStorage.getItem(key)).not.toBeNull();
});
it("storage quota failure keeps editing available and reports unavailable recovery", async () => {
  render(<Editor />);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  fireEvent.change(screen.getByLabelText("Text"), { target: { value: "local" } });
  await screen.findByText(/Recuperação indisponível/);
  expect(screen.getByLabelText("Text")).toBeEnabled();
  fireEvent.click(screen.getByRole("link", { name: "Voltar" }));
  fireEvent.click(screen.getByRole("button", { name: "Sair e manter recuperação" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByLabelText("Text")).toHaveValue("local");
  expect(screen.getByText(/Recuperação indisponível/)).toBeVisible();
  write.mockRestore();
});

it("storage read failure does not block editing", () => {
  const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  render(<Editor />);
  expect(screen.getByText(/Recuperação indisponível/)).toBeVisible();
  expect(screen.getByLabelText("Text")).toBeEnabled();
  read.mockRestore();
});

it("keeps modified clicks untouched and guards normal application links", () => {
  render(<Editor />);
  const cleanExit = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(cleanExit);
  expect(cleanExit.defaultPrevented).toBe(false);
  fireEvent.change(screen.getByLabelText("Text"), { target: { value: "local" } });
  fireEvent.click(screen.getByRole("link", { name: "Voltar" }), { ctrlKey: true });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("link", { name: "Voltar" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(screen.getByText("Continuar editando"));
  expect(screen.getByLabelText("Text")).toHaveValue("local");
});
