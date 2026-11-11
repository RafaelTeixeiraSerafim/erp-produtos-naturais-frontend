# Etapa 14 — acesso, documentos e formulários

Branches `stage14-forms-auth`, bases frontend `d60fa53` e backend `22ff8a5`.
V1–V8 preservadas. Nenhum merge, deploy, reset ou migração de banco compartilhado.

## Contrato e configuração

Login envia `{login, senha}`. `login` contendo `@` usa e-mail; nos demais casos usa
`usuario`, separado de `nome`, único sem distinguir caixa (3–32 caracteres ASCII,
letras, números, ponto, hífen ou sublinhado). Bootstrap cria o usuário real `admin`.
As tentativas por usuário e e-mail da mesma conta compartilham o bloqueio.

A V9 é uma migration Java transacional (`db/migration/V9__forms_auth.java`). Antes
de qualquer escrita, valida documentos, duplicidades normalizadas, fornecedores
com nenhum/ambos os documentos e nomes de unidade. Erros listam os IDs e impedem
a migração; reconciliar explicitamente os registros e repetir, sem apagar/mesclar.
Não fazer `repair`, baseline ou reset para contornar o preflight. A tabela
`usuario_login_migracao` registra o resultado por ID (`SELECT id_usuario, usuario FROM usuario_login_migracao ORDER BY id_usuario`). Usuários vêm do prefixo do
e-mail, com sufixo de UUID estável nas colisões; `admin` fica reservado ao bootstrap.
A V9 revoga sessões antigas pela mudança do contrato da identidade.

Configurar no backend:

```dotenv
FRONTEND_PUBLIC_ORIGIN=https://frontend.exemplo.com
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USERNAME=conta-smtp
SMTP_PASSWORD=segredo-do-ambiente
SMTP_AUTH=true
SMTP_STARTTLS=true
SMTP_FROM=no-reply@exemplo.com
BOOTSTRAP_ADMIN_EMAIL=administrador@exemplo.com
```

Configurar no frontend `BACKEND_API_URL` e `FRONTEND_ORIGINS` como antes. A origem
pública usada no e-mail é fixa e validada; cabeçalhos Host/Origin não compõem links.
Para SMTP local, usar `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_AUTH=false` e
`SMTP_STARTTLS=false`, com um capturador local. Não enviar testes a destinatários reais.
O endereço padrão `admin@vilaverde.local` não recebe mensagens reais: configurar um
e-mail entregável antes do primeiro bootstrap ou editar a conta na administração.
Alterar a variável após existir administrador ativo não muda a conta existente.

`POST /api/auth/esqueci-senha` recebe `{login}` e sempre confirma genericamente;
aceita no máximo três solicitações por conta/identificador em 15 minutos. O token
aleatório de 256 bits fica no fragmento do link, é removido da navegação pelo
frontend e enviado no corpo do POST. Apenas SHA-256 é persistido, por 30 minutos.
`POST /api/auth/redefinir-senha` recebe `{token, senha, confirmacao}`. Consumo e
revogação são transacionais sob o mesmo lock das escritas de conta: só uma chamada
vence. Revoga sessões e todos os tokens, não autentica nem muda cargo, lojas,
status ou revisão. Ambos os endpoints exigem CSRF.

## Documentos e localidades

CPF opcional de cliente: vazio persiste como `null`; preenchido é único entre
clientes. Fornecedor exige exatamente CPF ou CNPJ e mantém ambos os campos no DTO.
Documentos são normalizados antes da validação/gravação; CNPJ admite letras nas
primeiras 12 posições e verificadores numéricos. O algoritmo segue o
[documento oficial da Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj).
A validação não consulta a situação cadastral na Receita. Unidades têm nome único
sem distinguir caixa, trim e espaços repetidos; siglas podem se repetir.
Índices cobrem concorrência; edição do próprio registro é permitida.

O problema de tamanho de CNPJ foi reproduzido em PostgreSQL V8 isolado: inserir
`04.252.011/0001-10` na coluna `varchar(14)` gera `22001`. O handler anterior
transformava falhas de integridade em 409 genérico. O serviço agora persiste os 14
caracteres canônicos e o handler distingue tamanho/formato (400), duplicidade
real (409, por índice) e referências em uso. Evidência automatizada em
`MigrationTests.maskedCnpjReproducesPostgresLengthErrorInOriginalSchema`.

`GET /api/localidades/estados` e `/api/localidades/estados/{uf}/municipios` exigem
sessão. Retornam `{dados, desatualizado, atualizadoEm}`. Produção consulta
exclusivamente a [API oficial IBGE](https://servicodados.ibge.gov.br/api/docs/localidades),
com timeout de conexão/resposta, cache de 24 horas em memória e cache sinalizado
por até sete dias em falha. Sem cache utilizável: 503. Reiniciar perde esse cache.
A V9 não faz HTTP. Código IBGE, UF e nome canônico são persistidos; município de
outra UF é rejeitado. Endereços antigos permanecem visíveis. Correspondência
única de nome preenche a seleção; alterar endereço sem correspondência exige
seleção explícita. Queries por UF impedem aplicar respostas atrasadas.

## Interface e validação

Menu compacto da conta com identificação, troca de senha, Sair, teclado e Escape.
Campos de senha compartilham botão de visibilidade; páginas de autenticação e
recuperação ficam fora da dashboard. Atalhos `+` respeitam a permissão e abrem nova
aba com `noopener`; `?novo=1` abre o modal de criação. `/skus/novo` reutiliza o
formulário e permite selecionar produto agrupador, com `catalog.write`.
Atualizações dos seletores refazem somente as consultas do campo e conservam valores e
seleções (SKU consulta variantes e agrupadores, necessários para validar o status); não escolhem registros novos automaticamente. Data de compra aceita
minutos, zera segundos novos e conserva o timestamp original quando não alterada.
Desconto seleciona o zero ao focar, mantendo entrada decimal brasileira.

Verificações executadas e resultado final: ver `STAGE14_RELEASE.md`.
O runner usa PostgreSQL, SMTP e catálogo IBGE próprios, em loopback. O substituto
IBGE está somente no classpath de testes (`ControlledIntegrationConfig`) e exige
`CATALOG_DISPOSABLE=1`; não é empacotado no backend de produção. A CI não depende
de IBGE/SMTP externos ao vivo. SDK integral regenerado por Kubb, sem editar gerados.
