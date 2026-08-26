# GSBC — Rodada 9

## Objetivo
Timeline consolidada da ficha 360º da empresa: unificar obrigações,
eventos de cobrança, eventos de negociação e pagamentos num único feed
cronológico (regra 25 — "a plataforma registra"), fechando o placeholder
que restava dessa seção desde a Rodada 5.

## Por que Documentos continua fora
Mesma razão da Rodada 8: o Supabase Storage está desabilitado neste
ambiente local por restrição de memória do Docker (ver
`docs/rodadas/rodada-01.md`). Nenhuma mudança nesse cenário desde a
última rodada — Documentos permanece como placeholder honesto, agora
renumerado para Rodada 10.

## Estado inicial
Rodadas 1–8 funcionando e testadas (fundação, sindicatos, empresas,
instrumentos/obrigações, cobranças, site institucional, negociações,
financeiro). A ficha 360º da empresa já reunia cobranças, negociações e
financeiro em seções separadas, mas sem uma visão cronológica única do
relacionamento — cada seção mostrava sua própria fatia do histórico.

## Implementações

### Abordagem: composição, não nova tabela
A timeline consolidada **não introduz uma tabela nova nem um evento
duplicado** — é a junção, em memória, de dados que já existem:
`obrigacoes.created_at`, `cobranca_eventos`, `negociacao_eventos` e
`pagamentos`, todos filtrados pela mesma empresa, mapeados para o mesmo
formato (`TimelineItem`) e ordenados por timestamp decrescente. Zero
migração nesta rodada.

- `cobranca_eventos` e `negociacao_eventos` não têm `empresa_id` direto —
  filtrados via embed com `!inner` e `.eq("cobrancas.empresa_id", id)` /
  `.eq("negociacoes.empresa_id", id)` (mesmo padrão de filtro por embed
  já usado no projeto, ex.: `tenants!inner(type)` na Rodada 5).
- Cada item ganha um prefixo de categoria no label (`Cobrança (...)`,
  `Negociação (...)`, `Pagamento (...)`, `Obrigação —`) para o feed ficar
  legível mesmo misturando as quatro origens — sem precisar alterar o
  componente `Timeline` (reaproveitado pela quinta vez seguida, sem
  modificação).

### UI
- Ficha 360º da empresa: placeholder "Timeline consolidada" substituído
  por dados reais; "Documentos" é o único placeholder restante, agora
  como Rodada 10.

## Arquivos criados
`src/app/backoffice/empresas/[id]/timeline-consolidada.tsx`.

## Arquivos alterados
`src/app/backoffice/empresas/[id]/page.tsx` (4 novas consultas + lógica
de composição/ordenação da timeline).

## Banco de dados
Nenhuma migração — esta rodada é puramente uma composição de leitura
sobre dados já existentes.

## Segurança
Sem RPC novo. As quatro consultas usadas para montar a timeline herdam
as políticas de RLS já existentes de `obrigacoes`, `cobranca_eventos`,
`negociacao_eventos` e `pagamentos` — nada de novo em termos de
superfície de acesso.

## Testes realizados
Verificação real pelo navegador, com os dois usuários de demonstração,
antes de reportar como concluído (regra 92):

- Login como Admin GSBC: a ficha 360º da empresa demo mostrou os 11
  eventos esperados (1 obrigação + 7 transições de cobrança + 3 eventos
  de negociação + 2 pagamentos) em ordem cronológica correta,
  intercalando as quatro origens.
- Login como Dirigente do Sindicato Demonstração: mesma timeline
  visível, com os nomes de autor ("por Admin GSBC (Demo)") resolvidos
  corretamente em todos os itens — confirma que a correção de
  visibilidade cross-tenant da Rodada 5 também cobre esta composição
  nova, sem precisar de ajuste adicional de RLS.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.
- Um erro de compilação (constante `STATUS_ENCERRADO` duplicada) foi
  introduzido e corrigido durante o desenvolvimento desta rodada, antes
  de reportar como concluído — capturado pelo próprio `npm run build`.

## Decisões arquiteturais
Nenhum ADR novo — reaproveita entidades e o componente `Timeline` já
existentes; nenhuma mudança estrutural.

## Pendências
- A timeline não pagina — para uma empresa com histórico muito longo,
  isso pode ficar pesado; aceitável no volume atual de dados de
  demonstração, mas vale revisitar se o volume real crescer.
- Documentos continua bloqueado por Storage desabilitado localmente
  (ver "Por que Documentos continua fora" acima).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Timeline sem paginação | Baixo | Revisitar se o histórico por empresa crescer muito no uso real |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Rodada 10 — Documentos, assim que o Storage local puder ser reativado
(ou diretamente em ambiente com mais memória disponível, já que a
restrição é só deste Docker local).
