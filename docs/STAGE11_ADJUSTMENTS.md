# Etapa 11 — ajustes quantitativos

Branches `stage11-adjustments` partem de frontend `bab4613` e backend `867cef2`.
Sem merge, implantação ou alteração de main/novaVersao.

API `/api/ajustes-estoque`: listar/consultar, POST com UUID Idempotency-Key,
PUT com versao, POST concluir/cancelar com versao (cancelar exige motivo).
DELETE é proibido. Operador vem da sessão, e ADMIN/GER podem confirmar seus
próprios rascunhos. GER precisa de acesso à loja original e à nova ao editar.

Confirmação bloqueia documento, depois produtos em ordem de UUID. Insere
saldos ausentes com zero, valida todos os resultados e aplica deltas atômicos.
Movimentos, snapshots antes/depois, auditoria e status compartilham transação.
Uma falha preserva o rascunho sem efeitos. Repetições retornam o documento salvo.
V6 marca registros anteriores como legados; nunca infere efeitos históricos.
Preflight interrompe dados incompatíveis/duplicados com consulta de reconciliação.

Telas: lista com filtros na URL e paginação de 20 linhas; editor com recuperação,
proteção de navegação e preservação dos valores em conflito; revisão obrigatória;
detalhe com unidade salva, saldos e auditoria. Projeções são informativas.

Validação: testes PostgreSQL de ciclo, precisão, overflow, falta, rollback misto,
identidade, escopo, concorrência com ajuste/venda/recebimento/transferência e
migração V5 com reinício. Playwright real desktop/mobile e comparação do estado
persistido antes/depois do reinício incluem ajustes. Evidências finais abaixo.

Fora do escopo: contagem física, aprovação por segunda pessoa, overrides,
estornos, devoluções, valoração e migração de banco compartilhado.

## Aceite em 06/11/2026

- Backend `bdd39f3b08c0c0e535e8b5e1c1ebb23c28b21ea4`: [CI PostgreSQL aprovado](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42272982970), 61 testes aprovados e um bootstrap ignorado conforme configuração, incluindo seis testes de ajustes e 12 de migração.
- Frontend `58fbd20`: [validate e integration aprovados](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42277458746): lint, TypeScript, 171 testes unitários, 106 cenários de interface, build de produção, smoke e 28 cenários reais desktop/mobile.
- Integração local completa aprovada, incluindo saldos exatos, movimentos, repetição, falta, cancelamento, ajuste misto e comparação dos documentos/saldos/movimentos após reinício do backend.
- Produtos de ajustes isolados das fixtures de regressão; limpeza restrita ao PostgreSQL descartável criado pelo runner.
- BG-001/BG-002: parcela restante de ajustes encerrada nesta branch. Nenhuma evidência implica migração do banco compartilhado ou implantação.
