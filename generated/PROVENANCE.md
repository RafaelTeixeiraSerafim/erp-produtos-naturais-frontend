# SDK do backend

- Repositório: https://github.com/Zayma1/erp-produtos-naturais-backend
- Branch: `stage12-returns`, base `bdd39f3`.
- Commit: `fac6c7352b18dc8847b529097bf25610af68a219`.
- Contrato: `openapi-stage12.json`, exportado por `ReturnsTests.exportOpenApi` com ADMIN autenticado e PostgreSQL V7 descartável.
- Geração completa: Kubb e lockfile existentes, `OPENAPI_FILE=openapi-stage12.json npm run sdk:generate`.
- SDK inteiro copiado do backend, incluindo `.kubb`, sem edição manual de arquivos gerados.
- Tipos distintos para itens de ajuste, devolução de cliente e devolução a fornecedor.
- Proxy de mesma origem com sessão/CSRF e Idempotency-Key UUID somente na criação das APIs aprovadas, incluindo devoluções.
- `scripts/integration.mjs` fixa o SHA acima.
- Evidências anteriores permanecem nos registros das etapas 9–11; evidência desta etapa em `docs/STAGE12_RELEASE.md`.
