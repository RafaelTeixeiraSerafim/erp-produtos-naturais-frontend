// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import {
  transferPayload,
  transferValues,
  transferDraftSchema,
} from "@/lib/transfers";
import { decodeRecovery, recoveryKey } from "@/lib/recovery";
import { pagePermission } from "@/lib/auth";
import { forwardCatalog } from "@/lib/proxy";
const origin = "10000000-0000-4000-8000-000000000001",
  destination = "20000000-0000-4000-8000-000000000001",
  product = "30000000-0000-4000-8000-000000000001";
const valid = () => ({
  ...transferValues(),
  idLojaOrigem: origin,
  idLojaDestino: destination,
  itens: [{ idProdutoSku: product, quantidade: "1,125" }],
});
afterEach(() => vi.unstubAllGlobals());
it("validates distinct stores, unique products and exact quantity scale and limits", () => {
  expect(transferPayload(valid()).itens[0].quantidade).toBe(1.125);
  for (const quantidade of ["0", "-1", "0.0001", "100000000000", "NaN"])
    expect(() =>
      transferPayload({
        ...valid(),
        itens: [{ idProdutoSku: product, quantidade }],
      }),
    ).toThrow();
  expect(() =>
    transferPayload({ ...valid(), idLojaDestino: origin }),
  ).toThrow();
  expect(() =>
    transferPayload({
      ...valid(),
      itens: [...valid().itens, ...valid().itens],
    }),
  ).toThrow();
});
it("preserves saved IDs and snapshots through form recovery and keys isolate document, user and environment", () => {
  const draft = valid();
  draft.pending = { key: crypto.randomUUID(), body: transferPayload(draft) };
  const raw = JSON.stringify({
    version: 1,
    updatedAt: Date.now(),
    revision: "one",
    baseline: "2",
    values: draft,
  });
  expect(decodeRecovery(raw, transferDraftSchema).values.pending).toEqual(
    draft.pending,
  );
  expect(recoveryKey("a", "user", "transfer:new")).not.toBe(
    recoveryKey("b", "user", "transfer:new"),
  );
  expect(recoveryKey("a", "user", "transfer:new")).not.toBe(
    recoveryKey("a", "other", "transfer:new"),
  );
  expect(pagePermission("/estoque/transferencias/1/editar")).toBe(
    "transfers.read",
  );
});
it("proxy allows only versioned transfer routes and forwards creation key only on creation", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(async () => Response.json({ id: origin }));
  vi.stubGlobal("fetch", fetch);
  const request = (method: string, path: string[], key?: string) =>
    forwardCatalog(
      new Request(`http://localhost/api/${path.join("/")}`, {
        method,
        headers: {
          Origin: "http://localhost",
          ...(key ? { "Idempotency-Key": key } : {}),
          Authorization: "secret",
        },
        ...(method === "GET" ? {} : { body: "{}" }),
      }),
      path,
    );
  expect((await request("POST", ["transferencias-estoque"])).status).toBe(400);
  const key = crypto.randomUUID();
  expect((await request("POST", ["transferencias-estoque"], key)).ok).toBe(
    true,
  );
  expect(fetch.mock.calls.at(-1)![1].headers["Idempotency-Key"]).toBe(key);
  expect(
    (await request("POST", ["transferencias-estoque", origin, "concluir"], key))
      .ok,
  ).toBe(true);
  expect(fetch.mock.calls.at(-1)![1].headers).not.toHaveProperty(
    "Idempotency-Key",
  );
  expect(fetch.mock.calls.at(-1)![1].headers).not.toHaveProperty(
    "Authorization",
  );
  expect(
    (await request("DELETE", ["transferencias-estoque", origin])).status,
  ).toBe(405);
  expect(
    (await request("POST", ["transferencias-estoque", origin, "receber"]))
      .status,
  ).toBe(404);
});
