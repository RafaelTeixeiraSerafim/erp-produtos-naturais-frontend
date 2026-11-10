"use client";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelDescription,
} from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Table, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useCan } from "./auth";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import {
  Package,
  CircleCheck,
  Tags,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Leaf,
} from "lucide-react";
import { useListarProdutos } from "@/generated/sdk/hooks/useListarProdutos";
import { useListarCategorias } from "@/generated/sdk/hooks/useListarCategorias";
import type { ProdutoResponseDTO } from "@/generated/sdk/types/ProdutoResponseDTO";
import {
  Heading,
  Loading,
  Empty,
  ErrorNotice,
  Status,
} from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/delete-dialog";
import { selectProducts } from "@/lib/report-selectors";
import { ExportCsv } from "./export-csv";
export function ProductList() {
  const canWrite = useCan("catalog.write");
  const query = useListarProdutos(),
    categories = useListarCategorias();
  const params = useSearchParams(),
    router = useRouter(),
    path = usePathname();
  const search = params.get("busca") || "",
    category = params.get("categoria") || "",
    status = params.get("status") || "",
    sort = params.get("ordem") || "asc";
  const [remove, setRemove] = useState<ProdutoResponseDTO>(),
    [success, setSuccess] = useState("");
  function control(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "pagina") next.delete("pagina");
    router.replace(`${path}?${next}`, { scroll: false });
  }
  const all = query.data || [];
  const filtered = selectProducts(all, { busca: search, categoria: category, status, ordem: sort });
  const pages = Math.max(1, Math.ceil(filtered.length / 20)),
    page = Math.min(
      pages,
      Math.max(1, Math.trunc(Number(params.get("pagina"))) || 1),
    );
  const rows = filtered.slice((page - 1) * 20, page * 20);
  return (
    <>
      <Heading
        title="Produtos"
        description="Organize seu catálogo e cuide de cada detalhe dos seus produtos."
        action={canWrite &&
          <Button asChild>
            <Link href="/produtos/novo">
              <Plus size={17} />
              Novo produto
            </Link>
          </Button>
        }
      />
      <div className="mb-7 grid grid-cols-3 gap-[18px] mobile:mb-5 mobile:gap-2">
        {[
          {
            title: "Total de produtos",
            value: query.isSuccess ? all.length : "—",
            icon: Package,
          },
          {
            title: "Produtos ativos",
            value: query.isSuccess
              ? all.filter((x) => x.status === "ATIVO").length
              : "—",
            icon: CircleCheck,
          },
          {
            title: "Categorias cadastradas",
            value: categories.isSuccess ? categories.data.length : "—",
            icon: Tags,
          },
        ].map(({ title, value, icon: Icon }) => (
          <div
            className="flex items-center justify-between rounded-[10px] border border-border bg-white px-[22px] py-5 compact:p-[17px] mobile:px-[11px] mobile:py-[13px]"
            key={title}
          >
            <div>
              <p className="text-[11px] text-[#77837a] mobile:text-[9px]">
                {title}
              </p>
              <strong className="mt-[5px] block text-[27px] font-semibold tracking-[-0.7px] mobile:text-[23px]">
                {value}
              </strong>
            </div>
            <span className="flex rounded-[10px] bg-[#f0f5ed] p-[11px] text-[#6b926c] mobile:hidden">
              <Icon size={22} />
            </span>
          </div>
        ))}
      </div>
      <ExportCsv name="produtos" source={query} incomplete={!categories.isSuccess} headers={["ID", "Nome", "Categoria", "Status"]} rows={filtered.map(r => [r.id, r.nome, r.nomeCategoria || r.idCategoria, r.status])} />
      {success && (
        <p
          role="status"
          className="mb-4 rounded-[7px] bg-[#eaf5e7] px-4 py-3 text-[12px] text-[#2d7445]"
        >
          {success}
        </p>
      )}
      {categories.isError && (
        <ErrorNotice
          error={categories.error}
          retry={() => void categories.refetch()}
        />
      )}
      <Panel as="section" aria-label="Catálogo de produtos">
        <PanelHeader>
          <div>
            <PanelTitle>Seu catálogo</PanelTitle>
            <PanelDescription>
              Todos os produtos, em um só lugar.
            </PanelDescription>
          </div>
          <Badge>
            {query.isSuccess ? `${all.length} produtos` : "Produtos"}
          </Badge>
        </PanelHeader>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-[23px] py-[19px] mobile:gap-[9px] mobile:p-[15px]">
          <div className="relative min-w-[190px] flex-1 mobile:basis-full">
            <Search
              className="absolute top-3 left-3 text-[#8a968c]"
              size={16}
            />
            <Input
              className="pl-9"
              aria-label="Buscar produtos"
              placeholder="Buscar por nome do produto…"
              value={search}
              onChange={(e) => control("busca", e.target.value)}
            />
          </div>
          <Select
            className="w-auto max-w-[190px] text-[12px] mobile:w-[30%] mobile:max-w-none mobile:flex-1 mobile:text-[11px]"
            aria-label="Filtrar por categoria"
            value={category}
            onChange={(e) => control("categoria", e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.data?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto max-w-[190px] text-[12px] mobile:w-[30%] mobile:max-w-none mobile:flex-1 mobile:text-[11px]"
            aria-label="Filtrar por status"
            value={status}
            onChange={(e) => control("status", e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </Select>
          <Select
            className="w-auto max-w-[190px] text-[12px] mobile:w-[30%] mobile:max-w-none mobile:flex-1 mobile:text-[11px]"
            aria-label="Ordenar produtos"
            value={sort}
            onChange={(e) => control("ordem", e.target.value)}
          >
            <option value="asc">Nome: A–Z</option>
            <option value="desc">Nome: Z–A</option>
          </Select>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <div className="p-5">
            <ErrorNotice
              error={query.error}
              retry={() => void query.refetch()}
            />
          </div>
        ) : rows.length === 0 ? (
          <Empty
            title="Nenhum produto encontrado"
            description={
              search || category || status
                ? "Ajuste os filtros para encontrar outros produtos."
                : "Comece pelas categorias. Depois, cadastre seu primeiro produto."
            }
          />
        ) : (
          <Table>
            <thead>
              <TableRow>
                <TableHead>PRODUTO</TableHead>
                <TableHead>CATEGORIA</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">AÇÕES</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-[35px] min-w-[35px] items-center justify-center rounded-lg bg-[#f0f5ed] text-[#799971]">
                        <Leaf size={17} />
                      </span>
                      <div>
                        <Link
                          className="font-semibold text-[#304b36] hover:underline"
                          href={`/produtos/${row.id}`}
                        >
                          {row.nome}
                        </Link>
                        <small className="mt-[3px] block text-[10px] text-[#8f998f]">
                          #{row.id?.slice(0, 8)}
                        </small>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.nomeCategoria ||
                      categories.data?.find((x) => x.id === row.idCategoria)
                        ?.nome ||
                      "—"}
                  </TableCell>
                  <TableCell>
                    <Status value={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-[3px] [&_button]:text-[#7a887e] [&_button:hover]:text-[#9a3935] mobile:[&_[data-slot=button]]:p-[5px]">
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          aria-label={`Abrir ${row.nome}`}
                          href={`/produtos/${row.id}`}
                        >
                          <ArrowUpRight size={16} />
                        </Link>
                      </Button>
                      {canWrite && <>
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          aria-label={`Editar ${row.nome}`}
                          href={`/produtos/${row.id}/editar`}
                        >
                          <Pencil size={14} />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir ${row.nome}`}
                        onClick={() => setRemove(row)}
                      >
                        <Trash2 size={15} />
                      </Button></>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
        {query.isSuccess && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-[23px] py-4 text-[11px] text-[#839083] mobile:flex-col mobile:items-start mobile:p-3.5">
            <span>
              {filtered.length
                ? `${(page - 1) * 20 + 1}–${Math.min(page * 20, filtered.length)} de ${filtered.length} produtos`
                : "0 produtos"}
            </span>
            <div className="flex items-center gap-3 mobile:w-full mobile:justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => control("pagina", String(page - 1))}
              >
                <ChevronLeft size={14} />
                Anterior
              </Button>
              <span>
                Página {page} de {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => control("pagina", String(page + 1))}
              >
                Próxima
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Panel>
      {remove?.id && (
        <DeleteDialog
          resource="products"
          id={remove.id}
          name={remove.nome || "produto"}
          onClose={() => setRemove(undefined)}
          onDeleted={() => {
            setRemove(undefined);
            setSuccess("Produto excluído.");
          }}
        />
      )}
    </>
  );
}
