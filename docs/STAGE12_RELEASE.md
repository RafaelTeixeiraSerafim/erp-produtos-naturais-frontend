# Etapa 12 — release e evidências

Implementação e decisões: [STAGE12_RETURNS.md](STAGE12_RETURNS.md).

Branches `stage12-returns` criadas nas bases frontend `20c5c80` e backend
`bdd39f3`. Em 06/11/2026, por solicitação do usuário, `stage12-returns` foi
integrada em `main` do frontend e `novaVersao` do backend por commits de merge,
sem conflitos. As etapas 9–11 foram incluídas com seu histórico preservado.
A `main` do backend e o remoto `upstream` do frontend não foram alterados.
Nenhum deploy manual ou migração de banco compartilhado foi executado.
As branches de origem foram preservadas.

A integração acrescenta apenas documentação ao código já validado abaixo.
O pin do runner/SDK permanece no backend `c87fe72`, contido em `novaVersao`;
não é necessário regenerar o SDK para mudanças exclusivamente documentais.
Os pushes dos merges iniciam as verificações automáticas dos destinos; os links
abaixo registram o aceite do código de origem, sem confundir merge com deploy.

## Backend

Commit `c87fe72a66ca2fe8aaf14bead7101c0e95e27267`:
[CI PostgreSQL aprovada](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42284077339).
Foram registrados 75 testes: 74 executados sem falhas e um bootstrap ignorado,
pois roda exclusivamente na integração descartável. A execução local completa
`bash scripts/test-postgres.sh` também passou, incluindo 12 testes de devoluções
e 13 de migração. V1–V6 permanecem inalteradas.

Cobertura: devoluções parciais/múltiplas, disposições mistas, item/produto
estrangeiro, duplicatas, precisão, versão, identidade estável, escopo e operador,
criação idempotente concorrente, confirmação repetida e cancelamento. Concorrência
entre devoluções do mesmo cliente/fornecedor; fornecedor versus venda/transferência;
cliente versus recebimento. Falta agregada por produto, rollback de documento
com dois produtos, overflow e falha tardia ao persistir movimento. Migração
V6→V7 preserva legados e IDs, bloqueia allowance desconhecido e não reaplica
estoque; reconexão preserva os registros.

## Frontend

Pin de integração/SDK: backend `c87fe72`. Contrato completo
`openapi-stage12.json`, geração Kubb sem alterações manuais. Lint, TypeScript e
179 testes unitários/componentes passaram localmente. Os 106 cenários anteriores
de interface e seis novos cenários de devolução passaram (112 desktop/mobile).
Os novos cenários conferem resposta perdida com chave/payload recuperados,
armazenamento indisponível sem envio e conflito preservando digitação até revisão.
O teste de cache começa com documentos do SDK já carregados e verifica a
seleção de origens elegíveis sem substituir os dados das listas e relatórios.

`npm run test:integration` passou localmente com backend `c87fe72`: build de
produção, smoke, 30 cenários reais desktop/mobile e comparação exata após
reinício real do processo. Devoluções completas, origens, saldos e movimentos
persistiram. A limpeza do ambiente descartável terminou sem falhas.

Frontend `b78cfbe`: [CI aprovada nos jobs validate e integration](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42285586563).
A revisão final inclui a correção do cache compartilhado e a asserção de itens
de compra/venda restrita às respectivas tabelas; as tabelas novas de devolução
não interferem mais nas contagens dos testes anteriores. A CI executou os
179 testes unitários/componentes, 112 cenários com fixtures e 30 cenários reais,
build, smoke e comparação após reinício. Aceite registrado em 06/11/2026.

## Aceite e limites

Roteiro real: receber 20 → vender 10 → devolver 2,125 com reposição e 1,875 sem
reposição → saldo 12,125, devolvido 4 e restante da venda 6. Depois devolver
3,125 ao fornecedor → saldo 9, recebido cumulativo 20 e restante da compra
16,875. Valores originais: venda 30 e compra 40, situações concluída/recebida
preservadas. Repetições não alteram esses saldos nem duplicam movimentos.
O teste também verifica edição concorrente, cancelamento de rascunho, falta,
histórico, referências de movimento e filtros da lista após reload.

Não aplicar V7 em banco compartilhado nesta etapa. Legados permanecem somente
leitura e bloqueiam novas devoluções da origem até reconciliação revisada;
não há ferramenta automática de reconciliação. Não há reembolso, crédito,
fiscal, troca, devolução em outra loja, quarentena, reversão de concluídas ou
política de prazo. Unidades de compras são identificadas como as da criação da
devolução, pois não existia snapshot histórico.
