// Run only against a disposable, local novaVersao backend. Never use shared Render.
import { authenticatedSession } from "./session.mjs";
import assert from "node:assert/strict";
if (process.env.CATALOG_DISPOSABLE !== "1")
  throw new Error("Defina CATALOG_DISPOSABLE=1 somente após confirmar que o backend e o banco são descartáveis; uma URL loopback não garante isso.");
const base = new URL(process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))
  throw new Error(
    "O smoke test aceita somente um servidor local e descartável.",
  );
const session = await authenticatedSession(base,process.env.INTEGRATION_ADMIN_EMAIL,process.env.INTEGRATION_ADMIN_PASSWORD);
const fetch = session.fetch;
const created = [];
async function api(resource, { method = "GET", body } = {}) {
  const response = await fetch(new URL(`/api/${resource}`, base), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error(
      `${method} ${resource}: HTTP ${response.status}: ${await response.text()}`,
    );
  return response.status === 204 ? undefined : response.json();
}
async function create(resource, body) {
  const row = await api(resource, { method: "POST", body });
  assert.ok(row.id);
  created.push([resource, row.id]);
  return row;
}
const stamp = `smoke-${Date.now()}`;
try {
  const category = await create("categorias", { nome: stamp });
  const unit = await create("unidades-medida", {
    nome: stamp,
    sigla: `s${Date.now()}`,
  });
  const store = await create("lojas", {
    nomeFantasia: stamp,
    razaoSocial: stamp,
    estado: "SC",
    cidade: "Criciúma",
    bairro: "Centro",
    numero: "1",
    complemento: "Teste descartável",
    cnpj: String(Date.now()).padStart(14, "0"),
  });
  const product = await create("produtos", {
    nome: stamp,
    idCategoria: category.id,
    descricao: "Teste de integração local",
    status: "ATIVO",
  });
  const sku = await create("produtos-sku", {
    idProduto: product.id,
    sku: stamp,
    status: "ATIVO",
    ean13: "7891234567890",
    dun14: "17891234567890",
    descricaoApresentacao: "Pacote",
    idUnidadeMedida:unit.id, tipoVenda:"UNIDADE",
  });
  await create("skus-loja", { idProdutoSku: sku.id, idLoja: store.id });
  const price = await create("skus-precos-loja", {
    idProdutoSku: sku.id,
    idLoja: store.id,
    preco: 12.9,
    dataInicio: "2026-11-03T12:00:00-03:00",
    dataFim: "2026-11-10T12:00:00-03:00",
  });
  assert.equal((await api(`produtos/${product.id}`)).nome, stamp);
  assert.ok(
    (await api(`produtos-sku?idProduto=${product.id}`)).some(
      (row) => row.id === sku.id,
    ),
  );
  assert.ok(
    (
      await api(`skus-loja?idProduto=${product.id}&idLoja=${store.id}`)
    ).some((row) => row.idProduto === product.id && row.idLoja === store.id),
  );
  assert.ok(
    (
      await api(
        `skus-precos-loja?idProduto=${product.id}&idLoja=${store.id}`,
      )
    ).some((row) => row.id === price.id && row.preco === 12.9),
  );
  await api(`produtos/${product.id}`, {
    method: "PUT",
    body: {
      nome: `${stamp}-editado`,
      idCategoria: category.id,
        descricao: "Atualizado",
      status: "INATIVO",
    },
  });
  const reloaded = await api(`produtos/${product.id}`);
  assert.equal(reloaded.tipoVenda, undefined);
  assert.equal(reloaded.status, "INATIVO");
  assert.equal(reloaded.nome, `${stamp}-editado`);
  console.log(
    "Smoke local passou: cadastros, SKU, vínculo, preço, edição e releitura pela API.",
  );
} finally {
  for (const [resource, id] of created.reverse())
    try {
      await api(`${resource}/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error(`Limpeza pendente: ${resource}/${id}`, error.message);
      process.exitCode = 1;
    }
}
