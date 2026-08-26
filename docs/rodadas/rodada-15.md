# GSBC — Rodada 15

## Objetivo
Ponto 1 da "próxima fase" do agente autônomo (Rodadas 14 pendências):
enriquecimento web — site institucional, e-mails corporativos, telefone,
redes sociais e decisores, complementando a consulta oficial de CNPJ da
Rodada 14 (Fase 1, só Receita Federal).

## Escolha da plataforma
Pesquisado com fontes atuais antes de recomendar (não da memória):
Bing Search API foi descontinuada em agosto de 2025, então busca
genérica (Serper/SerpAPI/Tavily) ficou fora — o prompt-mestre pede dados
estruturados por CNPJ (e-mail financeiro, RH, jurídico; decisores por
cargo), que uma busca genérica não entrega diretamente, exigindo mais
inferência e mais risco de alucinação. Escolhido **LeadCNPJ**
(leadcnpj.com.br): API nativa de CNPJ, preço público (R$289,90/mês por
5.000 consultas), complementa a BrasilAPI já integrada sem sobrepor.

## Estado inicial
Rodada 14 funcionando: consulta oficial de CNPJ (BrasilAPI/Receita
Federal), dossiê com evidências e score parcial (documentado como tal —
só 5 sinais, sem os sinais web do prompt original).

## Implementações

### Cliente LeadCNPJ
- `src/lib/cnpj/leadcnpj.ts`: `GET /empresa/{cnpj}?enriquecer=true`,
  autenticação Bearer via `LEADCNPJ_API_KEY`. **Construído sem chave de
  API disponível** — os nomes de campo (`enriquecimento.google.*`,
  `enriquecimento.website.*`, `enriquecimento.decisores`) vêm da
  documentação pública, não de uma resposta real testada (diferente da
  BrasilAPI na Rodada 14, que é gratuita e pôde ser testada na hora).
  Escrito defensivamente (várias variantes de caminho por campo) e
  comentado explicitamente como "a confirmar na primeira consulta real".
  Sem a chave configurada, a função retorna `nao_configurado` e a Fase 1
  segue funcionando normalmente — nada quebra por falta da Fase 2.

### Score de confiabilidade — agora a fórmula completa do prompt-mestre
A Rodada 14 documentou o score como "parcial" porque faltavam os sinais
web. Com o enriquecimento chegando, reescrevi para a tabela exata da
seção 13 do prompt-mestre:

| Sinal | Pontos |
|---|---|
| Receita/REDESIM confirmada (situação ativa) | +30 |
| Site oficial confirmado | +20 |
| E-mail oficial confirmado | +15 |
| Telefone oficial confirmado | +10 |
| Responsável identificado | +10 |
| LinkedIn confirmado | +5 |
| Duas fontes independentes concordando | +10 |

"Duas fontes independentes" é literal: quando um nome de sócio/decisor
aparece **tanto** no QSA da Receita Federal (BrasilAPI) **quanto** nos
decisores do LeadCNPJ, os +10 entram — cruzamento de fontes de verdade,
não só presença de dado.

**Separei conflito-detecção de score**: comparar razão social/endereço/
CNAE do cadastro GSBC contra a Receita Federal (Rodada 14) não pontua
mais no score — é uma checagem diferente ("nosso cadastro está certo?"),
não "essa empresa é fácil de achar e contatar?". Continua destacado na
UI exatamente como antes.

### Schema
- `dossies_cadastrais.dados_enriquecimento`: snapshot da última resposta
  do LeadCNPJ, paralelo a `dados_oficiais` (BrasilAPI).
- `dossie_evidencias.tipo`: ampliado com `site`, `email`, `telefone`,
  `redes_sociais`, `decisor`.
- Toda evidência agora carrega `fonte` de verdade (antes era uma
  constante fixa por consulta) — a UI mostra "fonte: BrasilAPI / Receita
  Federal" ou "fonte: LeadCNPJ" por linha, não mais implícito.

### UI
- Card de Inteligência Cadastral: header muda para "Receita Federal +
  enriquecimento web" quando `LEADCNPJ_API_KEY` está configurada; sem a
  chave, mostra um aviso explícito (não um erro) explicando que a Fase 2
  não está ativa e qual variável configurar.

## Arquivos criados
`supabase/migrations/0017_enriquecimento_web.sql`,
`src/lib/cnpj/leadcnpj.ts`.

## Arquivos alterados
`src/app/backoffice/empresas/[id]/{dossie-actions.ts,
dossie-cadastral-section.ts,page.tsx}`, `src/types/database.types.ts`,
`.env.example`.

## Banco de dados
`0017_enriquecimento_web.sql`: coluna `dados_enriquecimento`, constraint
de `tipo` em `dossie_evidencias` ampliada. Sem tabela nova.

## Segurança
`LEADCNPJ_API_KEY` só é lida no servidor (`"server-only"` no módulo,
igual ao cliente da BrasilAPI e ao SMTP) — nunca chega ao navegador.
Continua restrito a Owners de ponta a ponta (UI + RLS), sem mudança de
superfície de acesso.

## Testes realizados
Verificação real, com o banco resetado, antes de reportar como
concluído (regra 92) — **sem a chave da LeadCNPJ ainda** (não temos uma
configurada), então o que foi validado de fato:

- Consulta com um CNPJ real (mesmo procedimento de teste da Rodada 14 —
  troca temporária via `psql`, revertida depois) confirmando que: (a) a
  Fase 1 continua funcionando sozinha, (b) o aviso "enriquecimento web
  ainda não está configurado" aparece corretamente, (c) **o score
  recalculado bateu exatamente com a fórmula nova** (30/100 — só
  situação ativa, já que razão social/endereço/CNAE agora são
  conflito, não pontuação), (d) cada evidência mostra sua fonte
  ("fonte: BrasilAPI / Receita Federal (Minha Receita)").
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.
- Suíte Playwright completa: 16/16 passando.
- **O que ainda não foi verificado**: uma consulta real ao LeadCNPJ —
  vai acontecer assim que houver uma chave de API configurada (ver
  Pendências).

## Decisões arquiteturais
Nenhum ADR novo — extensão do módulo já modelado na Rodada 14.

## Pendências
- **Bloqueador para ativar de verdade**: falta `LEADCNPJ_API_KEY`. O
  provedor tem trial de 7 dias sem cartão — assim que houver uma chave
  configurada em `.env.local`, o próximo passo é rodar uma consulta real
  e comparar a resposta bruta com os caminhos de campo assumidos em
  `leadcnpj.ts` (mesmo processo de calibração que a BrasilAPI passou na
  Rodada 14 — é bem provável que 1-2 nomes de campo precisem de ajuste).
- Sem cache/deduplicação de consulta — cada clique em "Consultar CNPJ
  oficial" gasta crédito da LeadCNPJ de novo, mesmo se a última consulta
  foi há 5 minutos. Aceitável no volume atual (ação manual, não em
  lote), mas vale revisitar se o uso crescer.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Nomes de campo do LeadCNPJ não confirmados contra resposta real | Médio | Documentado explicitamente no código; primeira consulta real com a chave vai expor rapidamente qualquer divergência |
| Score agora depende de duas fontes externas | Baixo | Cada uma falha de forma isolada (BrasilAPI indisponível já bloqueava tudo antes; LeadCNPJ indisponível só reduz o score, não quebra a Fase 1) |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Depende do usuário: (a) obter a chave da LeadCNPJ e calibrar a Fase 2 com
uma consulta real, ou (b) seguir para o Ponto 2 (envio de cobrança via
Resend) ou Ponto 3 (notificação extrajudicial via Escrybe), conforme
combinado na conversa que definiu essas três frentes.
