# Lacunas do backend — Vila Verde

Registro para encaminhamento à equipe de backend. Registro inicial em 05/11/2026 do backend legado; a etapa 7 acrescenta correções de recebimento no commit `f335d525ea6ed107cd00824031ded904020967fe`. “Confirmado por inspeção” comprova o código/contrato observado; não equivale a reprodução HTTP. Suspeitas e instalações externas são explicitadas por entrada.

IDs são permanentes. Ao resolver, manter a entrada e acrescentar commit de correção, teste e evidência; o resultado de cada correção e sua evidência ficam na própria entrada. Dependências continuam fora do escopo.

## Contexto atual de publicação

Frontend de referência: [fork RafaelTeixeiraSerafim/erp-produtos-naturais-frontend](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend),
branch `main`, contendo o código validado `b78cfbe`. Backend de referência:
`Zayma1/erp-produtos-naturais-backend`, branch `novaVersao`, contendo o código
validado `c87fe72`. Em 06/11/2026, as branches `stage12-returns` foram integradas
nesses destinos por solicitação do usuário, incluindo as etapas 9–11. As branches
de origem foram preservadas. A `main` do backend não foi alterada; o frontend
original permanece como `upstream` e não recebeu este merge. Ver
[registro da integração](STAGE12_RELEASE.md). A integração Git não comprova o
commit em produção nem aplica migrações ao banco compartilhado.

O frontend usa a integração nativa Vercel/Git. A leitura pública observada em 05/11/2026 pertence à versão anterior à autenticação: não descreve a versão integrada atual nem comprova o estado atual de produção. O push em `main` pode disparar deploy, mas não foram auditados nesta revisão o commit executado pelo Render/Vercel nem as migrações do banco compartilhado. Consultar o [checklist de release](STAGE8_RELEASE.md).

**Situação das lacunas:** BG-003/BG-004 resolvidas na etapa 7; BG-011/BG-020 encerradas na versão integrada da etapa 8, com aceite funcional backend/frontend e CI. [Frontend `main`: validate/integration](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42223775274) e [backend `a3aa982`](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42218105138) aprovados. As demais entradas permanecem abertas; concorrência e idempotência continuam parcialmente resolvidas no recebimento. As observações sob o SHA legado em cada entrada registram o diagnóstico original; as atualizações posteriores indicam o efeito da etapa 8.

**Revalidação local em 06/11/2026:** GET sem cookies em `localhost:8090` para vendas, produtos, clientes, compras, usuários e `/api/auth/me` retornou 401. O processo ativo usa o checkout isolado atualizado. Abrir a API no mesmo navegador autenticado pode enviar o cookie `SESSION`, pois cookies de `localhost` são compartilhados entre portas; esse acesso autenticado não reproduz BG-011.

## Índice

| ID | Tipo | Assunto |
| --- | --- | --- |
| [BG-001](#bg-001) | Capacidade ausente | Funções de conclusão de estoque sem migração versionada |
| [BG-002](#bg-002) | Inconsistência de contrato | Detalhes de ajustes e transferências sem itens |
| [BG-003](#bg-003) | Capacidade ausente | Recebimento sem efeitos de estoque e progressão da compra |
| [BG-004](#bg-004) | Defeito | Edição de recebimento acrescenta itens |
| [BG-005](#bg-005) | Defeito | Exclusão de compra com itens viola FK |
| [BG-006](#bg-006) | Inconsistência de contrato | Status do pedido ignorado |
| [BG-007](#bg-007) | Inconsistência de contrato | PUT da compra recria IDs de itens |
| [BG-008](#bg-008) | Capacidade ausente | Vendas sem fechamento e baixa de estoque |
| [BG-009](#bg-009) | Defeito | Filtros individuais e combinados inconsistentes |
| [BG-010](#bg-010) | Inconsistência de contrato | Campos da entidade fornecedor ausentes dos DTOs |
| [BG-011](#bg-011) | Capacidade ausente | Autenticação e autorização de negócio ausentes |
| [BG-012](#bg-012) | Capacidade ausente | Precedência de preços sobrepostos indefinida |
| [BG-013](#bg-013) | Capacidade ausente | Listas sem paginação de servidor |
| [BG-014](#bg-014) | Inconsistência de contrato | Precisão e desconto não validados no DTO de compra |
| [BG-015](#bg-015) | Inconsistência de contrato | Cliente e operador opcionais no request, obrigatórios na entidade |
| [BG-016](#bg-016) | Inconsistência de contrato | Observação de venda não retorna na consulta |
| [BG-017](#bg-017) | Defeito | Atualização e exclusão de vendas sem guardas de status |
| [BG-018](#bg-018) | Inconsistência de contrato | Validação monetária e de precisão insuficiente nos itens de venda |
| [BG-019](#bg-019) | Inconsistência de contrato | Resposta de item omite total persistido e unidade histórica |
| [BG-020](#bg-020) | Defeito | Senha recebida atribuída diretamente a senhaHash |
| [BG-021](#bg-021) | Capacidade ausente | Criação sem idempotência de requisição |
| [BG-022](#bg-022) | Capacidade ausente | Compra sem versão de concorrência |

<a id="bg-001"></a>
## BG-001 — Funções de conclusão de estoque sem migração versionada

**Atualização da etapa 11 (ajustes): resolvida na branch `stage11-adjustments`.** Backend `bdd39f3` substitui a função ausente por lógica transacional e entrega itens, snapshots e auditoria. [CI backend aprovado](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42272982970) e [frontend validate/integration aprovados](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42277458746), incluindo ajuste misto, falta, cancelamento, replay, concorrência e persistência após reinício. A resolução refere-se às branches da etapa 11, sem merge ou implantação.

- **Tipo:** Capacidade ausente.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção; execução de conclusão não ensaiada.
- **Fonte:** [AjusteEstoqueService.concluir / TransferenciaEstoqueService.concluir](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/AjusteEstoqueService.java).
- **Comportamento observado:** Os serviços chamam public.fn_concluir_ajuste_estoque e public.fn_concluir_transferencia. Não há SQL/migração versionada em src/main/resources que instale essas funções.
- **Impacto/contorno no frontend:** Ajustes e transferências continuam sem escrita na interface.
- **Correção solicitada:** Versionar funções, permissões, instalação e atualização do esquema.
- **Aceite testável:** Um PostgreSQL vazio, preparado apenas pelo repositório, conclui ajuste e transferência, atualiza estoque uma única vez e desfaz tudo em erro.
- **Commit de correção:** pendente.

- **Atualização da etapa 7:** Etapa 7: Flyway V1/V2 e validação do esquema agora persistem recebimentos/estoque entre reinícios. As funções de ajustes/transferências continuam ausentes; esta lacuna não está encerrada.

<a id="bg-002"></a>
## BG-002 — Detalhes de ajustes e transferências sem itens

**Atualização da etapa 11 (ajustes): resolvida na branch `stage11-adjustments`.** Backend `bdd39f3` substitui a função ausente por lógica transacional e entrega itens, snapshots e auditoria. [CI backend aprovado](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42272982970) e [frontend validate/integration aprovados](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42277458746), incluindo ajuste misto, falta, cancelamento, replay, concorrência e persistência após reinício. A resolução refere-se às branches da etapa 11, sem merge ou implantação.


- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção.
- **Fonte:** [AjusteResponseDTO.fromEntity / TransferenciaResponseDTO.fromEntity](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/dto/ajuste/AjusteResponseDTO.java).
- **Comportamento observado:** Os DTOs de resposta contêm cabeçalho, sem coleção de itens. Os serviços gravam itens, mas buscar/listar não os incluem.
- **Impacto/contorno no frontend:** Não é possível construir revisão completa desses documentos; etapa mantém apenas visibilidade do estoque.
- **Correção solicitada:** Retornar itens com IDs, produto, tipo/quantidade e observação quando aplicáveis.
- **Aceite testável:** Criar documento com dois itens e recarregar seu detalhe retorna ambos com valores e IDs.
- **Commit de correção:** pendente.

<a id="bg-003"></a>
## BG-003 — Recebimento sem efeitos de estoque e progressão da compra

- **Tipo:** Capacidade ausente.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado no serviço; efeitos de triggers externos permanecem suspeitos/não verificados.
- **Fonte:** [RecebimentoCompraService.criar / atualizar / salvarItens](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/RecebimentoCompraService.java).
- **Comportamento observado:** O serviço insere recebimentos/itens e muda somente o status do recebimento; não atualiza estoque, quantidadeRecebida dos itens de compra ou status da compra. Não foi identificada instalação versionada de triggers; instalações externas precisam de investigação separada.
- **Impacto/contorno no frontend:** Recebimento não é exposto; salvar rascunho é apresentado como operação sem efeito no estoque.
- **Correção solicitada:** Implementar transação de recebimento com controle de saldo recebido, progressão parcial/total e idempotência; documentar eventuais triggers existentes.
- **Aceite testável:** Receber parte e depois o restante incrementa estoque e quantidade recebida, progride a compra e não duplica efeitos em repetição/rollback.
- **Commit de correção:** [`f335d525ea6ed107cd00824031ded904020967fe`](https://github.com/Zayma1/erp-produtos-naturais-backend/commit/f335d525ea6ed107cd00824031ded904020967fe), incorporado à `novaVersao`.

- **Atualização da etapa 7:** Etapa 7: correção implementada no backend `f335d525ea6ed107cd00824031ded904020967fe`. Confirmação explícita transacional, parcial/final, lock de compra/recebimento, incremento atômico de estoque e movimento único por item. Rascunhos sem efeitos, confirmação repetível e recebimento concluído imutável. Testes PostgreSQL cobrem concorrência e rollback. **Resolvida na etapa 7.** Evidência: 16 testes PostgreSQL verdes na [CI do backend](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42082561351), integração local descartável com 12 cenários reais desktop/mobile (incluindo recebimento parcial/final, edição, exclusão, saldo e link de movimento) e comparação integral após reiniciar o backend. `scripts/integration.mjs` fixa o commit de correção; evidências remotas frontend na [CI frontend de `f77fa68`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/42084313779).

<a id="bg-004"></a>
## BG-004 — Edição de recebimento acrescenta itens

- **Tipo:** Defeito.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção; sem reprodução HTTP nesta etapa.
- **Fonte:** [RecebimentoCompraService.atualizar / salvarItens](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/RecebimentoCompraService.java).
- **Comportamento observado:** Atualizar chama salvarItens sem excluir/substituir itens anteriores; cada chamada cria novas entidades.
- **Impacto/contorno no frontend:** Não oferecer edição de recebimento nem simular substituição no frontend.
- **Correção solicitada:** Definir substituição completa ou atualização por ID e garantir integridade em transação.
- **Aceite testável:** PUT duas vezes com um item mantém exatamente um item com a quantidade informada, sem duplicatas.
- **Commit de correção:** [`f335d525ea6ed107cd00824031ded904020967fe`](https://github.com/Zayma1/erp-produtos-naturais-backend/commit/f335d525ea6ed107cd00824031ded904020967fe), incorporado à `novaVersao`.

- **Atualização da etapa 7:** Etapa 7: correção implementada no mesmo commit. PUT substitui a coleção, preserva IDs mantidos (inclusive sem ID enviado), rejeita ID externo, exige versão e exclui itens removidos em transação. `ReceivingTests.draftReplacementPreservesIdentityAndHasNoStockEffects` faz dois PUTs e verifica uma linha/mesmo ID. **Resolvida na etapa 7.** Evidência: 16 testes PostgreSQL verdes na [CI do backend](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42082561351), integração local descartável com 12 cenários reais desktop/mobile (incluindo recebimento parcial/final, edição, exclusão, saldo e link de movimento) e comparação integral após reiniciar o backend. `scripts/integration.mjs` fixa o commit de correção; evidências remotas frontend na [CI frontend de `f77fa68`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/42084313779).

<a id="bg-005"></a>
## BG-005 — Exclusão de compra com itens viola FK

- **Tipo:** Defeito.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por reprodução em PostgreSQL 16 descartável.
- **Fonte:** [CompraService.excluir / ItemCompra.compra](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/CompraService.java).
- **Comportamento observado:** DELETE de rascunho com item retorna HTTP 409; log PostgreSQL confirma SQLState 23503 e FK de item_compra para compra. O serviço exclui apenas o cabeçalho e ItemCompra mantém FK sem cascata. scripts/purchases-seed.mjs reproduz por API upstream, verifica que a compra permanece e limpa seus itens somente por SQL de teste.
- **Impacto/contorno no frontend:** Não há exclusão de compras na interface/proxy. A limpeza de teste remove itens antes do cabeçalho; não existe contorno na aplicação.
- **Correção solicitada:** Excluir dependentes em transação para rascunhos sem referências externas, ou definir bloqueio de negócio explícito/documentado.
- **Aceite testável:** Rascunho com dois itens sem recebimentos pode ser excluído sem violar FK; nenhuma linha órfã permanece. Referências externas têm resposta de negócio e rollback integral.
- **Commit de correção:** pendente.

<a id="bg-006"></a>
## BG-006 — Status do pedido ignorado

- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção.
- **Fonte:** [CompraService.criar / atualizar / aplicar](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/CompraService.java).
- **Comportamento observado:** CompraRequestDTO expõe RASCUNHO, PARCIALMENTE_RECEBIDA, RECEBIDA e CANCELADA. Criar força RASCUNHO; aplicar ignora status; atualizar aceita apenas rascunhos.
- **Impacto/contorno no frontend:** POST/PUT enviam RASCUNHO; demais status são exibidos somente para consulta. Não há transições expostas.
- **Correção solicitada:** Restringir DTO de rascunho ou definir operações explícitas e regras de transição.
- **Aceite testável:** Contrato documenta os status aceitos em cada operação; status incompatível recebe 4xx, nunca sucesso silencioso ignorando a solicitação.
- **Commit de correção:** pendente.

<a id="bg-007"></a>
## BG-007 — PUT da compra recria IDs de itens

- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção e reprodução no banco descartável.
- **Fonte:** [CompraService.atualizar / salvarItens](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/CompraService.java).
- **Comportamento observado:** ItemCompraRequestDTO aceita id, mas atualizar exclui todos os itens e salvarItens cria novos IDs. A suíte real verifica a troca. FKs futuras de recebimento podem impedir editar mesmo um rascunho já referenciado.
- **Impacto/contorno no frontend:** PUT preserva IDs disponíveis por compatibilidade, sem assumir estabilidade após salvar; recarrega o detalhe autoritativo.
- **Correção solicitada:** Preservar identidade de itens existentes ou remover id do contrato e proibir explicitamente substituição com referências.
- **Aceite testável:** Um item mantido no PUT preserva ID e referências; item removido com referências produz erro de negócio claro e rollback completo.
- **Commit de correção:** pendente.

- **Atualização da etapa 7:** Etapa 7, progresso parcial: itens de recebimento preservam identidade; a compra referenciada por qualquer recebimento passa a bloquear PUT/DELETE antes da substituição. Excluir todos os rascunhos libera uma compra ainda editável. PUT de compra sem recebimentos continua recriando seus próprios itens; BG-007 permanece aberta.

<a id="bg-008"></a>
## BG-008 — Vendas sem fechamento e baixa de estoque

- **Tipo:** Capacidade ausente.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado no serviço; triggers externos não verificados.
- **Fonte:** [VendaService.aplicarCabecalho / criar / atualizar](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/VendaService.java).
- **Comportamento observado:** O serviço calcula valores e mantém venda ABERTA, sem operação de checkout, transições ou baixa de estoque.
- **Impacto/contorno no frontend:** Etapa 4 permite criar venda ABERTA e consultar registros em qualquer status, somente leitura após salvar. Não expõe checkout, edição, cancelamento, exclusão ou baixa. A suíte descartável confirma estoque inalterado na criação.
- **Correção solicitada:** Implementar fechamento/cancelamento transacionais com baixa/estorno e idempotência.
- **Aceite testável:** Fechar venda baixa estoque exatamente uma vez, bloqueia edição indevida e cancelamento segue política explícita com estorno testado.
- **Commit de correção:** pendente.

<a id="bg-009"></a>
## BG-009 — Filtros individuais e combinados inconsistentes

- **Tipo:** Defeito.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção; esta etapa não reproduziu todos os parâmetros por HTTP.
- **Fonte:** [MovimentacaoEstoqueService.listar / ProdutoSkuService.listar / ProdutoLojaService.listar / ProdutoPrecoLojaService.listar](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/MovimentacaoEstoqueService.java).
- **Comportamento observado:** Movimentações e preços filtram somente quando produto e loja são informados juntos; SKU ignora idLoja; vínculo prioriza produto e ignora loja quando ambos são informados. VendaService.listar prioriza cliente, depois usuário, depois loja, sem conjunção. [Fonte de vendas](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/VendaService.java), confirmado por inspeção; combinação de vendas não reproduzida por HTTP real.
- **Impacto/contorno no frontend:** Frontend filtra IDs localmente; SKU continua global por produto. Vendas envia cliente/loja à API e reaplica ambos localmente, além de status e intervalo inclusivo no fuso de São Paulo. Não introduzir regra de vínculo para comprar ou vender.
- **Correção solicitada:** Aplicar todos os filtros fornecidos por conjunção, ou retirar parâmetros sem significado do contrato.
- **Aceite testável:** Para cada recurso, testar nenhum filtro, cada filtro individual e ambos, inclusive combinação sem resultados. O retorno contém somente registros correspondentes.
- **Commit de correção:** pendente.

<a id="bg-010"></a>
## BG-010 — Campos da entidade fornecedor ausentes dos DTOs

- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção.
- **Fonte:** [FornecedorRequestDTO / FornecedorResponseDTO / Fornecedor](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/dto/fornecedor/FornecedorRequestDTO.java).
- **Comportamento observado:** Entidade contém logradouro, numero, cep, email, telefone e status; DTOs não os recebem nem devolvem. Apenas complemento, CNPJ e CPF são opcionais no contrato atual.
- **Impacto/contorno no frontend:** Formulário usa somente nome fantasia, razão social, UF, cidade, bairro, complemento, CNPJ e CPF; sem contato/endereço completo/status.
- **Correção solicitada:** Decidir escopo e alinhar entidade, DTOs e documentação com validações apropriadas.
- **Aceite testável:** Cada campo público acordado pode ser gravado e lido sem perda; os demais estão documentados como internos ou removidos.
- **Commit de correção:** pendente.

<a id="bg-011"></a>
## BG-011 — Autenticação e autorização de negócio ausentes

- **Tipo:** Capacidade ausente.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Encerrada na versão integrada em `novaVersao` (`a3aa982`), após aceite funcional backend/frontend e CI aprovada. Implantação e migrações em produção não auditadas.
- **Fonte:** [SecurityConfig.securityFilterChain](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/config/SecurityConfig.java).
- **Comportamento observado:** Todas as requisições são permitAll; não há isolamento/autorização por usuário/loja.
- **Impacto/contorno no frontend:** O frontend agora tem implantação pública na Vercel; leitura de categorias pelo proxy retornou 200 sem credenciais/cookies em 05/11/2026. A seleção explícita de operador em vendas/recebimentos identifica o registro internamente e não autentica nem autoriza a pessoa. Não foram testadas escritas no ambiente publicado.
- **Correção solicitada:** Definir autenticação, autorização por operação/loja e identidade auditável no servidor.
- **Aceite testável:** Sem credencial válida retorna 401; sem permissão retorna 403; cliente não consegue escolher identidade ou acessar loja indevida.
- **Commit de correção:** `396c426b6709d2a95e10222064e6c10218247a09` (correção inicial), incorporado em `novaVersao`; referência final `a3aa98212842a48bd3bb30302a25bca37c21727c`.

- **Atualização da etapa 7:** Etapa 7: recebimento exige operador existente, escolhido explicitamente na interface interna. Essa seleção não autentica nem autoriza o usuário. BG-011 continua aberta.

- **Implementação da etapa 8:** Sessões JDBC, BCrypt, CSRF inclusive login/logout, expirações, revogação, limite persistido de tentativas e contas administrativas. ADMIN/GER/FUNC são validados diretamente na API, com atribuições aplicadas nas coleções SQL, detalhes, escritas, confirmação, histórico e replay. IDs de outra loja retornam 404; operações proibidas 403; anônimos recebem 401 direto e pelo proxy. O ator vem do principal, com autor/modificador/confirmador separados. A comparação de `cargoUsuario` encontrou loader nulo e sem registro, `findByUuid` inválido, authorities/enum incorretos, permitAll, senhas em texto puro e regressão de recebimento; a branch foi adaptada, sem merge integral.
- **Aceite da etapa 8:** testes PostgreSQL/HTTP de autenticação, perfis, isolamento, falsificação de ator, replay e concorrência; 166 testes frontend, 106 cenários de navegador e 14 cenários reais autenticados desktop/mobile com PostgreSQL descartável, build de produção, 401 anônimo nos dois caminhos e persistência após reinício. Evidência local registrada no [handoff](PLANNER_HANDOFF.md#etapa-8--autenticação). CI final na [execução de `main` 42223775274](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42223775274), com `validate` e `integration` aprovados, e [backend `a3aa982`](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42218105138) aprovado (33 testes registrados, 32 executados e 1 ignorado).

<a id="bg-012"></a>
## BG-012 — Precedência de preços sobrepostos indefinida

- **Tipo:** Capacidade ausente.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado como ausência de regra no serviço; decisão de produto pendente.
- **Fonte:** [ProdutoPrecoLojaService.listar / aplicar](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/ProdutoPrecoLojaService.java).
- **Comportamento observado:** Preços podem ter validades sobrepostas e não há regra explícita de desempate para preço vigente.
- **Impacto/contorno no frontend:** Catálogo exibe todos os preços/validades. Compras exigem custo informado e não reutilizam preço de venda.
- **Correção solicitada:** Definir política de sobreposição e seleção determinística de preço vigente.
- **Aceite testável:** Dois preços sobrepostos têm criação rejeitada ou seleção determinística documentada, testada nos limites de data.
- **Commit de correção:** pendente.

<a id="bg-013"></a>
## BG-013 — Listas sem paginação de servidor

- **Tipo:** Capacidade ausente.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção.
- **Fonte:** [CompraService.listar / FornecedorService.listar e demais listar do catálogo](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/CompraService.java).
- **Comportamento observado:** Listas retornam arrays completos com findAll; compras incluem também todos os itens em cada resposta.
- **Impacto/contorno no frontend:** Filtros, ordenação e páginas de 20 registros são locais. A etapa 5 também carrega arrays completos para agregações da visão geral e exportação CSV de todas as linhas filtradas antes da paginação. Queries são independentes, sem snapshot transacional. Volume crescente aumenta tráfego, memória, processamento e tamanho do download no navegador; a compensação no frontend não resolve esta lacuna.
- **Correção solicitada:** Adicionar paginação/filtros/ordenação estáveis, total e DTO resumido de compra para listagem; agregações de catálogo/estoque/documentos por status no servidor e exportações filtradas/ordenadas no servidor são requisitos de escala. As agregações devem explicitar escopo temporal/loja, status e totais incompletos.
- **Aceite testável:** Consultar páginas com ordem estável não duplica/perde registros; filtros afetam total e conteúdo; limite é aplicado no banco. Em volume superior a uma página, agregações por status coincidem com documentos conhecidos sem transferir todos os itens, e exportação inclui todas as linhas filtradas na ordem estável pedida. Datas usam limites explícitos de São Paulo e totais inválidos não são tratados como zero.
- **Commit de correção:** pendente.

<a id="bg-014"></a>
## BG-014 — Precisão e desconto não validados no DTO de compra

- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção; efeitos de arredondamento/negativos suspeitos sem teste destrutivo nesta etapa.
- **Fonte:** [ItemCompraRequestDTO / ItemCompra / CompraService.salvarItens](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/dto/compra/ItemCompraRequestDTO.java).
- **Comportamento observado:** DTO valida apenas mínimos; não limita casas/dígitos nem compara desconto ao bruto. Entidade usa numeric(14,3), numeric(14,4), numeric(14,2); serviço calcula total antes da persistência/arredondamento das colunas.
- **Impacto/contorno no frontend:** Validação local com inteiros escalados rejeita casas extras, limites e desconto acima do bruto sem arredondar. Outros clientes podem contornar isso.
- **Correção solicitada:** Adicionar validação de precisão e desconto no servidor antes de persistir, mantendo HALF_UP por item e limite da soma.
- **Aceite testável:** Casas/dígitos extras, desconto maior que bruto e soma fora do limite retornam 4xx sem gravação; limites válidos recarregam com totais iguais ao cálculo documentado.
- **Commit de correção:** pendente.

<a id="bg-015"></a>
## BG-015 — Cliente e operador opcionais no request, obrigatórios na entidade

- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção e probes descartáveis descritos abaixo (`scripts/sales-seed.mjs`).
- **Fonte:** [VendaRequestDTO](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/dto/venda/VendaRequestDTO.java).
- **Comportamento observado:** Request permite IDs nulos e serviço os aplica; [Venda.cliente e usuario](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/entity/Venda.java) exige @NotNull. Envio sem ambos reproduziu HTTP 500 no banco descartável.
- **Impacto/contorno no frontend:** Form exige os dois IDs e seleção explícita de operador.
- **Correção solicitada:** Adicionar @NotNull aos IDs no DTO, mantendo contrato OpenAPI consistente.
- **Aceite testável:** Omitir cada ID individualmente retorna 400 com mensagem de campo; payload válido cria ABERTA.
- **Commit de correção:** pendente.

- **Atualização da etapa 8:** Operador passa a vir do principal autenticado; `idUsuario` omitido é permitido e outro ID é rejeitado. A interface não oferece seletor de operador. `idCliente` continua opcional no DTO; a inconsistência de cliente permanece aberta.

<a id="bg-016"></a>
## BG-016 — Observação de venda não retorna na consulta

- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção e probes descartáveis descritos abaixo (`scripts/sales-seed.mjs`).
- **Fonte:** [VendaResponseDTO.fromEntity](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/dto/venda/VendaResponseDTO.java).
- **Comportamento observado:** Observação é aceita e gravada, mas não é devolvida. Probe enviou observação e confirmou sua ausência no POST/GET.
- **Impacto/contorno no frontend:** Sem input de observação e sem edição integral após salvar.
- **Correção solicitada:** Retornar observacao no DTO de resposta.
- **Aceite testável:** POST com observação seguido de GET preserva e retorna o texto.
- **Commit de correção:** pendente.

<a id="bg-017"></a>
## BG-017 — Atualização e exclusão de vendas sem guardas de status

- **Tipo:** Defeito.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção e probes descartáveis descritos abaixo (`scripts/sales-seed.mjs`).
- **Fonte:** [VendaService.atualizar / excluir](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/VendaService.java).
- **Comportamento observado:** Serviço não verifica status. Probe alterou status para CONCLUIDA por SQL exclusivo de teste: PUT e DELETE upstream foram aceitos (200/204).
- **Impacto/contorno no frontend:** Proxy bloqueia PUT/DELETE de vendas; detalhe sempre somente leitura.
- **Correção solicitada:** Definir política de imutabilidade por status e validá-la em transação.
- **Aceite testável:** PUT/DELETE de venda concluída/cancelada são rejeitados com erro de negócio, sem modificar itens/cabeçalho.
- **Commit de correção:** pendente.

- **Atualização da etapa 8:** PUT/DELETE de vendas são negados diretamente pela API para todos os perfis, além do proxy. Isso bloqueia o fluxo sem suporte, mas não implementa política de edição/exclusão por status no serviço; a lacuna permanece aberta.

<a id="bg-018"></a>
## BG-018 — Validação monetária e de precisão insuficiente nos itens de venda

- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção e probes descartáveis descritos abaixo (`scripts/sales-seed.mjs`).
- **Fonte:** [ProdutoVendaRequestDTO / ProdutoVenda](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/dto/venda/ProdutoVendaRequestDTO.java).
- **Comportamento observado:** DTO só impõe mínimo de quantidade e presença de preço. Não há mínimo de preço/desconto, @Digits ou comparação desconto/bruto. Probe com preço -1 foi aceito e retornou total -1. Precisão excessiva e outros valores inválidos não foram reproduzidos por HTTP.
- **Impacto/contorno no frontend:** BigInt em escalas 3/2/2, limites numeric(14,3), numeric(12,2), numeric(14,2), desconto limitado ao bruto não arredondado; HALF_UP agregado.
- **Correção solicitada:** Validar escalas, limites, mínimos e desconto <= bruto também no backend.
- **Aceite testável:** Valores negativos, escala excedida, overflow e desconto acima do bruto retornam 400 e não persistem; limites válidos têm totais consistentes.
- **Commit de correção:** pendente.

<a id="bg-019"></a>
## BG-019 — Resposta de item omite total persistido e unidade histórica

- **Tipo:** Inconsistência de contrato.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção e probes descartáveis descritos abaixo (`scripts/sales-seed.mjs`).
- **Fonte:** [ProdutoVendaResponseDTO.fromEntity](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/dto/venda/ProdutoVendaResponseDTO.java).
- **Comportamento observado:** [ProdutoVenda](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/entity/ProdutoVenda.java) persiste totalItem e unidadeSiglaSnapshot, DTO omite ambos. Ausência confirmada no retorno real.
- **Impacto/contorno no frontend:** Detalhe usa totais de cabeçalho autoritativos e identifica unidade atual como lookup do catálogo. Não apresenta cálculo como total persistido do item.
- **Correção solicitada:** Incluir totalItem e unidadeSiglaSnapshot nas respostas.
- **Aceite testável:** GET devolve total HALF_UP e unidade histórica mesmo após mudar a unidade do catálogo.
- **Commit de correção:** pendente.

<a id="bg-020"></a>
## BG-020 — Senha recebida atribuída diretamente a senhaHash

- **Tipo:** Defeito.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Encerrada na versão integrada em `novaVersao` (`a3aa982`), após aceite funcional backend/frontend e CI aprovada. Implantação e migrações em produção não auditadas.
- **Fonte:** [UsuarioService.criar / atualizar](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/UsuarioService.java).
- **Comportamento observado:** Ambos os métodos chamam setSenhaHash(dto.senha()), sem hashing no serviço inspecionado. Confirmado por inspeção; conteúdo de senha persistida não foi consultado nem registrado.
- **Impacto/contorno no frontend:** Sem gestão de usuários ou autenticação. Operador descartável é criado somente por teste upstream com segredo aleatório.
- **Correção solicitada:** Aplicar hash de senha adequado e política consistente de criação/atualização, com tratamento seguro de credenciais.
- **Aceite testável:** Teste de serviço comprova hash verificável diferente da senha recebida; resposta/log não expõe senha nem hash.
- **Commit de correção:** `396c426b6709d2a95e10222064e6c10218247a09` (correção inicial), incorporado em `novaVersao`; referência final `a3aa98212842a48bd3bb30302a25bca37c21727c`.

- **Implementação da etapa 8:** Criação, reset e alteração usam BCrypt custo 12, com senha temporária obrigatoriamente substituída e sessões revogadas. V3 invalida todas as credenciais antigas, preserva IDs/referências e cargo legado, sem fallback em texto puro; contas antigas exigem revisão/reset explícito. Hashes não integram DTOs, `/me`, logs de aplicação ou armazenamento do browser. Por solicitação posterior do usuário (backend `8d4099b`), o startup HTTP cria `admin` / `admin` somente se não houver ADMIN ativo/revisado; a senha é BCrypt, temporária e exige troca antes de acesso de negócio. Administradores/senhas existentes não são alterados. O comando local continua como alternativa, sem endpoint público de bootstrap. O mínimo atual é de 8 caracteres para criação/reset/troca (backend `a3aa982`); a credencial inicial `admin` é a exceção temporária do bootstrap.
- **Aceite da etapa 8:** testes PostgreSQL/HTTP de autenticação, perfis, isolamento, falsificação de ator, replay e concorrência; 166 testes frontend, 106 cenários de navegador e 14 cenários reais autenticados desktop/mobile com PostgreSQL descartável, build de produção, 401 anônimo nos dois caminhos e persistência após reinício. Evidência local registrada no [handoff](PLANNER_HANDOFF.md#etapa-8--autenticação). CI final na [execução de `main` 42223775274](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42223775274), com `validate` e `integration` aprovados, e [backend `a3aa982`](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42218105138) aprovado (33 testes registrados, 32 executados e 1 ignorado).

<a id="bg-021"></a>
## BG-021 — Criação de compras e vendas sem idempotência de requisição

- **Tipo:** Capacidade ausente.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção; duplicação após timeout não foi reproduzida.
- **Fonte:** [CompraController.criar](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/controller/CompraController.java), [VendaController.criar](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/controller/VendaController.java), CompraService.criar e VendaService.criar no mesmo commit.
- **Comportamento observado:** Os controllers recebem somente o DTO; serviços criam nova entidade com ID gerado. Não há chave de requisição persistida ou resposta anterior recuperável nesses caminhos.
- **Impacto/contorno no frontend:** Uma perda de resposta pode esconder uma gravação concluída. Manter recuperação e orientar consulta à lista antes de repetir; nunca reenviar POST automaticamente. Sucesso reconhecido limpa recuperação e bloqueia novo envio mesmo se refresh falhar.
- **Correção solicitada:** Aceitar chave de idempotência com escopo e retenção documentados, persistindo resultado atomicamente com o documento; rejeitar reutilização com payload diferente.
- **Aceite testável:** Repetir a mesma chave/payload, inclusive após perda de resposta e em chamadas concorrentes, retorna o mesmo ID com exatamente um documento; payload divergente retorna conflito.
- **Commit de correção:** pendente.

- **Atualização da etapa 7:** Etapa 7, progresso restrito a recebimentos: POST exige chave UUID; chave/hash canônico/identidade são persistidos transacionalmente, com lock da chave, replay concorrente e tombstone após exclusão. A interface guarda a chave e o payload exato antes do envio e os reutiliza em resultado incerto, inclusive após reload. Compras e vendas continuam sem idempotência de criação; BG-021 permanece aberta para esses caminhos.

<a id="bg-022"></a>
## BG-022 — Compra sem versão ou precondição de concorrência

- **Tipo:** Capacidade ausente.
- **Commit inspecionado:** `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`.
- **Situação:** Confirmado por inspeção; perda de atualização concorrente não foi reproduzida. O teste de recuperação altera uma compra sequencialmente para verificar bloqueio local, sem alegar reprodução de corrida.
- **Fonte:** [CompraService.atualizar](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/service/CompraService.java), [Compra](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/e0f312e611d56ab73a4a8e3d5832f8b8874ff362/src/main/java/com/vilaverde/erp/entity/Compra.java) e CompraController.atualizar no mesmo commit.
- **Comportamento observado:** PUT verifica RASCUNHO, exclui itens anteriores e aplica todo o DTO. A entidade não possui `@Version`; o controller não recebe `If-Match` nem versão do registro.
- **Impacto/contorno no frontend:** O fingerprint local bloqueia restauração quando campos editáveis, operador, status ou identidades dos itens diferem da base. Isso não elimina a janela entre GET e PUT nem substitui controle transacional no servidor.
- **Correção solicitada:** Expor versão/ETag e exigir precondição no PUT, incluindo status/itens na mesma transação.
- **Aceite testável:** Dois clientes leem a mesma versão; após o primeiro PUT, o segundo recebe 409/412 sem alterar cabeçalho/itens. Resposta informa como recarregar a versão atual.
- **Commit de correção:** pendente.

- **Atualização da etapa 7:** Etapa 7, progresso restrito a recebimentos: versão otimista em PUT/DELETE, bloqueio de compra antes de editar/criar/confirmar e revisão explícita após conflito. Confirmação revalida pendentes sob lock. Não há versão otimista no PUT geral de compras, nem controle equivalente para vendas; BG-022 permanece aberta.

## Atualização da etapa 9 — vendas operacionais

Esta seção atualiza o estado das lacunas de vendas; os relatos anteriores descrevem o backend antigo. Correção: [`65d6585767398c100a6db40e956b683eb7221125`](https://github.com/Zayma1/erp-produtos-naturais-backend/commit/65d6585767398c100a6db40e956b683eb7221125), branch `stage9-sales`, sem merge/implantação. [CI backend aprovada](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42241771727): 44 testes registrados, 43 executados e um bootstrap exclusivo de integração ignorado.

| Lacuna | Estado e evidência na etapa 9 |
| --- | --- |
| BG-008 | Corrigida: conclusão transacional, falta bloqueia toda a venda, produtos repetidos agregados, saldos bloqueados em ordem e baixa atômica. Movimentos únicos por item, replay sem duplicação; concorrência com vendas e recebimentos e rollback de múltiplos produtos em `SalesTests`. A política acordada permite cancelar apenas abertas, sem movimentação; estorno/devolução de concluídas ficam fora do escopo e substituem a proposta antiga de estorno neste aceite. Confirmação não registra pagamento. |
| BG-015 | Corrigida: cliente obrigatório com 400; identidade do operador vem da sessão. Campo opcional idUsuario apenas valida a própria identidade, sem delegação de autoria. Autores e escopos cobertos em `SalesTests` e `AuthenticationTests`. |
| BG-016 | Corrigida: observação retorna em criação, edição e GET; formulário e recuperação conservam o valor. |
| BG-017 | Corrigida: PUT apenas ABERTA com versão, identidade de itens preservada; estados finais rejeitam edição/conversão com 409. DELETE permanece 403 para preservar histórico. Cancelamento explícito audita motivo/ator/horário. |
| BG-018 | Corrigida: validação de sinal, escala, precisão, limites por item/cabeçalho e desconto <= bruto antes da persistência. HALF_UP agregado e total separado por item preservados; testes PostgreSQL e probe HTTP de preço negativo rejeitado com 400. |
| BG-019 | Corrigida: DTO inclui totalItem e unidadeSiglaSnapshot. Teste altera a unidade do catálogo e conserva a unidade histórica; interface explica ausência de snapshot legado. |
| BG-021 | Parcial: criação de vendas agora idempotente, com UUID, hash canônico, dono, persistência e replay concorrente/reinício. Recuperação guarda chave e payload antes do POST. **Criação de compras continua sem idempotência; lacuna permanece aberta para compras.** |
| BG-022 | Permanece aberta para PUT geral de compras. Vendas agora têm versão, lock transacional e conflito explícito; isso não corrige a concorrência da edição de compras. |
| BG-001 | Progresso restrito a vendas: V4 versiona o fluxo sem alterar V1–V3. Relatório de reconciliação e testes de migração preservam históricos sem replay. Ajustes/transferências e demais funções não foram incorporados. |

O contrato integral e o runner do frontend fixam esse commit. O [aceite da etapa 9](STAGE9_RELEASE.md) descreve as verificações, o comando da integração real e o gate de CI do fork pessoal. Nenhum banco compartilhado foi migrado e a versão em produção não foi auditada nesta etapa.

### Aceite final e correção local

Frontend final: `27301102f2906e7a00c2eed02a3b445e964eeac1`, branch `stage9-sales`. [CI do fork pessoal aprovada, validate e integration](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42242646140): lint, tipos, 167 testes unitários/componentes, 106 cenários de navegador, build, smoke autenticado e 18 cenários reais desktop/mobile, incluindo persistência de vendas/itens/estoque/movimentos após reinício do backend fixado. O aceite local da mesma integração também passou. Esses resultados completam a evidência das correções de vendas descritas acima; compras continuam com BG-021/BG-022 abertas.

Após a entrega, o banco local `vila-verde-demo-db` apresentou checksum da V4 intermediária `-979646665`, enquanto o código final possui `597117758`. A comparação com esquema isolado confirmou apenas duas diferenças: `venda.atualizado_em` e `venda_lifecycle_audit`. Com backup/relatório em `/home/rafael.serafim/.local/state/vila-verde/backups/20261106-141433-stage9/`, foram aplicadas as adições e reconciliado o histórico local transacionalmente, sem alterar dados de negócio. A inicialização temporária validou as quatro migrations e retornou 401 sem sessão em /api/vendas; processo de verificação encerrado. Não houve alteração das migrations publicadas nem intervenção em banco compartilhado. Esta reconciliação específica não autoriza repair genérico para outros checksums/esquemas.

## Atualização da etapa 10 — transferências

Backend `867cef2e35596ae67f692f9e2fcfd4932953d513`, branch `stage10-transfers`, base `65d6585` de `stage9-sales`. SDK completo e runner usam esse SHA; V1–V4 permanecem inalteradas.

| Lacuna | Situação nesta etapa |
| --- | --- |
| BG-001 | Resolvida para transferências: aplicação transacional substitui `fn_concluir_transferencia`; V5 versiona auditoria, idempotência, snapshots e unique por item/direção. Confirmação atômica, ordem produto→loja, replay sem duplicação, rollback e persistência. A parte de ajustes (`fn_concluir_ajuste_estoque`) permanece aberta. |
| BG-002 | Resolvida para transferências: detalhe retorna IDs de itens/produtos, nomes, quantidades, unidades salvas, versão e auditoria. Detalhes de ajustes permanecem abertos. |

Históricos são somente leitura e não recebem efeitos/snapshots inferidos. Não há reparo de estoque ou migração compartilhada. Evidências e limites: [STAGE10_RELEASE.md](STAGE10_RELEASE.md). Demais lacunas preservam seus estados anteriores.

### Aceite final da etapa 10

Frontend validado: `e78b80880d90cf3029fd405bef4b62aebd86a8b5`, branch `stage10-transfers`; [CI aprovada: validate e integration](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42267039532). Backend/SDK: `867cef2e35596ae67f692f9e2fcfd4932953d513`; [CI PostgreSQL aprovada](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42265562737).

Aceite: 53 testes backend executados (54 registrados, um bootstrap exclusivo de integração ignorado), 170 testes unitários/componentes frontend, 106 cenários de navegador, build e 26 cenários reais desktop/mobile, com persistência após reiniciar o backend. Esta evidência encerra somente as parcelas de transferências de BG-001/BG-002. As parcelas de ajustes e as demais lacunas abertas não foram encerradas por inferência. As branches seguem sem integração, implantação ou migração compartilhada.

### Etapa 11 — ajustes (aceita na branch)

Substituída a função SQL ausente por confirmação transacional, com versão,
escopo, idempotência, auditoria e snapshots. A parcela de ajustes de BG-001 e
BG-002 está encerrada nesta branch; evidências em [STAGE11_ADJUSTMENTS.md](STAGE11_ADJUSTMENTS.md).

### Etapa 12 — devoluções (integrada em main/novaVersao)

As funções de devolução de cliente/fornecedor de BG-001 agora têm implementação
transacional versionada em V7, com limites autoritativos, escopo ADMIN/GER,
versão, idempotência persistida, auditoria, movimentos únicos e replay seguro.
Os detalhes de devoluções incluem itens reais e snapshots. A unidade de compras
é explicitamente a da criação da devolução, pois não existia snapshot histórico.
Históricos ficam somente leitura e bloqueiam novas devoluções da origem até
reconciliação; não há ferramenta automática de reconciliação nesta etapa.
Não foram implementados reembolso, crédito, fiscal ou reversão de concluídas.
Evidências e limites exatos: [STAGE12_RELEASE.md](STAGE12_RELEASE.md) e
[STAGE12_RETURNS.md](STAGE12_RETURNS.md). Não encerra outras lacunas por inferência.

Aceite final da etapa 12 em 06/11/2026: backend `c87fe72`, 75 testes registrados
(74 executados e um bootstrap ignorado), [CI aprovada](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42284077339).
Frontend `b78cfbe`, 179 testes unitários/componentes, 112 cenários com fixtures
e 30 cenários reais desktop/mobile, com persistência após reinício,
[validate/integration aprovados](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42285586563).
A parcela de devoluções de BG-001 está encerrada na versão integrada; reconciliação de
históricos, acertos financeiros e demais itens diferidos não foram implementados.
