// Test fixtures bound to loopback, owned and closed by the integration runner.
import http from "node:http";
import net from "node:net";
export async function controlledServices() {
  const messages=[];let ibgeRequests=0;
  const server=http.createServer((req,res)=>{
    res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");
    if(req.url?.startsWith("/ibge/"))ibgeRequests++;
    if(req.url==="/stats")return res.end(JSON.stringify({ibgeRequests}));
    if(req.url==="/messages")return res.end(JSON.stringify(messages));
    if(req.url==="/ibge/estados")return res.end(JSON.stringify([{id:42,sigla:"SC",nome:"Santa Catarina"},{id:43,sigla:"RS",nome:"Rio Grande do Sul"}]));
    if(req.url==="/ibge/estados/SC/municipios")return res.end(JSON.stringify([{id:4204608,nome:"Criciúma"}]));
    if(req.url==="/ibge/estados/RS/municipios")return res.end(JSON.stringify([{id:4314902,nome:"Porto Alegre"}]));
    res.statusCode=503;res.end("{}");
  });
  const sockets=new Set();
  const smtp=net.createServer(socket=>{
    sockets.add(socket);socket.on("close",()=>sockets.delete(socket));socket.on("error",()=>{});
    socket.write("220 localhost SMTP\r\n");let buffer="",data=false,body="",to="";
    socket.on("data",chunk=>{
      buffer+=chunk.toString();let index;
      while((index=buffer.indexOf("\r\n"))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+2);
        if(data){if(line==="."){messages.push({to,body});body="";data=false;socket.write("250 captured\r\n");}else body+=line+"\n";}
        else if(line==="DATA"){data=true;socket.write("354 end with dot\r\n");}
        else if(line==="QUIT")socket.end("221 bye\r\n");
        else {if(line.startsWith("RCPT TO:"))to=line.slice(8).trim();socket.write("250 OK\r\n");}
      }
    });
  });
  await Promise.all([new Promise(resolve=>server.listen(0,"127.0.0.1",resolve)),new Promise(resolve=>smtp.listen(0,"127.0.0.1",resolve))]);
  return {origin:`http://127.0.0.1:${server.address().port}`,smtpPort:String(smtp.address().port),close:async()=>{for(const socket of sockets)socket.destroy();await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>smtp.close(resolve))]);}};
}
export function testCnpj(base=String(Date.now()).slice(-12).padStart(12,"0")) {
  let v=base;for(let n=12;n<14;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(v[i])*((n-1-i)%8+2);const d=11-sum%11;v+=d>=10?0:d;}return v;
}
