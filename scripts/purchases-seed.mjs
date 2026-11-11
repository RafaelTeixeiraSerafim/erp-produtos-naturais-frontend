// Test-only lifecycle: every SQL statement runs in the runner-owned container.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export function purchasesSeed({ base, sql, inventory }) {
  const prefix = `stage3-${randomUUID().slice(0, 8)}`;
  let supplierId;
  async function api(resource, method = "GET", body) {
    const response = await fetch(`${base}/api/${resource}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });
    assert(
      response.ok,
      `${method} ${resource}: ${response.status} ${await (response.ok ? Promise.resolve("") : response.text())}`,
    );
    return response.status === 204 ? undefined : response.json();
  }
  return {
    async seed() {
      const supplier = await api("fornecedores", "POST", {
        nomeFantasia: prefix,
        razaoSocial: prefix,
        estado: "SC",
        municipioIbge:4204608,
        cnpj:"12ABC34501DE35",
        cidade: "Criciúma",
        bairro: "Centro",
      });
      supplierId = supplier.id;
      const before = await api("estoques");
      const body = {
        idFornecedor: supplierId,
        idLoja: inventory.store,
        status: "RASCUNHO",
        itens: [
          {
            idProdutoSku: inventory.product,
            quantidade: 1.125,
            custoUnitario: 2.3456,
            desconto: 0.1,
          },
          {
            idProdutoSku: inventory.otherProduct,
            quantidade: 0.001,
            custoUnitario: 5,
            desconto: 0,
          },
        ],
      };
      const saved = await api("compras", "POST", body);
      assert.equal(saved.status, "RASCUNHO");
      assert.equal(saved.valorTotal, 2.55);
      assert.deepEqual(
        saved.itens.map((i) => i.totalItem).sort((a, b) => a - b),
        [0.01, 2.54],
      );
      const reload = await api(`compras/${saved.id}`);
      assert.equal(reload.valorTotal, 2.55);
      assert.equal(reload.itens.length, 2);
      const edited = await api(`compras/${saved.id}`, "PUT", {
        ...body,
        dataCompra: reload.dataCompra,
        itens: [
          { ...body.itens[0], id: reload.itens[0].id, quantidade: 2.125 },
        ],
      });
      assert.equal(edited.valorTotal, 4.88);
      assert.equal(edited.itens.length, 1);
      assert(
        !reload.itens.some((i) => i.id === edited.itens[0].id),
        "Backend atual recria IDs",
      );
      assert.equal((await api(`compras/${saved.id}`)).valorTotal, 4.88);
      assert.deepEqual(
        await api("estoques"),
        before,
        "Rascunhos não devem modificar estoque",
      );
      const deletion = await fetch(`${base}/api/compras/${saved.id}`, {
        method: "DELETE",
      });
      assert.equal(
        deletion.status,
        403,
        "Registrar mudança no comportamento de exclusão com dependentes",
      );
      assert.equal((await api(`compras/${saved.id}`)).itens.length, 1);
      console.log(
        "Compras reais: totais, reload, substituição de IDs e estoque inalterado; DELETE negado diretamente pelo backend (403).",
      );
      const reports = [];
      for (let i = 0; i < 25; i++) {
        const row = await api("compras", "POST", { ...body, dataCompra: "2020-06-15T12:00:00-03:00", itens: [{ idProdutoSku: inventory.product, quantidade: 1, custoUnitario: 2.34, desconto: 0 }] });
        assert.match(row.id, /^[0-9a-f-]{36}$/i);
        const status = ["RASCUNHO", "PARCIALMENTE_RECEBIDA", "RECEBIDA", "CANCELADA"][i % 4];
        await sql(`UPDATE compra SET status = '${status}' WHERE id = '${row.id}'`);
        reports.push({ id: row.id, status, total: row.valorTotal });
      }
      return { ...inventory, prefix, supplier: supplierId, reports };
    },
    async cleanup() {
      const suppliers = (await api("fornecedores")).filter((s) =>
        s.nomeFantasia?.startsWith(prefix),
      );
      const ids = new Set(suppliers.map((s) => s.id));
      if (supplierId) ids.add(supplierId);
      for (const id of ids) assert.match(id, /^[0-9a-f-]{36}$/i);
      const purchases = (await api("compras")).filter((p) =>
        ids.has(p.idFornecedor),
      );
      for (const purchase of purchases) {
        assert.match(purchase.id, /^[0-9a-f-]{36}$/i);
        // Reset only owned report fixtures so the normal deletion guard permits cleanup.
        await sql(`BEGIN; UPDATE compra SET status = 'RASCUNHO' WHERE id = '${purchase.id}'; DELETE FROM item_compra WHERE id_compra = '${purchase.id}'; COMMIT;`);
        await sql(`DELETE FROM item_compra WHERE id_compra='${purchase.id}'; DELETE FROM compra WHERE id='${purchase.id}'`);
      }
      for (const id of ids) await api(`fornecedores/${id}`, "DELETE");
      console.log(
        `Limpeza compras: ${purchases.length} cabeçalhos e ${ids.size} fornecedores removidos após seus itens.`,
      );
    },
  };
}
