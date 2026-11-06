# Etapa 12 — devoluções de clientes e fornecedores

Branches `stage12-returns`, frontend base `20c5c80` e backend base `bdd39f3`.
Etapas 9–11 preservadas. Sem merge, implantação ou alteração de main/novaVersao.

As duas APIs `/api/devolucoes-clientes` e `/api/devolucoes-fornecedores` permitem
GET de coleção/detalhe, POST com UUID Idempotency-Key, PUT com versão e POST
concluir/cancelar. Cancelar exige versão e motivo. DELETE permanece bloqueado.
ADMIN/GER operam no escopo da loja original; o operador vem da sessão.
A criação idempotente pertence ao ator e o replay revalida o acesso à origem.

Devolução de cliente exige venda concluída não legada. Cada item real pode ter
uma linha por disposição, permitindo quantidades com/sem reposição. Ambas
consomem o limite vendido; sem reposição exige observação e não movimenta
estoque disponível. Apenas reposições geram DEVOLUCAO de quantidade positiva.

Devolução a fornecedor exige compra parcial/totalmente recebida. Cada item
real aparece uma vez por documento, com teto baseado no recebido cumulativo
menos devoluções confirmadas. Produtos repetidos entre itens são agregados
para conferir o saldo da loja; saídas DEVOLUCAO_FORNECEDOR nunca tornam o
saldo negativo. Quantidades recebidas, situação e valores da compra permanecem.
Vendas também conservam situação e valores originais. Nenhuma operação registra
reembolso, crédito, pagamento ou receita líquida.

Confirmação bloqueia origem, devolução e saldos em ordem de produto/loja.
Revalida limites usando apenas documentos confirmados. Rascunhos não reservam.
Validação integral precede efeitos; qualquer falha reverte estoque, movimentos,
versão, situação e auditoria na mesma transação. Repetir conclusão devolve o
resultado salvo. Índices únicos impedem movimento duplicado por item.

Flyway V7 preserva V1–V6 e marca devoluções existentes como legadas, somente
leitura. Origens com qualquer devolução legada ficam bloqueadas e seu restante
é desconhecido (`quantidadeDevolvivel=null`). Não há desbloqueio automático ou
endpoint de reconciliação: uma intervenção futura revisada precisa estabelecer
os quantitativos históricos e a auditoria antes de remover esse bloqueio. V7
interrompe movimentos históricos duplicados com consulta de diagnóstico.
As funções SQL de leitura retornam totais confirmados e sinalização de legado;
a confirmação calcula novamente esses totais sob bloqueio da origem.

Snapshots preservam a unidade salva da venda. Compras não tinham unidade
histórica; o snapshot é identificado como `UNIDADE_NA_CRIACAO_DEVOLUCAO`, com
rótulo explícito na interface. Não inferir unidade histórica do cadastro atual.

Telas em `/vendas/devolucoes` e `/compras/devolucoes`: listas com filtros,
ordenação e paginação na URL; seleção pela origem elegível; criação/edição de
rascunhos; revisão explícita de efeitos; detalhes com auditoria e movimentos.
Detalhes de venda/compra mostram histórico e vendido/recebido, devolvido e
restante. Quantidades começam vazias. Conflitos preservam a digitação e exigem
revisão dos dados atualizados. Recuperação de sete dias, proteção de navegação
e chave/payload de criação persistidos usam a infraestrutura existente.

## Verificação

Evidências finais são registradas em STAGE12_RELEASE.md. A integração usa
PostgreSQL/backend/frontend próprios, executa navegador desktop/mobile e
compara devoluções, origens, saldos e movimentos após reinício real do backend.
O runner remove apenas os dados do seu banco descartável.

Fora do escopo: reembolso, crédito de fornecedor, fiscal, trocas, devolução em
outra loja, estoque de quarentena, reversão de concluídas, janela temporal de
política, upgrades, migração de banco compartilhado, deploy e integração de branches.
