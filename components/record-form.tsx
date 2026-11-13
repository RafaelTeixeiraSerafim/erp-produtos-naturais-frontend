"use client";
import { Controller } from "react-hook-form";
import { DocumentInput } from "./ui/document-input";
import { LocalityFields } from "./locality-fields";
import { Field, FieldHeader } from "./ui/field";
import { RelatedField, RelatedStatus, related } from "./related-field";
import { useListarCategorias } from "@/generated/sdk/hooks/useListarCategorias";
import { useListarLojas } from "@/generated/sdk/hooks/useListarLojas";
import { useListarProdutos } from "@/generated/sdk/hooks/useListarProdutos";
import { useListarUnidadesMedida } from "@/generated/sdk/hooks/useListarUnidadesMedida";
import { Select, Textarea, Input } from "@/components/ui/input";
import { FormActions } from "@/components/ui/form-actions";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useId, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import {
  fields,
  schemas,
  initialValues,
  saveRecord,
  type Resource,
  type Values,
  type Field as CatalogField,
} from "@/lib/catalog";
import { refreshCatalog } from "@/lib/queries";
import { ErrorNotice } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function RecordForm({
  resource,
  initial,
  extra = {},
  fieldOptions = {},
  onSaved,
  onCancel,
  disabled = false,
  onBusyChange,
  layout = "dialog",
}: {
  resource: Resource;
  initial?: Record<string, unknown>;
  extra?: Values;
  fieldOptions?: Record<string, CatalogField["options"]>;
  onSaved: (row: unknown) => void;
  onCancel: () => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  layout?: "dialog" | "page";
}) {
  const formId = useId();
  const categories=useListarCategorias({query:{enabled:resource==="products"}});
  const stores=useListarLojas({query:{enabled:["assignments","prices"].includes(resource)}});
  const units=useListarUnidadesMedida({query:{enabled:resource==="skus"}});
  const products=useListarProdutos({query:{enabled:resource==="skus" && !extra.idProduto}});
  const fieldQueries={idCategoria:categories,idLoja:stores,idUnidadeMedida:units,idProduto:products};
  const [documentType,setDocumentType]=useState(initial?.cpf?"cpf":"cnpj");
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<unknown>();
  const form=useForm<Values>({defaultValues: { ...initialValues(resource, initial), municipioIbge:String(initial?.municipioIbge || ""), ...extra }});
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;
  useEffect(() => {
    onBusyChange?.(isSubmitting);
  }, [isSubmitting, onBusyChange]);
  const submit = handleSubmit(async (values) => {
    setRequestError(undefined);
    clearErrors();
    const parsed = schemas[resource].safeParse({ ...values, ...extra });
    if (!parsed.success) {
      for (const [index, issue] of parsed.error.issues.entries())
        setError(
          String(issue.path[0]),
          { message: issue.message },
          { shouldFocus: index === 0 },
        );
      return;
    }
    try {
      const saved = await saveRecord(
        resource,
        { ...values, ...extra },
        typeof initial?.id === "string" ? initial.id : undefined,
      );
      await refreshCatalog(queryClient);
      onSaved(saved);
    } catch (error) {
      setRequestError(error);
    }
  });
  return (
    <form onSubmit={submit} noValidate aria-busy={isSubmitting}>
      {!!requestError && <ErrorNotice error={requestError} />}
      <div
        className={cn(
          "grid grid-cols-2 gap-5 mobile:grid-cols-1 mobile:gap-[17px]",
          layout === "page" && "p-7 mobile:p-5",
        )}
      >
        {(resource==="suppliers" || resource==="stores") && <LocalityFields form={form} disabled={isSubmitting || disabled}/>}
        {(fields[resource] as CatalogField[]).map((f) => {
          if((resource==="suppliers" || resource==="stores") && ["estado","cidade"].includes(f.name))return null;
          if(resource==="suppliers" && ["cpf","cnpj"].includes(f.name) && f.name!==documentType)return null;
          if(extra[f.name]!==undefined && f.name==="idProduto")return null;
          const query=fieldQueries[f.name as keyof typeof fieldQueries];
          const optional=resource==="suppliers" && ["cpf","cnpj"].includes(f.name)?false:f.optional;
          const id = `${formId}-${f.name}`,
            options = query?.data ? query.data.map(r=>({value:r.id!,label:("sigla" in r?`${r.nome} (${r.sigla})`:"nomeFantasia" in r?r.nomeFantasia:"nome" in r?r.nome:"")||r.id!})) : fieldOptions[f.name] || f.options;
          const attrs = {
            id,
            ...register(f.name),
            "aria-invalid": !!errors[f.name],
            "aria-required": !optional,
            "aria-describedby": errors[f.name]
              ? `${id}-error`
              : f.hint
                ? `${id}-hint`
                : undefined,
            disabled: isSubmitting || disabled,
          };
          const field = (
            <div
              key={f.name}
              className={cn(
                "min-w-0",
                (f.type === "textarea" ||
                  f.name === "nome" ||
                  f.name === "sku") &&
                  "col-span-full",
              )}
            >
              <FieldHeader htmlFor={id} actions={query && <RelatedField field={f.name as keyof typeof related} query={query}/>}>
                {f.label}{!optional && <span aria-hidden="true"> *</span>}
              </FieldHeader>
              {["cpf","cnpj"].includes(f.name) ? <Controller name={f.name} control={form.control} render={({field})=><DocumentInput {...attrs} cnpj={f.name==="cnpj"} value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} disabled={isSubmitting || disabled}/>}/> : f.type === "select" ? (
                <Select {...attrs}>
                  <option value="">Selecione…</option>
                  {options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : f.type === "textarea" ? (
                <Textarea {...attrs} />
              ) : (
                <Input
                  {...attrs}
                  type={f.type || "text"}
                  inputMode={
                    f.name === "preco"
                      ? "decimal"
                      : f.name === "ean13" || f.name === "dun14"
                        ? "numeric"
                        : undefined
                  }
                />
              )}
              {query && <RelatedStatus query={query}/>}
              {f.hint && (
                <small className="text-[11px] text-[#7b887e]" id={`${id}-hint`}>
                  {f.hint}
                </small>
              )}
              {errors[f.name] && (
                <p id={`${id}-error`} className="text-[11px] text-[#a53b33]">
                  {errors[f.name]?.message}
                </p>
              )}
            </div>
          );
          return resource === "suppliers" && ["cpf","cnpj"].includes(f.name) ? <div key="document" className="col-span-full grid grid-cols-[160px_minmax(0,1fr)] gap-5 mobile:grid-cols-1 mobile:gap-[17px]">
            <Field label="Tipo de documento"><Select value={documentType} disabled={isSubmitting || disabled} onChange={e=>{setDocumentType(e.target.value);form.setValue("cpf","",{shouldDirty:true});form.setValue("cnpj","",{shouldDirty:true});clearErrors(["cpf","cnpj"]);}}><option value="cpf">CPF</option><option value="cnpj">CNPJ</option></Select></Field>
            {field}
          </div> : field;
        })}
      </div>
      <FormActions
        className={
          layout === "page" ? "m-0 px-7 py-5 mobile:p-[17px]" : undefined
        }
      >
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || disabled}>
          {isSubmitting && <LoaderCircle size={16} className="animate-spin" />}
          {isSubmitting ? "Salvando…" : "Salvar"}
        </Button>
      </FormActions>
    </form>
  );
}
export function RecordModal({
  title,
  description,
  onClose,
  ...props
}: Omit<React.ComponentProps<typeof RecordForm>, "onCancel"> & {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [opener] = useState(() =>
    typeof document !== "undefined"
      ? (document.activeElement as HTMLElement)
      : null,
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (opener?.isConnected) opener.focus();
          else document.getElementById("conteudo")?.focus();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {description ||
            "Preencha os campos abaixo. Campos com * são obrigatórios."}
        </DialogDescription>
        <RecordForm {...props} onBusyChange={setBusy} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  );
}
