# Vila Verde · Visão geral, catálogo, estoque, compras, recebimentos, vendas e transferências

Frontend administrativo em português para visão geral, catálogo, consulta de estoque, fornecedores/compras, clientes/vendas operacionais, transferências entre lojas e relatórios CSV de produtos naturais. Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, componentes no padrão shadcn/ui com Radix, Lucide, React Hook Form, Zod, Axios e TanStack Query.


## Etapa 8 — login, contas e permissões

O sistema exige autenticação. Use `/login` com uma conta revisada pelo administrador; não existe cadastro público. Contas novas/resetadas devem trocar a senha em `/alterar-senha` e entrar novamente. O destino interno solicitado antes do login é preservado; destinos externos são recusados. `/usuarios` gerencia identidade, cargo (`ADMIN`, `GER`, `FUNC`), lojas, ativação/desativação e senha temporária. Somente ADMIN acessa essa tela. O backend cria automaticamente o primeiro administrador quando não há ADMIN ativo: usuário `admin`, senha temporária `admin`. A troca é obrigatória antes do acesso de negócio; senhas novas exigem ao menos 8 caracteres. A conta usa e-mail interno `admin@vilaverde.local`; o alias `admin` funciona no campo “E-mail ou usuário”. Reinícios preservam administradores e senhas existentes. `BOOTSTRAP_ADMIN_PASSWORD` no backend substitui a senha inicial; `BOOTSTRAP_ADMIN_ENABLED=false` desativa o bootstrap automático. Não existe endpoint público de bootstrap.

O backend valida sessões, permissões, lojas e operadores diretamente, mesmo sem o frontend. ADMIN gerencia tudo; GER gerencia catálogo, fornecedores, clientes e compras/recebimentos das lojas atribuídas; FUNC lê catálogo, cria/edita clientes, registra vendas abertas e consulta estoque das lojas atribuídas. Visão geral e CSVs respeitam o mesmo escopo; seções proibidas não são consultadas. A ausência de lojas tem explicação na tela. Vendas operacionais estão descritas na etapa 9. Transferências ADMIN/GER estão na etapa 10; DELETE, ajustes e reversões continuam indisponíveis.

O proxy encaminha apenas `SESSION`, `X-CSRF-TOKEN` e os headers aprovados, incluindo `Idempotency-Key` na criação de recebimentos, vendas e transferências. Reescreve o cookie como host-only, HttpOnly, SameSite=Lax, Secure fora de localhost e preserva giro/remoção. Senhas/tokens não são armazenados no browser; CSRF fica em memória e é renovado após login/logout. **Configure `FRONTEND_ORIGINS`** com as origens públicas exatas autorizadas a escrever (separadas por vírgula), além de `BACKEND_API_URL` somente no servidor. O listener interno do Next pode usar outro hostname; não use sua origem interna como substituto da origem pública. Não use `*` nem `NEXT_PUBLIC_*` para credenciais.

Sessões JDBC expiram após 30 minutos de inatividade ou 12 horas desde o login. Troca/reset de senha, desativação e alterações administrativas revogam sessões. Falhas de login usam mensagem genérica e limite persistido de cinco tentativas em 15 minutos por e-mail normalizado (429 durante o bloqueio). 401 interrompe gravações e leva ao login; 403 informa falta de permissão sem encerrar a sessão.

Recuperação usa namespace v2 por ambiente **e usuário**, sem importar cópias anônimas v1. Expiração preserva o rascunho para a mesma conta; outra conta não o restaura. Ao restaurar, as lojas são revalidadas e o operador é substituído pela identidade atual. Sair exige confirmação, interrompe escritores em outras abas, descarta as cópias dessa conta e limpa o cache antes de invalidar a sessão. Edições preservam o autor original e mostram o modificador; recebimento/movimentos registram o confirmador real.

A migração V3 invalida todas as credenciais legadas, preserva IDs/referências e mantém o cargo anterior para revisão, sem conceder privilégios ou lojas automaticamente. Colisões de e-mail normalizado interrompem a migração com relatório para reconciliação. Consulte o [checklist de release coordenada](docs/STAGE8_RELEASE.md). Esta implementação não migra bancos compartilhados, publica release ou altera `main`. A publicação continua pela integração nativa Vercel/Git.

Validação atual da etapa 8, bootstrap automático e mínimo de 8 caracteres: 166 testes unitários/componentes, 106 cenários de navegador, 14 cenários reais autenticados, lint, tipos, build e persistência após reinício aprovados nos jobs `validate`/`integration` do [fork, commit `85f237f`](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42218282295). A [CI do backend `a3aa982`](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42218105138) registrou 33 testes, com 32 executados e um bootstrap exclusivo do runner ignorado. BG-011/BG-020 estão corrigidas na branch; produção não foi alterada.

Os testes de browser com fixtures usam um backend local de autenticação separado, com guardas reais do Next e build de produção na porta 3200. `test:integration` cria PostgreSQL/backend/frontend próprios, faz bootstrap só no classpath de teste, autentica todas as suítes reais e também verifica 401 anônimo direto/pelo proxy e persistência após reinício. O token/credencial desse ambiente descartável não é reutilizado na aplicação publicada.

## Estado da implementação

Visão geral, catálogo, estoque, fornecedores/compras, clientes/vendas abertas, recebimentos com confirmação e CSVs implementados, com estilos em utilitários Tailwind e componentes reutilizáveis. O resumo para continuidade está em [docs/PLANNER_HANDOFF.md](docs/PLANNER_HANDOFF.md). As limitações verificadas do backend estão em [docs/BACKEND_GAPS.md](docs/BACKEND_GAPS.md).

Validação anterior do catálogo em 04/11/2026, com Node 24 (a evidência da etapa 2 está no handoff):

- ESLint e TypeScript passaram.
- Vitest: 39 testes passaram, incluindo Testing Library e atualização de queries.
- Playwright: os 18 cenários desktop/mobile passaram; os dois fluxos completos passaram em uma execução direcionada após correções nos seletores e na espera pela navegação dos testes.
- Build de produção passou em uma cópia isolada do projeto para preservar o servidor de desenvolvimento aberto.
- Comparação visual: 55 capturas antes/depois do refactor, sem diferenças de geometria; 49 idênticas em pixels. Os seis casos restantes tiveram diferenças pequenas de rasterização/texto (até 96 pixels por captura). Os limites responsivos também foram conferidos em 390, 720, 721, 1050, 1051 e 1600 px.

Instalação limpa pelo registro público, smoke da API e Playwright real desktop/mobile passaram contra o backend fixado abaixo e PostgreSQL 16 descartável. A [CI de `67dadee`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/41906754976) passou nos jobs `validate` e `integration`. Consulte o handoff para os commits, comandos e limitações.

Validação local da etapa 2 (04/11/2026): lint, tipos, 57 testes unitários/de componentes, 28 cenários de navegador e integração descartável completos passaram. A integração inclui build, smoke e 4 cenários reais de catálogo/estoque em desktop e mobile. Os 10 cenários de estoque também passaram após ampliar as asserções. SDK e dependências permanecem inalterados; a evidência atual é local, sem nova execução de CI nesta sessão.

## Executar

Use Node.js 24 (`nvm use`) e npm:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. A raiz redireciona para `/visao-geral`. O lockfile versionado usa `https://registry.npmjs.org`; use `npm ci` nas instalações e na CI.

`BACKEND_API_URL=http://localhost:8080` é uma variável **somente do servidor** e deve conter a origem do backend. Reinicie o Next.js após alterá-la. Não use `NEXT_PUBLIC_` nem aponte para Render ao testar mutações.

O navegador chama o mesmo domínio em `/api`. O Route Handler encaminha os recursos de catálogo `produtos`, `categorias`, `unidades-medida`, `lojas`, `produtos-sku`, `produtos-loja` e `produtos-precos-loja`. No catálogo, permite GET/POST de coleções e GET/PUT/DELETE por UUID; vínculos não aceitam PUT. Estoque permite somente GET em `estoques`, `estoques/{uuid}`, `estoques/saldo`, `movimentacoes-estoque` e `movimentacoes-estoque/{uuid}`. O saldo exige `idProduto` e `idLoja` UUIDs válidos; escritas de estoque retornam 405. Mantém parâmetros, códigos HTTP, JSON de erro e respostas vazias 204; desativa cache e limita a espera pelo backend a 15 segundos. Não encaminha credenciais ou cookies. Fornecedores permitem GET/POST de coleção e GET/PUT/DELETE por UUID; compras permitem GET/POST de coleção e GET/PUT por UUID. Exclusão e transições genéricas de compra continuam bloqueadas. Recebimentos permitem GET/POST de coleção, GET/PUT/DELETE por UUID (exclusão exige `versao`) e somente POST em `/{uuid}/concluir`. A criação exige e encaminha `Idempotency-Key` UUID; o proxy não encaminha esse cabeçalho para outras APIs.

## Backend e SDK

Integração de referência: [`Zayma1/erp-produtos-naturais-backend`](https://github.com/Zayma1/erp-produtos-naturais-backend), branch de feature **`stage8-auth`** (base `novaVersao`), commit **`a3aa98212842a48bd3bb30302a25bca37c21727c`**. A branch `main` não tem a API usada aqui. A origem do SDK completo, incluindo `.kubb`, está documentada em [generated/PROVENANCE.md](generated/PROVENANCE.md).

O SDK completo foi regenerado a partir do contrato local do backend de autenticação e recebimento. `components/providers.tsx` sobrescreve sua origem padrão antes dos componentes consumidores. Como as URLs geradas já começam em `/api`, `baseURL` deve ser vazio para chamadas de mesma origem. Não importe clientes em novos pontos sem usar essa configuração.

O commit de integração está fixado no runner e foi enviado à branch `stage8-auth`; autenticação ainda não foi incorporada à `novaVersao`. Para conferir a referência:

```bash
git ls-remote https://github.com/Zayma1/erp-produtos-naturais-backend.git refs/heads/stage8-auth
```

## Integração descartável

Pré-requisitos: Node.js 24, Java 21, Docker em execução, Git e acesso à internet (GitHub, Docker Hub e Maven Central). Instale as dependências e o Chromium:

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:integration
```

O comando busca o backend no commit exato acima em um diretório temporário, inicia um PostgreSQL 16 sem volume persistente com credenciais aleatórias e datasource substituído por variáveis de ambiente. Resolve o Maven online, aguarda a API, faz um build isolado do frontend e executa o smoke da API seguido do Playwright real, serial, em Chromium desktop e mobile. Não altera o checkout existente do backend nem depende de `.env.local`.

As portas loopback **8081** (backend) e **3100** (frontend de produção) precisam estar livres; o comando falha se estiverem ocupadas e nunca reutiliza servidores. A porta do PostgreSQL é escolhida pelo Docker. Os processos e o banco pertencentes à execução são removidos ao terminar, inclusive em falhas e sinais SIGINT/SIGTERM. SIGKILL ou queda da máquina não permitem executar limpeza; nesse caso remova o container `vila-integration-*` restante com Docker.

Logs sem a senha temporária ficam em `integration-artifacts/`; relatório e traces de falha ficam em `playwright-live-report/` e `test-results/live/`. A CI possui um job separado com esses mesmos pré-requisitos e publica os artefatos em falhas.

O backend usa Flyway V1/V2/V3 e `ddl-auto=validate`, com credenciais PostgreSQL por ambiente. A integração reinicia o processo e compara recebimentos completos, compras, estoque e movimentos antes/depois. Bancos existentes exigem backup, preflight e baseline explícito conforme o README do backend; esta implementação não migra bancos compartilhados.

## Fluxo

1. Crie categorias e unidades de medida. Sem elas, o formulário de produto fica desabilitado com links para os cadastros.
2. Crie um produto (`ATIVO` e `UNIDADE` por padrão; também aceita `INATIVO` e `PESO`). A edição envia o DTO completo.
3. Na página do produto salvo, cadastre SKUs globais, com EAN-13, DUN-14 e apresentação opcionais.
4. Cadastre lojas com nome fantasia, razão social, CNPJ, estado, cidade, bairro, número e complemento; vincule o produto a elas.
5. Cadastre preços por produto/loja com início e fim opcionais. Use `12,90` ou `1.234,56`. Valores negativos, casas extras e fim anterior ao início são rejeitados. Datas locais são convertidas para o mesmo instante em ISO UTC com `Z`.

As abas fazem operações independentes: uma falha não apaga o que já foi salvo. A lista mostra **todos os registros de preço e suas validades**, sem escolher preço vigente nem resolver sobreposições. Relacionamentos retornados pela API são filtrados explicitamente pelo produto e, quando selecionada, pela loja. SKUs são consultados somente por `idProduto`.

Busca, ordenação e paginação (20 registros) são locais porque a API retorna arrays. Os controles ficam nos parâmetros da URL; produtos também têm filtros de categoria e status. Cadastros de apoio usam modais, e produtos usam páginas completas. Exclusões exigem confirmação e nunca fazem cascata. Erros de integridade permanecem visíveis; formulários mantêm o conteúdo após falhas e bloqueiam novo envio enquanto salvam.

Autenticação por sessão e gestão de usuários estão descritas na etapa 8 abaixo. Aprovação/cancelamento de compras, reversão e ajustes continuam fora do escopo. Vendas e transferências foram acrescentadas nas etapas 9 e 10.

## Consulta de estoque (etapa 2)

- `/estoque`: saldos existentes por produto/loja, unidade, quantidade e última atualização; busca por nome, seletores de produto/loja, filtro de quantidade, ordenação e páginas locais de 20 registros.
- Ao selecionar produto e loja, o painel consulta o saldo exato separadamente. Zero retornado pelo endpoint é mostrado mesmo quando a listagem não tem registro, com a indicação “Sem registro de estoque”. Erros nunca são convertidos em saldo zero.
- `/estoque/movimentacoes`: tipo, quantidade original e observação; filtros de produto/loja/tipo e datas inclusivas em `America/Sao_Paulo`, ordenação e paginação. O diálogo mostra observação completa e referências presentes, somente para consulta.
- Filtros, ordenação e página ficam na URL e sobrevivem ao reload. Alterar filtros reinicia a página. “Atualizar” recarrega as consultas de estoque atuais; sucessos independentes e dados anteriores continuam visíveis em falhas.
- Produtos levam ao catálogo; “Consultar estoque” nos detalhes retorna aos saldos filtrados. A navegação desktop/mobile oferece Saldos e Movimentações.

A API recebe filtros de produto/loja; a interface também os aplica localmente. Não cria combinações inexistentes nem soma unidades incompatíveis. Quantidades usam até três casas decimais brasileiras. Consultas de catálogo resolvem nomes/unidades e mantêm compatibilidade com a invalidação existente; IDs servem de fallback. Não há movimentações de escrita, saldo por SKU ou saldo histórico calculado.

O runner de integração cria os pré-requisitos por API após a prontidão do backend e insere saldos/movimentações conhecidos exclusivamente no PostgreSQL que ele próprio iniciou (`scripts/inventory-seed.mjs`). Inclui zero, negativo, frações, dois produtos/lojas e limites de datas. A limpeza remove primeiro movimentos e saldos por SQL, depois o catálogo pela API. Nenhuma rota da aplicação executa SQL.

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Os testes unitários cobrem schemas, enums, moeda, datas, mensagens reais `ApiError`, transporte dos clientes gerados, atualização de listas/detalhes/relacionamentos e a lista permitida do proxy. O Playwright intercepta a API com fixtures **apenas nos testes** e cobre desktop/mobile, fluxo completo, edição/exclusão, recarga, duplicidades, filtros, erros de backend, pré-requisitos vazios e foco por teclado. A CI em `.github/workflows/ci.yml` executa essas verificações com `npm ci`, além do job separado de integração real.

Com backend **descartável** e frontend rodando localmente, exporte antes `INTEGRATION_ADMIN_EMAIL` e `INTEGRATION_ADMIN_PASSWORD` de uma conta desse ambiente. Prefira o runner completo, que injeta credenciais aleatórias automaticamente:

```bash
CATALOG_DISPOSABLE=1 npm run test:live
```

O script autentica a conta descartável pelo proxy, cria e relê categoria, unidade, loja, produto, SKU, vínculo e preço, edita o produto e limpa os registros em ordem inversa. Aceita apenas origem loopback, por padrão `http://127.0.0.1:3000`. Use `SMOKE_BASE_URL` para mudar a porta local. A variável `CATALOG_DISPOSABLE=1` é obrigatória e declara que o backend e seu banco são descartáveis. **Uma URL frontend loopback sozinha não garante que o banco upstream seja descartável.** Prefira `npm run test:integration`, que cria e controla os serviços e fornece essa opção ao smoke. A suíte `e2e-live/` não intercepta requests e verifica cadastros pelo UI, edições, duplicidades, bloqueios por referência, saves independentes, moeda brasileira, datas e persistência após reload. Sua limpeza por API segue a ordem de dependências e falhas de limpeza reprovam o teste.

## Repositório de destino

O repositório de trabalho é o [fork RafaelTeixeiraSerafim/erp-produtos-naturais-frontend](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend), branch `main`. `origin` aponta para o fork e `upstream` preserva o original [BrunoCGhisi/erp-produtos-naturais-frontend](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend). A antiga `feat/catalog` foi incorporada à `main` e removida. As evidências históricas do original permanecem vinculadas às suas execuções. Não use force push.

Publicado em [https://erp-produtos-naturais-frontend.vercel.app](https://erp-produtos-naturais-frontend.vercel.app) pelo dashboard/integração Git da Vercel. A configuração de deploy por GitHub Actions/CLI foi cancelada; o workflow versionado continua somente com `validate` e `integration`. `BACKEND_API_URL` é configurada no ambiente da Vercel e permanece no servidor. Consulta HTTP sem credenciais confirmou `/visao-geral` e `/api/categorias` com status 200; não houve testes de escrita na implantação publicada. Estado atual, CI e limites estão no [handoff](docs/PLANNER_HANDOFF.md).

## Fornecedores e rascunhos de compras (etapa 3)

- `/fornecedores`: busca, ordem, paginação de 20 registros e CRUD com confirmação de exclusão. Campos reais do DTO: nome fantasia, razão social, UF, cidade, bairro (obrigatórios), complemento, CNPJ e CPF (opcionais). UF é normalizada para duas letras maiúsculas. “Ver compras” abre os pedidos filtrados.
- `/compras`: fornecedor, loja, data em São Paulo, todos os status retornados e total salvo. Filtros de fornecedor/loja/status/datas, ordenação e páginas de 20 linhas ficam na URL. Ordem inicial: data mais recente.
- `/compras/nova`, `/compras/[id]` e `/compras/[id]/editar`: criação, consulta e edição restrita a RASCUNHO. Cabeçalho com fornecedor/loja obrigatórios, data opcional e observação. Sem data na criação, o backend usa seu padrão. Os horários usam America/Sao_Paulo e são enviados com offset ISO.
- Cada compra precisa de pelo menos um item do catálogo: quantidade positiva com até três casas, custo não negativo com até quatro e desconto monetário não negativo com até duas. Não há seleção de usuário, preço de venda automático nem restrição nova de produto por loja/fornecedor.
- Prévia usa inteiros escalados e HALF_UP por item antes da soma; limites de numeric(14,s) e desconto superior ao bruto são rejeitados. Depois de salvar, os totais retornados pelo backend são autoritativos. Custos exibem até quatro casas.
- Formulários preservam valores em falhas e exigem consultas de pré-requisitos bem-sucedidas. Se o servidor rejeitar edição por mudança de status, a interface confirma o status salvo e bloqueia novo envio. Falhas de confirmação aparecem separadamente, com retry.
- **Salvar rascunho não altera estoque.** Quantidades recebidas e pendentes aparecem no detalhe. O recebimento tem rascunho e confirmação separados (etapa 7). Não há exclusão de compra, aprovação ou cancelamento na UI.

`npm run test:integration` também exercita fornecedores/compras com backend e PostgreSQL descartáveis, valida totais persistidos, substituição de itens e estoque inalterado, e reproduz [BG-005](docs/BACKEND_GAPS.md#bg-005). A limpeza remove itens de compra por SQL exclusivamente no container de teste, depois cabeçalhos/fornecedores por API, antes dos pré-requisitos do catálogo. Não há SQL nem exclusão em cascata de compras na aplicação.

Validação local da etapa 3: lint, tipos, 82 testes unitários/de componentes, 42 cenários desktop/mobile, build de produção e seis cenários reais passaram. Os 14 cenários de compras passaram novamente após os ajustes finais. Evidências e detalhes de entrega estão no [handoff](docs/PLANNER_HANDOFF.md#etapa-3--fornecedores-e-rascunhos-de-compras). SDK, backend de referência e dependências permanecem iguais.

### Etapa 4: clientes e vendas abertas

`/clientes` oferece cadastro, busca, ordenação, paginação, edição e exclusão confirmada, com CPF/nascimento opcionais. Nascimento é data civil, sem conversão de fuso. “Ver vendas” abre o filtro por cliente.

`/vendas` lista registros em todos os status com filtros restauráveis na URL (cliente, loja, status e intervalo inclusivo de datas em São Paulo), ordenação e 20 registros por página. `/vendas/nova` exige cliente, loja atribuída e itens do catálogo. O operador é o usuário autenticado. As lojas disponíveis são as atribuídas à conta; somente administradores gerenciam contas.

Preços são informados manualmente, com até duas casas; quantidades têm até três. Descontos monetários não podem exceder o bruto. A prévia usa inteiros escalados e HALF_UP, arredondando a soma dos brutos antes de descontar; pode diferir da soma das prévias dos itens. Nenhum preço de validade, vínculo com loja ou saldo é escolhido como restrição automática.

Salvar cria ABERTA e abre `/vendas/[id]`, somente leitura, com totais autoritativos do backend. Não conclui checkout ou baixa estoque. Não há edição, cancelamento ou exclusão de vendas. A unidade exibida vem do catálogo atual; a API não devolve o snapshot nem o total persistido dos itens. Não existe campo de observação porque a API não o retorna. Limitações: [BG-008, BG-009 e BG-015 a BG-020](docs/BACKEND_GAPS.md).

A integração descartável faz bootstrap de uma conta administrativa somente no classpath de teste e cria cliente/venda pelo navegador em desktop/mobile, verificando arredondamento agregado, status, reload e estoque inalterado. Probes de falhas e mutações upstream ficam exclusivamente em `scripts/sales-seed.mjs`; vendas são limpas antes de clientes e do catálogo. Contas de teste são desativadas e desatribuídas quando necessário; o banco inteiro é descartado ao final. `npm run test:integration` executa build isolado, smoke e todas as suítes reais. As suítes novas são descobertas automaticamente pelos jobs existentes de CI.

Validação local final da etapa 4 (05/11/2026): lint, tipos, 119 testes unitários/componentes, 50 cenários Playwright e integração real (build, smoke e 8 cenários desktop/mobile) passaram. Evidências e situação da CI remota no [handoff](docs/PLANNER_HANDOFF.md#etapa-4--clientes-e-vendas-abertas).


## Visão geral e relatórios CSV (etapa 5)

`/visao-geral` é o início da aplicação. Loja e período ficam na URL (`idLoja`, `periodo`, `inicio`, `fim`). O padrão é todas as lojas e o mês civil atual em `America/Sao_Paulo`; também há últimos 30 dias (incluindo hoje) e datas personalizadas. Limites de dias são inclusivos.

- **Catálogo:** contagens globais de produtos ativos/inativos, independentes de loja e período.
- **Estoque atual:** quantidade de registros produto/loja retornados com saldo positivo, zero ou negativo, filtrados apenas por loja. Produto sem registro não conta como saldo zero. Não é estoque histórico.
- **Vendas/compras:** quantidade e soma do total salvo de cada documento, por status e por loja/data do documento. Vendas abertas e compras em rascunho não são receita/despesa concluída. Documentos cancelados aparecem separadamente. Valores ausentes, negativos, não finitos ou com fração de centavo deixam o resumo daquele status incompleto; nenhum total é recalculado a partir de itens.
- As somas usam centavos inteiros (`BigInt`). Cada seção possui atualização, erro e retry próprios, preserva dados após falha de refresh com aviso de desatualização e informa sua última consulta bem-sucedida. “Atualizar” refaz as consultas. São consultas separadas, sem snapshot transacional. Os cinco documentos mais recentes levam aos detalhes; contagens e status levam às listas com os mesmos filtros.

“Exportar CSV (N)” em produtos, saldos, movimentações, compras e vendas usa **todos** os resultados filtrados, na ordem da tabela, antes da paginação de 20 linhas. Seletores puros em `lib/report-selectors.ts` alimentam a tabela e o arquivo. As chamadas enviam os parâmetros suportados e reaplicam todos os filtros localmente (BG-009). Compras não têm parâmetros de listagem no SDK. Não há endpoint de exportação, SQL de aplicação ou alterações no SDK.

CSV usa UTF-8 com BOM, separador `;`, CRLF, cabeçalhos/status em português, números brasileiros sem milhares e timestamps ISO com offset. Todos os campos são delimitados por aspas duplas, com aspas internas duplicadas. Textos que poderiam iniciar fórmulas recebem apóstrofo; quantidades numéricas negativas permanecem numéricas. Arquivos se chamam `vila-verde-<lista>-AAAA-MM-DD.csv`, com data de São Paulo, sem dados pessoais no nome. URLs de download são revogadas após o clique.

Campos exportados: produtos (ID, nome, categoria, unidade, tipo de venda, status); saldos (ID do registro, IDs/nomes de produto/loja, unidade atual, quantidade, atualização); movimentos (ID, IDs/nomes de produto/loja, unidade atual, tipo, quantidade, data, observação e referências disponíveis de venda/compra/transferência/ajuste/usuário); compras (ID, IDs/nomes de fornecedor/loja, data, status, total salvo); vendas (ID, IDs/nomes de cliente/operador/loja, data, status, subtotal/descontos/total salvos). Compras/vendas têm uma linha por documento, sem itens. Unidades são as atuais do catálogo, não snapshots históricos (BG-019).

Exportação fica desabilitada durante carga/refresh, erro ou consulta desatualizada e sem resultados. O botão “Atualizar dados” renova a fonte quando necessário. Falhas de consultas auxiliares permitem fallback por ID com aviso de rótulos incompletos.

A solução depende dos arrays completos da API (BG-013): volume crescente exige agregações no servidor, paginação e exportação filtrada/ordenada no servidor. Não calcula lucro, valoração de estoque, somas entre unidades ou pagamentos. Backend e SDK continuam fixados nas referências anteriores.

Os testes `tests/reports.test.ts`, `e2e/reports.spec.ts` e `e2e-live/reports.spec.ts` verificam centavos, status, datas, seletores, formato CSV e relatórios contra registros reais. Os seeds de integração criam 25 vendas e 25 compras de junho/2020, com status mistos, exclusivamente no banco descartável **antes** das suítes; a limpeza remove vendas antes de clientes/operador e itens de compra antes de cabeçalhos/fornecedores, depois estoque/catálogo. Evidência final desta etapa no handoff.

## Recuperação de compras e vendas (etapa 6)

Nova compra, edição de compra e nova venda guardam valores digitados e linhas de itens no `localStorage`, após 300 ms de inatividade. A cópia pertence ao navegador/perfil/dispositivo e ao ambiente de backend configurado; não é sincronizada e não equivale a um RASCUNHO salvo no servidor. Em navegador compartilhado, outras pessoas com acesso ao mesmo perfil podem ler esses dados. Não são armazenadas credenciais nem listas completas do catálogo.

A recuperação expira sete dias após a última alteração; cópias expiradas, inválidas ou incompatíveis são removidas ao abrir o formulário. Ao voltar, escolha Restaurar ou Descartar antes de editar. “Descartar alterações” pede confirmação, apaga a cópia e retorna aos valores iniciais. Limpar os dados do site também remove as cópias. Alterações em outra aba pausam gravações até escolher carregar a cópia ou substituir pela edição local, sem mesclar itens.

Links da aplicação pedem decisão ao sair de um formulário alterado. Fechar/recarregar usa a proteção nativa do navegador; voltar/avançar depende da cópia recuperável, sem garantia de diálogo personalizado. A gravação é tentada também na saída, mas armazenamento bloqueado/cheio e encerramento abrupto podem impedir recuperação; a interface avisa quando indisponível.

Na edição, a compra é consultada antes da recuperação. Mudança dos campos editáveis, IDs de itens, operador ou status impede aplicar a cópia e a mantém visível para consulta manual; compra ausente/indisponível também mantém o painel. Seleções ausentes dos cadastros atuais permanecem visíveis e precisam ser corrigidas antes do envio. As validações de data, dinheiro e status continuam obrigatórias.

Sucesso confirmado apaga a recuperação e impede reenvio antes de atualizar consultas/navegar. Se essa atualização falhar, o link do registro salvo continua disponível. Falhas de validação/API preservam valores; em erro de rede/timeout ou resposta 5xx, consulte a lista antes de repetir porque a gravação pode ter ocorrido. Não há fila offline nem replay automático. Limites do servidor: BG-021 e BG-022 em [BACKEND_GAPS](docs/BACKEND_GAPS.md).

## Recebimento de compras — etapa 7

Em Compras → Recebimentos consulte rascunhos e confirmações; o detalhe da compra mostra histórico e quantidades pedidas/recebidas/pendentes. “Novo recebimento” abre `/compras/[id]/recebimentos/novo`; selecione itens e quantidades parciais. Quantidades começam vazias; “Preencher pendentes” é uma ação explícita. O operador é a identidade autenticada; a confirmação registra o confirmador real.

“Salvar rascunho” não reserva quantidades nem altera estoque. O detalhe em `/recebimentos/[id]` permite editar ou excluir rascunho com confirmação. “Concluir recebimento” exige revisão das quantidades e da loja de destino. A confirmação grava entrada, movimentos, quantidades recebidas e status parcial/recebida em uma única transação. Confirmados ficam somente leitura, com horário da conclusão e links para compra/saldos/movimentos. O histórico de estoque inclui link ao recebimento.

Edições e exclusões exigem versão. Conflitos recarregam dados autoritativos e preservam valores; é preciso aceitar a versão atual e revisar, sem corte de quantidade nem reenvio automático. Recuperação local de sete dias e proteção de navegação cobrem novos recebimentos/edições; uma versão divergente deixa a cópia apenas para consulta. Após aceitar uma nova versão, a recuperação passa a usar essa base.

Antes de criar, o navegador guarda uma chave UUID e o payload exato. Após resultado incerto, inclusive reload, “Repetir envio salvo” repete a mesma operação. O backend mantém chave/hash/identidade e tombstone após exclusão. Sucesso limpa recuperação e bloqueia repetição, mesmo se atualizar a tela falhar. A confirmação é idempotente pelo estado do servidor; o navegador nunca calcula efeitos de estoque.

O frontend invalida todas as queries de API relacionadas após sucesso. O backend impede edição de compra com qualquer recebimento; excluir todos os rascunhos libera uma compra ainda editável. Na etapa 7, autenticação permanecia pendente; a etapa 8 abaixo adiciona a proteção dos fluxos. Reversão, devoluções, checkout, aprovação e valoração continuam fora do escopo.

Validação da etapa 7: 16 testes PostgreSQL, 156 testes frontend, regressão desktop/mobile, 12 cenários reais e persistência após reinício passaram localmente. CI backend: [execução final](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42082561351). A entrega frontend passou nos jobs validate/integration da [CI original de `f77fa68`](https://github.com/BrunoCGhisi/erp-produtos-naturais-frontend/actions/runs/42084313779). BG-003/BG-004 foram encerradas; demais avanços são restritos ao recebimento e estão detalhados no handoff.

## Etapa 10 — transferências entre lojas

`/estoque/transferencias` lista rascunhos e documentos confirmados/cancelados com filtros locais, ordenação, paginação de 20 e estado na URL. ADMIN/GER precisam de acesso às duas lojas. `/nova`, `/{id}` e `/{id}/editar` oferecem criação, detalhe auditado e edição com IDs de itens preservados, unidade salva, versão e recuperação isolada por ambiente/usuário/documento.

Rascunhos não reservam estoque. A revisão de confirmação explica a movimentação imediata origem→destino; qualquer falta/overflow impede a operação inteira. Confirmados são imutáveis; somente rascunhos podem ser cancelados com motivo. Conflitos mantêm os valores locais e exigem revisão explícita. A chave e o conteúdo da criação são guardados antes da rede para repetição após resposta perdida. Sucesso é reconhecido antes de atualizar consultas ou navegar. FUNC continua consultando movimentos permitidos sem link para o documento de transferência.

Branches empilhadas `stage10-transfers`: frontend base `2730110`, backend base `65d6585`; SDK e integração fixados em `867cef2e35596ae67f692f9e2fcfd4932953d513`. V5 preserva transferências anteriores como históricas somente para consulta, sem replay. Nenhum merge, implantação, migração compartilhada ou reparo histórico. Veja [STAGE10_RELEASE.md](docs/STAGE10_RELEASE.md) e [procedência do SDK](generated/PROVENANCE.md).

Frontend validado: `e78b80880d90cf3029fd405bef4b62aebd86a8b5`, branch `stage10-transfers`; [CI aprovada: validate e integration](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42267039532). Backend/SDK: `867cef2e35596ae67f692f9e2fcfd4932953d513`; [CI PostgreSQL aprovada](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42265562737).

Aceite: 53 testes backend executados (54 registrados, um bootstrap exclusivo de integração ignorado), 170 testes unitários/componentes frontend, 106 cenários de navegador, build e 26 cenários reais desktop/mobile, com persistência após reiniciar o backend.
