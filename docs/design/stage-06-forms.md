# GSBC — Stage 6 (Forms)

## Objetivo

Melhorar legibilidade e feedback de formulários longos aplicando
`FormSection` (Stage 1) — agrupar campos por conceito ("Dados
cadastrais", "Contato", "Informações financeiras"), preservando os
padrões que já funcionavam (submit state, erro geral).

## O que mudou

Aplicado nos 3 formulários com mais de um agrupamento conceitual real
— nenhum formulário de 1-2 campos foi tocado (regra de não aplicar
onde não há necessidade):

- `src/app/backoffice/empresas/[id]/edit-empresa-form.tsx` — os 6
  campos (razão social, nome fantasia, CNPJ, CNAE, segmento,
  enquadramento) envolvidos por uma `FormSection title="Dados
  cadastrais"`.
- `src/app/backoffice/cobrancas/[id]/edit-cobranca-form.tsx` — dividido
  em duas seções reais: **Valores** (valor principal, atualização,
  vencimento) e **Gestão** (prioridade, responsável) — eram
  conceitualmente distintos mas viviam no mesmo grid sem nenhuma
  separação visual.
- `src/app/backoffice/empresas/novo/empresa-form.tsx` — **Jurisdição**
  (seleção do sindicato) separada de **Dados cadastrais**.

## O que foi avaliado e deliberadamente não mudado

- **Erro por campo** (Seção 44: "quando tecnicamente possível, erro
  próximo ao campo") — os três formulários continuam com um único
  alerta geral (`state.error`, já existente). Implementar erro por
  campo de verdade exigiria mudar o contrato de retorno de cada Server
  Action (de "uma mensagem" pra "mapa de erros por campo") em pelo
  menos 3 arquivos de `actions.ts`, além dos schemas Zod — mudança de
  escopo maior que o que este stage pede, e a própria Seção 44 permite
  explicitamente manter o alerta geral quando esse não é o caso.
  Registrado como pendência.
- **Helper text** — nenhum campo destes formulários tinha ambiguidade
  suficiente pra justificar um texto de ajuda (regra 45: "não preencher
  tela com explicações óbvias"). `FormSection` já ganhou suporte a
  `description` (usado nas duas seções de Cobrança) — a peça que
  faltava não era o componente, era um lugar genuinamente confuso pra
  usar.
- **Submit state** (Seção 46) — já estava correto em todo o produto
  (`Salvando...`/`Cadastrando...`) antes deste stage; nada a mudar.

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros.
- `npm run build` — build de produção limpo.
- **Validação visual real**: as 3 telas renderizadas em 1440×900 com
  as seções visivelmente separadas (título + descrição opcional acima
  de cada grupo de campos); cobrança também conferida em 390×844.
- **Teste funcional real, não só visual**: submissão de fato do
  formulário de edição de empresa (clique em "Salvar alterações", sem
  alterar valores) — confirmado que o `<fieldset>` do `FormSection`
  não interfere na coleta do `FormData` pelo Server Action; página
  recarregou com os mesmos dados, sem erro.
- `npx playwright test e2e/rls-visibility.spec.ts e2e/mobile-navigation.spec.ts e2e/dashboard-cockpit.spec.ts`
  — 13/13 passando.

## Pendências

- Erro por campo (ver acima) — mudança de contrato de Server Action,
  fora do escopo deste stage.
- Outros formulários do produto (negociação, instrumento, sindicato,
  cobrança nova) não foram revisados — aplicar `FormSection` neles é
  trabalho futuro se/quando esses formulários crescerem o suficiente
  pra justificar.

## Riscos residuais

Nenhum novo — mudança puramente de agrupamento visual sobre campos já
existentes, com submissão real testada.

## Próximo stage

Stage 7 — Critical Flows: reduzir risco operacional em pagamento,
mudança de status e notificação usando `CriticalActionDialog` (Stage
1) com resumo antes/depois — sem alterar lógica.
