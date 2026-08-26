# GSBC — Rodada 14

## Objetivo
Implementar a **Fase 1** do "Agente Autônomo de Inteligência Cadastral,
Localização Empresarial e Cobrança" (prompt-mestre fornecido pelo
usuário): consulta oficial de CNPJ, dossiê com evidências estruturadas e
score de confiabilidade — restrito a Owners.

## Escopo — por que só Fase 1
O prompt-mestre original descreve um sistema de 41 seções: pesquisa
cadastral, enriquecimento web (site/LinkedIn/contatos), envio automático
de cobrança por e-mail, recobrança em régua, monitoramento de respostas,
e preparação de notificação extrajudicial com gate jurídico. Isso é
grande demais para uma rodada — e parte depende de decisões e
credenciais que só o usuário tem. Perguntado diretamente, o usuário
decidiu:

1. **Escopo desta rodada**: só inteligência cadastral (leitura/validação),
   sem envio de cobrança, recobrança ou notificação extrajudicial.
2. **Enriquecimento web** (site, LinkedIn, e-mails corporativos): fora
   desta fase — exigiria uma API de busca paga (Google Custom Search,
   Bing, SerpAPI) que o usuário ainda não tem. Registrado como pendência
   explícita, não implementado com dados inventados.
3. **Disparo de cobrança** (quando chegarmos a essa fase): sempre com um
   Owner revisando e clicando — nunca agendamento autônomo sem
   supervisão. Consistente com o próprio gate jurídico que o prompt-mestre
   já exige para a notificação extrajudicial (regra 27 do prompt).
4. **Papel "Owner"**: mapeado ao papel `gsbc_super_admin` já existente no
   RBAC — sem papel novo nesta rodada.

## Implementações

### Fonte de dados: BrasilAPI (Receita Federal / Minha Receita)
Nível 1 da hierarquia de fontes do prompt-mestre — gratuita, pública, sem
credencial: `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, que
espelha dados oficiais da Receita Federal via o projeto Minha Receita
(razão social, situação cadastral, endereço, CNAE, QSA). Verificada
como real antes de integrar (não assumida).

- `src/lib/cnpj/brasil-api.ts`: cliente HTTP, normaliza a resposta bruta
  para um formato tipado. Trata três desfechos: `encontrado`,
  `nao_encontrado` (404 — CNPJ válido mas não cadastrado) e `erro`
  (inclui `400` — CNPJ com dígito verificador inválido — tratado à
  parte, com mensagem específica, em vez de um erro genérico).

### Owner (RBAC)
- `CurrentUser.isOwner`, calculado em `src/lib/auth/session.ts`:
  membership ativa no tenant `platform` com `roleCode === "gsbc_super_admin"`.
- `public.is_owner(uuid)`: espelho SQL da mesma regra, usado nas
  policies de RLS das duas tabelas novas.

### Dossiê e evidências
- `dossies_cadastrais`: um dossiê por empresa (reconsultas atualizam o
  mesmo registro — `upsert` por `empresa_id`). Guarda o snapshot da
  última consulta (`dados_oficiais`, `qsa`), `status`
  (`novo`/`cadastro_validado`/`conflito_identificado`/`revisao_cadastral`
  — subconjunto da máquina de 20 estados do prompt-mestre, só os que
  esta fase realmente usa), `score_confiabilidade` (0-100) e
  `score_classificacao`.
- `dossie_evidencias`: log imutável por campo pesquisado (regra 33 do
  prompt-mestre — `tipo`, `campo`, `valor`, `fonte`, `nivel_confianca`,
  `observacao`), reaproveitado também como fonte da timeline (nono reuso
  do componente `Timeline`).
- **Score desta fase é parcial, documentado como tal**: situação ativa
  (+40), razão social confere (+20), endereço confere (+15), CNAE
  confere (+10), QSA disponível (+15) = até 100. O score completo de 90+
  pontos do prompt-mestre (site oficial, e-mail, telefone, LinkedIn)
  depende de sinais que só existirão na Fase 2 (enriquecimento web) —
  não fabriquei pontos para sinais que não verificamos.
- **Conflitos são destacados, nunca escolhidos silenciosamente** (regra 4
  do prompt-mestre): quando o cadastro GSBC diverge do oficial (razão
  social, endereço, CNAE), a UI mostra os dois valores lado a lado numa
  seção "Conflitos identificados" e a badge fica `conflitante`, não uma
  escolha automática de qual versão é a verdadeira.
- CNPJ inativo na Receita: registrado como evidência `confirmado` (o
  fato da situação, seja qual for, é confirmado pela fonte oficial), com
  observação explícita de que é um **indício**, não uma conclusão de
  irregularidade (regra 23 do prompt-mestre).

### UI
- Ficha 360º da empresa: card "Inteligência cadastral" — só renderiza se
  `user.isOwner`; botão "Consultar CNPJ oficial" dispara a consulta.

### Auditoria
`dossie_cadastral.consultado` via `log_audit_event`, com o resultado
(encontrado/não encontrado) e o score quando aplicável.

## Arquivos criados
`supabase/migrations/0016_inteligencia_cadastral.sql`,
`src/lib/cnpj/brasil-api.ts`, `src/lib/validation/dossie-cadastral.ts`,
`src/app/backoffice/empresas/[id]/{dossie-actions.ts,
dossie-cadastral-section.tsx}`, `e2e/inteligencia-cadastral.spec.ts`.

## Arquivos alterados
`src/types/domain.ts` (`CurrentUser.isOwner`),
`src/lib/auth/session.ts`, `src/types/database.types.ts`,
`src/app/backoffice/empresas/[id]/page.tsx`, `e2e/README.md`.

## Banco de dados
`0016_inteligencia_cadastral.sql`: função `is_owner`, tabelas
`dossies_cadastrais` e `dossie_evidencias`, RLS restrita a Owners
(nenhum outro papel — nem o resto da equipe GSBC — tem acesso), grants.

## Segurança
Módulo restrito de ponta a ponta: UI só renderiza para `isOwner`, e a
RLS das duas tabelas exige `is_owner(auth.uid())` tanto para leitura
quanto para escrita — mesmo que alguém contornasse a UI, a policy do
banco bloqueia. Nenhuma credencial de terceiro é usada (BrasilAPI é
pública, sem chave).

## Testes realizados
Verificação real, com chamada de verdade à BrasilAPI, antes de reportar
como concluído (regra 92) — incluindo dois problemas reais encontrados e
corrigidos durante a própria verificação, não hipotéticos:

- **Bug real #1 — BrasilAPI bloqueava com 403**: a primeira tentativa
  contra o CNPJ falhava com HTTP 403. Descoberto que a API exige um
  header `User-Agent` (o próprio exemplo de uso da documentação já
  mostrava isso) — corrigido enviando um User-Agent identificando a
  aplicação.
- **CNPJ de demonstração é inválido de propósito**: os CNPJs do seed
  (`11.222.333/0001-44` etc.) não passam na validação de dígito
  verificador da Receita — são fictícios, nunca foram pensados para
  bater num CNPJ real. Testei esse caminho e confirmei que a UI mostra
  "CNPJ inválido — não passa na validação de dígito verificador.", não
  um erro genérico.
- **Teste do caminho feliz com dado real**: troquei temporariamente (via
  `psql`, direto no banco local, sem passar pela UI) o CNPJ da empresa
  de demonstração para um CNPJ real e ativo (Ministério da
  Fazenda/Receita Federal) só para provar a consulta + comparação +
  score de ponta a ponta — **os três conflitos apareceram corretamente**
  (razão social, endereço, CNAE todos diferentes, como esperado, já que
  é uma empresa fictícia "Mercado Bom Preço" comparada a um órgão
  público real), score calculado em 40/100 (só a situação ativa bateu),
  status "Conflito identificado". Revertido o CNPJ e apagado o dossiê de
  teste depois, para não deixar dado real de terceiro misturado ao seed
  fictício.
- Login como Dirigente do Sindicato Demonstração: confirmei que a seção
  "Inteligência cadastral" **não aparece de forma nenhuma** — nem o
  card, nem o botão.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.
- Suíte Playwright completa: **16/16 passando** (2 specs novas de
  visibilidade Owner-only).
- Docker Desktop caiu no meio da rodada (falha de infraestrutura local,
  não do código) — reiniciado, stack recuperado, sem perda de dados
  (backup automático do `supabase db reset`).

## Decisões arquiteturais
Nenhum ADR novo — extensão do padrão de RLS/RBAC já documentado
(ADR-003), com um papel adicional derivado (`is_owner`) em vez de uma
mudança estrutural.

## Pendências
- **Fase 2 — Enriquecimento web** (site institucional, LinkedIn,
  e-mails/telefones corporativos, contatos por cargo): bloqueada até o
  usuário decidir/contratar um provedor de busca (Google Custom Search,
  Bing, SerpAPI ou similar) — nenhuma credencial existe hoje.
- **Fase 3 — Cobrança e recobrança automatizada**: decisão já tomada
  (disparo sempre com clique de um Owner, nunca agendamento autônomo),
  mas não implementada nesta rodada. Dependeria também do site
  institucional/plataforma estar em produção para um fluxo de
  agendamento fazer sentido (hoje só roda localmente).
- **Fase 4 — Notificação extrajudicial**: o prompt-mestre já exige um
  gate jurídico explícito (preparar → revisão jurídica → aprovação →
  envio) — não implementado; quando chegar a essa fase, o fluxo de
  aprovação humana precisa ser desenhado com o mesmo cuidado.
- Sem reenvio/atualização em lote (um dossiê por vez, via botão manual
  na ficha da empresa) — aceitável para o volume atual.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Score desta fase é parcial (só 5 sinais, não os ~7 do prompt completo) | Baixo | Documentado explicitamente como "Fase 1" na própria UI e no código — não se apresenta como o score final |
| BrasilAPI é um serviço de terceiro sem SLA formal | Baixo | Fonte gratuita e amplamente usada; se ficar instável, a ação já trata erro de conexão sem quebrar a página |
| Comparação de endereço só usa cidade/UF, não logradouro completo | Baixo | Comparar logradouro literal seria frágil (abreviações, formatação) — decisão deliberada de comparar só o que é robusto |

## Regras de negócio pendentes
Nenhuma nova — as decisões de escopo desta rodada já foram resolvidas
diretamente com o usuário (ver seção "Escopo" acima).

## Próxima rodada recomendada
Depende da prioridade do usuário: (a) Fase 2 do agente (enriquecimento
web, assim que houver uma API de busca), ou (b) deploy em produção
(Supabase Cloud + Vercel), que segue como a recomendação de maior
alavancagem geral do projeto desde a Rodada 13.
