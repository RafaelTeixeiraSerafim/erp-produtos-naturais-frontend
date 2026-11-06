# Etapa 10 — transferências de estoque

Branches `stage10-transfers`, empilhadas sem integração: frontend a partir de `27301102f2906e7a00c2eed02a3b445e964eeac1`; backend a partir de `65d6585767398c100a6db40e956b683eb7221125`. `stage9-sales`, `main` e `novaVersao` foram preservadas. As quatro edições de documentação que já existiam no frontend permanecem locais e separadas do commit desta etapa.

Backend/SDK fixado em `867cef2e35596ae67f692f9e2fcfd4932953d513`, contrato autenticado `openapi-stage10.json`, geração completa com Kubb e lock existente. V1–V4 inalteradas; V5 acrescenta versão, auditoria, idempotência, snapshot da unidade e vínculo/unique de movimentos por item/direção. Todas as transferências preexistentes recebem `legado=true`, inclusive rascunhos, sem inferir ou repetir efeitos históricos.

ADMIN/GER precisam de acesso às duas lojas para lista, detalhe, criação, edição, ações e replay. Mudanças de lojas exigem acesso aos pares antigo e novo. FUNC não acessa documentos de transferência; mantém seus movimentos de estoque e não recebe link para detalhes proibidos.

O fluxo é RASCUNHO → CONCLUIDA ou CANCELADA. Rascunhos não reservam. Confirmação movimenta imediatamente os estoques, sem trânsito/recebimento parcial. Documento e pares produto→loja são bloqueados; saldos ausentes são criados a zero na mesma transação. Todas as faltas e limites de destino são verificados antes dos efeitos. Débitos/créditos incrementais, movimentos positivos pareados, ator autenticado e horário do servidor são atômicos. A data comercial é mantida separadamente. Repetições não duplicam efeitos; cancelamento exige motivo e não movimenta estoque. Confirmados são imutáveis e DELETE é proibido.

A interface inclui lista com filtros locais/ordem/paginação de 20/URL, criação/edição, disponibilidade informativa, detalhe com itens/IDs/unidades salvas, versão e auditoria, revisão de confirmação e cancelamento. Recuperação é isolada por usuário/ambiente/documento, com proteção ao navegar. Chave e payload de criação são persistidos antes da rede. Sucesso é reconhecido antes de refresh/navegação; conflitos mantêm entradas e exigem revisão explícita da versão atual.

Validação local:

- Backend PostgreSQL descartável: 54 testes registrados, 53 executados, um bootstrap exclusivo de integração ignorado; sem falhas. Inclui nove testes de transferências, dez de migração e regressões de autenticação/recebimento/vendas. Concorrência de direções opostas, origem disputada, recebimentos nas duas lojas e venda; rollback de falta/overflow/falha de movimento, auditoria, escopo, CSRF, snapshots, IDs e replay concorrente.
- Frontend: lint/tipos e 170 testes unitários/componentes aprovados; 106 cenários de navegador desktop/mobile aprovados; build de produção executado pelo runner de navegador.
- Integração real e CI: em verificação; resultados finais serão registrados abaixo.

Roteiro de aceite: receber em A, criar e recuperar rascunho, editar preservando ID, revisar e confirmar parte para B, conferir saldos e os dois movimentos e vender em B. Verificar também falta sem efeitos, cancelamento sem efeitos, replay de resposta perdida após reload, conflito de versão e gerente sem uma das atribuições. O runner reinicia o backend e compara documentos, itens, saldos e movimentos persistidos.

BG-001/BG-002 resolvidas **somente para transferências**; ajustes permanecem abertos. Sem migração compartilhada, deploy, merge, reparo de histórico ou upgrades. Trânsito, recebimento parcial, reversões, ajustes, pagamentos, valoração e regras automáticas de atribuição continuam adiados.
