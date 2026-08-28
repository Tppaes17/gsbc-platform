# GSBC — Stage 7 (Critical Flows)

## Objetivo

Reduzir risco operacional nos quatro fluxos que o master prompt trata
como críticos (Seções 23–26) — pagamento, mudança de status,
notificação, negociação — mostrando contexto e impacto antes da
confirmação, sem alterar nenhuma lógica de negócio (achado #05 do
[GSBC Design Baseline](https://claude.ai/code/artifact/3c62b120-7889-4f59-a831-3966142d43c2)).

## O que mudou

### Pagamento (`src/app/backoffice/financeiro/pagamento-action.tsx`)
Exemplo literal da Seção 24 do master prompt. Adicionado: contexto
(Empresa/Obrigação) e **Saldo atual → Saldo após este pagamento**,
recalculado ao vivo conforme o valor é digitado. `saldoAtual` é
calculado uma vez em `cobrancas/[id]/page.tsx` com a mesma fórmula já
usada em `PagamentosList` (`Math.max(valorReferencia - totalPago, 0)`)
— nenhuma lógica nova, o mesmo cálculo, só exibido antes da
confirmação. A persistência continua inteiramente em
`registerPagamentoAction`, intocada.

### Status (`src/app/backoffice/cobrancas/[id]/status-action.tsx`)
Bloco **Status atual → Novo status** adicionado acima do seletor,
atualizando ao vivo conforme a opção muda. **"Impacto esperado" foi
deliberadamente omitido** — `change_cobranca_status` foi retocado em
pelo menos 5 migrations ao longo do projeto (0008 até 0023+) e mapear
com certeza o efeito colateral de cada uma das ~14 transições exigiria
uma investigação fora de proporção pra este stage de UI. A própria
Seção 26 do master prompt permite isso: "se impacto não estiver
mapeado, apenas apresentar alteração."

### Notificação (`src/app/backoffice/cobrancas/[id]/notificacao-action.tsx`)
Preview completo antes do envio (Seção 25): Destinatário, Canal,
Assunto, e o **Conteúdo** — o texto inteiro que seria enviado,
recalculado ao vivo enquanto a "Mensagem adicional" é digitada.
`montarPreview()` é uma cópia fiel da construção de `text` dentro de
`sendNotificacaoAction` (mesmas strings, mesma ordem) — não é o
template real, é uma reprodução pra exibição; o envio continua
inteiramente na Server Action, `sendEmail` nunca é chamado do
cliente.

### Negociação (`src/app/backoffice/negociacoes/[id]/evento-form.tsx`)
Cada `Tipo` de movimento agora mostra uma frase de consequência
diretamente abaixo do seletor — inclusive o caso mais arriscado
("Aceite": "Se o valor for menor que o original da cobrança, exige
aprovação de desconto do Owner antes de virar acordo firmado (Policy
Engine, STG-11)"), texto verificado contra o comportamento real
implementado na Rodada 27, não uma suposição.

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros.
- `npm run build` — build de produção limpo.
- **Validação visual e interativa real** dos 4 fluxos:
  - Pagamento: digitado um valor no campo, "Saldo após este pagamento"
    recalculou corretamente (cobrança já paga, saldo em R$0,00 antes e
    depois — caso de borda confirmado).
  - Notificação: preview completo renderizado com dado real
    (destinatário, canal, assunto), texto do conteúdo batendo com o
    template real linha a linha; digitado uma "mensagem adicional" e
    confirmado que o preview a insere no lugar certo, ao vivo.
  - Status: selecionado "Em negociação" a partir de "Paga" no dropdown
    — bloco "Novo status" atualizou ao vivo; diálogo fechado sem
    confirmar (não alterou o dado real).
  - Negociação: selecionado "Aceite" no tipo — texto de consequência
    do Policy Engine apareceu corretamente; diálogo fechado sem
    confirmar.
- Integridade de dado real reverificada depois dos testes interativos:
  322 dossiês, 2 empresas, 1 cobrança (status `paid` intacto,
  confirmando que o teste do dialog de status não foi submetido), 1
  pagamento, 1 negociação, 3 eventos de negociação — nenhuma escrita
  acidental.
- `npx playwright test e2e/rls-visibility.spec.ts e2e/financeiro-e-notificacoes.spec.ts e2e/mobile-navigation.spec.ts`
  — 15/15 passando, incluindo o teste que envia uma notificação de
  verdade através do novo preview (`enviar notificação por e-mail
  registra sucesso`).

## Pendências

- "Impacto esperado" da mudança de status — depende de mapear o
  comportamento real de `change_cobranca_status` por transição; fora
  de escopo deste stage (ver acima).

## Riscos residuais

| Risco | Observação |
|---|---|
| `montarPreview()` fica desalinhado se `sendNotificacaoAction` mudar o template no futuro | Baixo — mudança futura no template real precisa lembrar de atualizar a cópia de preview; comentário no código aponta pra isso explicitamente |

## Próximo stage

Stage 8 — Detail Pages: separar as páginas de detalhe grandes
(cobrança 564 linhas, empresa 396 linhas) em componentes de
apresentação nomeados, aplicando `PageSection` de forma mais completa.
