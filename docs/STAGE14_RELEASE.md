# Etapa 14 — aceite local

Data: 11/11/2026. Código frontend: `05ae92eae2f1b11614a10fef8af17fa8b8ebf32f`. Branches de origem `stage14-forms-auth`, sobre frontend `d60fa53`
e backend `22ff8a5`. Código backend fixado no SDK/runner:
`7f8477645978dbabaceca961aa09f98b7882abc2`.

No aceite local anterior à autorização de publicação não houve merge, push, deploy,
envio de e-mails reais ou reset/migração de banco de desenvolvimento/compartilhado.
Os bancos descartáveis dos runners foram removidos após os testes. O estado de
publicação atual consta abaixo.

## Publicação autorizada em 11/11/2026

Etapa 14 integrada à `main` do frontend e à `novaVersao` do backend, incluindo a
etapa 13 que serve de base. As branches de origem foram preservadas.

- Merge frontend: `6974f1bb4ed0006b19df422a85274d80a5468d9f`.
- Merge backend: `c8520068fe65ec7c86996dae46364914ae44f336`.
- [CI frontend da etapa 14](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/43061783469): `validate` e `integration` aprovados.
- [CI backend da etapa 14](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/43061781973): 100 testes registrados, 99 executados,
  nenhum erro/falha e um bootstrap exclusivo de integração ignorado.

As árvores dos merges são idênticas às das branches validadas. A atualização
posterior deste relatório altera somente documentação. Novas execuções da CI
nas branches de destino podem ser acionadas pelo push; os links acima identificam
as execuções aprovadas antes da integração.

O backend remoto tinha duas alterações paralelas: tamanho de CNPJ no mapeamento
JPA e um método `findByUuid` no repositório. O histórico foi incorporado, mantendo
o CNPJ canônico de 14 caracteres e a busca atual por ID/usuário/e-mail. A árvore
resultante foi comparada integralmente com a versão aprovada antes da CI.

O usuário informou que já havia resetado o banco. Nenhum reset, SQL manual ou
deploy manual foi executado durante esta publicação. Implantação automática e
configuração de SMTP no ambiente publicado não foram verificadas.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Backend PostgreSQL 16 | 100 testes registrados; 99 executados e aprovados, um bootstrap exclusivo do runner ignorado. Inclui V1–V9, preflight, colisões, documentos, concorrência, tokens, cache e regressão operacional. |
| Bootstrap de integração | Executado separadamente no banco próprio, com senha gerada pelo runner. |
| Frontend | TypeScript, ESLint e 187 testes unitários/componentes aprovados. |
| Navegador com fixtures | 128 cenários desktop/mobile aprovados; mais dois cenários dirigidos de criação de conta passaram após ajustar o pattern HTML ao modo `v` dos navegadores. |
| Build | Produção aprovada; o runner também construiu cópia isolada do frontend. |
| Integração real | Smoke e 34 cenários Chromium desktop/mobile aprovados no backend fixado; comparação integral de documentos, itens, saldos e movimentos após reiniciar o processo aprovada. |
| SDK | Árvore completa idêntica à gerada no backend, incluindo `.kubb`; sem edição manual de gerados. |
| Migrações | Diff de V1–V8 vazio em relação a `22ff8a5`; V9 Java transacional. |

Comandos utilizados:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e -- --workers=3 --reporter=list
# No backend:
bash scripts/test-postgres.sh
# No frontend, com o checkout backend local:
INTEGRATION_BACKEND_REPO="$PWD/../erp-produtos-naturais-backend" npm run test:integration
```

Nesta máquina foi usado `MAVEN_ARGS=-s /tmp/stage14-maven-settings.xml` para acessar
o Maven Central, pois o mirror global da máquina não resolvia. O projeto e as
versões existentes foram preservados; apenas o starter SMTP foi acrescentado.
O runner padrão busca o SHA no remoto do backend; enquanto as branches forem
locais, usar `INTEGRATION_BACKEND_REPO` como acima.

## Cobertura do aceite

- `AuthenticationTests` e `FormsAuthTests`: usuário/e-mail, nome independente,
  bootstrap real `admin`, caixa, usuário inválido/duplicado, limite compartilhado,
  CSRF e recuperação pública mesmo com sessão revogada ou senha obrigatória.
- SMTP JavaMail capturado por servidor local: fragmento com token de 256 bits,
  hash persistido, expiração, reutilização, concorrência com um único vencedor,
  limite de três solicitações, revogação e manutenção de status/revisão/cargo/lojas.
  `e2e-live/forms-auth.spec.ts` confirma redefinição por e-mail e sessão anterior 401.
- CNPJ numérico e alfanumérico com/sem máscara, CPF válido/inválido/repetido,
  persistência canônica, edição do próprio registro e múltiplos clientes sem CPF.
  Clientes e fornecedores podem compartilhar documento entre seus cadastros.
- Concorrência em CPF de cliente, documento de fornecedor e nome normalizado de
  unidade. Sigla repetida continua permitida. `MigrationTests` reproduz `22001`
  do CNPJ mascarado no esquema anterior e bloqueia conflitos V9 com relatório de IDs.
- Catálogo IBGE controlado: cache 24h, uso sinalizado por até sete dias em falha,
  503 sem cache, município incompatível, seleção dependente e resposta atrasada.
  Endereço legado sem correspondência continua editável sem mudar o endereço;
  complemento nulo/vazio é equivalente. Mudar o endereço exige seleção explícita.
- Menu da conta, teclado/Escape/foco, olho de senha, páginas públicas independentes,
  confirmação da nova senha e links sucessivos de redefinição na mesma aba.
- Atalhos por permissão em nova aba com `noopener`, modal por `?novo=1`, rota
  `/skus/novo` com seleção de agrupador, refresh localizado, seleção/observação
  preservadas e disponibilidade de SKU ligado a novo agrupador após atualizar.
- Compra com minutos/`step=60`, novos segundos zerados, segundos originais
  preservados ao editar sem mudar a data; foco substitui desconto zero e mantém
  entrada `0,50`. Recebimentos e outros documentos mantêm sua precisão anterior.

A integração usa `spring-boot:test-run` com entrada/configuração somente no
classpath de testes. O runner exige dois estados do catálogo local e contabiliza
requisições ao servidor IBGE controlado antes de criar fixtures, impedindo uso
silencioso da API pública. SMTP fica explicitamente em loopback, sem autenticação,
com destinatários `.test`; suas mensagens permanecem apenas no capturador local.

## Roteiro de configuração e revisão

1. Conferir [configuração SMTP e origem pública](STAGE14_FORMS_AUTH.md). Definir
   e-mail entregável do bootstrap antes da primeira criação ou editar a conta
   existente. A senha inicial exige troca e não é redefinida em reinícios.
2. Em cópia isolada de um banco V8, executar a aplicação com V9. Havendo conflito,
   conferir os IDs do preflight e reconciliar explicitamente. Consultar
   `SELECT id_usuario, usuario FROM usuario_login_migracao ORDER BY id_usuario`.
3. Testar login pelo usuário e e-mail, editar usuário sem mudar nome, abrir o menu
   por teclado e conferir visibilidade das senhas em desktop/mobile.
4. Solicitar recuperação usando o SMTP local; abrir o link, redefinir e verificar
   reutilização rejeitada e sessões anteriores revogadas. Não usar destinatários reais.
5. Exercitar máscaras/documentos, duplicidade e seleção UF/município em loja e
   fornecedor; conferir os endereços legados e erros localizados de consulta.
6. Manter uma compra preenchida, abrir cadastros pelo `+`, criar sem trocar a aba
   original, atualizar só o campo e selecionar explicitamente o novo registro.
   Conferir desconto, minutos e preservação da data original na edição.

BG-024–BG-028 corrigidas com as evidências acima. BG-021/BG-022 de compras
permanecem abertas: esta etapa não introduz idempotência nem versão no PUT geral.
