"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Identity } from "@/lib/auth";
import { internalDestination } from "@/lib/auth";
import { authRequest, renewCsrf } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { PasswordInput } from "./ui/password-input";
import { Input } from "./ui/input";
export const AuthContext = createContext<Identity | null>(null);
export const useIdentity = () => useContext(AuthContext);
export const useCan = (permission: string) => !!useIdentity()?.permissions.includes(permission);
export function useOperator() {
  const user = useIdentity();
  return { data: user ? [user] : [], isSuccess: !!user, isPending: !user, isFetching: false, isError: false, error: null, refetch: async () => {} };
}
export function AuthForm({ change = false }: { change?: boolean }) {
  const params = useSearchParams();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [next, setNext] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  return <form className="mx-auto my-12 max-w-md space-y-5 rounded-xl border border-border bg-white p-6" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (change) { await authRequest("auth/alterar-senha", { senhaAtual: password, novaSenha: next }); renewCsrf(); location.assign(`/login?returnTo=${encodeURIComponent(internalDestination(params.get("returnTo")))}`); }
      else { const user = await authRequest("auth/login", { login: email, senha: password }); renewCsrf(); location.assign(user.alterarSenha ? `/alterar-senha?returnTo=${encodeURIComponent(internalDestination(params.get("returnTo")))}` : internalDestination(params.get("returnTo"))); }
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }}>
    <h1 className="text-2xl font-semibold">{change ? "Alterar senha" : "Entrar na Vila Verde"}</h1>
    {change ? <p>Substitua sua senha temporária para acessar o sistema. Depois, entre com a nova senha.</p> : <label className="block">E-mail ou usuário<Input type="text" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>}
    <label className="block">{change ? "Senha atual" : "Senha"}<PasswordInput aria-label={change ? "Senha atual" : "Senha"} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
    {change && <label className="block">Nova senha<PasswordInput aria-label="Nova senha" autoComplete="new-password" required minLength={8} maxLength={72} value={next} onChange={e => setNext(e.target.value)} /><small>Use ao menos 8 caracteres.</small></label>}
    {error && <p role="alert">{error}</p>}
    <Button disabled={busy} type="submit">{busy ? "Aguarde…" : change ? "Salvar nova senha" : "Entrar"}</Button>
    {!change && <p><a href="/esqueci-senha" className="underline">Esqueci minha senha</a></p>}
    <AccountControls showPasswordChange={false} showIdentity={false} />
  </form>;
}
export function AccountControls({ showPasswordChange = true, showIdentity = true }: { showPasswordChange?: boolean; showIdentity?: boolean }) {
  const user = useIdentity(), client = useQueryClient();
  const details=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    function close(e: KeyboardEvent | MouseEvent) {
      if(!details.current?.open)return;
      if(e instanceof KeyboardEvent && e.key==="Escape") {details.current.open=false;details.current.querySelector("summary")?.focus();}
      else if(e instanceof MouseEvent && !details.current.contains(e.target as Node))details.current.open=false;
    }
    document.addEventListener("keydown",close);document.addEventListener("click",close);
    return ()=>{document.removeEventListener("keydown",close);document.removeEventListener("click",close);};
  },[]);
  const [error, setError] = useState("");
  if (!user) return null;
  const actions=<div className="flex flex-wrap items-center gap-2 text-xs">{showIdentity && <span>{user.nome} · {user.usuario}</span>}{showPasswordChange && <a href="/alterar-senha" className="underline">Alterar senha</a>}<Button type="button" variant="ghost" size="sm" onClick={async () => {
    if (!window.confirm("Sair e descartar os rascunhos locais desta conta neste ambiente?")) return;
    try {
      // Stop recovery writers in every tab before clearing the account's copies.
      const env = document.querySelector('meta[name="recovery-environment"]')?.getAttribute("content");
      const prefix = `vila:recovery:v2:${env}:${user.id}:`;
      window.dispatchEvent(new Event("auth-logout"));
      try {
        localStorage.setItem(`vila:logout:${env}:${user.id}`, crypto.randomUUID());
        for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key);
      } catch { /* Storage may be disabled; still invalidate the server session. */ }
      client.clear();
      await authRequest("auth/logout", {});
      renewCsrf(); location.assign("/login");
    } catch (e) { setError((e as Error).message); }
  }}>Sair</Button>{error && <p role="alert">{error}</p>}</div>;
  return showIdentity ? <details ref={details} className="relative ml-auto text-xs"><summary className="cursor-pointer rounded border border-border p-2">Conta · {user.usuario}</summary><div className="absolute right-0 z-50 mt-2 w-64 rounded border border-border bg-white p-4 shadow-lg">{actions}</div></details> : actions;
}
