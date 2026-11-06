# SDK do backend

- Repositório: https://github.com/Zayma1/erp-produtos-naturais-backend
- Branch: `stage9-sales`, base `a3aa982` de `novaVersao`.
- Commit: `65d6585767398c100a6db40e956b683eb7221125`.
- Contrato: `openapi-stage9.json`, exportado por `AuthenticationTests.exportAuthenticatedContract` com sessão ADMIN e PostgreSQL descartável migrado até V4.
- Geração: Kubb 5.15.3 e lockfile existente, `OPENAPI_FILE=./openapi-stage9.json npm run sdk:generate`.
- A pasta `generated/sdk` inteira, incluindo `.kubb`, foi copiada desse commit; sem edição manual de arquivos gerados.
- Base gerada vazia; chamadas usam o proxy de mesma origem e mantêm sessão/CSRF. Vendas exigem chave UUID apenas no POST de criação; edição e ações explícitas usam versão. DELETE continua bloqueado.
- `scripts/integration.mjs` fixa esse commit; `INTEGRATION_BACKEND_REPO` troca somente a origem do clone.
