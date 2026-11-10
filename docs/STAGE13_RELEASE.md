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

## Gates finais

[CI backend](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/42888325815): resultado em acompanhamento. Integração real (32 cenários desktop/mobile, smoke, proxy, V8/bootstrap e comparação após reiniciar a API) e CI frontend em andamento; ainda não declaradas aprovadas neste registro.
