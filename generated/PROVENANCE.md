# SDK da etapa 14

Backend base `22ff8a5`, branch `stage14-forms-auth`, commit `7f8477645978dbabaceca961aa09f98b7882abc2`.
Contrato `openapi-stage14.json` exportado por `ReturnsTests.exportOpenApi` com ADMIN
em PostgreSQL V9 descartável. SDK integral gerado no backend com
`OPENAPI_FILE=openapi-stage14.json npm run sdk:generate`, lockfile existente.
Árvore completa copiada incluindo `.kubb`; nenhum arquivo gerado editado à mão.

Novos contratos: usuário real separado de nome/e-mail, login por `login`,
recuperação/redefinição de senha, localidades e código IBGE de município.
Configuração e evidências em [etapa 14](../docs/STAGE14_FORMS_AUTH.md).

SHA-256 do OpenAPI autenticado: `8ad71842fbcc5b654f78d99a11f88eb5ff4b787167b83d7d4f56b90ae0029519`.
O teste de exportação verifica schemas distintos para recuperação pública e
senha temporária administrativa, além das respostas de sucesso e erro.

O runner acompanha a diagnóstico administrativo de transporte IBGE em `dffae8413159e43c8d3032ae99a692ae40a534d2`; o contrato e o SDK permanecem idênticos à geração acima.
