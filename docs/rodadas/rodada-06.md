# GSBC — Rodada 6

## Objetivo
Site institucional público (regras 82–84): a plataforma SaaS (Rodadas 1–5)
precisava de uma porta de entrada pública para apresentar a GSBC a
sindicatos ainda não parceiros, coletar leads de diagnóstico e levar ao
login da plataforma — hoje "/" apenas redirecionava direto para `/login`.

Direcionamento explícito do usuário: seguir automaticamente até um MVP,
usando o material da apresentação institucional (PPTX) e a logo enviada
como fonte de conteúdo e identidade visual.

## Estado inicial
Rodadas 1–5 funcionando e testadas (fundação, sindicatos, empresas,
instrumentos/obrigações, cobranças). `/` redirecionava para `/login` com um
comentário explícito de que o site institucional estava fora do escopo
priorizado até então.

## Fonte de conteúdo e decisões de marca
- **Conteúdo**: extraído do PPTX institucional fornecido (9 slides —
  quem somos, desafio, soluções, como funciona a parceria, tecnologia,
  roadmap, por que ser parceiro, CTA de fechamento) via `markitdown`
  (LibreOffice/`soffice` não está instalado nesta máquina, então a
  inspeção visual do deck foi feita via grep direto do XML das cores em
  `ppt/slides/slide*.xml`, não pelo grid de thumbnails).
- **Paleta**: as cores reais usadas nos slides (não o tema padrão do
  Office, que o deck não usa) são navy `#304755`/`#112836`, gelo
  `#CAD6DE`, teal `#0A988B`/`#08786D` — sem dourado. A logo enviada pelo
  usuário é navy + dourado. **Decisão**: navy/gelo/teal do deck formam a
  paleta estrutural do site (fundos, texto, ícones); o dourado da logo
  fica reservado como cor de destaque única para CTAs — assim a
  identidade da marca (logo) fica visível sem descartar a paleta real da
  apresentação. Tokens em [globals.css](../../src/app/globals.css)
  (`--color-brand-*`).
- **Logo**: o arquivo original (imagem colada no chat) não ficou
  persistido em disco em nenhum local acessível a esta sessão — busquei em
  `/tmp`, pastas de cache do app e Downloads/Desktop recentes, sem
  encontrar o arquivo. Reconstruí uma marca gráfica original consistente
  com a mesma paleta (navy + dourado) em
  [logo.tsx](../../src/components/site/logo.tsx), documentado no próprio
  código como reconstrução, não reprodução pixel a pixel. **Pendência**:
  se o arquivo original (PNG/SVG) for enviado como arquivo (não colado no
  chat), substituir diretamente.
- **Dados de contato do deck são placeholders** (`+55 (XX) XXXXX-XXXX`) —
  por regra 84, não foram publicados como se fossem reais. O site usa
  apenas o e-mail `contato@gsbc.com.br` e o formulário de contato/
  diagnóstico como canais.

## Implementações

### Site institucional (`src/app/(site)/`)
Route group separado do `/backoffice` e `/login`, com layout próprio
(header sticky + footer, sem sidebar da plataforma):
- `/` — hero, estatísticas do roadmap, desafios (slide 3), soluções
  (slide 4), tecnologia (slide 6), por que ser parceiro (slide 8), CTA
  final (slide 9).
- `/solucoes` — as 6 soluções detalhadas.
- `/como-funciona` — fluxo de 6 etapas da parceria (slide 5), com
  encaminhamento judicial explicitamente como último recurso.
- `/tecnologia` — módulos da plataforma, com estatística real (30–40% de
  redução operacional) vinda do deck.
- `/beneficios` — detalhamento da gestão de benefícios.
- `/compliance` — isolamento de dados, RBAC e trilha de auditoria
  descritos como arquitetura real da plataforma (não como selo/
  certificação — nenhuma certificação foi inventada).
- `/sobre` — quem somos, valores, roadmap de 3 anos (slide 7).
- `/diagnostico` e `/contato` — formulário de captação de lead, funcional
  de ponta a ponta (ver abaixo), não decorativo.

### Componentes novos
`src/components/site/{logo,site-header,site-footer,nav-items,ui,lead-form}.tsx`
— header responsivo (menu mobile com estado próprio), footer, primitivas
de seção (`Container`, `SectionHeading`, `FeatureCard`, `StatCard`,
`IconCircle`) reaproveitadas em todas as páginas para consistência visual.
`Textarea` adicionado a `src/components/ui/` (faltava no design system).

### Captação de lead — funcional, não mockada
- `site_leads` (`supabase/migrations/0010_site_leads.sql`): tabela fora do
  modelo multi-tenant (não existe tenant antes da parceria começar).
  Policy de INSERT liberada para `anon`/`authenticated` (formulário
  público); SELECT/UPDATE restritos à equipe GSBC
  (`is_platform_staff`), mesmo padrão de grants explícitos das rodadas
  anteriores.
- `submitSiteLeadAction` ([actions.ts](../../src/app/(site)/actions.ts)) —
  valida com Zod e grava direto na tabela; sem e-mail/CRM real por trás
  (não existe módulo de notificações ainda — mesma pendência já registrada
  na Rodada 5), mas o dado é persistido de verdade.

## Auditoria
Não aplicável — leads de site público não passam por `log_audit_event`
(não há usuário autenticado nem tenant no momento da captação). A leitura
dos leads pela equipe GSBC ficará auditável quando a fila de atendimento
de leads for construída (fora do escopo desta rodada).

## Segurança
`site_leads_insert` usa `with check (true)` deliberadamente — é a única
tabela do sistema com escrita pública, porque representa a única
superfície pré-tenant da aplicação. Leitura permanece restrita à equipe
GSBC via `is_platform_staff`, o mesmo helper usado em todo o resto do
sistema.

## Testes realizados
Verificação real pelo navegador antes de reportar como concluído (regra
92), incluindo confirmação direta no banco (não apenas na UI):
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros (1 warning
  pré-existente no `data-table.tsx`, não relacionado a esta rodada).
- `supabase db reset` aplicando a migration 0010 sem erros.
- Home, `/diagnostico` e navegação renderizadas no preview; paleta,
  logo e layout responsivo (mobile 375px e desktop) conferidos
  visualmente, sem erros no console do navegador.
- Preenchi e enviei o formulário de diagnóstico como visitante anônimo
  pelo navegador; a UI mostrou a confirmação de sucesso **e** a linha
  apareceu de fato na tabela `site_leads` via `psql` direto no Postgres —
  não apenas uma mensagem de sucesso na tela.
- Menu mobile testado (abre/fecha, navega para as páginas do site).

## Decisões arquiteturais
Nenhum ADR novo — o site institucional não altera o modelo de
multi-tenancy, RBAC ou auditoria; `site_leads` é deliberadamente uma
tabela fora desse modelo, documentada acima e no próprio SQL.

## Pendências
- Logo real: aguardando o arquivo original (PNG/SVG) do usuário para
  substituir a reconstrução em `logo.tsx`.
- Fila de atendimento de leads para a equipe GSBC dentro do `/backoffice`
  (hoje os leads só existem na tabela — sem tela de acompanhamento).
- Notificação automática ao receber um lead (mesma pendência de
  notificações já registrada na Rodada 5 — módulo ainda não existe).
- Metadados de SEO/Open Graph por página (title/description já existem;
  falta imagem de compartilhamento).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Logo é uma reconstrução, não o arquivo original | Médio | Visualmente consistente com a paleta informada, mas não é pixel-a-pixel a arte enviada; trocar assim que o arquivo existir |
| `site_leads` sem tela de acompanhamento | Baixo | Dado já é real e consultável via SQL/Studio; tela dedicada é a próxima melhoria natural |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Rodada 7 — Negociações: propostas, contrapropostas e acordos vinculados a
uma cobrança (regras 26–27), como já indicado ao final da Rodada 5 —
retomada agora que o site institucional (exigência explícita do usuário)
está no ar.
