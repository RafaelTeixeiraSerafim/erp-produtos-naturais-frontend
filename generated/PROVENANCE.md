# SDK da etapa 13

- Backend: https://github.com/Zayma1/erp-produtos-naturais-backend, branch `stage13-sku-variants`, base `f38a335774b5f4b998514109e543932ed2cc8fe6`.
- Commit de implementação: `22ff8a5638325abc7bb7ceff770c741d97b74231` (fixado no runner).
- Contrato: `openapi-stage13.json`, exportado por `ReturnsTests.exportOpenApi`, com ADMIN autenticado em PostgreSQL V8 descartável.
- SDK completo: `OPENAPI_FILE=openapi-stage13.json npm run sdk:generate`, usando Kubb e lockfile existentes; árvore completa copiada, incluindo `.kubb`, sem edição manual.
- Produto agrupador; itens comerciais exigem `idProdutoSku`, com snapshots de código, apresentação e unidade.
- Endpoints de vínculo/preço substituídos por `/api/skus-loja` e `/api/skus-precos-loja`; filtros de estoque/movimentos combinam produto e SKU.
- Evidências: [aceite da etapa 13](../docs/STAGE13_RELEASE.md). Contrato anterior permanece no histórico Git.
