# Etapa 11 — notas de versão

Disponível na branch `stage11-adjustments`: correção quantitativa de estoque com
rascunho, revisão, confirmação e cancelamento. ADMIN/GER podem confirmar os
próprios ajustes; gerentes ficam limitados às lojas atribuídas.

Confirmação aplica entradas e saídas atomicamente, impede saldo negativo e
limites numéricos excedidos, preserva unidade e saldos anteriores/finais e
registra operador e instante do servidor. Criação e confirmação podem ser
repetidas sem duplicar documentos ou movimentos.

Rascunhos têm recuperação local por sete dias e proteção de navegação.
Conflitos preservam valores e exigem revisão explícita. Histórico confirmado e
cancelado é imutável. V6 torna ajustes preexistentes somente leitura sem
reaplicar efeitos; dados incompatíveis exigem reconciliação antes da migração.

Não inclui contagem física, aprovação por segundo operador, estoque negativo,
estorno ou valoração. Sem merge ou deployment.

Contrato e evidências: [STAGE11_ADJUSTMENTS.md](STAGE11_ADJUSTMENTS.md).
