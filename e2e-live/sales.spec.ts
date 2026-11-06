import { test, expect } from "./auth-fixture";
test("vendas reais: cliente e venda aberta com total agregado, reload e estoque inalterado", async ({
  page,
  request,
}, testInfo) => {
  if (process.env.CATALOG_DISPOSABLE !== "1" || !process.env.SALES_FIXTURE)
    throw new Error("Use npm run test:integration.");
  const fixture = JSON.parse(process.env.SALES_FIXTURE);
  const name = `${fixture.prefix}-${testInfo.project.name}`;
  const stock = await (await request.get("/api/estoques")).json();
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Novo cliente" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: false })
    .fill(name);
  await page.getByLabel("Data de nascimento").fill("2000-02-29");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/vendas/nova");
  await page
    .getByLabel("Cliente *", { exact: true })
    .selectOption({ label: name });
  await page.getByLabel("Loja *", { exact: true }).selectOption(fixture.store);
  const fill = async (
    n: number,
    product: string,
    q: string,
    cost: string,
    discount: string,
  ) => {
    const row = page.getByLabel(`Item ${n}`, { exact: true });
    await row.getByLabel("Produto").selectOption(product);
    await row.getByLabel("Quantidade").fill(q);
    await row.getByLabel("Preço unitário").fill(cost);
    await row.getByLabel("Desconto").fill(discount);
  };

  await fill(1, fixture.product, "0,001", "5", "0");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await fill(2, fixture.otherProduct, "0,001", "5", "0");
  await expect(page.getByText("Recuperação salva neste navegador", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Restaurar", exact: true }).click();
  await page.getByRole("button", { name: "Salvar venda aberta" }).click();
  await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]{36}$/);
  await page.reload();
  await expect(page.getByText("Status: Aberta")).toBeVisible();
  await expect(page.getByText(/^Total salvo:/)).toContainText("0,01");
  await expect(page.getByText("Subtotal salvo:")).toContainText("0,01");
  await expect(page.getByRole("row")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: /Editar|Excluir|Concluir|Cancelar/ }),
  ).toHaveCount(0);
  expect(await (await request.get("/api/estoques")).json()).toEqual(stock);
});
