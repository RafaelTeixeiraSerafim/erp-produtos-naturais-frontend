// Test-only fixture. SQL is executed exclusively in the integration runner's own
// container; this module is never imported by application routes.
import { randomUUID } from "node:crypto";
export function inventorySeed({ base, sql }) {
  const created = [];
  const productIds = [];
  const groupIds=[];
  async function api(resource, method = "GET", body) {
    const response = await fetch(`${base}/api/${resource}`, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Fixture ${method} ${resource}: ${response.status} ${await response.text()}`);
    return response.status === 204 ? undefined : response.json();
  }
  async function create(resource, body) {
    const row = await api(resource, "POST", body);
    if (!/^[0-9a-f-]{36}$/i.test(row.id)) throw new Error("ID de fixture inválido");
    created.push([resource, row.id]);
    return row.id;
  }
  return {
    async seed() {
      const category = await create("categorias", { nome: "Inventário integração" });
      const unit = await create("unidades-medida", { nome: "Quilograma integração", sigla: "kg" });
      for (const nome of ["Aveia integração", "Castanha integração"]) {
        const parent = await create("produtos", { nome, idCategoria: category, status: "ATIVO" });
        groupIds.push(parent);
        productIds.push(await create("produtos-sku", {idProduto:parent, sku:randomUUID(), descricaoApresentacao:"Granel", idUnidadeMedida:unit, tipoVenda:"PESO",status:"ATIVO"}));
      }
      const stores = [];
      for (const [i, nome] of ["Centro integração", "Bairro integração"].entries()) stores.push(await create("lojas", { nomeFantasia: nome, razaoSocial: nome, cnpj: `0000000000000${i}`, estado: "SC", cidade: "Criciúma", bairro: "Centro", numero: "1" }));
      const [p, q] = productIds, [a, b] = stores;
      const statements = ["BEGIN"];
      for (const [product, store, amount] of [[p, a, 1234.567], [p, b, 0], [q, a, -0.125]]) statements.push(`INSERT INTO estoque_produto (id,id_produto_sku,id_loja,quantidade_atual,atualizado_em) VALUES ('${randomUUID()}','${product}','${store}',${amount},'2026-11-04T03:00:00Z')`);
      for (const [i, date] of ["2026-11-04T02:59:59.999Z", "2026-11-04T03:00:00Z", "2026-11-05T02:59:59.999Z", "2026-11-05T03:00:00Z"].entries()) statements.push(`INSERT INTO movimentacao_estoque (id,id_produto_sku,id_loja,tipo,quantidade,data_movimentacao,observacao) VALUES ('${randomUUID()}','${p}','${a}','AJUSTE_ENTRADA',0.125,'${date}','Limite de data ${i}')`);
      statements.push(`INSERT INTO movimentacao_estoque (id,id_produto_sku,id_loja,tipo,quantidade,data_movimentacao,observacao) VALUES ('${randomUUID()}','${q}','${b}','AJUSTE_SAIDA',0.25,'2026-11-04T12:00:00Z','Outro produto e loja')`, "COMMIT");
      await sql(statements.join(";"));
      return { productGroup:groupIds[0], otherProductGroup:groupIds[1], product: p, otherProduct: q, store: a, otherStore: b };
    },
    async cleanup() {
      if (productIds.length) {
        const ids = productIds.map((id) => `'${id}'`).join(",");
        await sql(`BEGIN; DELETE FROM movimentacao_estoque WHERE id_produto_sku IN (${ids}); DELETE FROM estoque_produto WHERE id_produto_sku IN (${ids}); COMMIT;`);
      }
      const errors = [];
      for (const [resource, id] of created.reverse()) {
        try { await api(`${resource}/${id}`, "DELETE"); } catch (error) { errors.push(error.message); }
      }
      if (errors.length) throw new Error(errors.join("\n"));
    },
  };
}
