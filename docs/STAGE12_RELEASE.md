# Etapa 12 — release e evidências

Implementação e decisões: [STAGE12_RETURNS.md](STAGE12_RETURNS.md).

Branches `stage12-returns` criadas nas bases frontend `20c5c80` e backend
`bdd39f3`. Nenhum merge ou deploy é parte desta entrega.

Validação em andamento nesta sessão: backend PostgreSQL completo, lint,
TypeScript, testes unitários/componentes, navegador com fixtures, build,
smoke, navegador real desktop/mobile e persistência após reinício.
Os resultados finais e links de CI serão acrescentados após conclusão.

Aceite manual de referência: receber mercadoria → concluir venda → devolver
parcialmente com condições mistas → conferir saldo e limite; separadamente
retornar ao fornecedor → conferir saída, recebido inalterado e movimentos.
Confira cancelamento de rascunho, replay sem efeitos duplicados, conflito com
preservação da digitação e os registros após reinício.

Não aplicar V7 em banco compartilhado nesta etapa. Legados permanecem
bloqueados até reconciliação revisada; não inventar efeitos ou unidades antigas.
