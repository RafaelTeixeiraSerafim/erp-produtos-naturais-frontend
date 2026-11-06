// Fixture backend for browser tests only. The application retains its real server guards.
import http from "node:http";
const permissions = ["catalog.read","customers.read","customers.write","sales.read","sales.create","inventory.read","overview.read"];
const identity = (role, id = "11111111-1111-4111-8111-111111111111", temporary = false) => ({ id, nome: "Operador", email: `${role.toLowerCase()}@example.test`, cargo: role, lojas: role === "ADMIN" ? [] : ["00000000-0000-4000-8000-000000000001"], alterarSenha: temporary, permissions: [...permissions, ...(role !== "FUNC" ? ["catalog.write","suppliers.read","suppliers.write","purchases.read","purchases.write"] : []), ...(role === "ADMIN" ? ["users.manage","stores.manage"] : [])] });
const seeds = new Map([["fixture-admin",identity("ADMIN")],["fixture-manager",identity("GER")],["fixture-func",identity("FUNC")],["fixture-temporary",identity("ADMIN",undefined,true)],["fixture-other",identity("ADMIN","22222222-2222-4222-8222-222222222222")]]);
const sessions = new Map(seeds);
let accounts = [{...identity("FUNC"), status:"ATIVO", revisado:true}];
http.createServer(async (req,res) => {
  const path = new URL(req.url,"http://localhost").pathname;
  let raw=""; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const token = req.headers.cookie?.match(/(?:^|;\s*)SESSION=([^;]+)/)?.[1];
  const user = sessions.get(token);
  const send = (status, data) => { res.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(status===204 ? undefined : JSON.stringify(data)); };
  if (path === "/api/auth/csrf") return send(200,{token:"fixture-csrf",headerName:"X-CSRF-TOKEN"});
  if (path === "/api/auth/login") {
    if (body.senha !== "Fixture-password-123") return send(401,{message:"E-mail ou senha inválidos."});
    const key = body.email === "func@example.test" ? "fixture-func" : body.email === "ger@example.test" ? "fixture-manager" : body.email === "temporary@example.test" ? "fixture-temporary" : body.email === "other@example.test" ? "fixture-other" : "fixture-admin";
    const next = crypto.randomUUID(); sessions.set(next,seeds.get(key));res.setHeader("Set-Cookie",`SESSION=${next}; Path=/; HttpOnly`);return send(200,sessions.get(next));
  }
  if (!user) return send(401,{message:"Autenticação necessária"});
  if (path === "/api/auth/me") return send(200,user);
  if (path === "/api/auth/logout" || path === "/api/auth/alterar-senha") { sessions.delete(token);res.setHeader("Set-Cookie","SESSION=; Max-Age=0; Path=/");return send(204); }
  if (path === "/api/usuarios") {
    if(user.cargo!=="ADMIN")return send(403,{message:"Acesso negado"});
    if(req.method==="POST") {const row={...body,id:crypto.randomUUID(),revisado:true,alterarSenha:true};delete row.senha;accounts.push(row);return send(201,row);}
    return send(200,accounts);
  }
  if (path.startsWith("/api/usuarios/")) { const id=path.split("/").at(-1);accounts=accounts.map(a=>a.id===id ? {...a,...body,id}:a);return send(200,accounts.find(a=>a.id===id)); }
  return send(200,[]);
}).listen(8099,"127.0.0.1");
