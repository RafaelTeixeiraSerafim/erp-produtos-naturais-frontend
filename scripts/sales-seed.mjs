// Disposable-only upstream probes. Never imported by application code.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export function salesSeed({ base, inventory, sql }) {
  const prefix = `stage4-${randomUUID().slice(0, 8)}`;
  let operator;
  async function api(resource, method = "GET", body) {
    const response = await fetch(`${base}/api/${resource}`, {
      method,
      headers: { "Content-Type": "application/json", ...(resource === "vendas" && method === "POST" ? {"Idempotency-Key":randomUUID()} : {}) },
      body: body && JSON.stringify(body),
    });
    assert(
      response.ok,
      `${method} ${resource}: ${response.status} ${response.ok ? "" : await response.text()}`,
    );
    return response.status === 204 ? undefined : response.json();
  }
  return {
    async seed() {
      operator = await api("auth/me");
      const customer = await api("clientes", "POST", {
        nome: prefix,
        dataNascimento: "2000-02-29",
      });
      const before = await api("estoques");
      const body = {
        idCliente: customer.id,
        idUsuario: operator.id,
        idLoja: inventory.store,
        observacao: "probe",
        itens: [inventory.product, inventory.otherProduct].map((idProduto) => ({
          idProduto,
          quantidade: 0.001,
          precoUnitario: 5,
          desconto: 0,
        })),
      };
      const saved = await api("vendas", "POST", body);
      assert.equal(saved.status, "ABERTA");
      assert.equal(saved.subtotal, 0.01);
      assert.equal(saved.valorTotal, 0.01);
      assert.equal(saved.observacao,"probe");
      assert.equal(saved.itens[0].totalItem,0.01);
      assert(saved.itens[0].unidadeSiglaSnapshot);
      assert.equal((await api(`vendas/${saved.id}`)).valorTotal, 0.01);
      assert.deepEqual(await api("estoques"), before);
      const missing = await fetch(`${base}/api/vendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          idCliente: undefined,
          idUsuario: undefined,
        }),
      });
      assert.equal(missing.status, 400);
      await missing.text();
      const negative = await fetch(`${base}/api/vendas`, { method:"POST", headers:{"Content-Type":"application/json","Idempotency-Key":randomUUID()}, body:JSON.stringify({...body,itens:[{...body.itens[0],quantidade:1,precoUnitario:-1}]}) });
      assert.equal(negative.status,400);
      const key=randomUUID();
      const create=()=>fetch(`${base}/api/vendas`,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":key},body:JSON.stringify(body)}).then(r=>r.json());
      const [first,replay]=await Promise.all([create(),create()]);assert.equal(first.id,replay.id);
      const cancelled=await api(`vendas/${first.id}/cancelar`,"POST",{versao:first.versao,motivo:"Probe"});
      assert.equal(cancelled.status,"CANCELADA");assert.deepEqual(await api("estoques"),before);
      console.log("Vendas: validação, observação, snapshots, idempotência concorrente e cancelamento sem baixa verificados.");
      // Mixed report statuses are inserted before browser suites, only in the owned DB.
      const reports = [];
      for (let i = 0; i < 25; i++) {
        const row = await api("vendas", "POST", { ...body, dataVenda: "2020-06-15T12:00:00-03:00", itens: [{ idProduto: inventory.product, quantidade: 1, precoUnitario: 1.23, desconto: 0 }] });
        assert.match(row.id, /^[0-9a-f-]{36}$/i);
        const status = ["ABERTA", "CONCLUIDA", "CANCELADA"][i % 3];
        await sql(`UPDATE venda SET legado=true,status = '${status}' WHERE id = '${row.id}'`);
        reports.push({ id: row.id, status, total: row.valorTotal });
      }
      return { ...inventory, prefix, operator: operator.id, customer: customer.id, reports };
    },
    async cleanup() {
      const customers = (await api("clientes")).filter((c) =>
        c.nome?.startsWith(prefix),
      );
      const ids = new Set(customers.map((c) => c.id));
      const sales = (await api("vendas")).filter(
        (v) => ids.has(v.idCliente) || v.idUsuario === operator?.id,
      );
      for (const sale of sales) {
        assert.match(sale.id,/^[0-9a-f-]{36}$/i);
        await sql(`DELETE FROM movimentacao_estoque WHERE id_venda='${sale.id}'; DELETE FROM venda_idempotencia WHERE venda_id='${sale.id}'; DELETE FROM produto_venda WHERE id_venda='${sale.id}'; DELETE FROM venda WHERE id='${sale.id}'`);
      }
      for (const customer of customers)
        await api(`clientes/${customer.id}`, "DELETE");

      console.log(
        `Limpeza vendas: ${sales.length} vendas e ${customers.length} clientes removidos; a conta pertence ao banco descartável.`,
      );
    },
  };
}
