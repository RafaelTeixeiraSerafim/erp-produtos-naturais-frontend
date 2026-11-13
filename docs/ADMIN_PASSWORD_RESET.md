# Redefinição de senha pela administração

A recuperação por e-mail foi removida. O login orienta a pessoa a solicitar uma
senha temporária ao administrador. Não há envio automático nem configuração SMTP.

1. Como ADMIN, abra **Usuários**, busque a conta e clique em **Editar**.
2. Preencha **Senha temporária** (mínimo de oito caracteres) e salve a conta.
3. Entregue a senha à pessoa por um canal privado.
4. A pessoa entra com usuário/e-mail e a senha temporária. O sistema exige uma
   nova senha antes de permitir acesso às operações; depois, ela entra novamente.

Deixar o campo vazio ao editar mantém a senha atual. A redefinição revoga as
sessões anteriores. Cargo, lojas e status não são modificados pela senha.
A alteração da própria senha permanece disponível no menu da conta.

Somente ADMIN pode usar `POST /api/usuarios/{id}/senha-temporaria` e editar contas;
CSRF continua obrigatório. GER/FUNC não redefinem senhas de outras pessoas.
As rotas antigas `/esqueci-senha` e `/redefinir-senha` retornam 404 no frontend,
e os endpoints públicos correspondentes não existem mais no contrato/proxy.

V1–V9 são preservadas. A V10 remove somente `password_reset` e
`password_reset_attempt`, invalidando os tokens antigos sem alterar contas,
credenciais, referências ou sessões existentes. Não requer reset de banco.
O starter Mail, serviço de recuperação, propriedades SMTP e capturadores SMTP de
teste foram removidos. Variáveis SMTP antigas, se existirem no ambiente de
hospedagem, não são mais usadas pelo aplicativo.

Verificação: PostgreSQL testa migração com token existente e preservação de hash,
autorização/CSRF, revogação e troca obrigatória. Integração desktop/mobile exercita
a redefinição pela tela de usuários em serviços descartáveis, sem e-mails reais.

## Evidências de entrega — 13/11/2026

- Backend: 118 registrados, 117 executados sem falhas, um bootstrap de integração
  ignorado; [CI aprovada](https://github.com/Zayma1/erp-produtos-naturais-backend/actions/runs/43505499113).
- Frontend: 209 testes unitários/componentes, TypeScript, lint e build aprovados;
  [CI com integração e desktop/mobile aprovada](https://github.com/RafaelTeixeiraSerafim/erp-produtos-naturais-frontend/actions/runs/43505883325).
- Integração real descartável: administrador edita senha temporária pela tela,
  sessão anterior passa a 401, a pessoa troca a senha obrigatória e entra novamente.
- Publicação: login mostra orientação ao administrador; páginas antigas e seus
  endpoints pelo proxy retornam 404. O acesso administrativo existente foi
  confirmado e o campo/hint da senha temporária conferido sem salvar a conta.
- Nenhuma senha de produção foi redefinida durante a validação e não houve e-mail,
  reset de banco ou alteração das migrações V1–V9.
