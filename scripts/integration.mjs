// Own every service used by this run; never target an existing backend/database.
import { controlledServices } from "./controlled-services.mjs";
import { authenticatedSession } from "./session.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { salesSeed } from "./sales-seed.mjs";
import { purchasesSeed } from "./purchases-seed.mjs";
import { inventorySeed } from "./inventory-seed.mjs";

const root = process.cwd();
const commit = "2d872ef29feea764c9e769c90fa29b40cb2d302e";
const logs = path.join(root, "integration-artifacts");
const temp = await mkdtemp(path.join(os.tmpdir(), "vila-integration-"));
const backend = path.join(temp, "backend");
const frontend = path.join(temp, "frontend");
const container = `vila-integration-${randomUUID()}`;
const password = randomUUID();
const adminPassword = randomUUID();
const nativeFetch = globalThis.fetch;
const children = new Set();
const streams = [];
let stopping = false;
let databaseCreated = false;
let inventoryFixture;
let purchasesFixture;
let salesFixture;
let backendProcess;
let controlled;
let inventorySqlStep = 0;
const env = { ...process.env, BACKEND_API_URL: "http://127.0.0.1:8081", FRONTEND_ORIGINS:"http://127.0.0.1:3100" };
await rm(logs, { recursive: true, force: true });
await mkdir(logs, { recursive: true });
function start(command, args, cwd, extraEnv = {}, log) {
  const stream = log ? openSync(path.join(temp, log), "w") : undefined;
  if (stream !== undefined) streams.push([stream, log]);
  const child = spawn(command, args, {
    cwd, env: { ...env, ...extraEnv }, detached: true,
    stdio: ["ignore", stream ?? "inherit", stream ?? "inherit"],
  });
  // Install listeners immediately, including for commands missing from PATH.
  child.done = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} terminou (${signal || code}); consulte ${log || "a saída"}.`)));
  });
  child.done.catch(() => {});
  children.add(child);
  return child;
}
async function run(command, args, cwd = root, extraEnv = {}, log) {
  const child = start(command, args, cwd, extraEnv, log);
  try { await child.done; } finally { children.delete(child); }
}
async function freePort(port) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", () => reject(new Error(`Porta ${port} ocupada. Encerre o serviço antes de executar; nenhum servidor existente será reutilizado.`)));
    server.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => server.close(resolve));
}
async function ready(url, child, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (stopping) throw new Error("Execução interrompida.");
    if (child.exitCode !== null || child.signalCode) { await child.done; throw new Error("Servidor encerrado antes da prontidão."); }
    try {
      const response = await nativeFetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* Retry until the owned API is ready. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`API não ficou pronta: ${url}`);
}
async function stop(child) {
  if (!child.pid) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  await Promise.race([child.done.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 3000))]);
  try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
}
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
  stopping = true;
  for (const child of children) if (child.pid && child !== backendProcess) { try { process.kill(-child.pid, "SIGTERM"); } catch {} }
});
try {
  await Promise.all([freePort(8081), freePort(3100)]);
  if (!process.version.startsWith("v24.")) throw new Error("Use Node.js 24.");
  await run("java", ["-version"], root, {}, "java.log");
  if (!/version "21[."]/.test(await readFile(path.join(temp, "java.log"), "utf8")))
    throw new Error("Use Java 21 (confira JAVA_HOME e PATH).");
  await mkdir(backend);
  await run("git", ["init", "--quiet", backend]);
  await run("git", ["fetch", "--depth=1", process.env.INTEGRATION_BACKEND_REPO || "https://github.com/Zayma1/erp-produtos-naturais-backend.git", commit], backend);
  await run("git", ["checkout", "--quiet", "--detach", "FETCH_HEAD"], backend);
  databaseCreated = true; // Also clean up if Docker is interrupted during startup.
  await run("docker", ["run", "--detach", "--rm", "--name", container,
    "--publish", "127.0.0.1::5432", "--env", "POSTGRES_DB=catalog",
    "--env", "POSTGRES_USER=catalog", "--env", "POSTGRES_PASSWORD", "postgres:16"], root,
    { POSTGRES_PASSWORD: password }, "database-start.log");
  const inspect = start("docker", ["inspect", "--format", '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', container], root, {}, "database-port.log");
  await inspect.done; children.delete(inspect);
  const port = (await readFile(path.join(temp, "database-port.log"), "utf8")).trim();
  for (let attempt = 0; ; attempt++) {
    try { await run("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "catalog", "-d", "catalog"]); break; }
    catch (error) { if (attempt === 60 || stopping) throw error; await new Promise((resolve) => setTimeout(resolve, 1000)); }
  }
  await run("chmod", ["+x", "mvnw"], backend);
  controlled=await controlledServices();
  const backendEnv = {
    CATALOG_DISPOSABLE:"1", SPRING_PROFILES_ACTIVE:"integration-controlled", IBGE_FIXTURE_URL:controlled.origin, SMTP_HOST:"127.0.0.1", SMTP_PORT:controlled.smtpPort, SMTP_AUTH:"false", SMTP_STARTTLS:"false", SMTP_USERNAME:"", SMTP_PASSWORD:"", SMTP_FROM:"no-reply@fixture.test", FRONTEND_PUBLIC_ORIGIN:"http://127.0.0.1:3100",
    SERVER_ADDRESS: "127.0.0.1", SERVER_PORT: "8081",
    DB_URL: `jdbc:postgresql://127.0.0.1:${port}/catalog`, DB_USER: "catalog", DB_PASSWORD: password, SESSION_COOKIE_SECURE: "false",
  };
  await run("./mvnw", ["--batch-mode", "--no-transfer-progress", "test", "-Dtest=IntegrationBootstrapTests"], backend,
    { ...backendEnv, CATALOG_DISPOSABLE:"1", INTEGRATION_ADMIN_PASSWORD:adminPassword }, "bootstrap.log");
  const api = start("./mvnw", ["--batch-mode", "--no-transfer-progress", "spring-boot:test-run", "-Dspring-boot.run.main-class=com.vilaverde.erp.ControlledIntegrationApplication"], backend, backendEnv, "backend.log");
  backendProcess = api;
  console.log(`Backend fixado em ${commit}; aguardando API real…`);
  await ready("http://127.0.0.1:8081/api/auth/csrf", api, 600000);
  assert.equal((await nativeFetch("http://127.0.0.1:8081/api/categorias")).status,401);
  process.env.CATALOG_DISPOSABLE="1";
  const session=await authenticatedSession("http://127.0.0.1:8081","stage8-admin@example.test",adminPassword,nativeFetch);
  globalThis.fetch=session.fetch;
  const states=await (await session.fetch("http://127.0.0.1:8081/api/localidades/estados")).json();
  assert.equal(states.dados?.length,2,"Integration must use the controlled IBGE catalog");
  assert((await (await nativeFetch(`${controlled.origin}/stats`)).json()).ibgeRequests>0,"The backend must reach the owned IBGE fixture");
  inventoryFixture = inventorySeed({ base: "http://127.0.0.1:8081", sql: (statement) => run("docker", ["exec", container, "psql", "-U", "catalog", "-d", "catalog", "-v", "ON_ERROR_STOP=1", "-c", statement], root, {}, `inventory-sql-${++inventorySqlStep}.log`) });
  const inventory = await inventoryFixture.seed();
  purchasesFixture = purchasesSeed({ base: "http://127.0.0.1:8081", inventory, sql: (statement) => run("docker", ["exec", container, "psql", "-U", "catalog", "-d", "catalog", "-v", "ON_ERROR_STOP=1", "-c", statement], root, {}, `purchases-sql-${++inventorySqlStep}.log`) });
  const purchases = await purchasesFixture.seed();
  salesFixture = salesSeed({ base: "http://127.0.0.1:8081", inventory, sql: (statement) => run("docker", ["exec", container, "psql", "-U", "catalog", "-d", "catalog", "-v", "ON_ERROR_STOP=1", "-c", statement], root, {}, `sales-sql-${++inventorySqlStep}.log`) });
  const sales = await salesFixture.seed();
  await cp(root, frontend, { recursive: true, filter: (source) =>
    ![".git", ".next", "node_modules", "integration-artifacts", "playwright-report", "playwright-live-report", "test-results"].includes(path.basename(source)) && !path.basename(source).startsWith(".env") });
  // Reuse only installed dependencies, never a running server or build directory.
  await run("ln", ["-s", path.join(root, "node_modules"), path.join(frontend, "node_modules")]);
  await run("npm", ["run", "build"], frontend, {}, "frontend-build.log");
  const web = start("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3100"], frontend, {}, "frontend.log");
  await ready("http://127.0.0.1:3100/api/auth/csrf", web, 60000);
  assert.equal((await nativeFetch("http://127.0.0.1:3100/api/categorias")).status,401);
  const proxySession=await authenticatedSession("http://127.0.0.1:3100","stage8-admin@example.test",adminPassword,nativeFetch);
  const testEnv = { CONTROLLED_SERVICES_URL:controlled.origin, INTEGRATION_ADMIN_EMAIL:"stage8-admin@example.test", INTEGRATION_ADMIN_PASSWORD:adminPassword, LIVE_SESSION:JSON.stringify(proxySession.storageState), LIVE_HEADERS:JSON.stringify(proxySession.headers), SMOKE_BASE_URL: "http://127.0.0.1:3100", CATALOG_DISPOSABLE: "1", INVENTORY_FIXTURE: JSON.stringify(inventory), SALES_FIXTURE: JSON.stringify(sales), PURCHASES_FIXTURE: JSON.stringify(purchases) };
  await run("npm", ["run", "test:live"], root, testEnv);
  await run("npx", ["playwright", "test", "--config=playwright.live.config.ts"], root, testEnv);
  // A real process restart must retain operational receipts, stock, quantities and movements.
  const snapshot = async () => Object.fromEntries(await Promise.all(["devolucoes-clientes", "devolucoes-fornecedores", "ajustes-estoque", "transferencias-estoque", "vendas", "recebimentos-compras", "compras", "estoques", "movimentacoes-estoque"].map(async resource => {
    const rows = await (await fetch(`http://127.0.0.1:8081/api/${resource}`)).json();
    if (["devolucoes-clientes", "devolucoes-fornecedores", "ajustes-estoque", "transferencias-estoque", "vendas", "recebimentos-compras"].includes(resource)) for (let i=0; i<rows.length; i++) rows[i] = await (await fetch(`http://127.0.0.1:8081/api/${resource}/${rows[i].id}`)).json();
    return [resource, rows.sort((a,b) => a.id.localeCompare(b.id))];
  })));
  const beforeRestart = await snapshot();
  for (const resource of ["devolucoes-clientes","devolucoes-fornecedores"]) assert(beforeRestart[resource].some(r=>r.status==="CONCLUIDA" && r.idConfirmador),"Return browser tests must persist completed documents");
  assert(beforeRestart["ajustes-estoque"].some(r=>r.status==="CONCLUIDO" && r.idConfirmador),"Adjustment browser tests must persist confirmed documents");
  assert(beforeRestart["recebimentos-compras"].some(r => r.status === "CONCLUIDO"), "Receiving browser tests must persist confirmed receipts");
  assert(beforeRestart["transferencias-estoque"].some(t=>t.status==="CONCLUIDA" && t.idConfirmador),"Transfer browser tests must persist completed transfers");
  assert(beforeRestart.vendas.some(r=>r.status==="CONCLUIDA" && r.idConfirmador),"Sales browser tests must persist confirmed sales");
  await stop(api); children.delete(api);
  backendProcess = start("./mvnw", ["--batch-mode", "--no-transfer-progress", "spring-boot:test-run", "-Dspring-boot.run.main-class=com.vilaverde.erp.ControlledIntegrationApplication"], backend, backendEnv, "backend-restart.log");
  await ready("http://127.0.0.1:8081/api/auth/csrf", backendProcess, 600000);
  assert.deepEqual(await snapshot(), beforeRestart, "Backend restart must retain all operational data");
  console.log("Integração real concluída: smoke, Chromium desktop/mobile e persistência após reiniciar o backend.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if(controlled)await controlled.close();
  if (inventoryFixture) {
    try { await run("docker", ["exec",container,"psql","-U","catalog","-d","catalog","-v","ON_ERROR_STOP=1","-c","BEGIN; DELETE FROM movimentacao_estoque WHERE id_devolucao_cliente IS NOT NULL OR id_devolucao_fornecedor IS NOT NULL; DELETE FROM devolucao_cliente_idempotencia; DELETE FROM devolucao_fornecedor_idempotencia; DELETE FROM item_devolucao_cliente; DELETE FROM item_devolucao_fornecedor; DELETE FROM devolucao_cliente; DELETE FROM devolucao_fornecedor; DELETE FROM movimentacao_estoque WHERE id_ajuste_estoque IS NOT NULL; DELETE FROM ajuste_idempotencia; DELETE FROM item_ajuste_estoque; DELETE FROM ajuste_estoque; DELETE FROM estoque_produto WHERE id_produto_sku IN (SELECT s.id FROM produto_sku s JOIN produto p ON p.id=s.id_produto WHERE p.nome LIKE 'Ajuste integração %'); DELETE FROM produto_sku WHERE id_produto IN (SELECT id FROM produto WHERE nome LIKE 'Ajuste integração %'); DELETE FROM produto WHERE nome LIKE 'Ajuste integração %'; DELETE FROM movimentacao_estoque WHERE id_transferencia IS NOT NULL; DELETE FROM transferencia_idempotencia; DELETE FROM item_transferencia; DELETE FROM transferencia_estoque; COMMIT;"],root,{},"transfers-cleanup.log"); }
    catch(error) {process.exitCode=1;console.error(`Falha na limpeza de transferências: ${error.message}`);}
  }
  if (purchasesFixture && salesFixture) {
    try {
      // Only receipts of the runner's known supplier fixtures; remove them before the operator.
      const suppliers = (await (await fetch("http://127.0.0.1:8081/api/fornecedores")).json()).filter(s => s.nomeFantasia?.startsWith("stage3-"));
      const ids = suppliers.map(s => { assert.match(s.id,/^[0-9a-f-]{36}$/i); return `'${s.id}'`; });
      if (ids.length) await run("docker", ["exec", container, "psql", "-U", "catalog", "-d", "catalog", "-v", "ON_ERROR_STOP=1", "-c", `BEGIN; DELETE FROM movimentacao_estoque WHERE id_item_recebimento_compra IN (SELECT i.id FROM item_recebimento_compra i JOIN recebimento_compra r ON r.id=i.id_recebimento_compra JOIN compra c ON c.id=r.id_compra WHERE c.id_fornecedor IN (${ids})); DELETE FROM item_recebimento_compra WHERE id_recebimento_compra IN (SELECT r.id FROM recebimento_compra r JOIN compra c ON c.id=r.id_compra WHERE c.id_fornecedor IN (${ids})); DELETE FROM recebimento_compra WHERE id_compra IN (SELECT id FROM compra WHERE id_fornecedor IN (${ids})); COMMIT;`], root, {}, "receipts-cleanup.log");
    } catch(error) { process.exitCode=1; console.error(`Falha na limpeza de recebimentos: ${error.message}`); }
  }
  if (salesFixture) {
    try { await salesFixture.cleanup(); }
    catch (error) { process.exitCode = 1; console.error(`Falha na limpeza de vendas: ${error.message}`); }
  }
  if (purchasesFixture) {
    try { await purchasesFixture.cleanup(); }
    catch (error) { process.exitCode = 1; console.error(`Falha na limpeza de compras: ${error.message}`); }
  }
  if (inventoryFixture) {
    try { await run("docker", ["exec",container,"psql","-U","catalog","-d","catalog","-v","ON_ERROR_STOP=1","-c","BEGIN; DELETE FROM estoque_produto WHERE id_produto_sku IN (SELECT s.id FROM produto_sku s JOIN produto p ON p.id=s.id_produto WHERE p.nome LIKE 'Devolução integração %' OR p.nome LIKE 'SKU integração %'); DELETE FROM produto_sku WHERE id_produto IN (SELECT id FROM produto WHERE nome LIKE 'Devolução integração %' OR nome LIKE 'SKU integração %'); DELETE FROM produto WHERE nome LIKE 'Devolução integração %' OR nome LIKE 'SKU integração %'; COMMIT;"],root,{},"returns-products-cleanup.log"); } catch(error) {process.exitCode=1;console.error(`Falha na limpeza de produtos de devolução: ${error.message}`);}
    try { await inventoryFixture.cleanup(); }
    catch (error) { process.exitCode = 1; console.error(`Falha na limpeza de estoque: ${error.message}`); }
  }
  for (const child of children) {
    try { await stop(child); }
    catch (error) { process.exitCode = 1; console.error(`Falha ao encerrar processo: ${error.message}`); }
  }
  // rm -f is idempotent even when startup failed before container creation.
  try { if (databaseCreated) await run("docker", ["rm", "--force", container], root, {}, "database-cleanup.log"); }
  catch { process.exitCode = 1; console.error(`Falha ao remover ${container}.`); }
  for (const [stream, name] of streams) {
    closeSync(stream);
    const raw = await readFile(path.join(temp, name), "utf8");
    await writeFile(path.join(logs, name), raw.replaceAll(password, "[REDACTED]").replaceAll(adminPassword,"[REDACTED]").replace(/(Using generated security password:) .*/g, "$1 [REDACTED]"));
  }
  await rm(temp, { recursive: true, force: true });
  if (stopping) process.exitCode = 1;
}
