"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authRequest } from "@/lib/auth-client";
import { Input } from "./ui/input";
import { PasswordInput } from "./ui/password-input";
import { Button } from "./ui/button";
export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const [token,setToken]=useState("");
  const [login,setLogin]=useState(""),[senha,setSenha]=useState(""),[confirmacao,setConfirmacao]=useState("");
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
  useEffect(()=>{
    if(!reset)return;
    function receiveToken(){
      const raw=location.hash.slice(1);if(!raw)return;
      setToken(raw);setMessage("");setError("");setSenha("");setConfirmacao("");
      history.replaceState(null,"",location.pathname);
    }
    queueMicrotask(receiveToken);window.addEventListener("hashchange",receiveToken);
    return ()=>window.removeEventListener("hashchange",receiveToken);
  },[reset]);
  return <form className="mx-auto my-12 max-w-md space-y-5 rounded-xl border border-border bg-white p-6" onSubmit={async e=>{
    e.preventDefault();setError("");
    if(reset && senha!==confirmacao){setError("As senhas não coincidem.");return;}
    setBusy(true);
    try { const result=await authRequest<{message:string}>(reset?"auth/redefinir-senha":"auth/esqueci-senha",reset?{token,senha,confirmacao}:{login});setMessage(result.message);setSenha("");setConfirmacao(""); }
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }}>
    <h1 className="text-2xl font-semibold">{reset?"Redefinir senha":"Esqueci minha senha"}</h1>
    {message ? <p role="status">{message}</p> : reset ? <>
      {!token && <p role="alert">Link inválido. Solicite um novo link.</p>}
      <label className="block">Nova senha<PasswordInput aria-label="Nova senha" required minLength={8} maxLength={72} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)} /></label>
      <label className="block">Confirmar nova senha<PasswordInput aria-label="Confirmar nova senha" required minLength={8} maxLength={72} autoComplete="new-password" value={confirmacao} onChange={e=>setConfirmacao(e.target.value)} /></label>
    </> : <label className="block">E-mail ou usuário<Input required autoComplete="username" maxLength={254} value={login} onChange={e=>setLogin(e.target.value)} /></label>}
    {error && <p role="alert">{error}</p>}
    {!message && <Button disabled={busy || (reset && !token)} type="submit">{busy?"Aguarde…":reset?"Salvar nova senha":"Enviar link"}</Button>}
    <p><Link href="/login" className="underline">Voltar ao login</Link></p>
    {reset && <Link href="/esqueci-senha" className="underline">Solicitar outro link</Link>}
  </form>;
}
