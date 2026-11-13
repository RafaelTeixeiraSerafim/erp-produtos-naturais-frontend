# SDK — redefinição administrativa de senha

Backend e runner fixados em `8cc139caa55d2398c5a71f6349fa784947b21352`. O contrato `openapi-stage14.json` foi
exportado por `ReturnsTests.exportOpenApi` com ADMIN em PostgreSQL descartável,
com V1–V10. SHA-256: `b7885fab97713e21b95a2e15af1c764724120f11e579ce5b8e574b529f1577ea`.

SDK integral regenerado no backend com `OPENAPI_FILE=openapi-stage14.json npm run sdk:generate`,
lockfile existente, e copiado incluindo `.kubb`. Nenhum código gerado foi editado
manualmente. Foram removidos os clientes, hooks e tipos de recuperação/redefinição
por e-mail; permanece `senhaTemporaria`, exclusivo de ADMIN e protegido por CSRF.

O contrato de localidades e a alternativa regional IBGE permanecem iguais.
Regras e operação em [redefinição por ADMIN](../docs/ADMIN_PASSWORD_RESET.md).
