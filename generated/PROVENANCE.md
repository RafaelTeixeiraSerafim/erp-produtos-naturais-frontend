# SDK do backend

- Repositório: https://github.com/Zayma1/erp-produtos-naturais-backend
- Branch: `stage11-adjustments`, base `867cef2`.
- Commit: `bdd39f3b08c0c0e535e8b5e1c1ebb23c28b21ea4`.
- Contrato: `openapi-stage11.json`, exportado por `AdjustmentTests.exportOpenApi` com ADMIN autenticado e PostgreSQL V6 descartável.
- Geração completa: Kubb e lockfile existentes, `OPENAPI_FILE=openapi-stage11.json npm run sdk:generate`.
- SDK inteiro copiado do backend, sem edição manual de arquivos gerados.
- Proxy de mesma origem com sessão/CSRF e Idempotency-Key UUID na criação de ajustes.
- `scripts/integration.mjs` fixa o SHA acima.
- Evidências anteriores permanecem nos registros das etapas 9/10; evidência desta etapa em `docs/STAGE11_ADJUSTMENTS.md`.
