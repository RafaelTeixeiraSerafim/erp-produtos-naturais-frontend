"use client";
import { BackLink } from "@/components/ui/back-link";
import {
  AlertCircle,
  PackageOpen,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Notice, NoticeDescription } from "@/components/ui/notice";
import { errorMessage, isMissing } from "@/lib/errors";
import { cn } from "@/lib/utils";
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Notice variant="error" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>
          {isMissing(error)
            ? "Registro não encontrado"
            : "Não foi possível concluir"}
        </strong>
        <NoticeDescription>{errorMessage(error)}</NoticeDescription>
        {retry && (
          <Button variant="outline" size="sm" onClick={retry}>
            <RefreshCw size={14} />
            Tentar novamente
          </Button>
        )}
        {isMissing(error) && <BackLink href="/produtos">Voltar aos produtos</BackLink>}
      </div>
    </Notice>
  );
}
export function EmptyState({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-[9px] px-6 py-[65px] text-center text-[#7b897d]",
        className,
      )}
      {...props}
    />
  );
}
export function Loading() {
  return (
    <EmptyState role="status">
      <LoaderCircle className="animate-spin" />
      <p className="max-w-[400px] text-[12px]">Carregando registros…</p>
    </EmptyState>
  );
}
export function Empty({
  title = "Nenhum registro encontrado",
  description = "Cadastre o primeiro registro para começar.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState>
      <span className="mb-[7px] flex rounded-full bg-[#f2f6ee] p-[15px] text-[#7b9e73]">
        <PackageOpen size={28} />
      </span>
      <h3 className="text-base leading-normal font-semibold text-[#456049]">
        {title}
      </h3>
      <p className="max-w-[400px] text-[12px]">{description}</p>
    </EmptyState>
  );
}
export function Status({ value }: { value?: string }) {
  return (
    <Badge variant={value === "ATIVO" ? "active" : "muted"}>
      <span className="size-[5px] rounded-full bg-current" />
      {value === "ATIVO" ? "Ativo" : "Inativo"}
    </Badge>
  );
}
export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "text-[30px] leading-[1.25] font-[650] tracking-[-1px] mobile:text-[27px]",
        className,
      )}
      {...props}
    />
  );
}
export function Heading({
  eyebrow = "CATÁLOGO",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-[30px] flex items-center justify-between gap-[18px] mobile:mb-[23px] mobile:flex-wrap mobile:items-start mobile:gap-4 mobile:[&>[data-slot=button]]:w-full wide:mb-[38px]">
      <div>
        <p className="mb-2.5 text-[10px] font-[650] tracking-[1.8px] text-[#6f8b71]">
          {eyebrow}
        </p>
        <PageTitle>{title}</PageTitle>
        <p className="mt-2 text-[13px] text-muted mobile:text-[12px]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
