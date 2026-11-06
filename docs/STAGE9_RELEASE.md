# Etapa 9 — concluir vendas e baixar estoque

Base: frontend `6a4d7f4`, backend `a3aa982`. Trabalho na branch `stage9-sales` dos dois repositórios; sem merge, implantação ou migração de banco compartilhado.

Backend fixado em `65d6585767398c100a6db40e956b683eb7221125`. [CI backend aprovada](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42241771727).

## Comportamento entregue

- Criar aberta → editar → revisar → concluir e baixar estoque; cancelamento apenas de abertas, com motivo obrigatório. Concluídas/canceladas são imutáveis.
- Conclusão não registra pagamento. Relatórios e CSVs continuam separando status; sem caixa, devoluções ou estorno de concluídas.
- Versões obrigatórias em edição/ações; IDs de itens mantidos, removidos por omissão e rejeitados quando pertencem a outra venda. Criador preservado, atores de alteração/conclusão/cancelamento obtidos da sessão.
- Falta em qualquer produto bloqueia tudo, agregando linhas repetidas. Locks em venda e saldos ordenados por produto; débitos atômicos compatíveis com incrementos de recebimento. Um movimento positivo por item, com vínculo à venda e identidade única no banco.
- Criação exige UUID Idempotency-Key com hash canônico, dono autenticado e identidade persistida. A interface guarda chave/payload antes do POST e repete a mesma solicitação após perda de resposta/reload.
- Edição em `/vendas/[id]/editar`, observação, totais persistidos, unidades históricas e auditoria. Recuperação por sete dias, ambiente/usuário/documento; conflitos preservam entradas e exigem revisão explícita da versão atual.
- Estoque atual é informativo; não há reserva. Erro de falta identifica produtos e quantidades disponíveis/necessárias e mantém acesso à edição.
- Sucesso reconhecido antes de refresh/navegação. Conclusão invalida vendas, saldos, movimentos e visão geral. Detalhes de movimentos apontam para a venda.
- SDK completo regenerado com o lock existente e contrato autenticado `openapi-stage9.json`; procedência em `generated/PROVENANCE.md`. Proxy libera apenas PUT e ações concluir/cancelar de vendas, encaminhando Idempotency-Key somente na criação.

## Evidência e aceite

- PostgreSQL descartável: 44 testes registrados, 43 executados e um bootstrap exclusivo do runner ignorado. Ciclo completo, snapshots/observação, identidade, precisão/arredondamento, escopos/CSRF, idempotência, atores, disputa pelo saldo, produtos repetidos, recebimento simultâneo, repetição e rollback de múltiplos produtos.
- Migração: V1–V3 intactas; V4 preserva abertos e snapshots, bloqueia valores inválidos e marca históricos como somente leitura sem replay. Relatório de reconciliação: `scripts/sales-preflight.sql` do backend. Nenhuma baixa ou movimentação histórica é fabricada.
- Frontend: lint, tipos, 167 testes unitários/componentes; regressão de 106 cenários desktop/mobile em build de produção, executada em `/tmp/vila-stage9-browser`.
- Aceite real: `INTEGRATION_BACKEND_REPO="$PWD/../erp-produtos-naturais-backend" npm run test:integration`. O runner cria banco/processos próprios, fixa o SHA backend, faz smoke autenticado e 18 cenários reais desktop/mobile. Inclui recebimento → criação/edição → conclusão → saldo exato/movimento; falta e cancelamento; resposta perdida com repetição da mesma chave/payload; conflito de versão; reload e reinício real do backend com comparação de vendas, itens, estoque, compras, recebimentos e movimentos.
- Gate remoto do frontend: jobs `validate` e `integration` no [fork pessoal](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions?query=branch%3Astage9-sales). O resultado final deve ser conferido no SHA entregue; CI backend aprovada não substitui esses jobs.

As alterações de documentação já existentes antes desta etapa permanecem preservadas e fora dos commits da implementação. Pendências de compras, incluindo idempotência da criação e versão no PUT geral, continuam abertas.
