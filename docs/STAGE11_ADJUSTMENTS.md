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
