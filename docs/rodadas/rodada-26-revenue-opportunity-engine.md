# GSBC — Rodada 26 (STG-10 — Revenue Opportunity Engine)

## Objetivo
Identificar oportunidades de receita antes da cobrança — pipeline
Prospecto → Dados cadastrais → Fit territorial → Fit de atividade →
Instrumentos potenciais → Obrigações potenciais → Estimativa econômica
→ Confiança → Prioridade, terminando num Opportunity Score
determinístico e explicável (`docs/roadmap-stagings.md`, STG-10). Regra
explícita do roadmap: inferência nunca é obrigação jurídica confirmada;
sem Machine Learning nesta primeira versão ("primeiro acumular dados").

## Diagnóstico e decisões arquiteturais

### Reaproveitamento do precedente de score explicável já existente
`avaliarCnpj()` (Rodada 14, `src/lib/cnpj/avaliacao.ts`) já é
exatamente o padrão que o roadmap pede pro Opportunity Score: pontos
aditivos por sinal verificado, capados em 100, cada ponto pareado com
uma evidência/explicação legível. A explicabilidade nasce da própria
estrutura aditiva do cálculo — não é uma camada de "explicação"
construída depois por cima de um número opaco. `src/lib/oportunidades/scoring.ts`
segue o mesmo desenho: 7 dimensões (as "dimensões possíveis" listadas
literalmente no roadmap), cada uma com `pontos`/`pesoMaximo`/`explicacao`.

### Nenhum campo estruturado existe pra fit territorial/atividade —
### decisão confirmada com o usuário
`sindicatos.categoria`/`base_territorial` são texto livre (ex.: "Estado
de São Paulo"); `instrumentos`/`clausulas` não têm nenhum campo de
escopo territorial ou CNAE. Duas opções foram apresentadas: (a)
comparação por texto livre aproximada, sem dado novo pra preencher; (b)
exigir campos estruturados novos em `sindicatos` antes do engine
funcionar com precisão. O usuário confirmou (a) — decisão também
alinhada com "não pular etapas": estruturar escopo territorial/CNAE de
sindicato é natureza de **Policy Engine** (STG-11, a próxima etapa do
roadmap), não deste estágio. `calcularFitTerritorial()`/`calcularFitAtividade()`
comparam UF (com um mapa de 27 nomes de estado) e tokens do CNAE contra
o texto livre — sempre rotulado como aproximação na própria explicação
gerada ("comparação por texto livre, aproximada").

### Estimativa econômica: média histórica real, nunca um número
### inventado
Segunda decisão confirmada com o usuário: `potencial_economico` usa a
média de `obrigacoes.valor_referencia` já registradas pro tenant
candidato — dado real, nunca uma extrapolação de mercado inventada
(regra 5). Quando não há histórico (sindicato novo, sem obrigações
ainda), o campo fica explicitamente `null` com
`estimativa_metodologia` explicando o motivo — nunca um placeholder
tipo R$0,00 que pareceria um valor real. Verificado ao vivo: R$1.675,00
calculado bateu exatamente com `avg(valor_referencia)` das 2 obrigações
reais do Sindicato Demonstração, conferido por query direta.

### RLS direta (Prospectos), não funil de RPCs (Escalonamentos) —
### decisão deliberada, não inconsistência
A Rodada 25 (Escalonamentos) exigiu funil de RPCs `security definer`
porque havia um papel MAIS ESTREITO (Jurídico) que precisava ser
protegido contra um papel mais amplo (staff qualquer) com policy de
escrita genérica. Aqui não existe essa lacuna: **Owner já é o papel
mais restrito do sistema** — não há ninguém "mais amplo" de quem
proteger a escrita. Por isso as 3 tabelas novas seguem o padrão de
`dossies_cadastrais`/`dossie_evidencias` (Rodada 14): RLS direta com
`is_owner(auth.uid())`, sem RPC. Verificado ao vivo, os dois níveis que
importam aqui: (1) app já redireciona não-Owner pra `/backoffice`; (2)
simulação de JWT de sindicato (`set local request.jwt.claims`) mostrou
`select count(*) from oportunidades` retornando 0 linhas e um `update`
direto afetando 0 linhas — RLS é a autoridade de verdade, não só o
redirect da UI.

### Terceiro sistema de "prioridade" nunca é decisão automática
O score é sempre uma sugestão — `validar`/`descartar` exige
justificativa humana explícita (mesmo padrão de
`decidir_aprovacao`/`registrar_resultado`, Rodada 25), nunca dispara
automaticamente de um threshold de score. O texto do diálogo de decisão
cita a regra 8 explicitamente ("IA não tem autoridade"). Reavaliação
(recalcular o score) é bloqueada uma vez que a decisão é terminal
(`validada`/`descartada`) — reavaliar não pode silenciosamente mudar um
número por trás de uma decisão já tomada.

## Implementações
- `src/lib/oportunidades/scoring.ts` — `escolherCandidato()` (fit
  territorial/atividade contra todos os sindicatos, sem acesso a
  banco) + `calcularScoreOportunidade()` (7 dimensões, score final,
  prioridade/confiança derivadas).
- `src/app/backoffice/prospectos/oportunidade-actions.ts` — 3 Server
  Actions (`avaliarOportunidadeAction`, `iniciarAnaliseOportunidadeAction`,
  `decidirOportunidadeAction`), reaproveitando o padrão de
  `consultarProspectoAction` (Rodada 14).
- `src/app/backoffice/prospectos/[id]/oportunidade-section.tsx` — UI na
  ficha do prospecto: score/prioridade/confiança, sindicato candidato,
  estimativa econômica, instrumentos potenciais, breakdown por
  dimensão (barra + explicação), histórico.
- "Prioridade (oportunidade)" — nova coluna na lista de Prospectos, pra
  triagem sem precisar abrir cada ficha.
- `e2e/oportunidades.spec.ts`.

## Arquivos criados
`supabase/migrations/0026_revenue_opportunity_engine.sql`,
`src/lib/oportunidades/scoring.ts`,
`src/app/backoffice/prospectos/oportunidade-actions.ts`,
`src/app/backoffice/prospectos/[id]/oportunidade-section.tsx`,
`e2e/oportunidades.spec.ts`.

## Arquivos alterados
`src/types/database.types.ts` (3 tabelas novas, editado à mão —
convenção já estabelecida), `src/app/backoffice/prospectos/[id]/page.tsx`,
`src/app/backoffice/prospectos/page.tsx`,
`src/app/backoffice/prospectos/prospectos-table.tsx`.

## Banco de dados
`0026_revenue_opportunity_engine.sql`: 3 tabelas novas
(`oportunidades`, `oportunidade_fatores`, `oportunidade_eventos`). RLS
restrita a `is_owner()` — mesmo gate de `dossies_cadastrais`. Sem
migration em `instrumentos`/`clausulas`/`sindicatos` (decisão
confirmada: sem campo estruturado novo nesta rodada).

## Segurança
- Módulo inteiro restrito a Owner (`gsbc_super_admin`) — mesma porta de
  Prospectos, sem RBAC novo (decisão confirmada com o usuário).
- RLS verificada como autoridade real, não só UI: simulação de JWT de
  sindicato retornou 0 linhas em `select` e 0 linhas afetadas em
  `update` direto na tabela.
- `candidatos_avaliados`/`instrumentos_potenciais` (jsonb) são
  snapshots derivados, recalculáveis — nunca fonte de verdade sobre
  vínculo real entre prospecto e sindicato.

## Testes realizados
Verificação real, ao vivo, local **e** staging (regra 92), com duas
fixtures construídas especificamente pra isso:

- **Fixture com fit forte** (empresa fictícia em SP, CNAE de comércio
  varejista, ligada ao Sindicato Demonstração — CNPJ/dados nunca
  reais): avaliação produziu score 85/100, cada dimensão conferida à
  mão contra o cálculo esperado — fit territorial 20/20 (UF "SP"
  encontrada em "Estado de São Paulo"), fit atividade 10/20 (50% de
  sobreposição de tokens, matematicamente correto pro texto usado),
  qualidade de evidências 5/10 (1 fonte), completude 15/15 (todos os 5
  campos presentes), potencial econômico 20/20 com estimativa de
  R$1.675,00 — **conferido por query direta batendo exatamente com a
  média real de 2 obrigações do Sindicato Demonstração**, recência 5/5,
  contato 10/10. Instrumento potencial (CCT 2026 real, `empresa_id`
  null) apareceu corretamente na lista.
- **Fixture sem dados oficiais** (prospecto só com razão social/CNPJ,
  igual ao perfil da maioria dos 322 prospectos reais importados por
  planilha): avaliação produziu 0/100 com explicação honesta e
  específica em cada uma das 7 dimensões ("Sem UF...", "Sem CNAE...",
  "Nenhuma evidência...") — nenhum dado inventado, nenhum crash.
- **Ciclo completo de status**: potencial → em análise → validada
  (com justificativa) na primeira fixture; potencial → descartada
  (direto, sem passar por em análise) na segunda — os dois caminhos de
  transição previstos no desenho. Após decisão terminal, botão
  "Reavaliar" corretamente some da UI.
- **RLS como autoridade real**: simulação de JWT do usuário sindicato
  (`dirigente.demo`) mostrou `select count(*) from oportunidades` = 0 e
  um `update` direto pra reverter o status afetando 0 linhas.
- **Lista de Prospectos**: coluna "Prioridade (oportunidade)" mostrou
  "Alta — 85/100" e "Baixa — 0/100" pras duas fixtures avaliadas, e
  "Não avaliado" corretamente pros demais prospectos reais (nenhum
  outro foi tocado).
- `npx tsc --noEmit`, `npx eslint .` (0 erros — 1 warning pré-existente
  não relacionado), `npm run build` sem erros.
- **Deploy em staging** (Vercel + Supabase Cloud): migration 0026
  aplicada via SQL Editor (acentuação verificada antes de rodar), 3
  tabelas confirmadas por query direta.
- **e2e automatizado** (`e2e/oportunidades.spec.ts`, 2 testes: seção
  aparece na ficha de um prospecto real, sindicato não acessa
  Prospectos) — 2/2 passando em staging. Suíte completa: 41/44
  passando — as mesmas 3 falhas pré-existentes já documentadas desde as
  Rodadas 21/22/23 (SMTP sem provider customizado, dados de prospectos
  não resetados entre runs), nenhuma nova.
- Fixtures de teste (2 dossiês, 1 evidência, 2 oportunidades com
  fatores/eventos em cascata) totalmente apagadas depois — 322
  prospectos reais, 2 empresas, 1 cobrança/pagamento real, 2 obrigações
  reais reverificados intactos por contagem após a limpeza (local).

### O que não foi testado ao vivo
- **Prospecto com múltiplos sindicatos candidatos ambos com fit > 0**:
  o ambiente demo só tem 1 sindicato ativo — a lógica de ranking
  (`candidatosAvaliados` ordenado por `combinado`) foi revisada por
  código mas não exercitada com mais de um candidato real.

## Pendências
- **Fit territorial/atividade por texto livre é uma aproximação
  deliberada** — pode errar (falso positivo/negativo) se o texto de
  `base_territorial`/`categoria` for muito diferente do padrão
  esperado. Estruturar isso com precisão é trabalho de STG-11 (Policy
  Engine), não desta rodada — decisão confirmada com o usuário.
- **Sem teste ao vivo com múltiplos sindicatos candidatos** — ver acima.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Fit territorial/atividade impreciso pra texto livre fora do padrão esperado | Baixo-médio | Sempre rotulado como aproximação na própria explicação; correção estrutural é escopo do STG-11 |
| Estimativa econômica indisponível pra sindicato sem histórico de obrigações | Esperado | Comportamento correto (regra 5) — melhora conforme mais obrigações reais forem registradas |
| Ranking de múltiplos candidatos não testado ao vivo | Baixo | Lógica simples (ordenação por score combinado), revisada por código |

## Regras de negócio pendentes
Nenhuma nova — as três decisões desta rodada (fit por texto livre,
estimativa via histórico real, módulo restrito a Owner) foram
confirmadas com o usuário antes de implementar.

## Próximo staging recomendado
STG-11 (Policy Engine) é o próximo item do roadmap — e, como notado
acima, é onde faria sentido estruturar territorialidade/CNAE de
sindicato com precisão, se isso vier a ser priorizado.
