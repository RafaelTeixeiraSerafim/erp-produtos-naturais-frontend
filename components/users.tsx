"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authRequest } from "@/lib/auth-client";
import type { Identity } from "@/lib/auth";
import { Button } from "./ui/button";
import { Input, Select } from "./ui/input";
import { Heading } from "./feedback";
type Account = { id: string; nome: string; email: string; cargo: Identity["cargo"]; status: "ATIVO" | "INATIVO"; lojas: string[]; revisado: boolean; alterarSenha: boolean };
const blank = { nome: "", email: "", cargo: "FUNC" as Account["cargo"], status: "ATIVO" as Account["status"], lojas: [] as string[], senha: "" };
export function Users() {
  const client = useQueryClient();
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => authRequest<Account[]>("usuarios") });
  const stores = useQuery({ queryKey: ["admin-stores"], queryFn: () => authRequest<{ id: string; nomeFantasia: string }[]>("lojas") });
  const [editing, setEditing] = useState<string | null>(null), [form, setForm] = useState(blank), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  return <><Heading title="Usuários" description="Gerencie contas, permissões e lojas. A senha temporária exige substituição no primeiro acesso." />
    {users.isError && <p role="alert">{users.error.message}</p>}
    {stores.isError && <p role="alert">{stores.error.message}</p>}
    <div className="my-5 space-y-3">{users.data?.map(user => <article key={user.id} className="flex flex-wrap items-center gap-3 rounded border border-border p-3"><div className="flex-1"><strong>{user.nome}</strong><p>{user.email} · {user.cargo} · {user.status}{!user.revisado ? " · Revisão pendente" : user.alterarSenha ? " · Troca de senha pendente" : ""}</p></div><Button variant="outline" onClick={() => { setEditing(user.id); setForm({ nome: user.nome, email: user.email, cargo: user.cargo, status: user.status, lojas: user.lojas, senha: "" }); }}>Editar {user.nome}</Button></article>)}</div>
    <form className="max-w-xl space-y-4 rounded border border-border bg-white p-5" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMessage("");
      try {
        await authRequest(`usuarios${editing ? `/${editing}` : ""}`, { ...form, ...(editing && !form.senha ? { senha: undefined } : {}) }, editing ? "PUT" : "POST");
        await client.invalidateQueries({ queryKey: ["admin-users"] }); setEditing(null); setForm(blank); setMessage("Conta salva.");
      } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
    }}>
      <h2 className="text-xl font-semibold">{editing ? "Editar conta" : "Criar conta"}</h2>
      <label className="block">Nome<Input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
      <label className="block">E-mail<Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
      <label className="block">Cargo<Select aria-label="Cargo" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value as Account["cargo"] })}><option value="ADMIN">Administrador</option><option value="GER">Gerente</option><option value="FUNC">Funcionário</option></Select></label>
      <label className="block">Status<Select aria-label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Account["status"] })}><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option></Select></label>
      <fieldset><legend>Lojas permitidas</legend>{stores.data?.map(store => <label className="block" key={store.id}><input type="checkbox" checked={form.lojas.includes(store.id)} onChange={e => setForm({ ...form, lojas: e.target.checked ? [...form.lojas, store.id] : form.lojas.filter(id => id !== store.id) })} /> {store.nomeFantasia}</label>)}<small>Administradores acessam todas as lojas. Outras contas precisam de atribuições.</small></fieldset>
      <label className="block">Senha temporária<Input aria-label="Senha temporária" type="password" autoComplete="new-password" minLength={12} maxLength={72} required={!editing} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} /><small>{editing ? "Preencha para redefinir a senha; em branco mantém a atual." : "Entregue a senha à pessoa por um canal privado."}</small></label>
      <Button disabled={busy || !stores.isSuccess}>Salvar conta</Button><Button type="button" variant="outline" onClick={() => { setEditing(null); setForm(blank); }}>Nova conta</Button>
    </form>{message && <p role="status" className="my-4">{message}</p>}</>;
}
