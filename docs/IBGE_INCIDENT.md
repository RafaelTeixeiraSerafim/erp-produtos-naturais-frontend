# Consulta IBGE retornando 503 no ambiente publicado

Relato de 11/11/2026: frontend Vercel e backend Render retornaram
`Catálogo IBGE indisponível. Tente atualizar o campo.` no GET de estados.

## Evidências e limite do diagnóstico

A consulta direta à API oficial respondeu 200 com os 27 estados. O cliente Java
21 também obteve 200. Uma execução do serviço completo original retornou 503;
uma execução posterior carregou os mesmos 27 estados normalmente. O JSON oficial
foi validado separadamente pelo mesmo parser do serviço.

Isso comprova uma falha intermitente na observação local, mas não identifica a
causa de rede/status no Render. A implementação original descartava a exceção e
não registrava nem o status HTTP upstream. Não havia conexão autenticada ao Render
nesta investigação; a causa específica do incidente publicado continua pendente
até conferir seus logs e repetir a requisição após a implantação.

## Alteração

- No máximo duas tentativas para I/O ou HTTP 429/500/502/503/504, compartilhando o
  limite total original de cinco segundos. Timeout não ganha outros cinco segundos.
- Erros permanentes, como 403/404, não são repetidos. `Retry-After` que solicita
  espera impede uma repetição imediata, sem bloquear a requisição por esse período.
- `Accept: application/json` explícito. Origem segue fixa na API oficial do IBGE;
  não foi adicionado fallback para outra API, lista estática ou texto livre.
- Registro de `Falha na consulta IBGE: recurso=..., cacheUtilizavel=...` com a
  exceção original. HTTP upstream informa o código; falhas TLS/DNS/timeout mantêm
  sua causa para diagnóstico. A resposta pública continua genérica e sem detalhes
  internos. Essas chamadas não contêm credenciais ou tokens de recuperação.
- Mantidos cache fresco por 24 horas, cache sinalizado por até sete dias e 503
  quando não existe cache utilizável. Falha não renova o timestamp do catálogo.

## Validação

`LocalidadesHttpTests` usa servidor HTTP local e o transporte real da produção,
sem dependência de serviços externos na CI. Cobre falha transitória seguida de
sucesso, cache, status permanente e diagnóstico, limite de tempo, cache expirado,
JSON inválido, município com acento e `Retry-After`.

Regressão local: 107 testes registrados, 106 executados e aprovados, um bootstrap
exclusivo de integração ignorado. Os sete testes HTTP passaram. A leitura real
pelo serviço corrigido também retornou os 27 estados a partir desta máquina.

Nenhum DTO, OpenAPI, arquivo gerado do SDK ou migration foi alterado.

## Verificação no Render

Depois de a versão corrigida entrar no ar, repetir **Atualizar estados**. Caso o
503 permaneça, procurar `Falha na consulta IBGE` nos logs do backend e conferir a
exceção imediatamente abaixo:

- `IBGE respondeu HTTP ...`: o servidor foi alcançado; conferir status/bloqueio
  recebido da API oficial.
- `HttpConnectTimeoutException` / `HttpTimeoutException`: conexão/resposta excedeu
  o limite; conferir saída de rede do runtime.
- `SSLHandshakeException`: conferir o truststore/TLS do Java no runtime.
- `UnknownHostException` / `ConnectException`: conferir resolução DNS e conexão.

A validação local não encerra a investigação do ambiente publicado por si só.

## Diagnóstico sem acesso ao painel do Render

Com a sessão administrativa ativa, a resposta 503 de localidades inclui o header
`X-IBGE-Failure`. Somente ADMIN recebe o código; a resposta pública permanece
igual para todos. O proxy aceita apenas códigos predefinidos, sem mensagens,
stack traces, corpos upstream ou credenciais. Respostas usam `no-store`.

Consultar no navegador autenticado: `fetch('/api/localidades/estados').then(r =>
({status:r.status, failure:r.headers.get('X-IBGE-Failure')}))`.

Códigos: `DNS`, `TLS`, `CONNECT_TIMEOUT`, `REQUEST_TIMEOUT`, `CONNECTION`,
`INTERRUPTED`, `INVALID_RESPONSE_OR_IO` ou `HTTP_NNN` (status recebido do IBGE).
Esse diagnóstico reutiliza a consulta normal, seu timeout/cache e a origem fixa;
não cria uma ferramenta de chamadas arbitrárias nem expõe logs do servidor.

Em 12/11/2026, após o cold start e com `/api/auth/me` retornando 200, estados e
municípios continuaram retornando 503 em aproximadamente 5,4 segundos. O retry
no formulário também falhou. A causa específica ainda precisa ser observada no
runtime; duração semelhante ao timeout, isoladamente, não comprova sua origem.
