# SDK do backend

- Repositório: https://github.com/Zayma1/erp-produtos-naturais-backend
- Branch: `stage10-transfers`, base `65d6585767398c100a6db40e956b683eb7221125` de `stage9-sales`.
- Commit exato: `867cef2e35596ae67f692f9e2fcfd4932953d513`.
- Contrato: `openapi-stage10.json`, exportado por `AuthenticationTests.exportAuthenticatedContract` com sessão ADMIN e PostgreSQL descartável migrado até V5.
- Geração completa: Kubb 5.15.3 e lockfile existente, `OPENAPI_FILE=./openapi-stage10.json npm run sdk:generate`.
- `generated/sdk` inteira, incluindo `.kubb`, copiada do backend; nenhum arquivo gerado editado manualmente.
- Base gerada vazia; proxy de mesma origem com sessão e CSRF. Transferências exigem UUID Idempotency-Key na criação e versão em edição/conclusão/cancelamento. DELETE bloqueado.
- `scripts/integration.mjs` fixa esse SHA; `INTEGRATION_BACKEND_REPO` muda somente a origem do clone.
