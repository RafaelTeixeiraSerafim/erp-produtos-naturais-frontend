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

## Resultado do diagnóstico no ambiente publicado

Em 12/11/2026, com a versão de diagnóstico publicada e a sessão administrativa
renovada, o GET de estados retornou `503` com `X-IBGE-Failure: CONNECT_TIMEOUT`.
Isso identifica falha na conclusão da conexão do cliente Java ao IBGE, sem
necessidade de acesso aos logs. Não comprova bloqueio de IP, DNS ou HTTP/2.

O limite de conexão passa de três para cinco segundos, com orçamento total de
seis segundos por catálogo (incluindo no máximo duas tentativas). Uma consulta
fria de estados seguida de municípios permanece limitada a doze segundos de
transporte, abaixo dos quinze segundos do proxy. O resultado em produção deve
ser conferido: ampliar o timeout não resolve uma rota de rede bloqueada.

## Exceção original na resposta administrativa

Por solicitação do responsável, erros 503 de localidades agora incluem em
`detalhes`, para ADMIN, as classes e mensagens da cadeia original de exceções e
seus frames, além da versão Java e preferências IPv4/IPv6. Isso permite inspecionar
`Caused by` pelo Network do navegador sem acesso ao painel do Render. A cadeia é
limitada a 12 causas e 20 frames por causa; mensagens têm limite de 2048 caracteres.
O código resumido `X-IBGE-Failure` permanece disponível. Outros perfis continuam
recebendo `detalhes: null`; a resposta usa `Cache-Control: no-store`.

Não se trata de logs globais: são detalhes da exceção da consulta ao endpoint
fixo oficial de localidades. Nenhuma chamada a SMTP, autenticação ou recuperação
de senha passa por esse diagnóstico. O contrato `ApiError.detalhes` já é uma lista
de strings; não há mudança de OpenAPI ou necessidade de regenerar o SDK.

## Diagnóstico de rede executado no Render

`GET /api/localidades/diagnostico`, somente ADMIN, inicia um teste assíncrono ou
retorna seu resultado. Repetir a mesma chamada até `state` deixar de ser `RUNNING`.
Os destinos são fixos no código: API oficial de estados do IBGE e controles
HTTPS públicos. Não aceita URL, host ou IP do solicitante. A resposta tem `no-store`. Há somente uma execução por instância,
reaproveitada por cinco minutos; duração máxima observada pelo polling: 60 segundos.
A rota operacional é ocultada do OpenAPI/SDK de domínio.

Os testes retornam sucesso/falha, duração e detalhes para:

- DNS: endereços IPv4/IPv6 resolvidos (até quatro), limite de três segundos.
- TCP: conexão à porta 443 de cada IP resolvido, limite de dois segundos por IP.
- TLS: no primeiro IP que aceitou TCP, handshake com validação do certificado e
  hostname, comparando TLS padrão sem ALPN, com ALPN e TLS 1.2 com ALPN.
- HTTP: GET no endpoint oficial, comparando preferência HTTP/2, HTTP/1.1 e HTTP/1.1
  com TLS 1.2; conexão de até três segundos e requisição de até seis segundos.

Interpretação: falha DNS aponta para resolução; TCP que expira em todos os IPs
aponta para estabelecimento da conexão nesse runtime (não prova quem bloqueou);
TCP funciona mas TLS falha restringe o diagnóstico ao handshake; somente uma
configuração HTTP funcionando indica uma opção de compatibilidade a validar no
cliente de produção. HTTP 403/429 é diferente de timeout de conexão.

CI usa servidor HTTP local e fixture de diagnóstico sem internet; cobre execução
assíncrona, reuso, expiração, deadline e autorização 401/403/200. O diagnóstico não
altera o cliente de localidades, seus dados ou seu cache.

## Resultado real: camada TCP, 13/11/2026

Diagnóstico autenticado executado no Render em `2026-11-13T11:23:42Z`:

| Teste | Máquina local | Render |
| --- | --- | --- |
| DNS | `170.84.40.178`, 24 ms | Mesmo IPv4, 398 ms |
| TCP 443 | Sucesso, 35 ms | `SocketTimeoutException: Connect timed out`, 2105 ms |
| TLS padrão/ALPN/TLS 1.2 | Sucesso nos três modos | Não executado: nenhum IP aceitou TCP |
| Cliente com preferência HTTP/2 | 200, negociou HTTP/1.1 | `HttpConnectTimeoutException`, 3207 ms |
| HTTP/1.1 | 200 | `HttpConnectTimeoutException`, 3093 ms |
| HTTP/1.1 + TLS 1.2 | 200 | `HttpConnectTimeoutException`, 3004 ms |

A consulta chega à resolução DNS e falha ao estabelecer conexão com a porta 443
nesse caminho de rede. A comparação não identifica quem impede a conexão:
restrição de saída do provedor, entrada do destino e rota intermediária continuam
sendo hipóteses. Não há evidência para declarar bloqueio de IP pelo IBGE.

O incidente de localidades permanece aberto: o diagnóstico foi implementado e
verificado em produção, mas não constitui correção da conectividade. Uma mudança
de caminho (por exemplo, ponte no Vercel) precisa ser testada separadamente; não
foi adicionada nessa investigação.

## Comparação de saída HTTPS e diagnóstico no Vercel

O diagnóstico do Render inclui controles HTTPS fixos em `example.com` e na página
`/login` do próprio frontend publicado. Qualquer resposta HTTP nesses controles
comprova que DNS/TCP/TLS terminaram, mesmo com status de negação ou redirecionamento.
Nenhuma credencial acompanha essas consultas. `finishedAt` agora registra o fim
real do worker, independentemente do instante em que o navegador consulta o resultado.

`GET /api/localidades/diagnostico-vercel` executa a comparação no runtime Node.js
do frontend. Exige ADMIN, validado pelo backend a cada chamada, inclusive cache
hits. Consulta somente os endpoints oficiais de estados e municípios de SC, em
paralelo, com limite de seis segundos e sem encaminhar a sessão ao IBGE. Retorna
status, quantidade de localidades, duração e cadeia de erro. Há reuso por cinco
minutos, resposta `no-store` e bloqueio de redirecionamentos do upstream.

Esse endpoint é diagnóstico operacional, sem alteração dos endpoints utilizados
pelos formulários e sem introduzir uma ponte de produção entre os serviços.
CI usa respostas HTTP locais ou simuladas; não consulta serviços externos ao vivo.
