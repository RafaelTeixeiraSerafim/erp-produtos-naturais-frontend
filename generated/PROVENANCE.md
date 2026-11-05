# SDK do backend

- Repositório: https://github.com/Zayma1/erp-produtos-naturais-backend
- Branch atual: `novaVersao`; a origem de geração foi `stage7-receiving`, incorporada e removida após a entrega.
- Commit: `f335d525ea6ed107cd00824031ded904020967fe`.
- Contrato: `openapi-stage7.json` obtido de `/v3/api-docs` do backend local com PostgreSQL descartável e migrações V1/V2.
- Geração: Kubb 5.15.3, lockfile do backend, `OPENAPI_FILE=./openapi-stage7.json npm run sdk:generate`.
- A pasta `generated/sdk` inteira, incluindo `.kubb`, foi copiada desse commit. Nenhum arquivo gerado foi editado manualmente.
- Base gerada vazia; `components/providers.tsx` mantém chamadas no proxy da aplicação. Contrato completo inclui operações que o proxy continua bloqueando.
- `scripts/integration.mjs` fixa esse commit. `INTEGRATION_BACKEND_REPO` permite somente trocar a origem do clone para validar o mesmo commit em checkout local, antes de publicá-lo.
