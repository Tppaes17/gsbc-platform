# GSBC — Resumo do Projeto e da Construção do SaaS

## O que é

O GSBC é uma plataforma SaaS de **inteligência, gestão, recuperação de
receitas e compliance para entidades sindicais**. Em termos de negócio: um
sindicato cadastra as empresas sob sua base territorial/categoria, vincula
os instrumentos coletivos (CCTs/ACTs) que regem essas empresas, e a GSBC
opera a cobrança das obrigações que nascem desses instrumentos — do
lançamento até a negociação, o pagamento e, quando necessário, a
notificação formal — com cada etapa registrada numa timeline auditável.

Mais recentemente (Rodadas 14–16), a plataforma ganhou uma camada de
**inteligência cadastral**: validação de CNPJ contra a Receita Federal,
enriquecimento de dados de contato via fontes web, e um módulo de
prospecção que permite à GSBC importar listas de empresas já pesquisadas
(ex.: exportações de provedores de dados B2B por CNAE) antes mesmo de
decidir formalmente atuar sob um sindicato específico.

## Como foi construído

O projeto partiu de um diretório **completamente vazio** — sem
repositório, sem código, sem stack decidida — e foi construído a partir de
um "prompt-mestre": um documento de especificação extenso (dezenas de
seções e regras de negócio numeradas) fornecido pelo usuário, cobrindo
desde o modelo de dados até regras de conduta para o desenvolvimento em si
(ex.: "nunca inventar dado", "toda mudança de status gera um evento",
"RLS é a autoridade final de isolamento, nunca o frontend").

A construção seguiu um método de **rodadas incrementais**: cada rodada
entrega um pedaço funcional e verificado do sistema — nunca um esqueleto
ou mockup —, é testada de ponta a ponta antes de ser declarada concluída
(login real, dado real, no caso de bug real corrigido durante a própria
verificação, não hipotético), e termina com um documento (`docs/rodadas/
rodada-NN.md`) registrando objetivo, decisões, arquivos alterados, testes
realizados e pendências para a próxima rodada. Isso criou uma trilha
auditável de **por que** cada decisão foi tomada, não só o quê — inclusive
decisões estruturais (multi-tenancy, RBAC, escolha de plataforma) foram
confirmadas explicitamente com o usuário antes de codificar, nunca
assumidas.

## Stack técnica

| Camada | Escolha |
|---|---|
| Frontend | Next.js 16 (App Router, Server Actions, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui sobre Base UI, Lucide Icons |
| Dados / Auth / Storage | Supabase (PostgreSQL gerenciado + Auth + Storage), `@supabase/ssr` |
| Autorização | Row Level Security nativo do Postgres — nunca filtro de frontend |
| Formulários / validação | React Hook Form + Zod |
| Dados assíncronos | TanStack Query + TanStack Table |
| Gráficos | Recharts |
| Hospedagem alvo | Vercel (frontend) + Supabase Cloud (dados) — ainda não implantado |

## As três decisões arquiteturais fundamentais

Registradas como ADRs (`docs/architecture/`), tomadas na Rodada 1 e
válidas até hoje:

1. **Multi-tenancy por RLS, banco compartilhado** ([ADR-001](docs/architecture/ADR-001-multi-tenancy.md)) —
   isolamento entre sindicatos garantido por Row Level Security do
   Postgres, não por schema ou banco separado por cliente. `tenants.type`
   distingue a própria GSBC (`platform`, singleton) de cada sindicato
   (`sindicato`); a equipe GSBC é modelada como membership no tenant
   `platform`, reaproveitando o mesmo modelo de autorização em vez de um
   sistema paralelo para staff interno.
2. **Supabase como plataforma de dados completa** ([ADR-002](docs/architecture/ADR-002-supabase-platform.md)) —
   Postgres gerenciado, Auth via cookies HTTP-only, Storage para
   documentos, tudo sob um único provedor em vez de montar Auth/RLS/refresh
   de sessão manualmente sobre Postgres self-hosted.
3. **RBAC via `User → Membership → Tenant → Role → Permissions`** ([ADR-003](docs/architecture/ADR-003-autorizacao-rbac.md)) —
   deliberadamente sem campo `role` fixo em `users`, para permitir que a
   mesma pessoa tenha papéis diferentes em tenants diferentes. Aplicado em
   duas camadas: RLS no Postgres (autoridade final) e helpers em
   `src/lib/auth/session.ts` (só para UI — nunca o único controle numa
   mutação sensível).

## Linha do tempo — o que cada rodada entregou

**Fase 1 — Diagnóstico e fundação**
- **Rodada 0**: diagnóstico do projeto (vazio) e confirmação das três
  decisões estruturais acima antes de escrever qualquer código.
- **Rodada 1**: fundação SaaS completa — autenticação, tenants, usuários,
  papéis/permissões, RLS, auditoria, design system e a entidade
  sindicatos.

**Fase 2 — A cadeia de negócio central**
Cada rodada fechou um elo da cadeia `Sindicato → Empresa → Instrumento →
Cláusula → Obrigação → Cobrança → Negociação → Financeiro`, sempre com
placeholders honestos (nunca telas mockadas) para as seções ainda não
construídas:
- **Rodada 2**: cadastro real de sindicato e fluxo de convite/onboarding
  de usuários.
- **Rodada 3**: ficha 360º da empresa (dados cadastrais e contatos).
- **Rodada 4**: instrumentos coletivos (CCT/ACT), cláusulas e as
  obrigações que delas nascem.
- **Rodada 5**: cobranças — status não-histórico (toda mudança gera um
  evento) e timeline.
- **Rodada 7**: negociações — propostas, contrapropostas e desfecho de
  uma cobrança.
- **Rodada 8**: financeiro — pagamentos, vencimentos e inadimplência.
- **Rodada 9**: timeline consolidada da ficha 360º, unificando
  obrigações, cobrança, negociação e pagamentos num único feed.

**Fase 3 — Porta de entrada pública**
- **Rodada 6**: site institucional público — apresentação da GSBC,
  captura de leads de diagnóstico e caminho até o login da plataforma.

**Fase 4 — Documentos e comunicação**
- **Rodada 10**: upload, listagem e download de documentos por empresa.
- **Rodada 11**: notificações por e-mail — pendência mais antiga do
  projeto, desbloqueada quando se descobriu que o SMTP local (Inbucket)
  já subia junto com o resto do stack sem custo adicional.

**Fase 5 — Qualidade**
- **Rodada 12**: suíte de testes automatizados (Playwright) sobre o
  fluxo completo, para não depender só de verificação manual daí em
  diante.
- **Rodada 13**: correção de uma regra de negócio pendente desde a
  Rodada 8 — qual valor considerar "quitado" quando uma negociação é
  aceita por um valor menor que o original.

**Fase 6 — Agente autônomo de inteligência cadastral**
A partir de um segundo prompt-mestre (41 seções), focado em pesquisa
cadastral, localização empresarial e cobrança automatizada — implementado
em fases deliberadamente menores que o documento original, com decisões
de escopo confirmadas com o usuário a cada passo (nunca builtado "no
escuro"):
- **Rodada 14 — Fase 1**: consulta oficial de CNPJ (BrasilAPI/Receita
  Federal), dossiê com evidências estruturadas e score de confiabilidade,
  restrito a um papel "Owner" (mapeado ao `gsbc_super_admin` existente).
- **Rodada 15 — Fase 2**: enriquecimento web (site, e-mails, telefone,
  decisores, LinkedIn) via LeadCNPJ, com o score de confiabilidade
  completo somando as duas fontes.
- **Rodada 16**: módulo de **prospectos** — upload de planilhas de
  pesquisa já realizada (template extraído de duas planilhas reais
  fornecidas pelo usuário), gerando dossiês sem empresa/sindicato
  vinculado ainda, reaproveitando toda a máquina de score/evidências das
  Rodadas 14–15 em vez de duplicá-la.

## O que existe hoje (módulos do backoffice)

Visão Geral · Sindicatos · Empresas · **Prospectos** (Owner) · Instrumentos
· Cobranças · Negociações · Financeiro · Usuários · Auditoria — mais o
site institucional público e o portal de login. Cada módulo tem RLS
aplicado no banco, não só controle de UI.

## Disciplina seguida ao longo de todas as rodadas

- **RLS é a autoridade final** — toda tabela sensível tem Row Level
  Security; a UI só reflete o que o banco já impõe, nunca o contrário.
- **Timeline imutável** — mudanças de status não sobrescrevem o registro
  anterior; geram um novo evento (cobranças, negociações, evidências de
  dossiê, importações de planilha).
- **Nunca inventar dado** — quando uma fonte não confirma uma informação,
  isso é registrado como ausência de informação, não preenchido com um
  palpite.
- **Placeholders honestos, nunca mockups** — uma seção ainda não
  implementada aparece como tal explicitamente, nunca como uma tela que
  parece funcional mas não é.
- **Verificação real antes de declarar concluído** — login de verdade,
  dado de verdade, suíte Playwright rodando; várias rodadas encontraram e
  corrigiram bugs reais durante essa verificação (não hipotéticos).
- **Decisões estruturais sempre confirmadas com o usuário** antes de
  codificar — nunca assumidas unilateralmente quando envolvem escolha de
  negócio ou arquitetura.

## Pendências em aberto

- **Deploy em produção** (Vercel + Supabase Cloud) — recomendado desde a
  Rodada 13 como a ação de maior alavancagem geral do projeto; ainda não
  feito, o sistema roda só localmente.
- **Chave de API da LeadCNPJ** — o enriquecimento web (Rodada 15) está
  implementado mas nunca foi calibrado contra uma resposta real da API.
- **Cobrança e recobrança automatizada por e-mail** e **notificação
  extrajudicial** — os pontos 2 e 3 do agente autônomo, ainda não
  iniciados (o ponto 1, enriquecimento web, foi a Rodada 15).
- **"Promover prospecto a empresa"** — hoje um prospecto validado precisa
  ser recriado manualmente como empresa; não construído por não ter sido
  pedido explicitamente.

---
*Gerado a partir do histórico real do projeto (`docs/rodadas/`,
`docs/architecture/`) — não uma descrição hipotética.*
