import { BackLink } from "@/components/ui/back-link";
import { EmptyState, PageTitle } from "@/components/feedback";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <EmptyState>
      <PageTitle>Página não encontrada</PageTitle>
      <p className="max-w-[400px] text-[12px]">
        O endereço solicitado não está disponível.
      </p>
      <Button asChild>
        <BackLink href="/produtos">Voltar aos produtos</BackLink>
      </Button>
    </EmptyState>
  );
}
