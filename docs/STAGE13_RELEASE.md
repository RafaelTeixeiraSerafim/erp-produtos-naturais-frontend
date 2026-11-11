# Aceite da etapa 13

Branches `stage13-sku-variants`, sem merge em main/novaVersao ou deploy. Bases e roteiro: [STAGE13_SKU_VARIANTS.md](STAGE13_SKU_VARIANTS.md).

Backend implementado em `aa6a45033cdee093d709048c2da9cf4ac0d4bd7a`, seguido do reforço de teste `22ff8a5638325abc7bb7ceff770c741d97b74231`, fixado no runner e na procedência do SDK. O SDK completo foi regenerado do OpenAPI autenticado V8, sem edição manual.

## Evidências locais

- `bash scripts/test-postgres.sh`: **82 registrados, 81 executados, zero falhas, um bootstrap de integração ignorado**. Cobertura de variantes, frações, saldo isolado, concorrência, rollback, snapshots, inativação, permissões e V8 vazia/recusa de V7 preenchida/reconexão.
- Teste direcionado `ReturnsTests#stage13PurchaseReceiptSaleReturnKeepSkuAndSnapshots`: aprovado, incluindo bloqueio explícito da mudança de unidade e de tipo de venda em SKU utilizado, preservação de código/apresentação e ciclo compra → recebimento → venda → devolução.
- `npm test`: **182 aprovados**. Recuperação incompatível sem SKU e filtros conjuntos cobertos.
- `npm run test:e2e`: **112 aprovados**, Chromium desktop e mobile, incluindo build de produção. Cadastro, relações por SKU, estoque, documentos, conflitos, sessão, recuperação e CSV.
- `npm run typecheck` e `npm run lint`: aprovados.
- `bash scripts/reset-development.sh`: aprovado; recriou exclusivamente o container identificado `vila-verde-stage13-development`, PostgreSQL V8 e bootstrap. Porta local observada `37649`; credenciais no arquivo privado `/tmp/vila-verde-stage13-development.env`. Nenhuma configuração compartilhada foi alterada.

## Gates finais aprovados

| Gate | Commit validado | Evidência |
| --- | --- | --- |
| Backend PostgreSQL | `22ff8a5638325abc7bb7ceff770c741d97b74231` | [CI aprovada](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42888325815) |
| Frontend validate: lint, TypeScript, 182 unitários, 112 desktop/mobile e build | `42ae648366e6fdf69baf88129aff5f199cc99fb7` | [CI aprovada](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42892700923) |
| Integração real, 32 cenários e persistência após reinício | `42ae648366e6fdf69baf88129aff5f199cc99fb7` | [Job integration aprovado](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/42892700923) |

A execução local final de `npm run test:integration` também passou: **32/32**, smoke por API/proxy e comparação integral de documentos, saldos e movimentos após reiniciar o processo backend. Inclui três variantes do mesmo agrupador, duas unitárias com UN e uma de granel com kg, escolha explícita e busca por código, falta isolada, replay e compra → recebimento → venda → devolução. Logs locais em `integration-artifacts/`, sem credenciais nos arquivos publicados pelo runner. A execução removeu seus containers e processos próprios; a base de desenvolvimento identificada permanece separada.

Os cenários de recebimento filtram SKU e período antes de localizar movimentos, preservando a verificação quando existem mais de vinte registros. A unidade nas devoluções a fornecedor vem do snapshot da compra, com origem `COMPRA`.

## Código para revisão

- [V8: recusa de dados antigos, chave SKU/loja e proteções](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/22ff8a5638325abc7bb7ceff770c741d97b74231/src/main/resources/db/migration/V8__sku_commercial_variants.sql).
- [Quantidade e estado comercial do SKU](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/22ff8a5638325abc7bb7ceff770c741d97b74231/src/main/java/com/vilaverde/erp/entity/ProdutoSku.java), [snapshots](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/22ff8a5638325abc7bb7ceff770c741d97b74231/src/main/java/com/vilaverde/erp/entity/SkuSnapshot.java).
- [Aceite PostgreSQL das variantes e regressão de devoluções](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/22ff8a5638325abc7bb7ceff770c741d97b74231/src/test/java/com/vilaverde/erp/ReturnsTests.java), [instalação e recusa da V8](https://github.com/Zayma1/erp-produtos-naturais-backend/blob/22ff8a5638325abc7bb7ceff770c741d97b74231/src/test/java/com/vilaverde/erp/MigrationTests.java).
- [Aceite real com três variantes](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/blob/42ae648366e6fdf69baf88129aff5f199cc99fb7/e2e-live/sku-variants.spec.ts).

Contrato autenticado `openapi-stage13.json`, SHA-256 `e6fe54a2947f48cbb37c4c184aa40cf46ebadda43eef25fa0563c252201d109b`. As árvores de SDK do consumidor e backend foram comparadas integralmente e coincidem.

Registro documental posterior não altera o código validado. As branches `main` e `novaVersao` permanecem nos SHAs iniciais; não houve merge, deploy, alteração de configuração publicada nem reset de banco compartilhado.
