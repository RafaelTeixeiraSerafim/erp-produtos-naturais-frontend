# Handoff para o agente planejador — Vila Verde

Atualização: 06/11/2026. Etapa 8 implementada nas branches `stage8-auth` de frontend e backend; aceite funcional local e CI do fork pessoal concluídos com sucesso. A seção abaixo é a referência atual; o restante preserva o histórico das entregas anteriores.

## Etapa 8 — autenticação

Correção de layout em 06/11: `/alterar-senha` usa apresentação independente, como `/login`, sem sidebar, header ou footer do dashboard. A ação Sair permanece no formulário (sem submetê-lo). Os 14 cenários locais de autenticação desktop/mobile passaram, incluindo ausência dos landmarks de navegação e logout durante a troca obrigatória; lint, tipos e build também aprovados. A suíte real recebeu as mesmas verificações de layout.

Atualização posterior de 06/11: bootstrap automático solicitado pelo usuário, backend `8d4099b`. PostgreSQL local: 32 testes registrados (31 executados, 1 ignorado), incluindo criação concorrente, senha BCrypt, alias `admin`, troca obrigatória, ausência de reset em reinícios e preservação de administradores existentes. Frontend: campo de login aceita usuário ou e-mail; 14 cenários de autenticação desktop/mobile passaram localmente. CI desta atualização aprovada: [backend `8d4099b`, 32 testes registrados/31 executados](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42211068182); [frontend `4a020b6`, jobs validate/integration, 166 testes unitários, 106 cenários de navegador e 14 cenários reais](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42211139909). Os registros abaixo preservam também o aceite da versão anterior.

- Frontend no fork pessoal `RafaelTeixeiraSerafim/erp-produtos-naturais-frontend`, branch de feature destinada a `main`. Backend em checkout isolado `../backend-stage8`, branch derivada de `novaVersao` com recebimento. O checkout original mantém `application.properties` modificado pelo usuário.
- `cargoUsuario` foi comparada e adaptada, sem merge integral: enum/ideia de UserDetails aproveitados; loader nulo, ausência de `@Service`, `findByUuid`, authorities, validação/persistência do enum, permitAll e senha em texto puro corrigidos. A branch antecedia as garantias de recebimento.
- BCrypt custo 12, Spring Session JDBC, rotação no login, CSRF em login/logout/escritas, 30 minutos ociosos/12 horas absolutas, revogação por versão persistida e remoção de sessões; limite persistido de cinco falhas/15 minutos por e-mail normalizado.
- V3 preserva IDs/referências, guarda `cargo_legado`, invalida credenciais antigas, exige revisão/reset e não concede lojas/privilégios. Colisões normalizadas interrompem a migração com IDs. Preflight somente leitura e proteção concorrente do último ADMIN ativo. Atualização solicitada pelo usuário em 06/11: o startup HTTP passa a criar automaticamente `admin` / `admin` se não houver ADMIN ativo/revisado, com BCrypt e troca obrigatória; reinícios e réplicas concorrentes preservam a conta/senha existente. O comando interativo permanece disponível; `BOOTSTRAP_ADMIN_PASSWORD`/`BOOTSTRAP_ADMIN_ENABLED` configuram a inicialização.
- API/Next validam perfis e lojas, inclusive coleções sem filtro, detalhes, gravações, histórico e replay. IDs fora de escopo dão 404 e operações proibidas 403. Catálogo/clientes/fornecedores são compartilhados na organização. Sem tenant novo. Fluxos sem suporte continuam negados diretamente pela API.
- Login, troca de senha obrigatória, logout e `/usuarios`; proxy host-only/HttpOnly/SameSite=Lax/Secure; CSRF em memória; `FRONTEND_ORIGINS` precisa conter a origem pública exata. Navegação e consultas/exportações por permissões. Operador vem do principal; autores preservados, modificadores/confirmadores separados e nomes retornados nos documentos.
- Recuperação v2 por ambiente + ID do usuário, sem importar anônimos; expiração conserva cópia; logout confirmado apaga cópias e cache da conta, inclusive coordenação entre abas; restauração revalida seleções e substitui operador.
- Testes reais agora fazem bootstrap somente dentro do ambiente descartável e autenticam todas as suítes; exclusões de limpeza que passaram a ser proibidas usam SQL exclusivamente nesse banco pertencente ao runner. Nenhuma rota da aplicação executa SQL de limpeza.
- Sem workflow de deploy alternativo, migração de banco compartilhado, merge em `main` ou publicação manual. O [checklist de release](STAGE8_RELEASE.md) cobre a ativação coordenada.
- Backend/SDK/runner fixados em `8d4099b1a3051a7810b9507ff73d7d6a987ded9c`; contrato `openapi-stage8.json`, SDK integral regenerado com o lock existente e sem edição manual. O contrato explicita Identity no login, 401/429 e respostas 204 de logout/troca/reset.
- Validação local: lint e tipos sem erros/avisos; 166 testes unitários/componentes; 104 cenários Playwright desktop/mobile em build de produção; smoke autenticado, 14 cenários reais, 401 anônimo direto/pelo proxy e persistência (inclusive sessões JDBC) após restart. A suíte real de administração verifica conta FUNC atribuída a uma loja, troca obrigatória e logout. O teste PostgreSQL adicional verifica GER/FUNC contra vendas/estoque/movimentos/recebimentos de outra loja, inclusive coleção sem filtro, detalhe, escrita e confirmação.
- Backend: 30 testes registrados, 29 executados e 1 ignorado (`IntegrationBootstrapTests`, exclusivo do runner descartável). A CI de `ecf1875` passou na [execução 42149426645](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42149426645); a geração/validação do contrato final foi testada separadamente. O commit final `396c426` passou na [CI 42149861607](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42149861607).
- Comando da integração final: `INTEGRATION_BACKEND_REPO="$PWD/../backend-stage8" npm run test:integration`; o override altera só a origem do clone, mantendo o SHA final fixado. Browser com fixtures executado em cópia isolada em `/tmp/vila-stage8-browser`, preservando o dev existente na porta 3000. O runner removeu processos e banco próprios ao terminar.
- **CI do fork aprovada em 06/11/2026:** depois da habilitação de Actions pelo usuário, um novo push na feature iniciou a [execução 42154913714](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42154913714) no commit `49e9f7727300534c42cd5e3ed85617748b96cd11`. Os jobs `validate` e `integration` terminaram com `success`. Logs confirmam lint, tipos, 166 testes frontend, 104 cenários de navegador, build, smoke autenticado, 14 cenários reais e persistência após reinício do backend fixado em `396c426`.
- A pendência anterior de zero execuções de Actions foi resolvida. A evidência pertence ao fork pessoal; não foi usada a CI do repositório original nem status Vercel como substituto. Não há pendências de implementação/CI da etapa 8; revisão, integração das branches e release coordenada continuam como etapas operacionais posteriores.
- BG-011/BG-020 corrigidas na branch após os testes de aceite locais; produção não foi alterada. Demais lacunas permanecem abertas. Nenhuma mudança foi enviada a `main`, e não foi criado workflow de deploy.


## Histórico da etapa 7 — estado anterior à autenticação

- **Frontend:** [RafaelTeixeiraSerafim/erp-produtos-naturais-frontend](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend), branch `main`, base funcional `f77fa68b4603632b2c7611aed2a7cae9305a82a2`. O remoto local `origin` aponta para esse fork por SSH (`github-personal`, conta RafaelTeixeiraSerafim); o original [BrunoCGhisi/erp-produtos-naturais-frontend](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend) foi preservado como `upstream`. `main` acompanha `origin/main`; novos pushes devem ir ao fork.
- **Backend:** [Zayma1/erp-produtos-naturais-backend](https://github.com/Zayma1/erp-produtos-naturais-backend), branch `novaVersao`, commit `f335d525ea6ed107cd00824031ded904020967fe`. Na etapa 7, o runner e o SDK estavam fixados nesse commit; `main` do backend não é a referência de integração.
- **Merges e limpeza:** `feat/catalog` foi incorporada à `main` do frontend e `stage7-receiving` à `novaVersao` do backend, ambas por fast-forward. As duas branches de trabalho foram removidas localmente e dos remotos; o checkout temporário `../backend-stage7` também foi removido. O checkout original do backend conserva sua alteração local em `application.properties` e não foi atualizado à força.
- **Publicação:** o usuário criou o fork e publicou diretamente pelo dashboard da Vercel. URL: [https://erp-produtos-naturais-frontend.vercel.app](https://erp-produtos-naturais-frontend.vercel.app). O status GitHub **Vercel** de `f77fa68` informou *Deployment has completed*, com [registro do deploy](https://vercel.com/rafaelteixeiraserafims-projects/erp-produtos-naturais-frontend/6tLCVGcupGGATs16umjqF98B3bfM). Verificação HTTP sem credenciais/cookies: `GET /visao-geral` → 200 HTML; `GET /api/categorias` → 200 JSON array. Não houve escrita nem execução do smoke/seed na implantação publicada.
- **Automação escolhida:** deploy pela integração nativa Vercel/GitHub configurada no dashboard. A tentativa de configurar publicação via GitHub Actions/CLI foi cancelada e integralmente revertida antes de commit/push. Não há job Vercel, `vercel.json` ou secrets adicionados por aquela tentativa; não recriar essa configuração sem novo pedido.
- **CI:** os jobs `validate` e `integration` passaram na [execução original de `f77fa68`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/42084313779): 156 testes unitários/componentes, 92 cenários de navegador e 12 cenários reais, incluindo persistência após reinício. Essa evidência pertence ao repositório original. Na consulta inicial desta sessão não havia execuções de Actions no fork; o status Vercel não equivale aos dois jobs de CI.
- **Limites da verificação publicada:** a origem upstream configurada em `BACKEND_API_URL`, o commit efetivamente executado pelo backend publicado e o recebimento em produção não foram auditados. A consulta de categorias comprova apenas a leitura pelo proxy. BG-003/BG-004 continuam resolvidas na versão testada; BG-011 permanece aberta e agora registra acesso público de leitura sem login. Operador escolhido na interface não é autenticação.

As seções abaixo preservam o histórico de cada etapa, com seu escopo e evidências da época. A seção da etapa 8 no início deste documento prevalece sobre referências antigas a branches e limitações de autenticação.

Histórico do catálogo — Data: 04/11/2026. Repositório: [BrunoCGhisi/erp-produtos-naturais-frontend](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend), branch `feat/catalog`. Este documento acompanha o refactor Tailwind posterior à implementação inicial `1a4f0d2`.

## Resultado e aderência ao plano

O MVP do catálogo está implementado e o fluxo foi validado contra PostgreSQL 16 e backend real descartáveis, além dos testes com fixtures. A CI da base `187f565` passou na [execução 41900348828](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/41900348828). A seção de fechamento abaixo registra a nova entrega.

O fluxo implementado é: categorias/unidades → produtos → SKUs → vínculos com lojas → preços por produto/loja. A interface é em português, com branding Vila Verde, sidebar, breadcrumbs e navegação móvel. A raiz redireciona para `/produtos`.

| Área planejada           | Implementação                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Base técnica             | Next.js 16.1.6 App Router, React 19, TypeScript, Tailwind CSS 4, npm e Node 24                                                        |
| Produtos                 | Listagem, busca, filtros de categoria/status, ordenação, paginação local de 20 linhas, criação, edição, detalhe e exclusão confirmada |
| Cadastros de apoio       | CRUD de categorias, unidades e lojas em modais; loja usa os campos reais do DTO do backend                                            |
| Relacionamentos          | Abas de SKUs globais, vínculos e preços, com operações e erros independentes                                                          |
| Contratos                | Clientes Axios, DTOs e hooks TanStack Query do SDK completo, inclusive `.kubb`, sem editar arquivos gerados                           |
| Transporte               | Proxy de mesma origem `/api`, limitado aos sete recursos do catálogo; mantém query string, status, JSON e 204 e desativa cache        |
| Validação                | Enums exatos, DTO completo em PUT, moeda brasileira não negativa, datas ISO com `Z`, fim igual ou posterior ao início                 |
| Estados e acessibilidade | Loading, vazio, erro/retry, registro ausente, confirmação, preservação de formulário, envio bloqueado durante gravação, labels e foco |
| Testes e CI              | Vitest/Testing Library, Playwright desktop/mobile e workflow de lint, tipos, testes e build                                           |
| Lockfile                 | Lock público versionado; instalação limpa com `npm ci` validada |
| Smoke real               | Smoke e Playwright real desktop/mobile passaram com PostgreSQL 16 descartável |

Listas usam dados reais em produção; fixtures estão nos testes. Não há cascata de exclusão na interface. Os preços mostram todos os registros e respectivas validades, sem escolher um preço vigente nem estabelecer precedência para sobreposições. Vínculos/preços retornados pela API são filtrados explicitamente pelos IDs selecionados. SKUs são consultados por `idProduto`.

Autenticação, fornecedores, clientes, vendas, compras, ajustes/transferências de estoque, dashboards, usuários e hospedagem permanecem fora do MVP de demonstração interna.

## Origem e particularidades da integração

- Backend real: [Zayma1/erp-produtos-naturais-backend](https://github.com/Zayma1/erp-produtos-naturais-backend), branch `novaVersao`, commit `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`. O remoto foi reconferido nesta entrega e continua nesse commit. `main` não é a referência de integração.
- SDK: 307 arquivos copiados integralmente de `generated/sdk`, incluindo os helpers ocultos. Os arquivos continuam inalterados em relação ao commit de origem. Consulte [PROVENANCE.md](../generated/PROVENANCE.md).
- As URLs geradas já incluem `/api`. [providers.tsx](../components/providers.tsx) sobrescreve a origem padrão Render com `baseURL: ''`. Usar `baseURL: '/api'` duplicaria o prefixo.
- [route.ts](../app/api/[...path]/route.ts) e [proxy.ts](../lib/proxy.ts) usam `BACKEND_API_URL` somente no servidor, com padrão `http://localhost:8080`. Não são necessárias alterações de CORS no backend.
- SKUs não recebem loja ou preço. Vínculos não têm PUT. Cada gravação é separada para preservar sucessos parciais e permitir novas tentativas.
- O backend usa `ApiError` com `message` e `detalhes`; a normalização também cobre os demais formatos de erro tratados pela UI.

## Correção de direção: estilos em Tailwind

A primeira implementação concentrou quase todo o estilo em `globals.css`, apesar do plano pedir Tailwind. O usuário pediu a correção mantendo a UI atual. O refactor removeu as regras de layout/componentes do CSS global e passou a usar classes Tailwind nos componentes.

[globals.css](../app/globals.css) agora tem 26 linhas: importação Tailwind, tokens de tema, variantes responsivas e defaults compartilhados de foco/cursor/disabled. Não há classes CSS próprias de componentes nem um mapa central que apenas renomeie o CSS antigo.

Os componentes em [components/ui](../components/ui) concentram utilitários reutilizáveis para botões, inputs/selects/textareas, tabelas, painéis, badges, avisos, ações de formulário, diálogos e tabs. O restante do layout usa utilitários diretamente no JSX. As variantes `mobile`, `compact` e `wide` mantêm os limites originais de 720, 1050 e 1600 px.

## Evidências de validação

| Verificação         | Resultado local                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`      | Passou, sem erros ou avisos de ESLint                                                                                                                                                      |
| `npm run typecheck` | Passou                                                                                                                                                                                     |
| `npm test`          | 39 testes passaram em 6 arquivos, com Vitest 4.1.12 e Node 24                                                                                                                              |
| Playwright          | 16 cenários passaram na suíte completa; após corrigir a espera pela navegação, os 2 fluxos completos passaram na execução direcionada. Os 18 cenários estão cobertos entre essas execuções |
| `npm run build`     | Passou, incluindo compilação, tipos e geração de páginas                                                                                                                                   |
| Comparação visual   | 55 capturas em 1440, 960 e 390 px: zero diferenças de geometria; 49 capturas idênticas em pixels; diferenças residuais até 96 pixels nos outros 6 casos                                    |
| Limites responsivos | Conferidos em 390, 720, 721, 1050, 1051 e 1600 px                                                                                                                                          |
| Backend real        | Concluído no fechamento abaixo; smoke e dois projetos Chromium passaram                                                                                                                                              |

As capturas incluem listagens, forms, diálogos de categoria/loja/SKU/preço/exclusão, tabs, hover, validação, drawer móvel, vazio, erro e ausência de pré-requisitos. Os artefatos são temporários em `/tmp/vila-tailwind-visual/`; não foram adicionados ao repositório nem são fixtures de regressão permanentes. Pequenas diferenças de rasterização/texto não foram apresentadas como igualdade absoluta de pixels.

O build usou uma cópia isolada em `/tmp/vila-tailwind-build.htFiAF` com as mesmas fontes e dependências instaladas, para não interromper o servidor de desenvolvimento existente na porta 3000. A última edição posterior ao build foi em testes; o código da aplicação é o mesmo validado pelo build. Os avisos locais sobre a configuração futura do Vite e as variáveis de cor do runner não impediram os testes.

As evidências da tabela acima descrevem o refactor original; a instalação limpa e a integração real posteriores estão registradas no fechamento abaixo.

### Problemas dos testes corrigidos

A instalação completa das dependências tornou visíveis três erros de TypeScript em `JSON.parse(config.data)`: o payload do transporte é `unknown`. O teste agora valida que o corpo é uma string antes de decodificá-lo.

A execução dos testes de browser revelou seletores ambíguos já presentes na suíte: `SKU` também correspondia ao diálogo/tabpanel, `Vincular loja` correspondia a `Desvincular Loja Centro`, e o primeiro botão de retry era o de categorias. Os seletores foram restringidos ao elemento/recurso correto. O fluxo completo também aguardava a gravação, mas recarregava antes de confirmar a navegação; agora espera a URL de detalhe antes do reload e tem timeout próprio de 60 segundos. Não foi necessário mudar o comportamento da aplicação para contornar esses problemas.

A [CI anterior de `1a4f0d2`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/41849929867) falhou nos três erros de tipos do teste de catálogo. Essas causas foram corrigidas em `187f565`, cuja CI passou na [execução 41900348828](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/41900348828).

## Fechamento da validação completa

Frontend: `67dadeee33174661481724fd60fb70c49ee09698` (base `187f565`, branch `feat/catalog`). Backend: `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`, sem alterações. O checkout de backend existente e seu `application.properties` modificado foram preservados.

- Lock gerado em diretório temporário sem `node_modules`, exclusivamente pelo registro `https://registry.npmjs.org`. As 592 dependências resolvidas separadamente têm URL pública e `integrity`; seis entradas opcionais `inBundle` recebem integridade pelo pacote que as contém. O lock antigo foi preservado em `/tmp/catalog-lock.zqH8QI/original-package-lock.json` nesta máquina.
- `npm ci` passou sem configuração de registro privado em uma cópia limpa. Lint, tipos e 39 testes unitários passaram nessa instalação. Os 18 testes Playwright com fixtures passaram também nessa cópia, com configuração temporária na porta 3200 e servidor próprio para preservar o desenvolvimento na porta 3000. O build de produção, smoke real e dois projetos Chromium reais passaram.
- A suíte real cria categoria, unidade, loja, produto, SKU, vínculo e preço pelo UI; verifica edição, `1.234,56` e `14,50`, datas locais, reload de produto e relacionamentos, duplicidades e bloqueios de exclusão por referência. As gravações de vínculo e preço continuam após falhas independentes. Não houve defeito de integração no código da aplicação que exigisse correção.
- Todos os registros criados são removidos por API em ordem de dependência; falhas de limpeza reprovam o teste. Ao final o orquestrador encerra os processos próprios e remove o PostgreSQL, sem volumes persistentes.
- Verificações negativas passaram: o smoke recusa ausência de `CATALOG_DISPOSABLE=1` antes de acessar a API; uma porta 3100 ocupada faz a integração falhar preservando o servidor existente. SIGTERM durante a inicialização também retornou falha e removeu o container, deixando as portas 8081/3100 livres.
- CI: [execução 41906754976](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/41906754976) concluída com sucesso para `67dadeee33174661481724fd60fb70c49ee09698`, com os jobs `validate` e `integration` verdes. O workflow mantém os checks anteriores e adiciona um job de integração com Node 24, Java 21, Docker e Chromium. Em falhas publica logs com senha temporária removida, relatório e traces.

Comandos exatos:

```bash
nvm use
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
npm run test:integration
```

`test:integration` já inclui um build isolado. Para o smoke de baixo nível, somente depois de confirmar que **o banco upstream** é descartável: `CATALOG_DISPOSABLE=1 SMOKE_BASE_URL=http://127.0.0.1:3100 npm run test:live`. Uma URL loopback do frontend não garante isso.

Limitações: dados sobrevivem a reload do navegador, mas não precisam sobreviver ao restart do backend (`ddl-auto=create`). O fluxo exige internet para obter o commit fixado, imagem PostgreSQL e dependências Maven. SIGKILL e queda da máquina impedem limpeza automática; remova eventual container `vila-integration-*` restante. O lock conserva as declarações de dependências existentes; a auditoria npm da instalação reportou 11 avisos (8 moderados, 2 altos, 1 crítico), sem atualização de versões neste escopo. Autenticação, deploy e merge permanecem fora da entrega.

## Mapa para retomar

- [README](../README.md): startup, configuração e backend descartável.
- [catalog.ts](../lib/catalog.ts): campos, schemas por recurso e despacho para clientes gerados.
- [validation.ts](../lib/validation.ts): enums, moeda, datas e payloads.
- [queries.ts](../lib/queries.ts): invalidação das queries afetadas após gravações.
- [record-form.tsx](../components/record-form.tsx): forms compartilhados com React Hook Form e validação Zod.
- [product-detail.tsx](../components/product-detail.tsx): abas e relacionamentos; preservar filtros explícitos por IDs.
- [e2e/catalog.spec.ts](../e2e/catalog.spec.ts): fluxo completo e exceções com API interceptada.
- [smoke-live.mjs](../scripts/smoke-live.mjs): smoke de baixo nível com opt-in explícito e origem loopback.
- [integration.mjs](../scripts/integration.mjs): backend fixado, PostgreSQL e frontend descartáveis, prontidão e limpeza.
- [playwright.live.config.ts](../playwright.live.config.ts) e [e2e-live/catalog.spec.ts](../e2e-live/catalog.spec.ts): Chromium real desktop/mobile, sem interceptação.

Não existem alterações de backend, deploy público ou nova autenticação nesta entrega. A continuidade deve partir de `feat/catalog`, preservando o commit de integração do SDK e as separações produto/SKU/vínculo/preço.


## Etapa 2 — visibilidade de estoque

Implementadas `/estoque` e `/estoque/movimentacoes`, com hooks/tipos gerados intactos, filtros locais e enviados à API, URL restaurável, ordenação, paginação de 20 linhas, consulta exata independente, atualização manual, estados de carregamento/vazio/erro e data da última consulta bem-sucedida. O catálogo conecta-se aos saldos pelo produto; sidebar e menu móvel incluem Estoque, com breadcrumbs.

Quantidades usam três casas decimais e separadores brasileiros; movimentos preservam o valor retornado. Datas com offset são convertidas para `America/Sao_Paulo`; filtros comparam dias nesse fuso e incluem ambas as extremidades. Não há combinações artificiais, totais entre unidades ou cálculo de saldo histórico. O diálogo é somente leitura e omite referências ausentes. Consultas de lookup usam as mesmas chaves geradas do catálogo; na ausência de nomes, registros continuam visíveis pelos IDs.

`lib/proxy.ts` permite somente GET nos dois recursos de estoque, por coleção/UUID, e trata `estoques/saldo` antes da validação de UUID do caminho, exigindo os dois parâmetros válidos e únicos. Permissões do catálogo permanecem iguais.

`e2e/inventory.spec.ts`, `tests/inventory*.test.*` e os novos casos de proxy cobrem precisão, datas, filtros individuais, persistência na URL, fallback, ausência versus zero, refresh, erros independentes e navegação. `scripts/inventory-seed.mjs` é importado somente pelo runner descartável, sem SQL em rotas de aplicação. Insere dados conhecidos no container próprio após criar catálogo por API e remove estoque antes de limpar o catálogo, inclusive em falhas. `e2e-live/inventory.spec.ts` consome IDs da fixture via variável de ambiente, sem interceptar chamadas. A CI existente descobre as novas suítes em ambos os projetos de cada configuração e reprova em qualquer falha.

Os parâmetros de filtros usam `history.replaceState` integrado ao Next para manter a UI/URL sincronizadas sem navegação de servidor; cada alteração parte da URL atual, evitando perder alterações rápidas. Seletores têm rótulos explícitos. O teste real antigo de loja passou a procurar campos dentro do diálogo para evitar colisão com botões de registros já existentes.

Comandos de validação desta etapa: `npm run lint`, `npm run typecheck`, `npm test`, `npx playwright test`, `npm run test:integration` (inclui build, smoke e Playwright real desktop/mobile). Evidências locais em 04/11/2026 (Node 24):

- `npm run lint`, `npm run typecheck` e `npm test`: passaram; 57 testes em 8 arquivos.
- `npx playwright test`: 28 cenários passaram, em desktop/mobile. Após ampliar as asserções de quantidade, ordenação, parâmetros enviados e refresh com valores alterados, `npx playwright test e2e/inventory.spec.ts` passou novamente nos 10 cenários de estoque.
- `npm run test:integration`: passou com o backend fixado e PostgreSQL 16 próprio. Incluiu build de produção, smoke e 4 cenários reais (catálogo + estoque em `live-desktop` e `live-mobile`), sem interceptações.
- Limpeza confirmada: 5 movimentos e 3 saldos removidos em transação antes dos pré-requisitos do catálogo; container removido; runner terminou com código 0. Logs em `integration-artifacts/` (ignorados pelo Git).
- `git diff --check`: passou. SDK e dependências não foram alterados. O workflow continua exigindo as duas suítes de navegador e os checks anteriores; esta etapa não foi enviada ao remoto nem executada na CI nesta sessão.

A execução inicial revelou seletores imprecisos e perda de filtros em navegações rápidas; foram corrigidos antes das execuções verdes acima. O runner foi ajustado para conservar o backend durante o recebimento de sinal até finalizar a limpeza das fixtures. O build da execução verde contém o código final da aplicação; as edições posteriores ampliaram testes e documentação.

## Etapa 3 — fornecedores e rascunhos de compras

Continuação de `6f77647`, preservando a referência de backend/SDK `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`, a interface portuguesa em Tailwind e o acesso de demonstração interna. As declarações anteriores de fornecedores/compras fora do MVP descrevem as etapas históricas.

Implementadas listagem e CRUD de fornecedores em `/fornecedores`, reutilizando modais/tabelas/erros existentes, com os oito campos reais do DTO, cinco obrigatórios, UF normalizada e identificação opcional. “Ver compras” abre filtro por fornecedor. Implementadas `/compras`, `/compras/nova`, `/compras/[id]` e `/compras/[id]/editar`, navegação desktop/mobile e breadcrumbs. Lista com filtros, ordem por data decrescente inicial e paginação local de 20 registros; controles restaurados pela URL.

Compra inclui cabeçalho e múltiplos itens do catálogo, sem regras novas de vínculo. Validação rejeita precisão excedida, limites de numeric(14,s), quantidade zero/negativa, custo/desconto negativos e desconto superior ao bruto não arredondado. Prévia usa BigInt em escalas 3/4/2 e HALF_UP por item antes da soma. Custo não depende do preço de venda. O detalhe usa totais salvos e exibe quantidades recebidas; salvar rascunho não modifica estoque.

Criação envia RASCUNHO e omite usuário/data ausente. Edição envia DTO completo com IDs de itens e idUsuario existente, preservando o instante original da data quando não alterada. Horários editáveis são convertidos pelo fuso America/Sao_Paulo para ISO com offset (inclusive horário de verão histórico); dias/horários inexistentes são rejeitados. Erros de lookup, validação, gravação e atualização do status são independentes. Formulários mantêm o conteúdo em falhas; status concorrente impede novo envio mesmo se a confirmação falhar, com retry separado.

Proxy ampliado somente para fornecedores (GET/POST de coleção e GET/PUT/DELETE por UUID) e compras (GET/POST de coleção e GET/PUT por UUID). Estoque permanece somente leitura. Não há exclusão, recebimento, cancelamento, aprovação ou transições de compra na aplicação.

### Lacunas para encaminhamento

[BACKEND_GAPS.md](BACKEND_GAPS.md) registra BG-001 a BG-014 em português, com IDs permanentes, commit inspecionado, classificação, situação, fontes, impacto, pedido e aceite testável. Capacidade ausente, contrato inconsistente e defeito estão separados; inspeção não é apresentada como reprodução. Triggers externos de recebimentos/vendas continuam pendentes de investigação.

Confirmado nesta etapa: edição recria IDs de itens; DELETE upstream de compra com item retorna 409 e o log PostgreSQL registra FK de item_compra para compra (SQLState 23503). A suíte descartável reproduz isso e confirma a permanência da compra. A validação insuficiente de precisão/desconto no DTO do backend também foi registrada (BG-014), com efeitos não ensaiados identificados como suspeitos. Nenhuma lacuna foi simulada na UI nem corrigida no backend.

### Mapa e evidências da etapa

- [purchases.ts](../lib/purchases.ts): validação, cálculos com inteiros, DTO e datas.
- [purchases.tsx](../components/purchases.tsx): lista, detalhe e editor; [support-list.tsx](../components/support-list.tsx) reutilizado para fornecedores.
- [purchases.test.ts](../tests/purchases.test.ts), [purchases-component.test.tsx](../tests/purchases-component.test.tsx), proxy e queries: precisão, HALF_UP, descontos, limites, payloads, erros e invalidação.
- [purchases.spec.ts](../e2e/purchases.spec.ts): fluxo desktop/mobile com fixtures e falhas independentes.
- [purchases-seed.mjs](../scripts/purchases-seed.mjs): smoke real e reprodução da FK, importado apenas pelo runner dono do container.
- [e2e-live/purchases.spec.ts](../e2e-live/purchases.spec.ts): fornecedor pelo UI, múltiplos itens, edição/reload e estoque inalterado, sem interceptação.

A limpeza real remove itens por SQL somente de teste, cabeçalhos/fornecedores por API e, por último, pré-requisitos de catálogo/estoque. Falhas de limpeza reprovam a execução. CI existente descobre os novos testes em ambos os projetos, sem mudanças nas dependências ou SDK.

Validação local final em 05/11/2026, Node 24 e Java 21:

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Passou |
| `npm run typecheck` | Passou |
| `npm test` | 82 testes passaram em 10 arquivos |
| `npx playwright test` | 42 cenários passaram, incluindo catálogo, estoque e compras em desktop/mobile |
| `npx playwright test e2e/purchases.spec.ts` | 14 cenários passaram novamente após os ajustes finais de preservação/status |
| `npm run test:integration` | Passou no código final: build de produção isolado, smoke de catálogo/compras e 6 cenários reais desktop/mobile |
| Limpeza real | 3 compras e 3 fornecedores removidos após seus itens; estoque/catálogo limpos e container próprio removido |
| `git diff --check` | Passou |

A última execução real foi concluída com código 0; o build contém as cinco rotas novas. Logs em `integration-artifacts/`, incluindo `frontend-build.log`, `backend.log` (SQLState 23503/FK de item_compra) e `database-cleanup.log`. Esses artefatos são temporários e ignorados pelo Git. Não há containers `vila-integration-*` restantes.

As primeiras execuções detectaram seletores de testes ambíguos e a expectativa incorreta de HTTP 500 na exclusão; foram corrigidos para os nomes acessíveis exatos, escopos de diálogo/main e HTTP 409 confirmado no backend. Os testes não ocultam o defeito de integridade; ele permanece registrado em BG-005. A revisão final acrescentou testes de status atualizado por query e falha de refresh sem descartar formulário.

SDK, package.json e lockfile sem alterações. O application.properties previamente modificado do checkout de backend foi preservado; a integração usa checkout próprio. A situação da CI após o push não foi consultada nesta sessão. Não houve deploy ou merge. Os commits enviados e os ajustes posteriores estão registrados abaixo.

### Ajustes finais de navegação e envio

- [`876122f`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/commit/876122f): implementação da etapa 3 e evidências completas acima.
- [`4c3b414`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/commit/4c3b414): sidebar com logo fixo e rolagem somente a partir de Catálogo, incluindo os grupos Compras/Estoque e o rodapé lateral. A barra fica junto à borda direita, com espaçamento entre os itens e a barra; o espaçamento esquerdo foi preservado.
- Catálogo, Compras e Estoque nos breadcrumbs agora são texto, sem links para as primeiras páginas das seções. A navegação pela sidebar permanece disponível.
- Validação desses ajustes: ESLint dos arquivos alterados, `git diff --check` e os dois cenários de navegação/breadcrumbs em desktop/mobile passaram. Comando direcionado: `npx playwright test e2e/purchases.spec.ts -g 'navegação de compras'`. A suíte completa e a integração real da tabela acima foram executadas antes destes ajustes visuais.
- Ambos os commits foram enviados a `origin/feat/catalog`; o push avançou a branch remota de `6f77647` para `4c3b414`. A atualização deste registro segue em commit de documentação.

## Etapa 4 — clientes e vendas abertas

Implementadas `/clientes`, `/vendas`, `/vendas/nova` e `/vendas/[id]`, com grupo Vendas (Registros/Clientes), mantendo marca fixa, navegação rolável e breadcrumbs de seção sem links. Clientes reutilizam tabelas, modais, confirmação de exclusão e erros do backend. Datas de nascimento permanecem strings civis; CPF/nascimento são opcionais. Vendas listam data, cliente, operador, loja, status e total salvo, com filtros locais e suportados pela API, ordenação e paginação de 20 linhas na URL.

Preparação exige seleções explícitas de cliente/loja/operador e ao menos um item. Operador é responsabilidade na demonstração, sem autenticação nem gestão de usuários. Preço manual, sem vínculo/saldo/validade automáticos. Validação usa BigInt e escalas 3/2/2, incluindo numeric(12,2) do preço e numeric(14,s) dos demais valores. HALF_UP arredonda a soma dos brutos; a UI explica diferenças em relação à soma das prévias de itens. Data opcional usa São Paulo e é omitida em branco; status e observação não são enviados.

Após salvar, detalhe somente leitura usa subtotal/desconto/total retornados pelo backend, identifica unidade do catálogo como atual e explica snapshots/totais de item ausentes. Nenhuma mutação após criação, checkout, pagamento ou baixa de estoque foi adicionada. Proxy permite clientes GET/POST e GET/PUT/DELETE UUID, vendas GET/POST e GET UUID, usuários somente GET de coleção; rejeita ações extras. SDK, dependências e backend preservados.

Fontes: [sales.ts](../lib/sales.ts), [sales.tsx](../components/sales.tsx), [support-list.tsx](../components/support-list.tsx). Testes: `tests/sales*.test.*`, proxy/queries, `e2e/sales.spec.ts`, `e2e-live/sales.spec.ts` e `scripts/sales-seed.mjs`. A limpeza remove vendas antes de clientes e operador; o runner mantém propriedade exclusiva dos processos/container e limpa em falha. Os jobs CI existentes descobrem essas suítes sem alteração do workflow.

[BACKEND_GAPS.md](BACKEND_GAPS.md) mantém IDs anteriores, amplia BG-008/BG-009 e registra BG-015 a BG-020 com commit, links, impacto e aceite. Probes reais: ausência conjunta de cliente/operador retorna 500; preço negativo é aceito; PUT e DELETE de CONCLUIDA são aceitos; respostas omitem observação e campos persistidos de itens. Hash de senha e precedência de filtros foram confirmados por inspeção, sem atribuir-lhes reprodução não feita. Não há contorno de backend no código da aplicação.

### Evidências finais da etapa 4 — 05/11/2026

Validação sobre o código final, Node 24 e backend fixado em `e0f312e611d56ab73a4a8e3d5832f8b8874ff362`:

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Passou, sem erros/avisos ESLint |
| `npm run typecheck` | Passou |
| `npm test` | 119 testes em 12 arquivos passaram |
| `npm run test:e2e` | 50 cenários desktop/mobile passaram |
| `npm run test:integration` | Passou: build de produção isolado, smoke e 8 cenários reais desktop/mobile |
| Limpeza | 3 vendas, 3 clientes e operador temporário removidos antes das compras/estoque/catálogo; processos e container próprios removidos |
| `git diff --check` | Passou |

Logs finais temporários em `integration-artifacts/`, incluindo build com as quatro rotas novas e `database-cleanup.log`. Não há containers `vila-integration-*` restantes. As primeiras execuções detectaram seletores ambíguos de alerta/total nos testes; foram corrigidos com escopos de diálogo/main e expressão ancorada. Na revisão final foi corrigido o título da coluna CLIENTE; todas as suítes e integração foram repetidas depois desse ajuste. Os probes negativos retornam os resultados documentados, sem correções de backend.

CI: os jobs `validate` e `integration` do workflow existente incluem automaticamente todos os testes novos. As execuções acima são **locais**, não uma execução da CI remota. Esta etapa não foi enviada ao remoto; não há URL de CI nova para este commit. Nenhum deploy ou merge foi realizado.

## Etapa 5 — visão geral e relatórios CSV

`/` redireciona para `/visao-geral`, com link acima dos grupos existentes e marca levando ao início. A sidebar preserva largura de seleção, marca fixa, rolagem e menu móvel. Loja/período/datas ficam na URL; padrão é todas as lojas e mês civil de São Paulo, com últimos 30 dias inclusivos e intervalo personalizado.

Catálogo conta produtos ativos/inativos globalmente. Estoque conta registros produto/loja retornados com saldo positivo/zero/negativo, somente por loja, sem histórico ou inferência de saldo zero para produtos ausentes. Vendas/compras contam documentos e somam seus totais salvos separadamente por cada status, loja e data inclusiva em São Paulo. Soma em centavos `BigInt`; campos ausentes, não finitos, negativos ou com fração de centavo tornam aquele resumo incompleto. Cinco documentos recentes têm links para detalhes; cartões/status abrem listas com filtros equivalentes. Não há lucro, valoração, somas entre unidades ou indicadores de pagamento.

Seções usam queries geradas independentes, com carga/erro/retry próprios, última atualização bem-sucedida e retenção de dados com aviso após falha de refresh. Atualização global refaz as consultas, sem prometer snapshot transacional. Filtros suportados são enviados à API e todos são reaplicados localmente. Compras continuam sem parâmetros de consulta no SDK.

CSV em produtos, saldos, movimentações, compras e vendas inclui todos os resultados anteriores à paginação, na mesma ordem da tabela. `lib/report-selectors.ts` contém os seletores puros usados por tabela/exportação; `lib/reports.ts` contém agregação, períodos e serialização; `components/export-csv.tsx` controla download e disponibilidade. Formato: UTF-8 BOM, `;`, CRLF, cabeçalhos/status portugueses, decimais brasileiros sem milhares, datas ISO com offset, aspas duplicadas e neutralização de fórmulas somente em texto. Números negativos de estoque são preservados. Nome usa data de São Paulo sem dados pessoais; URL temporária é revogada. Uma linha por documento, sem exportação de itens. Falha de lookup permite IDs e aviso de rótulos incompletos; unidade é a atual. Carga, refresh, fonte com erro/desatualizada e zero resultados bloqueiam a exportação.

BG-013 foi ampliada para documentar arrays completos, custo de agregação/download no navegador e necessidade futura de agregados e exportações filtradas/ordenadas no servidor. BG-009/BG-019 continuam aplicáveis. Nenhuma lacuna foi marcada resolvida, nem houve alteração de backend, SDK, dependências, endpoints de exportação ou SQL de aplicação.

Fixtures de relatório são criadas antes das suítes em `scripts/purchases-seed.mjs` e `scripts/sales-seed.mjs`: 25 documentos de cada tipo, junho/2020, com status mistos e valores conhecidos. SQL de status só é executado pelo runner no banco que ele criou. Limpeza mantém vendas antes de clientes/operador e itens de compra antes de cabeçalhos/fornecedores, depois estoque/catálogo. Para excluir as compras de relatório, restaura RASCUNHO somente nas fixtures próprias antes de apagar os itens; a aplicação não faz transições. Também foi corrigida a leitura de `response.status` na mensagem de erro do seed de estoque.

Testes novos: `tests/reports.test.ts` (status, centavos, totais incompletos, limites de datas, seletores e CSV); `e2e/reports.spec.ts` (desktop/mobile, URL, links, falha de refresh, downloads com 25 linhas nas cinco listas, fallback e bloqueio por atualização/expiração); `e2e-live/reports.spec.ts` (resumos contra fixtures reais e downloads das cinco listas, incluindo 25 vendas/compras, IDs, ordem e valores). Os jobs existentes `validate` e `integration` descobrem essas suítes automaticamente.

### Validação da etapa 5 — 05/11/2026

| Verificação | Resultado local |
| --- | --- |
| `npm run lint` | Passou |
| `npm run typecheck` | Passou |
| `npm test` | 127 testes em 13 arquivos passaram |
| Playwright completo | 68 cenários desktop/mobile passaram (`npx playwright test --output=test-results/mocked-final --reporter=list`) |
| `npm run build` | Passou, incluindo `/visao-geral` |
| `npm run test:integration` | Passou: build isolado final, smoke e 10 cenários reais desktop/mobile |
| Limpeza descartável | 28 vendas, 3 clientes/operador e 28 compras/3 fornecedores removidos; estoque/catálogo limpos; container próprio removido |
| `git diff --check` | Passou |

Artefatos temporários em `integration-artifacts/` e `playwright-live-report/`, ignorados pelo Git. Nenhum container `vila-integration-*` permaneceu. A primeira execução real identificou o bloqueio esperado de DELETE fora de RASCUNHO durante a limpeza; o seed foi corrigido e a integração repetida com saída 0. Os testes de navegador tiveram seletores de período/alerta corrigidos para escopos exatos. Uma execução concorrente de Playwright compartilhou a pasta de artefatos; a execução completa final usou diretório separado e passou.

CI: a entrega exige sucesso dos jobs `validate` e `integration` no commit final. As evidências acima são locais; os resultados remotos ficam no [workflow da branch de entrega](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/workflows/ci.yml?query=branch%3Afeat%2Fcatalog), e serão conferidos após o push. SDK, backend e dependências permanecem fixados. Não houve deploy ou merge.

## Etapa 6 — proteção de compras e vendas não salvas

`lib/recovery.ts` define esquemas de valores crus, validade de sete dias, chaves versionadas e fingerprint dos campos editáveis/operador/status/IDs de itens da compra. `components/document-recovery.tsx` compartilha a persistência com debounce de 300 ms, decisão Restaurar/Descartar, descarte confirmado, proteção de links/unload e conflitos entre abas. Adaptadores ficam nos editores existentes; formulários de produto e modais auxiliares continuam fora do escopo.

O servidor fornece no layout um hash SHA-256 truncado da origem de `BACKEND_API_URL`, sem usuário/senha/path/query. O layout é renderizado por requisição para acompanhar a configuração de runtime do proxy, inclusive quando um build é movido de ambiente. As cópias ficam no mesmo navegador/perfil/dispositivo/origem da aplicação, separadas pelo ambiente e por nova compra/ID de compra/nova venda. Não há autenticação ou isolamento entre pessoas no mesmo perfil: em computador compartilhado os dados podem ser lidos por quem usa esse perfil. Não são guardadas credenciais ou listas de cadastros.

A última mudança efetiva renova os sete dias; restaurar sem mudar valores não renova a validade. Cópias expiradas/incompatíveis/inválidas são removidas na abertura. “Descartar” remove a cópia oferecida; “Descartar alterações” confirma remoção e retorno à base inicial; limpar os dados do site também remove a recuperação. Falhas de leitura/escrita/quota mantêm edição disponível com aviso; sair mantendo recuperação é bloqueado se a cópia não puder ser gravada. Recuperação não grava no backend, não sincroniza dispositivos e não equivale ao status RASCUNHO.

Antes da edição, GET da compra é refeito mesmo com cache recente. Erro de consulta bloqueia aplicação de recuperação; dados previamente carregados e valores digitados são preservados. Campos/status/IDs divergentes deixam a cópia somente para consulta manual. Após restauração, IDs são confrontados com cadastros recarregados; opções ausentes ficam visíveis e bloqueiam envio. A mesma validação de payload/data/precisão continua obrigatória. A base original é mantida ao persistir alterações locais, mesmo que a query atualize depois.

Links normais (inclusive sidebar, pré-requisitos e Voltar) oferecem continuar, sair mantendo recuperação ou descartar e sair. Cliques modificados, downloads, novas abas e âncoras da mesma página permanecem livres. `beforeunload` existe somente enquanto dirty; `pagehide`, unload, navegação controlada e desmontagem tentam flush. Voltar/avançar do navegador usa recuperação, sem manipular history ou garantir prompt personalizado. Conflito pausa sobrescritas e exige carregar/substituir explicitamente, sem merge de itens.

Sucesso da mutação marca committed e limpa a cópia antes do refresh/redirect; falha posterior mostra link salvo e não permite novo envio. Validação/API falhas preservam valores. Timeout/rede/5xx mantém cópia e orienta consultar a lista antes de repetir, sem replay automático. BG-021/BG-022 registram ausência de idempotência e versão de compra por inspeção do backend fixado; não alegam duplicação ou lost update reproduzidos. O fingerprint é proteção de recuperação local e não resolve a corrida GET/PUT no servidor.

Validação local: lint, typecheck e 143 testes unitários/componentes passaram; build de produção passou; 78 cenários Playwright desktop/mobile passaram, com mais dois cenários de falha de refresh adicionados na verificação dirigida de compras/vendas (34 cenários); integração descartável passou (build isolado, smoke e dez cenários reais desktop/mobile). A integração ampliada recupera nova compra/venda antes de salvar, restaura edição inalterada e mantém cópia somente leitura após PUT concorrente sequencial. Limpeza removeu 28 compras/3 fornecedores e 28 vendas/3 clientes/operador antes de estoque/catálogo e encerrou os serviços próprios. Artefatos temporários permanecem ignorados pelo Git.

Os jobs `validate` e `integration` descobrem as novas verificações sem alterar o workflow. A execução remota do commit de entrega será conferida após o push; resultado disponível no [workflow da branch](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/workflows/ci.yml?query=branch%3Afeat%2Fcatalog). Nenhum deploy ou merge faz parte desta etapa. SDK, proxy, backend fixado e versões de dependências foram preservados.

## Etapa 7 — recebimento com estoque persistente

A implementação foi feita no checkout isolado `../backend-stage7`, branch `stage7-receiving`, commit `f335d525ea6ed107cd00824031ded904020967fe`. Após a validação, a branch foi incorporada à `novaVersao` e removida, junto do checkout temporário. O checkout original e sua alteração local de application.properties foram preservados.

Flyway V1 reproduz o esquema legado; V2 valida dados legados/triggers antes de adicionar versões, conclusão, unicidade de item/movimento e registro permanente de idempotência. Configurações normais usam PostgreSQL por ambiente e validate. `scripts/migrate-existing.sh` exige backup novo, compara esquema em transação revertida e valida dados; baseline é uma ação explícita posterior. Histórico de recebimento com efeitos ou inconsistências exige reconciliação humana específica, sem replay automático nem apagamento para contornar a guarda. Nenhum banco compartilhado foi migrado.

Contrato `/api/recebimentos-compras`: lista resumida com filtro de compra, detalhe completo, POST rascunho com Idempotency-Key, PUT substitutivo com versão e identidade estável, DELETE versionado com tombstone e POST /concluir com versão. ApiError 400/404/409 documentados. O SDK completo foi regenerado localmente e copiado sem edição manual, incluindo runtime oculto; proveniência e runner fixam o commit.

Confirmação usa uma transação, locks compra → recebimento → estoque em ordem de produto; criação de recebimento e PUT/DELETE da compra usam o mesmo lock de compra. Quantidades são revalidadas sem reservar rascunhos. Upsert incrementa estoque sem perder entradas concorrentes de compras diferentes. Um ENTRADA_COMPRA por item liga compra/item de recebimento/produto/loja/operador, usa data do recebimento, preserva custos e totais e atualiza compra parcial/recebida. Conclusão repetida retorna o documento existente. Confirmados são imutáveis. Qualquer recebimento bloqueia edição da compra; remover todos os rascunhos libera uma compra ainda editável.

Interface: Recebimentos sob Compras, histórico e pendentes no detalhe de compra; novo em `/compras/[id]/recebimentos/novo`, detalhe/edição em `/recebimentos/[id]`. Operador explícito, quantidades inicialmente vazias, seleção por linha e preencher pendentes. Salvar rascunho precede revisão e confirmação da entrada. Confirmados exibem conclusão e links; movimento abre o recebimento. Conflitos mantêm valores digitados, atualizam dados salvos e exigem revisão explícita, sem aparar nem reenviar. Recuperação de sete dias/proteção de navegação cobre novos/edições, com comparação de versão e rebase explícito da recuperação após aceitar a versão atual. Criação persiste chave/payload exatos antes da rede; resultado incerto mantém a operação para repetição inclusive após reload. Sucesso é reconhecido antes de invalidar queries/navegar.

Validação local: lint e typecheck passaram; 16 testes PostgreSQL (incluindo backup/preflight real, migrações vazia/existente/legado incompatível, API, concorrência, rollback e idempotência); 156 testes frontend; 88 cenários de regressão desktop/mobile, seguidos de 12 cenários dirigidos de recebimento após incluir os casos de quota e exclusão/cache; build de produção e integração completa com 12 cenários reais desktop/mobile passaram. A integração compara recebimentos completos/compras/estoques/movimentos após reiniciar o processo. A limpeza removeu 30 compras/3 fornecedores e 28 vendas/3 clientes/operador, recebimentos antes do operador, e estoque/catálogo no container próprio. Artefatos temporários em integration-artifacts e playwright-live-report, ignorados pelo Git.

[CI final do backend](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42082561351) passou no commit fixado. Os jobs `validate` (156 testes unitários/componentes e 92 cenários de navegador) e `integration` (12 cenários reais e reinício do backend) passaram na [execução frontend de `f77fa68`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/42084313779) com o backend fixado.

BG-003/BG-004 encerradas com a evidência acima. O teste de estoque real considera as entradas de compra confirmadas que o desktop grava antes da execução mobile, preservando a base conhecida de 1.234,567 e as asserções de datas/ajustes/ausência/zero. Falhas iniciais vieram de seletores de campos/data, atualização automática durante a regressão e expectativa antiga do saldo inicial; a execução completa final passou após os ajustes. A revisão também corrigiu reenvio sem persistência após falha de quota e refresh de detalhe já excluído, com testes específicos verdes.

Fora do escopo: autenticação/senhas, vendas/checkout, aprovação, reversão, devoluções, ajustes/transferências, valoração, upgrades, deploy e merge. BG-007/BG-011/BG-021/BG-022 têm apenas progresso restrito a recebimento; não representam correção geral de compras/vendas.
