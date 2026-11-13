# Etapa 15 — consistência visual dos formulários e da navegação

Implementação exclusivamente no frontend. A política de senha temporária administrativa e os contratos de API/SDK/banco foram preservados.

## Comportamento entregue

- `resolveRoute` escolhe o destino mais específico por segmentos completos. Sidebar desktop/mobile e breadcrumb compartilham essa resolução. Listas de devoluções não recebem sufixo de detalhe; novos cadastros exibem “Nova devolução”. Transferências e ajustes continuam selecionados em seus detalhes e edições. As permissões existentes continuam filtrando o menu.
- `formatDocument` centraliza apresentação de CPF/CNPJ nas listagens de clientes, lojas e fornecedores. Preserva zeros, letras e documentos já mascarados; ausência aparece como “—”. A coluna de fornecedores passou a “CPF/CNPJ” e usa o documento preenchido. Os payloads continuam normalizados pelo catálogo existente.
- O formulário de fornecedor agrupa tipo e documento em uma linha com proporção 160px/restante no desktop e campos consecutivos no celular. A edição identifica o tipo preenchido; trocar o tipo limpa ambos os valores e os erros antigos, mantendo máscara e validação.
- `FieldHeader` define altura mínima de 34px e separa label de ações; `Field` associa a label ao primeiro controle. Formulários genéricos, compras, vendas, transferências, ajustes, seletor de variante do produto, lojas permitidas do usuário e estado/cidade usam o padrão. Cadastro e atualização usam botões de ícone de mesma dimensão e nomes acessíveis. Carregamento gira o ícone; mensagens de carregamento, falha e cache ficam abaixo do controle.
- A busca auxiliar do SKU fica abaixo do seletor principal, que se alinha aos campos vizinhos de quantidade/custo. Filtro e seleção atual permanecem preservados.
- `BackLink` compartilha `Button` outline, seta e texto, mantendo links reais e destinos explícitos nas páginas de cadastro/detalhe, erro e página inexistente. Botões de fechar/revisar diálogos continuam ações. A proteção existente de alterações pendentes continua interceptando os links de retorno.

## Cobertura de regressão

`tests/visual-consistency.test.tsx` cobre documentos numéricos/alfanuméricos, zeros, máscara existente, ausência, rotas de lista/cadastro/detalhe/edição, limites de segmentos, associação de labels, posição do feedback e semântica do retorno.

`e2e/visual-consistency.spec.ts` exercita desktop e celular: seleção única em vendas/compras e suas devoluções, breadcrumb, fornecedor CPF na listagem/edição, CNPJ alfanumérico, troca de tipo, proporção/empilhamento dos campos, cache de localidades, carregamento/falha/retry de seletor, manutenção da seleção/valores, alinhamento com e sem ações e retorno por teclado com proteção de alterações. A suíte existente também cobre criação/edição de fornecedor, validação, atraso/retry de localidades, permissões, novas abas e atualização restrita às consultas necessárias.

A inspeção manual pelo Chrome DevTools foi realizada em uma aba própria no build local com o backend de fixture: cadastro de fornecedor em desktop e viewport 390×844, seletor de tipo, máscara de CPF e empilhamento dos campos. A aba foi encerrada ao final. Nenhum cadastro foi salvo nessa inspeção.

As capturas dos cenários automatizados ficam em `test-results/stage15-desktop/` e `test-results/stage15-mobile/` (ignorados pelo Git). Os testes usam o build de produção e o backend local de fixture; não representam uma integração com o backend publicado ou evidência de CI remota.

## Validação local — 13/11/2026

| Verificação | Resultado |
| --- | --- |
| `npm test` | 213 testes em 25 arquivos passaram |
| `npm run typecheck` | Passou |
| `npm run lint` | Passou |
| `npm run build` | Passou pelo `webServer` do Playwright nas execuções finais |
| `npx playwright test --project=desktop --reporter=list --output=test-results/stage15-desktop` | 66 cenários passaram |
| `npx playwright test --project=mobile --reporter=list --output=test-results/stage15-mobile` | 66 cenários passaram |
| Inspeção visual | Chrome desktop/mobile e capturas de fornecedor/compra conferidos |
| `git diff --check` | Passou |

Total de navegador: 132 cenários aprovados no código final. As execuções foram separadas por projeto. O teste de alinhamento mede a posição do controle em relação ao próprio cabeçalho, evitando confundir os avisos de recuperação/pré-requisitos acima do formulário com desalinhamento entre campos.

A validação acima é local. CI remota e integração descartável com banco/backend não foram executadas nesta etapa. Não houve deploy manual nem alteração em serviço compartilhado.
