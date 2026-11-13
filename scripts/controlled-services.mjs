// Test fixtures bound to loopback, owned and closed by the integration runner.
import http from "node:http";
export async function controlledServices() {
  let ibgeRequests=0;
  const server=http.createServer((req,res)=>{
    res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");
    if(req.url?.startsWith("/ibge/"))ibgeRequests++;
    if(req.url==="/stats")return res.end(JSON.stringify({ibgeRequests}));
    if(req.url==="/ibge/estados")return res.end(JSON.stringify([{id:42,sigla:"SC",nome:"Santa Catarina"},{id:43,sigla:"RS",nome:"Rio Grande do Sul"}]));
    if(req.url==="/ibge/estados/SC/municipios")return res.end(JSON.stringify([{id:4204608,nome:"Criciúma"}]));
    if(req.url==="/ibge/estados/RS/municipios")return res.end(JSON.stringify([{id:4314902,nome:"Porto Alegre"}]));
    res.statusCode=503;res.end("{}");
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  return {origin:`http://127.0.0.1:${server.address().port}`,close:async()=>{await new Promise(resolve=>server.close(resolve));}};
}
export function testCnpj(base=String(Date.now()).slice(-12).padStart(12,"0")) {
  let v=base;for(let n=12;n<14;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(v[i])*((n-1-i)%8+2);const d=11-sum%11;v+=d>=10?0:d;}return v;
}
