# SDK do backend

- Repositório: https://github.com/Zayma1/erp-produtos-naturais-backend
- Branch de feature: `stage8-auth`, base `novaVersao` com recebimento. Não usa `main` nem merge integral de `cargoUsuario`.
- Commit: `a3aa98212842a48bd3bb30302a25bca37c21727c`.
- Contrato: `openapi-stage8.json`, obtido de `/v3/api-docs` com sessão de administrador em PostgreSQL descartável, migrado até V3. O teste `AuthenticationTests.exportAuthenticatedContract` exporta o contrato com `OPENAPI_EXPORT_FILE`.
- Geração: Kubb 5.15.3, lockfile existente do backend, `OPENAPI_FILE=./openapi-stage8.json npm run sdk:generate`.
- A pasta `generated/sdk` inteira, incluindo `.kubb`, foi copiada desse commit. Nenhum arquivo gerado foi editado manualmente.
- Base gerada vazia; providers mantém chamadas no proxy da aplicação. Login/sessões/CSRF e contas fazem parte do contrato completo. Operações sem suporte continuam bloqueadas diretamente no backend e no proxy.
- `scripts/integration.mjs` fixa esse commit. `INTEGRATION_BACKEND_REPO` troca apenas a origem do clone para validar o mesmo commit em checkout local antes de publicá-lo.
