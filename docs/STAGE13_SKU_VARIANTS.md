# Etapa 13 — SKU como variante comercial

Branches: `stage13-sku-variants`, criadas sobre os HEADs integrados:

| Repositório | Base | SHA inicial |
| --- | --- | --- |
| Frontend | main | f19de038c9c303e7177c16ea7ec38e733952cb23 |
| Backend | novaVersao | f38a335774b5f4b998514109e543932ed2cc8fe6 |

Produto é o agrupador (nome, descrição, categoria, status). Cada SKU declara código único, apresentação obrigatória, unidade, tipo de venda, status e EAN-13/DUN-14 opcionais. Um produto sem SKU pode ser cadastrado; não pode ser usado em documentos. A escolha de SKU é explícita, inclusive quando existe uma única variante.

Compras, recebimentos, vendas, transferências, ajustes, movimentos e devoluções usam `idProdutoSku`. Respostas também retornam `idProduto`, derivado do SKU. Os contratos `/api/produtos-loja` e `/api/produtos-precos-loja` foram substituídos por `/api/skus-loja` e `/api/skus-precos-loja`. `/api/produtos-sku` permanece o cadastro. Não há fallback comercial por produto.

A chave de saldo e vínculo é SKU + loja. Escritores ordenam os SKUs por UUID textual e depois as lojas por UUID textual. Disponibilidade, limites, rollback e movimentos se referem à variante. Documentos permitem variantes distintas do mesmo produto, preservando a regra de repetição de cada fluxo. Preços continuam manuais nos documentos; registros de validade são consultáveis sem precedência automática.

Itens e movimentos preservam código, apresentação e sigla da unidade. Recebimentos e devoluções copiam a identidade e os snapshots do item de origem. O servidor verifica a relação entre documento, item e SKU; todos os setters comerciais validam quantidade positiva, limite numeric(14,3), inteiros para UNIDADE e até três casas para PESO. A V8 também protege quantidades e snapshots no banco. Produto, unidade e tipo de venda de SKU utilizado são imutáveis; exclusão é bloqueada e inativação permanece disponível. SKU/produto inativo sai das novas seleções; documentos, movimentos e devoluções de origem continuam disponíveis.

O frontend oferece busca por nome, apresentação e código no seletor de SKU. Vínculos e preços exigem selecionar a variante no detalhe do produto. Consultas combinam produto + SKU + loja; saldos permanecem em linhas separadas e indicadores contam registros. Cópias locais antigas continuam detectáveis na chave existente, mas o esquema estrito exige SKU: são descartadas como incompatíveis, sem escolher uma variante.

## Reset autorizado de desenvolvimento

V1–V7 foram preservadas. V8 recusa qualquer SKU ou dado comercial antigo que necessite mapeamento, informa a tabela e reverte a transformação. Não há SKU legado, distribuição de saldo ou migração automática.

No backend, `bash scripts/reset-development.sh` recria exclusivamente o container `vila-verde-stage13-development`, validando sua identificação `vila-verde.owner=stage13-development` antes de remover uma instância anterior. Publica PostgreSQL apenas em loopback, em porta aleatória, sem volumes externos. Aplica migrations e o bootstrap existente usando o classpath de teste. Não lê `DB_URL` do ambiente para escolher o banco a apagar.

As credenciais ficam em `/tmp/vila-verde-stage13-development.env`, com permissão 600. Para iniciar a API local, carregue esse arquivo no terminal e execute `bash mvnw spring-boot:run` no backend, com `SERVER_ADDRESS=127.0.0.1` e uma porta local livre. O administrador de desenvolvimento é `stage8-admin@example.test`; a senha está na variável `INTEGRATION_ADMIN_PASSWORD` desse arquivo privado. Nenhum `.env` ou configuração publicada é modificado.

`npm run test:integration` cria outra base descartável própria, aplica V1–V8 e bootstrap, gera fixtures explicitamente por SKU, testa o proxy real e Chromium desktop/mobile e compara documentos, saldos e movimentos após reiniciar a API. O runner fixa o commit do backend; `INTEGRATION_BACKEND_REPO` permite usar o clone local como origem desse mesmo commit.

## Verificação

Evidências finais e SHAs estão no [registro de aceite](STAGE13_RELEASE.md). Não confundir resultados locais com CI. Os gates são: PostgreSQL, lint, TypeScript, unitários, Playwright desktop/mobile, build e integração real. A suíte inclui dois SKUs unitários e um granel do mesmo produto, falta apesar de saldo em outra variante, isolamento concorrente, rollback multi-SKU, snapshots, inativação, filtros combinados e instalação/refusa/reconexão da V8.

Sem merge em main/novaVersao, implantação, alteração de banco compartilhado, conversão de embalagens, configurador de atributos, lotes ou preços automáticos.
