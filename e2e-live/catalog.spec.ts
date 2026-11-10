import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "./auth-fixture";

// No routing/interception: all writes go through the production proxy and real API.
test.beforeAll(() => {
  if (process.env.CATALOG_DISPOSABLE !== "1")
    throw new Error("Execute npm run test:integration para usar banco descartável.");
});
async function save(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
async function cancel(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test("catálogo real: fluxo completo, erros independentes e persistência", async ({ page, request }) => {
  const stamp = `live-${randomUUID().slice(0, 12)}`;
  const name = `${stamp}-produto`;
  const edited = `${name}-editado`;
  const sku = `${stamp}-sku`;
  const created: [string, string][] = [];
  const cleanupErrors: string[] = [];
  // Capture successful creations even if an assertion immediately afterwards fails.
  const pending = new Set<Promise<void>>();
  page.on("response", (response) => {
    const resource = new URL(response.url()).pathname.match(/^\/api\/([^/]+)$/)?.[1];
    if (response.request().method() !== "POST" || !response.ok() || !resource) return;
    const capture = response.json().then((row) => {
      expect(row.id).toBeTruthy();
      created.push([resource, row.id]);
    }).catch((error) => { cleanupErrors.push(`Captura para limpeza: ${error}`); });
    pending.add(capture);
    void capture.finally(() => pending.delete(capture));
  });
  try {
    await page.goto("/categorias");
    await page.getByRole("button", { name: "Nova categoria" }).click();
    await page.getByLabel("Nome", { exact: false }).fill(stamp);
    await save(page);
    await page.goto("/unidades-medida");
    await page.getByRole("button", { name: "Nova unidade de medida" }).click();
    await page.getByLabel("Nome", { exact: false }).fill(stamp);
    await page.getByLabel("Sigla").fill("lv");
    await save(page);
    await page.goto("/lojas");
    await page.getByRole("button", { name: "Nova loja" }).click();
    for (const [label, value] of Object.entries({
      "Nome fantasia": stamp, "Razão social": stamp,
      CNPJ: `${Date.now()}${Math.floor(Math.random() * 10)}`,
      Estado: "SC", Cidade: "Criciúma", Bairro: "Centro", Número: "10",
      Complemento: "Integração descartável",
    })) await page.getByRole("dialog").getByLabel(label, { exact: false }).fill(value);
    await save(page);
    await page.goto("/produtos/novo");
    await page.getByLabel("Nome do produto").fill(name);
    await page.getByLabel("Categoria", { exact: false }).selectOption({ label: stamp });
    await page.getByLabel("Descrição", { exact: false }).fill("Produto real");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page).toHaveURL(/\/produtos\/[0-9a-f-]{36}$/);
    const productUrl = page.url();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Novo SKU" }).click();
    await page.getByRole("textbox", { name: "SKU", exact: true }).fill(sku);
    await page.getByLabel("Unidade de medida").selectOption({ label: `${stamp} (lv)` });
    await page.getByLabel("Descrição da apresentação").fill("Pacote real");
    await page.getByLabel("EAN-13").fill("7891234567890");
    await page.getByLabel("DUN-14").fill("17891234567890");
    await page.getByLabel("Descrição da apresentação").fill("Pacote real");
    await save(page);
    await expect(page.getByRole("cell", { name: sku, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Novo SKU" }).click();
    await page.getByRole("textbox", { name: "SKU", exact: true }).fill(sku);
    await page.getByLabel("Unidade de medida").selectOption({ label: `${stamp} (lv)` });
    await page.getByLabel("Descrição da apresentação").fill("Pacote real");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("SKU já cadastrado");
    await expect(page.getByRole("textbox", { name: "SKU", exact: true })).toHaveValue(sku);
    await cancel(page);
    // A failed SKU save must not prevent an independent assignment save.
    await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
    await page.getByRole("tab", { name: "Lojas", exact: true }).click();
    await page.getByRole("button", { name: "Vincular loja", exact: true }).click();
    await page.getByRole("dialog").getByLabel("Loja").selectOption({ label: stamp });
    await save(page);
    await expect(page.getByRole("cell", { name: stamp, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Vincular loja", exact: true }).click();
    await page.getByRole("dialog").getByLabel("Loja").selectOption({ label: stamp });
    await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("SKU já vinculado a esta loja");
    await expect(page.getByRole("dialog").getByLabel("Loja")).not.toHaveValue("");
    await cancel(page);
    // A failed assignment must not prevent an independent price save.
    await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
    await page.getByRole("tab", { name: "Preços", exact: true }).click();
    await page.getByRole("button", { name: "Novo preço" }).click();
    await page.getByRole("dialog").getByLabel("Loja").selectOption({ label: stamp });
    await page.getByLabel("Preço (R$)").fill("1.234,56");
    await page.getByLabel("Início da validade").fill("2026-11-03T12:00");
    await page.getByLabel("Fim da validade").fill("2026-11-10T12:00");
    await save(page);
    await expect(page.getByRole("cell", { name: /1\.234,56/ })).toBeVisible();
    await page.getByRole("button", { name: "Editar preço", exact: true }).click();
    await expect(page.getByLabel("Início da validade")).toHaveValue("2026-11-03T12:00");
    await expect(page.getByLabel("Fim da validade")).toHaveValue("2026-11-10T12:00");
    await page.getByLabel("Preço (R$)").fill("14,50");
    await save(page);
    await page.getByRole("link", { name: "Editar produto", exact: true }).click();
    await page.getByLabel("Nome do produto").fill(edited);
    await page.getByLabel("Status").selectOption("INATIVO");
    await page.getByLabel("Descrição", { exact: false }).fill("Descrição editada");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page).toHaveURL(productUrl);
    await page.reload();
    await expect(page.getByRole("heading", { name: edited, exact: true })).toBeVisible();
    await expect(page.getByText("Inativo", { exact: true })).toBeVisible();
    await expect(page.getByText("Peso", { exact: true })).toBeVisible();
    await expect(page.getByText("Descrição editada", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: sku, exact: true })).toBeVisible();
    await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
    await page.getByRole("tab", { name: "Lojas", exact: true }).click();
    await expect(page.getByRole("cell", { name: stamp, exact: true })).toBeVisible();
    await page.getByLabel("Variante para lojas e preços").selectOption({index:1});
    await page.getByRole("tab", { name: "Preços", exact: true }).click();
    await expect(page.getByRole("cell", { name: /14,50/ })).toBeVisible();
    await page.getByRole("button", { name: "Editar preço", exact: true }).click();
    await expect(page.getByLabel("Início da validade")).toHaveValue("2026-11-03T12:00");
    await expect(page.getByLabel("Fim da validade")).toHaveValue("2026-11-10T12:00");
    await cancel(page);
    // Product and support record deletes are blocked by real FK constraints.
    for (const [url, record] of [["/produtos", edited], ["/categorias", stamp]]) {
      await page.goto(url);
      await page.getByRole("button", { name: `Excluir ${record}`, exact: true }).click();
      const failedDelete = page.waitForResponse((response) => response.request().method() === "DELETE");
      await page.getByRole("dialog").getByRole("button", { name: "Excluir", exact: true }).click();
      expect((await failedDelete).ok()).toBe(false);
      await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
      await cancel(page);
      await page.reload();
      await expect(page.getByRole("button", { name: `Excluir ${record}`, exact: true })).toBeVisible();
    }
  } finally {
    await Promise.all([...pending]);
    const order = ["skus-precos-loja", "skus-loja", "produtos-sku", "produtos", "lojas", "unidades-medida", "categorias"];
    created.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
    for (const [resource, id] of created) {
      try {
        const response = await request.delete(`/api/${resource}/${id}`);
        if (!response.ok()) cleanupErrors.push(`${resource}/${id}: ${response.status()} ${await response.text()}`);
      } catch (error) { cleanupErrors.push(String(error)); }
    }
    expect(cleanupErrors, "Todos os registros devem ser removidos em ordem de dependência").toEqual([]);
  }
});
