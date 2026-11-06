"use client";
import { useIdentity } from "./auth";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { decodeRecovery, recoveryKey, type Recovery } from "@/lib/recovery";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";

export function useDocumentRecovery<T>({ context, initial, values, setValues, schema, baseline = "", applicable = true }: {
  context: string; initial: T; values: T; setValues: (value: T) => void; schema: z.ZodType<T>;
  baseline?: string; applicable?: boolean;
}) {
  const user = useIdentity();
  const router = useRouter();
  const [original] = useState(initial);
  const [originalBaseline, setOriginalBaseline] = useState(baseline);
  const [pending, setPending] = useState<Recovery<T> | null>(null);
  const [conflict, setConflict] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [committed, setCommitted] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const state = useRef({ key: "", seen: null as string | null, initialized: false, committed: false, blocked: false, values, baseline, applicable, dirty: false });
  const dirty = !committed && JSON.stringify(values) !== JSON.stringify(original);
  useLayoutEffect(() => { Object.assign(state.current, { values, baseline: originalBaseline, applicable, dirty }); });
  function fail() { setMessage("Recuperação indisponível neste navegador. Você pode continuar editando, mas as alterações podem ser perdidas ao sair."); }
  function read(raw: string | null) {
    return raw ? decodeRecovery(raw, schema) : null;
  }
  function checkExternal() {
    const s = state.current;
    const raw = localStorage.getItem(s.key);
    if (raw === s.seen) return false;
    s.blocked = true;
    s.seen = raw;
    try { setPending(read(raw)); } catch { setPending(null); }
    setConflict(true);
    return true;
  }
  function flush() {
    const s = state.current;
    if (s.committed) return true;
    if (!s.initialized || s.blocked) return false;
    try {
      if (checkExternal()) return false;
      if (!s.dirty) {
        localStorage.removeItem(s.key); s.seen = null; setMessage(""); return true;
      }
      const record: Recovery<T> = { version: 1, updatedAt: Date.now(), revision: crypto.randomUUID(), baseline: s.baseline, values: s.values };
      const raw = JSON.stringify(record);
      // Unchanged values do not extend the seven-day lifetime.
      if (s.seen && JSON.stringify(read(s.seen)?.values) === JSON.stringify(s.values)) return true;
      localStorage.setItem(s.key, raw); s.seen = raw;
      setMessage("Recuperação salva neste navegador");
      return true;
    } catch { fail(); return false; }
  }
  function clear(force = false) {
    const s = state.current;
    try {
      if (!force && checkExternal()) return false;
      localStorage.removeItem(s.key); s.seen = null;
      setMessage(""); return true;
    } catch { fail(); return false; }
  }
  /* Reading browser storage requires a client effect; the resulting decision gates editing. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const s = state.current;
    const environment = document.querySelector('meta[name="recovery-environment"]')?.getAttribute("content");
    if (!environment || !user) { fail(); setReady(true); return; }
    s.key = recoveryKey(environment, user.id, context);
    try {
      s.seen = localStorage.getItem(s.key);
      try {
        const copy = read(s.seen);
        if (copy) { s.blocked = true; setPending(copy); }
      } catch {
        localStorage.removeItem(s.key); s.seen = null;
        setMessage("Cópia de recuperação expirada, incompatível ou inválida; ela foi descartada.");
      }
      s.initialized = true;
    } catch { fail(); }
    setReady(true);
    const storage = (event: StorageEvent) => {
      if (event.key !== s.key && event.key !== null) return;
      try { checkExternal(); } catch { fail(); }
    };
    const exit = () => flush();
    const logout = () => { s.committed = true; s.dirty = false; };
    const expired = () => { flush(); s.blocked = true; s.committed = true; };
    const accountStorage = (e: StorageEvent) => { if (e.key === `vila:logout:${environment}:${user.id}`) { logout(); location.assign("/login"); } };
    window.addEventListener("auth-logout", logout);
    window.addEventListener("auth-expired", expired);
    window.addEventListener("storage", accountStorage);
    window.addEventListener("storage", storage);
    window.addEventListener("pagehide", exit);
    return () => { flush(); window.removeEventListener("auth-logout", logout); window.removeEventListener("auth-expired", expired); window.removeEventListener("storage", accountStorage); window.removeEventListener("storage", storage); window.removeEventListener("pagehide", exit); };
    // The editor is keyed by document context; current form data is read through state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    const timer = setTimeout(flush, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, ready, pending, conflict]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { if (state.current.committed) return; flush(); event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      if (state.current.committed || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest?.("a");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const url = new URL(anchor.href, location.href);
      if (!["http:", "https:"].includes(url.protocol) || (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && url.hash)) return;
      event.preventDefault(); event.stopPropagation(); flush(); setDestination(url.href);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);
  function decide(restore: boolean) {
    try { if (checkExternal()) return; } catch { fail(); return; }
    if (restore && pending && applicable && pending.baseline === baseline) { const restored = pending.values;
      if (restored && typeof restored === "object") {
        if ("idUsuario" in restored) Object.assign(restored, { idUsuario: user?.id || "" });
        if ("pending" in restored && restored.pending && typeof restored.pending === "object" && "body" in restored.pending) {
          const body = restored.pending.body;
          if (body && typeof body === "object" && "idUsuario" in body && body.idUsuario !== user?.id) { setMessage("Operador da cópia incompatível. Revise o rascunho antes de enviar."); return; }
        }
      }
      setValues(restored); setMessage("Recuperação salva neste navegador"); }
    else if (restore && !pending && applicable) setValues(original);
    else if (!restore && !clear(true)) return;
    state.current.blocked = false; setPending(null); setConflict(false);
  }
  function commit() {
    state.current.committed = true;
    setCommitted(true);
    // Never delete a different tab's newer copy after acknowledging this mutation.
    try { if (localStorage.getItem(state.current.key) === state.current.seen) clear(true); } catch { fail(); }
  }
  function leave(discard: boolean) {
    if (discard && !clear()) { setDestination(null); return; }
    if (!discard) {
      const persisted = flush();
      if (state.current.blocked) { setDestination(null); setMessage("Resolva o conflito de recuperação antes de sair e manter as alterações."); return; }
      if (!persisted) { setDestination(null); fail(); return; }
    }
    if (discard) { state.current.dirty = false; setValues(original); }
    if (destination) {
      const url = new URL(destination);
      if (url.origin === location.origin) router.push(url.pathname + url.search + url.hash);
      else {
        state.current.committed = true;
        try { location.assign(destination); }
        finally { setTimeout(() => { state.current.committed = false; }, 1000); }
      }
      setDestination(null);
    }
  }
  const blocked = !ready || !!pending || conflict || committed;
  const ui = <>
    <p className="mb-3 text-muted">A recuperação fica somente neste navegador por sete dias após a última alteração. Não salva o documento no servidor.</p>
    {message && <p role="status" className="mb-3">{message}</p>}
    {(pending || conflict) && <section aria-label="Recuperação local" className="mb-5 space-y-3 rounded border p-4">
      <h2 className="font-semibold">{conflict ? "Recuperação alterada em outra aba" : "Recuperação disponível"}</h2>
      {pending && <p>Última alteração: {new Date(pending.updatedAt).toLocaleString("pt-BR")}</p>}
      {pending && (!applicable || pending.baseline !== baseline) ? <>
        <p role="alert">O documento salvo mudou, não está editável ou não está disponível. Esta cópia serve apenas para consulta manual.</p>
        <pre className="overflow-auto whitespace-pre-wrap">{JSON.stringify(pending.values, null, 2)}</pre>
      </> : <Button type="button" onClick={() => decide(true)}>{conflict ? "Carregar cópia da outra aba" : "Restaurar"}</Button>}
      <Button type="button" variant="outline" onClick={() => decide(false)}>{conflict ? "Substituir pela edição desta aba" : "Descartar"}</Button>
      <p>Escolha uma opção antes de continuar editando. Itens não serão mesclados.</p>
    </section>}
    {!committed && <Button type="button" variant="outline" disabled={blocked || !dirty} onClick={() => setDiscarding(true)}>Descartar alterações</Button>}
    <Dialog open={discarding || !!destination} onOpenChange={(open) => { if (!open) { setDestination(null); setDiscarding(false); } }}>
      <DialogContent><DialogTitle>{discarding ? "Descartar alterações?" : "Sair com alterações não salvas?"}</DialogTitle>
        <DialogDescription>{discarding ? "A recuperação será apagada e o formulário voltará aos valores iniciais." : "Você pode manter a cópia neste navegador para recuperar depois."}</DialogDescription>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => { setDestination(null); setDiscarding(false); }}>Continuar editando</Button>
          {discarding ? <Button type="button" onClick={() => { if (clear()) { setValues(original); setDiscarding(false); } }}>Confirmar descarte</Button> : <>
            <Button type="button" onClick={() => leave(false)}>Sair e manter recuperação</Button>
            <Button type="button" variant="outline" onClick={() => leave(true)}>Descartar e sair</Button>
          </>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
  function persist(values: T) {
    state.current.values = values;
    state.current.dirty = true;
    return flush();
  }
  function rebase(value: string) { state.current.baseline = value; setOriginalBaseline(value); }
  return { dirty, blocked, ui, commit, flush, persist, rebase };
}

export function MissingSelection({ value, rows }: { value: string; rows?: { id?: string }[] }) {
  return value && !rows?.some(row => row.id === value) ? <option value={value}>Indisponível: {value} — selecione novamente</option> : null;
}
export function selectedExists(value: string, rows?: { id?: string }[]) {
  return !value || !!rows?.some(row => row.id === value);
}
