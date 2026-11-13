"use client";
import { BackLink } from "@/components/ui/back-link";
import { Field } from "./ui/field";
import { RelatedField, RelatedStatus } from "./related-field";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelDescription,
} from "@/components/ui/panel";
import { Notice, NoticeDescription } from "@/components/ui/notice";
import { Table, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select } from "@/components/ui/input";
import { useCan } from "./auth";
import Link from "next/link";
import { useState } from "react";
import {
  Pencil,
  Barcode,
  Store,
  Tags,
  Plus,
  Trash2,
} from "lucide-react";
import { useBuscarProdutoPorId } from "@/generated/sdk/hooks/useBuscarProdutoPorId";
import { useListarUnidadesMedida } from "@/generated/sdk/hooks/useListarUnidadesMedida";
import { useListarProdutosSku } from "@/generated/sdk/hooks/useListarProdutosSku";
import { useListarProdutosLoja } from "@/generated/sdk/hooks/useListarProdutosLoja";
import { useListarPrecosProdutoLoja } from "@/generated/sdk/hooks/useListarPrecosProdutoLoja";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import {
  Heading,
  Loading,
  ErrorNotice,
  Empty,
  Status,
} from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RecordModal } from "@/components/record-form";
import { DeleteDialog } from "@/components/delete-dialog";
import { currency, dateLabel, localDate } from "@/lib/validation";
import type { Resource } from "@/lib/catalog";
type Relationship = "skus" | "assignments" | "prices";
type RelationRow = {
  id?: string;
  idProduto?: string;
  idProdutoSku?: string;
  idUnidadeMedida?: string;
  tipoVenda?: string;
  siglaUnidadeMedida?: string;
  idLoja?: string;
  sku?: string;
  status?: string;
  ean13?: string;
  dun14?: string;
  descricaoApresentacao?: string;
  nomeLoja?: string;
  preco?: number;
  dataInicio?: string;
  dataFim?: string;
};
function Relationships({
  id,
  resource,
  storeId,
  skuId,
}: {
  id: string;
  resource: Relationship;
  storeId: string;
  skuId: string;
}) {
  const canWrite = useCan("catalog.write");
  const skus = useListarProdutosSku(
    { query: { idProduto: id } },
    { query: { enabled: resource === "skus" } },
  );
  const assignments = useListarProdutosLoja(
    { query: { idProduto: id, idProdutoSku: skuId || undefined, ...(storeId ? { idLoja: storeId } : {}) } },
    { query: { enabled: resource === "assignments" && !!skuId } },
  );
  const prices = useListarPrecosProdutoLoja(
    { query: { idProduto: id, idProdutoSku: skuId || undefined, ...(storeId ? { idLoja: storeId } : {}) } },
    { query: { enabled: resource === "prices" && !!skuId } },
  );
  const stores = useListarLojas();
  const units = useListarUnidadesMedida();
  const query =
    resource === "skus"
      ? skus
      : resource === "assignments"
        ? assignments
        : prices;
  const [edit, setEdit] = useState<RelationRow | null | undefined>(),
    [remove, setRemove] = useState<RelationRow>(),
    [success, setSuccess] = useState("");
  const rows = (query.data || []).filter(
    (row: RelationRow) =>
      row.idProduto === id && (resource === "skus" || row.idProdutoSku === skuId) &&
      (resource === "skus" || !storeId || row.idLoja === storeId),
  );
  const labels = {
    skus: {
      title: "SKUs do produto",
      new: "Novo SKU",
      description:
        "Identificadores e apresentações deste produto, válidos para todas as lojas.",
    },
    assignments: {
      title: "Lojas vinculadas",
      new: "Vincular loja",
      description: "Defina em quais lojas este SKU estará disponível.",
    },
    prices: {
      title: "Preços por loja",
      new: "Novo preço",
      description:
        "Todos os registros de preço e suas validades. Períodos podem se sobrepor.",
    },
  }[resource];
  const storeOptions = stores.data?.map((x) => ({
    value: x.id!,
    label: x.nomeFantasia || x.razaoSocial || "",
  }));
  const storeName = (row: RelationRow) =>
    stores.data?.find((x) => x.id === row.idLoja)?.nomeFantasia ||
    row.nomeLoja ||
    row.idLoja;
  const cannotAdd =
    resource !== "skus" && !skuId;
  return (
    <>
      {success && (
        <p
          role="status"
          className="mb-4 rounded-[7px] bg-[#eaf5e7] px-4 py-3 text-[12px] text-[#2d7445]"
        >
          {success}
        </p>
      )}
      {stores.isError && (
        <ErrorNotice error={stores.error} retry={() => void stores.refetch()} />
      )}
      <Panel as="section">
        <PanelHeader>
          <div>
            <PanelTitle>{labels.title}</PanelTitle>
            <PanelDescription>{labels.description}</PanelDescription>
          </div>
          <Button
            hidden={!canWrite}
            className="mobile:px-[11px] mobile:py-2 mobile:text-[11px]"
            disabled={cannotAdd || !canWrite}
            onClick={() => {
              setSuccess("");
              setEdit(null);
            }}
          >
            <Plus size={15} />
            {labels.new}
          </Button>
        </PanelHeader>
        {resource !== "skus" && stores.isSuccess && !stores.data.length && (
          <Notice className="m-5">
            <NoticeDescription>
              Crie um vínculo ou preço para selecionar a loja.
            </NoticeDescription>
          </Notice>
        )}
        {resource !== "skus" && !skuId ? <Empty title="Selecione um SKU" description="Escolha a variante para consultar vínculos e preços." /> : query.isPending ? (
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
            title={
              resource === "skus"
                ? "Nenhum SKU cadastrado"
                : resource === "assignments"
                  ? "Nenhuma loja vinculada"
                  : "Nenhum preço cadastrado"
            }
            description="Adicione um registro para continuar. Cada operação é salva separadamente."
          />
        ) : (
          <Table>
            <thead>
              <TableRow>
                {resource === "skus" ? (
                  <>
                    <TableHead>SKU</TableHead>
                    <TableHead>APRESENTAÇÃO</TableHead>
                    <TableHead>EAN-13 / DUN-14</TableHead>
                    <TableHead>STATUS</TableHead>
                  </>
                ) : resource === "assignments" ? (
                  <TableHead>LOJA</TableHead>
                ) : (
                  <>
                    <TableHead>LOJA</TableHead>
                    <TableHead>PREÇO</TableHead>
                    <TableHead>INÍCIO DA VALIDADE</TableHead>
                    <TableHead>FIM DA VALIDADE</TableHead>
                  </>
                )}
                <TableHead className="text-right">AÇÕES</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {rows.map((row: RelationRow) => (
                <TableRow key={row.id}>
                  {resource === "skus" ? (
                    <>
                      <TableCell className="font-semibold text-[#304b36] hover:underline">
                        {row.sku}
                      </TableCell>
                      <TableCell>{row.descricaoApresentacao || "—"}<small className="block">{row.siglaUnidadeMedida} · {row.tipoVenda}</small></TableCell>
                      <TableCell>
                        {row.ean13 || "—"}
                        <br />
                        {row.dun14 || "—"}
                      </TableCell>
                      <TableCell>
                        <Status value={row.status} />
                      </TableCell>
                    </>
                  ) : resource === "assignments" ? (
                    <TableCell className="font-semibold text-[#304b36] hover:underline">
                      {storeName(row)}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="font-semibold text-[#304b36] hover:underline">
                        {storeName(row)}
                      </TableCell>
                      <TableCell>{currency(row.preco)}</TableCell>
                      <TableCell>{dateLabel(row.dataInicio)}</TableCell>
                      <TableCell>{dateLabel(row.dataFim)}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <div className="flex justify-end gap-[3px] [&_button]:text-[#7a887e] [&_button:hover]:text-[#9a3935] mobile:[&_[data-slot=button]]:p-[5px]">
                      {resource !== "assignments" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          hidden={!canWrite}
                          aria-label={`Editar ${resource === "skus" ? row.sku : "preço"}`}
                          onClick={() => setEdit(row)}
                        >
                          <Pencil size={15} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        hidden={!canWrite}
                        aria-label={
                          resource === "assignments"
                            ? `Desvincular ${storeName(row)}`
                            : resource === "skus"
                              ? `Excluir ${row.sku}`
                              : "Excluir preço"
                        }
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
      </Panel>
      {edit !== undefined && (
        <RecordModal
          key={`${resource}-${edit?.id || "new"}`}
          resource={resource}
          title={
            edit
              ? resource === "skus"
                ? "Editar SKU"
                : "Editar preço"
              : labels.new
          }
          initial={
            edit
              ? {
                  ...edit,
                  ...(resource === "prices"
                    ? {
                        preco: edit.preco?.toFixed(2).replace(".", ","),
                        dataInicio: localDate(edit.dataInicio),
                        dataFim: localDate(edit.dataFim),
                      }
                    : {}),
                }
              : storeId
                ? { idLoja: storeId }
                : undefined
          }
          extra={resource === "skus" ? { idProduto: id } : { idProdutoSku: skuId }}
          fieldOptions={{ idLoja: storeOptions, idUnidadeMedida: units.data?.map(u => ({value:u.id!, label:`${u.nome} (${u.sigla})`})) }}
          onClose={() => setEdit(undefined)}
          onSaved={() => {
            setEdit(undefined);
            setSuccess("Registro salvo com sucesso.");
          }}
        />
      )}
      {remove?.id && (
        <DeleteDialog
          resource={resource as Resource}
          id={remove.id}
          name={remove.sku || storeName(remove) || "preço"}
          onClose={() => setRemove(undefined)}
          onDeleted={() => {
            setRemove(undefined);
            setSuccess(
              resource === "assignments"
                ? "Loja desvinculada."
                : "Registro excluído.",
            );
          }}
        />
      )}
    </>
  );
}
export function ProductDetail({ id }: { id: string }) {
  const canWrite = useCan("catalog.write");
  const query = useBuscarProdutoPorId({ path: { id } });
  const stores = useListarLojas();
  const skus = useListarProdutosSku({query:{idProduto:id}});
  const [skuId, setSkuId] = useState("");
  const [storeId, setStoreId] = useState(""),
    [tab, setTab] = useState("skus");
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <ErrorNotice error={query.error} retry={() => void query.refetch()} />
    );
  const product = query.data;
  return (
    <>
      <BackLink
        className="mb-6"
        href="/produtos"
      >Voltar aos produtos
      </BackLink>
      <Heading
        title={product.nome || "Produto"}
        description="Gerencie os identificadores, as lojas e os preços deste produto."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/estoque?idProduto=${id}`}>Consultar estoque</Link>
            </Button>
            <Button asChild variant="outline">
              <Link hidden={!canWrite} href={`/produtos/${id}/editar`}>
                <Pencil size={16} />
                Editar produto
              </Link>
            </Button>
          </div>
        }
      />
      <Panel>
        <PanelHeader>
          <PanelTitle>Informações do produto</PanelTitle>
          <Status value={product.status} />
        </PanelHeader>
        <dl className="grid grid-cols-4 gap-5 p-[25px] compact:grid-cols-2 mobile:p-5">
          <div>
            <dt className="mb-[5px] text-[10px] tracking-[0.6px] text-[#829083] uppercase">
              Categoria
            </dt>
            <dd className="m-0 text-[13px] text-[#38533e]">
              {product.nomeCategoria || "—"}
            </dd>
          </div>
          <div>
            <dt className="mb-[5px] text-[10px] tracking-[0.6px] text-[#829083] uppercase">
              Identificador
            </dt>
            <dd className="m-0 text-[13px] text-[#38533e] break-all">
              {product.id}
            </dd>
          </div>
        </dl>
        {product.descricao && (
          <p className="px-[25px] pb-[25px] text-[13px] whitespace-pre-wrap text-[#718073]">
            {product.descricao}
          </p>
        )}
      </Panel>
      <div className="mt-5"><Field label="Variante para lojas e preços" actions={<RelatedField field="idProdutoSku" query={skus}/>}><Select aria-label="Variante para lojas e preços" value={skuId} onChange={e=>setSkuId(e.target.value)}><option value="">Selecione um SKU</option>{skus.data?.map(s=><option key={s.id} value={s.id}>{s.descricaoApresentacao} · {s.sku} · {s.siglaUnidadeMedida}</option>)}</Select><RelatedStatus query={skus}/></Field></div>
      <Tabs className="mt-[26px]" value={tab} onValueChange={setTab}>
        <TabsList aria-label="Dados do produto">
          <TabsTrigger value="skus">
            <Barcode size={16} />
            SKUs
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Store size={16} />
            Lojas
          </TabsTrigger>
          <TabsTrigger value="prices">
            <Tags size={16} />
            Preços
          </TabsTrigger>
        </TabsList>
        {tab !== "skus" && (
          <div className="mb-[18px] flex max-w-[280px] flex-col gap-[7px]">
            <label
              className="text-[12px] font-semibold text-[#49614e]"
              htmlFor="store-filter"
            >
              Filtrar por loja
            </label>
            <Select
              id="store-filter"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              <option value="">Todas as lojas</option>
              {stores.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nomeFantasia}
                </option>
              ))}
            </Select>
          </div>
        )}
        {(["skus", "assignments", "prices"] as const).map((resource) => (
          <TabsContent key={resource} value={resource}>
            <Relationships id={id} resource={resource} storeId={storeId} skuId={skuId} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
