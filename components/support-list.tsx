"use client";
import { useCan } from "./auth";
import { useListarClientes } from "@/generated/sdk/hooks/useListarClientes";
import { calendarDateLabel } from "@/lib/validation";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelDescription,
} from "@/components/ui/panel";
import { Input, Select } from "@/components/ui/input";
import { Table, TableRow, TableHead, TableCell } from "@/components/ui/table";
import Link from "next/link";
import { useListarFornecedores } from "@/generated/sdk/hooks/useListarFornecedores";
import { useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useListarCategorias } from "@/generated/sdk/hooks/useListarCategorias";
import { useListarUnidadesMedida } from "@/generated/sdk/hooks/useListarUnidadesMedida";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { Heading, Loading, Empty, ErrorNotice } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { RecordModal } from "@/components/record-form";
import { DeleteDialog } from "@/components/delete-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { resourceNames } from "@/lib/catalog";
type SupportResource =
  | "categories"
  | "units"
  | "stores"
  | "suppliers"
  | "customers";
type Row = {
  id?: string;
  nome?: string;
  sigla?: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
  estado?: string;
  cidade?: string;
  [key: string]: unknown;
};
export function SupportList({ resource }: { resource: SupportResource }) {
  const canWrite = useCan(resource === "stores" ? "stores.manage" : resource === "customers" ? "customers.write" : resource === "suppliers" ? "suppliers.write" : "catalog.write");
  const canDelete = useCan(resource === "customers" ? "catalog.write" : resource === "stores" ? "stores.manage" : resource === "suppliers" ? "suppliers.write" : "catalog.write");
  const customers = useListarClientes({
    query: { enabled: resource === "customers" },
  });
  const categories = useListarCategorias({
    query: { enabled: resource === "categories" },
  });
  const units = useListarUnidadesMedida({
    query: { enabled: resource === "units" },
  });
  const stores = useListarLojas({ query: { enabled: resource === "stores" } });
  const suppliers = useListarFornecedores({
    query: { enabled: resource === "suppliers" },
  });
  const query =
    resource === "customers"
      ? customers
      : resource === "categories"
        ? categories
        : resource === "units"
          ? units
          : resource === "suppliers"
            ? suppliers
            : stores;
  const params = useSearchParams(),
    pathname = usePathname();
  const search = params.get("busca") || "",
    sort = params.get("ordem") || "asc";
  function control(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "pagina") next.delete("pagina");
    window.history.replaceState(null, "", `${pathname}?${next}`);
  }
  const [edit, setEdit] = useState<Row | null | undefined>(),
    [remove, setRemove] = useState<Row>(),
    [success, setSuccess] = useState("");
  const names = resourceNames[resource];
  const filtered = (query.data || [])
    .filter((r: Row) =>
      JSON.stringify(r)
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
    )
    .sort(
      (a: Row, b: Row) =>
        String(a.nome || a.nomeFantasia).localeCompare(
          String(b.nome || b.nomeFantasia),
          "pt-BR",
        ) * (sort === "desc" ? -1 : 1),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 20)),
    page = Math.min(
      pages,
      Math.max(1, Math.trunc(Number(params.get("pagina"))) || 1),
    );
  const rows = filtered.slice((page - 1) * 20, page * 20);
  const title =
    resource === "customers"
      ? "Novo cliente"
      : resource === "units"
        ? "Nova unidade de medida"
        : resource === "categories"
          ? "Nova categoria"
          : resource === "suppliers"
            ? "Novo fornecedor"
            : "Nova loja";
  return (
    <>
      <Heading
        title={names.plural}
        description={
          resource === "customers"
            ? "Cadastre os clientes da Vila Verde."
            : resource === "categories"
              ? "Organize os produtos em categorias para facilitar o dia a dia."
              : resource === "units"
                ? "Defina as unidades utilizadas no cadastro dos produtos."
                : resource === "suppliers"
                  ? "Cadastre os fornecedores da Vila Verde."
                  : "Cadastre as lojas que fazem parte da Vila Verde."
        }
        action={canWrite &&
          <Button
            onClick={() => {
              setSuccess("");
              setEdit(null);
            }}
          >
            <Plus size={16} />
            {title}
          </Button>
        }
      />
      {success && (
        <p
          role="status"
          className="mb-4 rounded-[7px] bg-[#eaf5e7] px-4 py-3 text-[12px] text-[#2d7445]"
        >
          {success}
        </p>
      )}
      <Panel>
        <PanelHeader>
          <div>
            <PanelTitle>
              {names.plural}{" "}
              {resource === "suppliers" || resource === "customers"
                ? "cadastrados"
                : "cadastradas"}
            </PanelTitle>
            <PanelDescription>
              {query.data?.length || 0} registros no catálogo
            </PanelDescription>
          </div>
        </PanelHeader>
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-[23px] py-[19px] mobile:gap-[9px] mobile:p-[15px]">
          <div className="relative min-w-[190px] flex-1 mobile:basis-full">
            <Search
              className="absolute top-3 left-3 text-[#8a968c]"
              size={16}
            />
            <Input
              className="pl-9"
              aria-label={`Buscar ${names.plural.toLowerCase()}`}
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => control("busca", e.target.value)}
            />
          </div>
          <Select
            className="w-auto max-w-[190px] text-[12px] mobile:w-[30%] mobile:max-w-none mobile:flex-1 mobile:text-[11px]"
            aria-label="Ordenar registros"
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
            description={
              search
                ? "Nenhum resultado para a busca informada."
                : "Cadastre o primeiro registro para começar."
            }
          />
        ) : (
          <Table>
            <thead>
              <TableRow>
                <TableHead>NOME</TableHead>
                {resource === "customers" && (
                  <>
                    <TableHead>CPF</TableHead>
                    <TableHead>NASCIMENTO</TableHead>
                  </>
                )}
                {resource === "units" && <TableHead>SIGLA</TableHead>}
                {(resource === "stores" || resource === "suppliers") && (
                  <>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>CIDADE / UF</TableHead>
                  </>
                )}
                <TableHead className="text-right">AÇÕES</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {rows.map((row: Row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-[#304b36] hover:underline">
                    {row.nome || row.nomeFantasia}
                  </TableCell>
                  {resource === "customers" && (
                    <>
                      <TableCell>{String(row.cpf || "—")}</TableCell>
                      <TableCell>
                        {calendarDateLabel(
                          row.dataNascimento as string | undefined,
                        )}
                      </TableCell>
                    </>
                  )}
                  {resource === "units" && <TableCell>{row.sigla}</TableCell>}
                  {(resource === "stores" || resource === "suppliers") && (
                    <>
                      <TableCell>{row.cnpj}</TableCell>
                      <TableCell>
                        {row.cidade} / {row.estado}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <div className="flex justify-end gap-[3px] [&_button]:text-[#7a887e] [&_button:hover]:text-[#9a3935] mobile:[&_[data-slot=button]]:p-[5px]">
                      {resource === "customers" && (
                        <Link href={`/vendas?idCliente=${row.id}`}>
                          Ver vendas
                        </Link>
                      )}
                      {resource === "suppliers" && (
                        <Link href={`/compras?idFornecedor=${row.id}`}>
                          Ver compras
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        hidden={!canWrite}
                        aria-label={`Editar ${row.nome || row.nomeFantasia}`}
                        onClick={() => setEdit(row)}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        hidden={!canDelete}
                        aria-label={`Excluir ${row.nome || row.nomeFantasia}`}
                        onClick={() => setRemove(row)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
        {query.isSuccess && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-[23px] py-4 text-[11px] text-[#839083] mobile:flex-col mobile:items-start mobile:p-3.5">
            <span>{filtered.length} registros</span>
            <div className="flex items-center gap-3 mobile:w-full mobile:justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => control("pagina", String(page - 1))}
              >
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
              </Button>
            </div>
          </div>
        )}
      </Panel>
      {edit !== undefined && (
        <RecordModal
          resource={resource}
          initial={edit || undefined}
          title={edit ? `Editar ${names.singular}` : title}
          onClose={() => setEdit(undefined)}
          onSaved={() => {
            setEdit(undefined);
            setSuccess("Registro salvo com sucesso.");
          }}
        />
      )}
      {remove?.id && (
        <DeleteDialog
          resource={resource}
          id={remove.id}
          name={String(remove.nome || remove.nomeFantasia)}
          onClose={() => setRemove(undefined)}
          onDeleted={() => {
            setRemove(undefined);
            setSuccess("Registro excluído.");
          }}
        />
      )}
    </>
  );
}
