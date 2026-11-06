"use client";
import { AccountControls, useIdentity } from "./auth";
import { pagePermission } from "@/lib/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Leaf,
  LayoutDashboard,
  Package,
  Tags,
  Ruler,
  Store,
  Menu,
  ChevronRight,
  Sprout,
  UsersRound,
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
const links = [
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/unidades-medida", label: "Unidades de medida", icon: Ruler },
  { href: "/lojas", label: "Lojas", icon: Store },
];
const salesLinks = [
  { href: "/vendas", label: "Registros", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Store },
];
const purchaseLinks = [
  { href: "/recebimentos", label: "Recebimentos", icon: Package },
  { href: "/compras", label: "Pedidos", icon: Package },
  { href: "/fornecedores", label: "Fornecedores", icon: Store },
];
const inventoryLinks = [
  { href: "/estoque/ajustes", label: "Ajustes", icon: Store },
  { href: "/estoque/transferencias", label: "Transferências", icon: Store },
  { href: "/estoque", label: "Saldos", icon: Package },
  { href: "/estoque/movimentacoes", label: "Movimentações", icon: Store },
];
const administrationLinks = [
  { href: "/usuarios", label: "Usuários", icon: UsersRound },
];
function Brand() {
  return (
    <Link
      href="/visao-geral"
      className="flex items-center gap-[11px] px-[7px] text-[23px] font-[650] tracking-[-0.8px] compact:text-[20px]"
    >
      <span className="flex rounded-xl bg-[#e9f2e9] p-[9px] text-primary">
        <Leaf size={25} />
      </span>
      <span>
        Vila Verde
        <small className="mt-px block text-[8px] tracking-[1.7px] text-[#798579]">
          GESTÃO DO CATÁLOGO
        </small>
      </span>
    </Link>
  );
}
function Navigation({
  path,
  onNavigate,
  className,
}: {
  path: string;
  onNavigate: () => void;
  className?: string;
}) {
  const user = useIdentity();
  const visible = (href: string) => !pagePermission(href) || !!user?.permissions.includes(pagePermission(href)!);
  return (
    <nav
      aria-label="Navegação principal"
      className={cn("mt-[46px]", className)}
    >
      <Link href="/visao-geral" onClick={onNavigate} aria-current={path === "/visao-geral" ? "page" : undefined} className="mb-6 flex items-center gap-3 rounded-[7px] px-3.5 py-3 text-[#617067] hover:bg-[#f3f6f2] aria-[current=page]:bg-[#eaf3eb] aria-[current=page]:text-primary"><LayoutDashboard size={19} />Visão geral</Link>
      <p className="px-3.5 pb-2.5 text-[10px] font-semibold tracking-[1.8px] text-[#8a958c]">
        CATÁLOGO
      </p>
      {links.filter(x => visible(x.href)).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={path.startsWith(href) ? "page" : undefined}
          onClick={onNavigate}
          className="my-[5px] flex items-center gap-3 rounded-[7px] px-3.5 py-3 font-medium text-[#617067] hover:bg-[#f3f6f2] aria-[current=page]:bg-[#eaf3eb] aria-[current=page]:text-[#236840]"
        >
          <Icon size={19} />
          {label}
        </Link>
      ))}
      <p className="mt-6 px-3.5 pb-2 text-[10px] font-semibold tracking-[1.8px] text-muted">
        VENDAS
      </p>
      {salesLinks.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={path.startsWith(href) ? "page" : undefined}
          className="my-[5px] flex items-center gap-3 rounded-[7px] px-3.5 py-3 text-[#617067] hover:bg-[#f3f6f2] aria-[current=page]:bg-[#eaf3eb] aria-[current=page]:text-primary"
        >
          <Icon size={19} />
          {label}
        </Link>
      ))}
      <p className="mt-6 px-3.5 pb-2 text-[10px] font-semibold tracking-[1.8px] text-muted">
        COMPRAS
      </p>
      {purchaseLinks.filter(x => visible(x.href)).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={path.startsWith(href) ? "page" : undefined}
          className="my-[5px] flex items-center gap-3 rounded-[7px] px-3.5 py-3 text-[#617067] hover:bg-[#f3f6f2] aria-[current=page]:bg-[#eaf3eb] aria-[current=page]:text-primary"
        >
          <Icon size={19} />
          {label}
        </Link>
      ))}
      <p className="mt-6 px-3.5 pb-2 text-[10px] font-semibold tracking-[1.8px] text-muted">
        ESTOQUE
      </p>
      {inventoryLinks.filter(x => visible(x.href)).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={path === href ? "page" : undefined}
          className="my-[5px] flex items-center gap-3 rounded-[7px] px-3.5 py-3 text-[#617067] hover:bg-[#f3f6f2] aria-[current=page]:bg-[#eaf3eb] aria-[current=page]:text-primary"
        >
          <Icon size={19} />
          {label}
        </Link>
      ))}
      {administrationLinks.some(x => visible(x.href)) && <>
        <p className="mt-6 px-3.5 pb-2 text-[10px] font-semibold tracking-[1.8px] text-muted">
          ADMINISTRAÇÃO
        </p>
        {administrationLinks.filter(x => visible(x.href)).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} onClick={onNavigate}
            aria-current={path.startsWith(href) ? "page" : undefined}
            className="my-[5px] flex items-center gap-3 rounded-[7px] px-3.5 py-3 text-[#617067] hover:bg-[#f3f6f2] aria-[current=page]:bg-[#eaf3eb] aria-[current=page]:text-primary">
            <Icon size={19} />{label}
          </Link>
        ))}
      </>}
    </nav>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const user = useIdentity();
  const path = usePathname(),
    [open, setOpen] = useState(false);
  if (path === "/login" || path === "/alterar-senha") return <main id="conteudo">{children}</main>;
  const current =
    (path === "/visao-geral" ? { label: "Visão geral" } : undefined) ||
    [...inventoryLinks].reverse().find((x) => path === x.href || (["/estoque/transferencias","/estoque/ajustes"].includes(x.href) && path.startsWith(x.href+"/"))) ||
    salesLinks.find((x) => path.startsWith(x.href)) ||
    purchaseLinks.find((x) => path.startsWith(x.href)) ||
    links.find((x) => path.startsWith(x.href)) ||
    administrationLinks.find((x) => path.startsWith(x.href));
  return (
    <div className="flex min-h-screen">
      <a
        href="#conteudo"
        className="fixed -top-[100px] left-3 z-100 bg-white p-3 focus:top-3"
      >
        Pular para conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 flex w-[246px] flex-col overflow-hidden border-r border-border bg-white py-[31px] pl-5 compact:w-[210px] compact:py-7 compact:pl-[13px] mobile:hidden">
        <div className="shrink-0 pr-5 compact:pr-[13px]">
          <Brand />
        </div>
        <div className="mt-[46px] flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-5 compact:pr-[13px]">
          <Navigation
            path={path}
            onNavigate={() => setOpen(false)}
            className="mt-0 shrink-0"
          />
          <div className="mt-auto flex shrink-0 gap-2.5 border-t border-border px-[5px] pt-6 text-[11px] text-[#5b7e61]">
            <Sprout size={22} />
            <p>
              Organizado para crescer.
              <small className="mt-[3px] block text-[10px] text-[#7e8980]">
                Produtos naturais, gestão simples.
              </small>
            </p>
          </div>
        </div>
      </aside>
      <div className="ml-[246px] flex w-[calc(100%-246px)] flex-col compact:ml-[210px] compact:w-[calc(100%-210px)] mobile:ml-0 mobile:w-full">
        <header className="flex h-[78px] items-center justify-between gap-4 border-b border-border bg-[#ffffffb0] px-[42px] compact:px-[25px] mobile:h-16 mobile:justify-start mobile:px-4">
          <div className="hidden mobile:block">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu">
                  <Menu size={22} />
                </Button>
              </DialogTrigger>
              <DialogContent className="top-0 left-0 h-dvh max-h-none w-[290px] translate-none rounded-none">
                <DialogTitle>Vila Verde</DialogTitle>
                <DialogDescription>Navegue pelo catálogo.</DialogDescription>
                <Navigation
                  path={path}
                  onNavigate={() => setOpen(false)}
                  className="mt-5"
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-[#7b877e] mobile:gap-[7px] mobile:text-[11px]">
            <span>
              {path === "/visao-geral" ? "Início" : administrationLinks.some(x => path.startsWith(x.href)) ? "Administração" : salesLinks.some((x) => path.startsWith(x.href))
                ? "Vendas"
                : purchaseLinks.some((x) => path.startsWith(x.href))
                  ? "Compras"
                  : path.startsWith("/estoque")
                    ? "Estoque"
                    : "Catálogo"}
            </span>
            <ChevronRight size={14} />
            <span className="text-[#3b5142]">
              {current?.label || "Página"}
              {path.startsWith("/estoque/transferencias/") ? (path.endsWith("/nova") ? " / Nova transferência" : path.endsWith("/editar") ? " / Editar rascunho" : " / Detalhes") : path.endsWith("/nova")
                ? path.startsWith("/vendas")
                  ? " / Nova venda"
                  : " / Nova compra"
                : path.startsWith("/vendas/")
                  ? " / Detalhes"
                  : path.startsWith("/compras/")
                    ? path.endsWith("/editar")
                      ? " / Editar rascunho"
                      : " / Detalhes"
                    : path.endsWith("/novo")
                      ? " / Novo produto"
                      : path.endsWith("/editar")
                        ? " / Editar produto"
                        : path.startsWith("/produtos/")
                          ? " / Detalhes"
                          : ""}
            </span>
          </div>
          <AccountControls />
        </header>
        <main
          id="conteudo"
          tabIndex={-1}
          className="m-auto w-full max-w-[1600px] flex-1 px-[42px] pt-[39px] pb-[60px] compact:px-[25px] compact:pt-[30px] compact:pb-[45px] mobile:px-4 mobile:pt-[25px] mobile:pb-10 wide:pt-[50px]"
        >
          {user && user.cargo !== "ADMIN" && user.lojas.length === 0 && <p role="status" className="mb-5 rounded border border-border p-4">Você ainda não tem lojas atribuídas. Solicite a um administrador a liberação das lojas para consultar e registrar operações.</p>}
          {children}
        </main>
        <footer className="mx-[42px] flex justify-between border-t border-border py-[18px] text-[10px] text-[#859086] compact:mx-[25px] mobile:mx-4 mobile:text-[9px]">
          Vila Verde <span>Catálogo de produtos naturais</span>
        </footer>
      </div>
    </div>
  );
}
