"use client";
import { FieldHeader } from "./ui/field";
import { RelatedField } from "./related-field";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Pencil, Plus, Search, UsersRound } from "lucide-react";
import { authRequest } from "@/lib/auth-client";
import type { Identity } from "@/lib/auth";
import { Button } from "./ui/button";
import { PasswordInput } from "./ui/password-input";
import { Input, Select } from "./ui/input";
import { Badge } from "./ui/badge";
import { Panel, PanelHeader, PanelTitle, PanelDescription } from "./ui/panel";
import { Table, TableCell, TableHead, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { FormActions } from "./ui/form-actions";
import { Notice } from "./ui/notice";
import { Empty, Heading, Loading, Status } from "./feedback";

type Account = {
  id: string; nome: string; usuario: string; email: string; cargo: Identity["cargo"];
  status: "ATIVO" | "INATIVO"; lojas: string[]; revisado: boolean; alterarSenha: boolean;
};
const roles: Record<Account["cargo"], string> = { ADMIN: "Administrador", GER: "Gerente", FUNC: "Funcionário" };
const blank = { nome: "", usuario: "", email: "", cargo: "FUNC" as Account["cargo"], status: "ATIVO" as Account["status"], lojas: [] as string[], senha: "" };
const fieldClass = "flex flex-col gap-[7px] text-[12px] font-medium text-[#49604e]";

export function Users() {
  const client = useQueryClient();
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => authRequest<Account[]>("usuarios") });
  const stores = useQuery({ queryKey: ["admin-stores"], queryFn: () => authRequest<{ id: string; nomeFantasia: string }[]>("lojas") });
  // undefined closes the dialog; null creates an account; an account edits it.
  const [editing, setEditing] = useState<Account | null | undefined>();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const opener = useRef<HTMLButtonElement | null>(null);
  const createButton = useRef<HTMLButtonElement | null>(null);
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const rows = (users.data || []).filter(user =>
    (!term || `${user.nome} ${user.usuario} ${user.email}`.toLocaleLowerCase("pt-BR").includes(term)) &&
    (!role || user.cargo === role) && (!status || user.status === status),
  ).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.email.localeCompare(b.email, "pt-BR"));
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, pages);
  const visibleRows = rows.slice((currentPage - 1) * 20, currentPage * 20);

  function openEditor(user: Account | null, button: HTMLButtonElement) {
    opener.current = button;
    setEditing(user);
    setForm(user ? { nome: user.nome, usuario: user.usuario, email: user.email, cargo: user.cargo, status: user.status, lojas: [...user.lojas], senha: "" } : blank);
    setError("");setSuccess("");
  }
  function closeEditor() {
    if (busy) return;
    setEditing(undefined);setForm(blank);setError("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !stores.isSuccess) return;
    setBusy(true);setError("");
    try {
      await authRequest(`usuarios${editing ? `/${editing.id}` : ""}`, {
        ...form, ...(editing && !form.senha ? { senha: undefined } : {}),
      }, editing ? "PUT" : "POST");
      setSuccess(editing ? "Usuário atualizado com sucesso." : "Usuário cadastrado com sucesso.");
      setEditing(undefined);setForm(blank);
      await client.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  function storeDescription(user: Account) {
    if (user.cargo === "ADMIN") return "Todas as lojas";
    if (!user.lojas.length) return "Sem lojas atribuídas";
    return user.lojas.map(id => stores.data?.find(store => store.id === id)?.nomeFantasia || "Loja indisponível").join(", ");
  }

  return <>
    <Heading eyebrow="ADMINISTRAÇÃO" title="Usuários" description="Gerencie o acesso da equipe e as lojas de cada usuário."
      action={<Button ref={createButton} onClick={event => openEditor(null, event.currentTarget)}><Plus size={16} />Novo usuário</Button>} />
    {success && <Notice role="status"><CheckCircle2 size={18} className="shrink-0" />{success}</Notice>}
    {users.isError && <Notice role="alert" variant="error"><AlertCircle size={18} className="shrink-0" /><div><p>{users.error.message}</p><Button variant="outline" size="sm" onClick={() => void users.refetch()}>Tentar novamente</Button></div></Notice>}
    <Panel>
      <PanelHeader><div><PanelTitle>Usuários cadastrados</PanelTitle><PanelDescription>{users.data ? `${users.data.length} conta(s) na Vila Verde` : "Consultando contas…"}</PanelDescription></div><UsersRound size={21} className="text-muted" /></PanelHeader>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-[23px] py-[19px] mobile:gap-[9px] mobile:p-[15px]">
        <div className="relative min-w-[190px] flex-1 mobile:basis-full"><Search size={16} className="absolute top-3 left-3 text-[#8a968c]" /><Input aria-label="Buscar usuários" placeholder="Buscar por nome ou e-mail…" className="pl-9" value={search} onChange={event => { setSearch(event.target.value);setPage(1); }} /></div>
        <Select aria-label="Filtrar por cargo" className="w-auto mobile:flex-1" value={role} onChange={event => { setRole(event.target.value);setPage(1); }}><option value="">Todos os cargos</option>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
        <Select aria-label="Filtrar por status" className="w-auto mobile:flex-1" value={status} onChange={event => { setStatus(event.target.value);setPage(1); }}><option value="">Todos os status</option><option value="ATIVO">Ativos</option><option value="INATIVO">Inativos</option></Select>
      </div>
      {users.isPending ? <Loading /> : !users.data ? null : !rows.length ? <Empty title={users.data.length ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"} description={users.data.length ? "Ajuste a busca ou os filtros para encontrar uma conta." : "Use Novo usuário para cadastrar a primeira conta."} /> : <>
        <Table><thead><TableRow>{["USUÁRIO", "CARGO", "STATUS", "LOJAS", "AÇÕES"].map(title => <TableHead key={title} className={title === "AÇÕES" ? "text-right" : undefined}>{title}</TableHead>)}</TableRow></thead><tbody>
          {visibleRows.map(user => <TableRow key={user.id}>
            <TableCell><p className="font-semibold text-foreground">{user.nome}</p><p className="mt-1 text-muted">{user.usuario} · {user.email}</p>{(!user.revisado || user.alterarSenha) && <Badge className="mt-2">{!user.revisado ? "Revisão pendente" : "Troca de senha pendente"}</Badge>}</TableCell>
            <TableCell>{roles[user.cargo]}</TableCell><TableCell><Status value={user.status} /></TableCell>
            <TableCell className="max-w-[300px] whitespace-normal">{storeDescription(user)}</TableCell>
            <TableCell className="text-right"><Button variant="ghost" size="icon" aria-label={`Editar ${user.nome}`} onClick={event => openEditor(user, event.currentTarget)}><Pencil size={16} /></Button></TableCell>
          </TableRow>)}
        </tbody></Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 text-[12px] text-muted mobile:px-4">
          <p>{rows.length} usuário(s) encontrado(s)</p><div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span>Página {currentPage} de {pages}</span><Button variant="outline" size="sm" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Próxima</Button></div>
        </div>
      </>}
    </Panel>
    <Dialog open={editing !== undefined} onOpenChange={open => { if (!open) closeEditor(); }}>
      <DialogContent className="max-w-[640px]" onCloseAutoFocus={event => { event.preventDefault();(opener.current?.isConnected ? opener.current : createButton.current)?.focus(); }} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }}>
        <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        <DialogDescription>{editing ? "Atualize os dados, as permissões e as lojas desta conta." : "Cadastre uma conta para a equipe. A senha temporária deve ser substituída no primeiro acesso."}</DialogDescription>
        <form onSubmit={save} aria-busy={busy}>
          {error && <Notice role="alert" variant="error"><AlertCircle size={18} className="shrink-0" /><p>{error}</p></Notice>}
          <fieldset disabled={busy} className="grid grid-cols-2 gap-5 mobile:grid-cols-1">
            <label className={`${fieldClass} col-span-full`}>Nome<Input required value={form.nome} onChange={event => setForm({ ...form, nome: event.target.value })} /></label>
            <label className={`${fieldClass} col-span-full`}>Usuário<Input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._\-]{3,32}" autoComplete="off" value={form.usuario} onChange={event => setForm({ ...form, usuario: event.target.value })} /></label>
            <label className={`${fieldClass} col-span-full`}>E-mail<Input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
            <label className={fieldClass}>Cargo<Select aria-label="Cargo" value={form.cargo} onChange={event => setForm({ ...form, cargo: event.target.value as Account["cargo"] })}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
            <label className={fieldClass}>Status<Select aria-label="Status" value={form.status} onChange={event => setForm({ ...form, status: event.target.value as Account["status"] })}><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option></Select></label>
            <fieldset className="col-span-full"><legend><FieldHeader actions={<RelatedField field="idLoja" query={stores}/>}>Lojas permitidas</FieldHeader></legend>
              {stores.isPending ? <p role="status" className="text-[12px] text-muted">Carregando lojas…</p> : stores.isError ? <Notice role="alert" variant="error"><div><p>{stores.error.message}</p><Button type="button" variant="outline" size="sm" onClick={() => void stores.refetch()}>Tentar novamente</Button></div></Notice> : form.cargo === "ADMIN" ? <p className="rounded-lg border border-border bg-background p-3 text-[12px] text-muted">Administradores acessam todas as lojas, sem precisar de atribuições individuais.</p> : !stores.data?.length ? <p className="rounded-lg border border-border bg-background p-3 text-[12px] text-muted">Nenhuma loja cadastrada. <Link href="/lojas?novo=1" target="_blank" rel="noopener noreferrer" className="text-primary underline">Cadastre uma loja</Link> para liberar operações por loja. Você pode salvar esta conta sem atribuições.</p> : <><div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border p-3 mobile:grid-cols-1">{stores.data.map(store => <label key={store.id} className="flex items-start gap-2 rounded p-2 text-[12px] hover:bg-background"><input type="checkbox" className="mt-0.5 accent-primary" checked={form.lojas.includes(store.id)} onChange={event => setForm({ ...form, lojas: event.target.checked ? [...form.lojas, store.id] : form.lojas.filter(id => id !== store.id) })} /><span>{store.nomeFantasia}</span></label>)}</div><p className="mt-2 text-[11px] text-muted">As operações por loja ficam restritas às lojas selecionadas.</p></>}
            </fieldset>
            <label className={`${fieldClass} col-span-full`}>Senha temporária<PasswordInput aria-label="Senha temporária" autoComplete="new-password" minLength={8} maxLength={72} required={!editing} value={form.senha} onChange={event => setForm({ ...form, senha: event.target.value })} /><small className="font-normal text-muted">{editing ? "Preencha para definir uma senha temporária. A pessoa deverá trocá-la no próximo acesso; em branco mantém a atual." : "Use ao menos 8 caracteres e entregue a senha à pessoa por um canal privado."}</small></label>
          </fieldset>
          <FormActions><Button type="button" variant="outline" disabled={busy} onClick={closeEditor}>Cancelar</Button><Button type="submit" disabled={busy || !stores.isSuccess}>{busy ? "Salvando…" : "Salvar conta"}</Button></FormActions>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
