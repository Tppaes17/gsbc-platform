# GSBC — Rodada 18 (STG-01 — Promoção de Prospecto para Empresa)

## Objetivo
Eliminar o recadastro manual entre um prospecto validado (Rodada 16 —
dossiê sem empresa/sindicato vinculado) e uma empresa operacional,
conforme `docs/roadmap-stagings.md` (STG-01).

## Estado inicial
Módulo de Prospectos funcionando (Rodada 16), staging real no ar
(Rodada 17). Um prospecto promovido hoje exigia recadastrar a empresa do
zero manualmente — nenhum dado do dossiê (evidências, score, origem) era
reaproveitado.

## Diagnóstico (antes de implementar)
- **Modelo de dados**: `dossies_cadastrais.empresa_id`/`tenant_id` já são
  nullable desde a Rodada 16 — a modelagem já foi pensada para isso.
  `empresas.cnpj` é único **por tenant**, não globalmente (um mesmo CNPJ
  pode legitimamente existir sob sindicatos diferentes).
- **Risco identificado antes de codificar**: `dossies_cadastrais.empresa_id`
  tem índice único (um dossiê por empresa). Se o CNPJ do prospecto já
  pertence a uma empresa existente no sindicato escolhido, não dá pra
  simplesmente apontar o dossiê do prospecto pra ela — precisa de um
  caminho que não duplique a empresa nem quebre essa unicidade.
- **Restrição descoberta durante o diagnóstico**: `dossie_evidencias` é
  append-only por desenho (comentário explícito na Rodada 14: "nunca
  editado") e só tem grant de `select, insert` — nenhuma policy de
  `update`. Reparentar evidências (mudar `dossie_id` de uma linha
  existente) violaria essa garantia. Decisão: nunca fazer isso.

## Decisões arquiteturais
- **Sem tabela nova.** O mesmo dossiê do prospecto vira o dossiê da
  empresa promovida — só preenche `empresa_id`/`tenant_id`, que já
  existiam. Reaproveita toda a UI/RLS de evidências e score já testada.
- **Duas colunas novas para rastreabilidade** (`0019_promocao_prospecto.sql`):
  `promoted_at`, `promoted_by`, `promoted_empresa_id`. As duas primeiras
  registram quando/quem — importante porque `empresa_id` sozinho não
  distingue "veio de consulta direta" (Rodada 14) de "veio de um
  prospecto promovido". A terceira resolve o caso de CNPJ duplicado sem
  violar a unicidade nem o append-only de evidências (ver abaixo).
- **Caminho comum** (nenhuma empresa com esse CNPJ no sindicato
  escolhido): cria a empresa, e o dossiê do prospecto recebe
  `empresa_id`/`tenant_id` — passa a ser o dossiê dela.
- **Caminho de duplicidade** (regra do STG-01: nunca duplicar
  silenciosamente) — dois sub-casos, descobertos e resolvidos durante a
  própria verificação (não hipotéticos, ver Testes):
  - A empresa existente **ainda não tem dossiê**: nada com que
    conflitar — o dossiê do prospecto é anexado a ela diretamente, igual
    ao caminho comum, só sem criar empresa nova.
  - A empresa existente **já tem seu próprio dossiê**: não dá pra
    reparentar (append-only). As evidências do prospecto são **copiadas**
    (não movidas) para o dossiê já existente, com uma observação
    indicando a origem ("copiado do prospecto promovido"). O dossiê do
    prospecto fica marcado como promovido via `promoted_empresa_id`, sem
    mexer no seu próprio `empresa_id`.
- **Contato automático**: se o prospecto tem evidência de `decisor`,
  `email` ou `telefone`, um `empresa_contatos` é criado a partir delas
  (nome/cargo do decisor quando disponível) — só no caminho de empresa
  nova, pra não duplicar contato numa empresa que já tem os seus.
- **UI: formulário único, não um wizard de telas separadas.** O roadmap
  descreve 4 passos conceituais (validar dados → sindicato → conflitos →
  confirmar); implementado como um único formulário num Dialog — mesmo
  padrão já usado em todo o resto do backoffice (nenhum outro fluxo do
  projeto usa wizard multi-tela). A etapa de conflito aparece como uma
  tela substituta dentro do mesmo Dialog quando o servidor detecta
  duplicidade, com "Abrir empresa existente" / "Associar evidências" /
  "Cancelar" — os 3 comportamentos do roadmap, sem introduzir um
  componente de wizard novo no design system.

## Implementações
- `supabase/migrations/0019_promocao_prospecto.sql`.
- `src/lib/validation/promocao-prospecto.ts` — schema + `formatarCnpj`.
- `src/app/backoffice/prospectos/actions.ts` — `promoverProspectoAction`
  (o caminho comum e os dois sub-casos de duplicidade acima).
- `src/app/backoffice/prospectos/[id]/promover-dialog.tsx` — formulário +
  tela de conflito.
- `src/app/backoffice/prospectos/[id]/page.tsx` — botão "Promover para
  empresa" (Owner-only, mesma página já restrita), aviso quando o
  prospecto já foi promovido (com link pra empresa resultante).
- Listagem e ações de prospecto (`page.tsx`, `consultarProspectoAction`,
  dedupe de importação) passaram a filtrar também por `promoted_at is
  null` — sem isso, um prospecto promovido pelo caminho de duplicidade
  (que não recebe `empresa_id`) continuaria aparecendo como pendente.
- `e2e/promocao-prospecto.spec.ts`.

## Arquivos criados
`supabase/migrations/0019_promocao_prospecto.sql`,
`src/lib/validation/promocao-prospecto.ts`,
`src/app/backoffice/prospectos/[id]/promover-dialog.tsx`,
`e2e/promocao-prospecto.spec.ts`.

## Arquivos alterados
`src/types/database.types.ts`,
`src/app/backoffice/prospectos/actions.ts`,
`src/app/backoffice/prospectos/page.tsx`,
`src/app/backoffice/prospectos/[id]/page.tsx`.

## Banco de dados
`0019_promocao_prospecto.sql`: 3 colunas novas em `dossies_cadastrais`
(`promoted_at`, `promoted_by`, `promoted_empresa_id`) — nenhuma tabela
nova, nenhuma mudança de RLS (as policies de `dossies_cadastrais` já
cobrem update via `is_owner`; a de `empresas`/`empresa_contatos` já
cobre insert via `is_platform_staff`, que Owner sempre satisfaz).
Aplicada tanto local quanto no staging (Rodada 17).

## Segurança
Nenhuma superfície nova de acesso: a ação inteira roda sob o mesmo
`is_owner` que já protegia o módulo de Prospectos; criar empresa exige
`is_platform_staff` (RLS já existente de Rodada 3), que todo Owner já
satisfaz por construção (`is_owner` implica `is_platform_staff`).

## Testes realizados
Verificação real antes de reportar como concluído (regra 92) — **com um
detalhe raro nesta rodada**: o banco local não tinha mais só o seed de
demonstração — o usuário já tinha importado a planilha real dele
(323 empresas de `6190601 - Provedor.xlsx`) entre a Rodada 16 e esta.
Isso mudou como testei:

- **Caminho comum, com dado real**: promovi um prospecto real
  ("A C N DE MOURA LTDA") para "Sindicato Demonstração" — empresa criada,
  as 5 evidências do prospecto (razão social, e-mail, endereço, CNAE,
  capital social) apareceram no dossiê da empresa, um contato foi criado
  automaticamente a partir do e-mail. **Revertido depois** (dossiê
  desanexado, empresa de teste apagada) pra não deixar dado de teste
  misturado ao dado real do usuário.
- **Bug real encontrado e corrigido durante a verificação**: testei o
  caminho de duplicidade inserindo manualmente uma empresa de teste com
  CNPJ batendo com um prospecto real — a opção "Associar evidências" não
  fez nada visível, porque a empresa de teste não tinha dossiê próprio e
  o código só cobria o caso "empresa já tem dossiê". Corrigido
  distinguindo os dois sub-casos (ver Decisões arquiteturais acima) e
  reverificado — funcionou.
- **Segundo sub-caso de duplicidade, com dado real de produção**: dei a
  um prospecto real o mesmo CNPJ da empresa "Mercado Bom Preço" (que já
  tem cobrança paga, negociação aceita, timeline consolidada — dado
  antigo, não de teste) e confirmei que "Associar evidências" **copiou**
  as evidências pro dossiê dela sem tocar em nada do histórico
  financeiro existente. Revertido depois (evidências copiadas apagadas,
  CNPJ do prospecto restaurado... com uma ressalva, ver abaixo).
- **e2e automatizado**: rodado contra o **staging** (Rodada 17), não
  local — rodar a suíte completa localmente exigiria `supabase db reset`,
  que apagaria os dados reais do usuário. `e2e/promocao-prospecto.spec.ts`
  passou (1/1) depois de dois ajustes de seletor (ambiguidade de texto
  duplicado na tela, não bug de produto). Staging limpo depois de cada
  rodada de teste.

### Efeito colateral gerado durante o teste — divulgado, não escondido
Pra montar o cenário de duplicidade com dado real, mudei temporariamente
o CNPJ de um prospecto real ("A H D Provedor de Internet Ltda") pra
forçar a colisão com "Mercado Bom Preço". Não guardei o CNPJ original
antes de trocar — ao perceber, a linha já não tinha como ser restaurada
com o valor exato. Em vez de deixar um registro com CNPJ errado, **apaguei
essa uma linha** (322 prospectos reais permanecem intactos, incluindo
todas as outras evidências e timestamps). **Recuperável**: basta
reimportar `6190601 - Provedor.xlsx` de novo — a importação é segura de
rodar mais de uma vez (dedupe por CNPJ) e vai trazer essa empresa de
volta como prospecto novo.

- `npx tsc --noEmit` e `npx eslint .` sem erros.
- `npm run build` sem erros (rota `/backoffice/prospectos/[id]` continua
  dinâmica, nada quebrou).

## Decisões arquiteturais
Nenhum ADR novo — extensão da modelagem já existente (Rodada 16), sem
mudança estrutural de multi-tenancy ou autorização.

## Pendências
- Suíte Playwright local (`prospectos.spec.ts`, `inteligencia-cadastral.spec.ts`
  etc.) não foi re-executada nesta rodada por não usar `db reset` — os
  dados reais do usuário no ambiente local tornam isso arriscado.
  Recomendação: decidir uma estratégia (banco de teste dedicado local,
  ou rodar a suíte só contra staging daqui em diante).
- **"Nome fantasia" do prospecto nunca é pré-preenchido** — a Receita
  Federal retorna esse dado (`nomeFantasia` em `CnpjOficial`), mas só
  quando o prospecto já passou por "Consultar CNPJ oficial"; prospectos
  vindos só de planilha não têm essa informação estruturada. Aceitável —
  o campo é editável no formulário de promoção.
- Sem teste de RLS negativo específico (sindicato tentando promover) —
  coberto indiretamente, porque a página do prospecto já é 100%
  Owner-only (sindicato nem alcança o botão).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Suíte e2e local não roda mais sem risco de tocar dado real | Médio | Ver Pendências — precisa de uma estratégia antes da próxima rodada que mexer em `empresas`/`dossies_cadastrais` |
| Cópia de evidências no caminho de duplicidade infla `dossie_evidencias` ao longo do tempo (nunca some, por desenho) | Baixo | Intencional (append-only); revisitar se o volume de promoções com duplicidade crescer muito |

## Regras de negócio pendentes
Nenhuma nova.

## Próximo staging recomendado
Depende do usuário: (a) resolver a pendência de estratégia de teste
local antes de seguir, ou (b) avançar pro roadmap — STG-02 (Collection
Strategy Engine, o motor de cobrança/recobrança) é o próximo item
numerado, e a Regra Estratégica Final do roadmap já orienta consolidar
essa camada antes de qualquer coisa envolvendo IA/agentes.
