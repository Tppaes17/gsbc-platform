# GSBC — Rodada 4

## Objetivo
Instrumentos e obrigações: fechar a cadeia `Instrumento → Cláusula →
Obrigação` (regras 20-22 do prompt-mestre), incluindo cadastro de CCT/ACT,
suas cláusulas, e as obrigações que delas nascem para empresas específicas —
sem ainda confundir obrigação com cobrança (regra 22, cobrança é Rodada 5).

## Estado inicial
Fundação SaaS + Clientes e usuários + Empresas (Rodadas 1-3) funcionando e
testadas. A ficha 360º da empresa tinha um placeholder honesto para
"Instrumentos e obrigações" — substituído nesta rodada por dados reais.

## Implementações

### Modelo de dados
- `instrumentos`: CCT, ACT, termo aditivo ou outro. `empresa_id` opcional —
  preenchido só quando o instrumento é um ACT restrito a uma empresa
  específica; nulo para CCT amplo (regra 20).
- `clausulas`: pertencem a um instrumento; número, título, texto.
- `obrigacoes`: nascem de um instrumento (obrigatório) e, opcionalmente, de
  uma cláusula específica; sempre associadas a uma empresa. Campos batem
  com a regra 21: fundamento, descrição, periodicidade, período, vencimento,
  valor de referência, status (`pending_validation` → `validated`/
  `contested` → `fulfilled`/`cancelled`).
- **Trigger de integridade**: se o instrumento já restringe a uma empresa
  (ACT), toda obrigação dele *tem* que apontar para essa mesma empresa — o
  banco recusa a inserção/atualização caso contrário (regra 67, não deixar
  essa integridade só para o frontend).
- RLS e grants seguindo exatamente o padrão já validado (staff GSBC
  escreve, sindicato lê o próprio tenant).

### UI
- `/backoffice/instrumentos` — listagem com tipo, sindicato, vigência,
  status.
- `/backoffice/instrumentos/novo` — cadastro com sindicato + empresa
  vinculada (opcional, filtrada dinamicamente pelo sindicato selecionado).
- `/backoffice/instrumentos/[id]` — edição do instrumento, seção de
  Cláusulas (listar/adicionar) e seção de Obrigações (listar/adicionar,
  com empresa e cláusula selecionáveis — empresa fica travada
  automaticamente se o instrumento já for um ACT restrito).
- **Ficha 360º da empresa**: o placeholder "Instrumentos e obrigações" foi
  substituído por uma lista real (somente leitura) das obrigações daquela
  empresa, cada uma linkando para o instrumento de origem — a gestão
  continua acontecendo na página do instrumento (regra 21: a obrigação
  nasce do instrumento, não da empresa).
- Menu lateral: item "Instrumentos" entre Empresas e Usuários. Dashboard:
  card "Instrumentos vigentes".

### Auditoria
`instrumento.created`, `instrumento.updated`, `clausula.added`,
`obrigacao.created` — mesmo padrão via `log_audit_event`.

## Arquivos criados
`src/app/backoffice/instrumentos/**`, `src/lib/validation/instrumento.ts`,
`src/app/backoffice/empresas/[id]/obrigacoes-list.tsx`,
`supabase/migrations/0007_instrumentos_obrigacoes.sql`.

## Arquivos alterados
`src/app/backoffice/empresas/[id]/page.tsx` (placeholder → dados reais),
`src/app/backoffice/page.tsx` (card de instrumentos),
`src/components/backoffice/nav-items.ts`, `src/types/database.types.ts`,
`supabase/seed.sql` (1 CCT, 2 cláusulas, 2 obrigações de demonstração).

## Banco de dados
`0007_instrumentos_obrigacoes.sql`: três tabelas, trigger de integridade
papel/empresa, RLS e grants — tudo numa única migration coerente.

## Segurança
Mesmo padrão das rodadas 2-3. O trigger de integridade
(`enforce_obrigacao_empresa_matches_instrumento`) é uma camada adicional que
não depende da RLS nem do frontend — protege mesmo contra um bug futuro na
Server Action.

## Testes realizados
Verificação real pelo navegador (build, typecheck, lint limpos antes e
depois das correções abaixo):

- Instrumento de demonstração (seed) exibido corretamente com cláusulas e
  as duas obrigações originais.
- Adicionei uma obrigação nova pela UI, vinculada à Cláusula 12ª — apareceu
  imediatamente na lista do instrumento **e** na ficha 360º da empresa
  correspondente, confirmando a integração entre os dois módulos.
- **Isolamento de tenant**: a dirigente do sindicato vê o instrumento do
  próprio tenant (sem coluna "Sindicato", sem botão "Novo instrumento"), e
  a página de detalhe aparece inteiramente travada — cláusulas e obrigações
  visíveis, mas sem os botões "Adicionar".
- Auditoria confirmou `obrigacao.created` corretamente.

**Um bug real foi encontrado e corrigido**: os `Select` de Tipo, Status e
Periodicidade mostravam o valor bruto do banco (`cct`, `active`, `unica`)
em vez do rótulo em português, porque eu esqueci de aplicar a correção já
descoberta na Rodada 2 (`Select.Value` do Base UI precisa de uma função
`children` para resolver o rótulo — não faz isso sozinho) em três lugares
novos desta rodada. Corrigido nos três arquivos
(`novo/instrumento-form.tsx`, `[id]/edit-instrumento-form.tsx`,
`[id]/obrigacoes-section.tsx`) e conferido visualmente depois.

## Decisões arquiteturais
Nenhuma nova — aplicação direta dos padrões já estabelecidos em
ADR-001/002/003 e nas decisões de modelagem documentadas nas rodadas 2-3
(escrita exclusiva de staff GSBC, grants explícitos desde o início).

## Pendências
- Edição/exclusão de cláusulas e obrigações existentes (hoje só é possível
  adicionar).
- Fluxo de validação de obrigação (`pending_validation` → `validated`)
  ainda não tem uma ação de UI dedicada — hoje só é setado por padrão ao
  criar; falta uma ação explícita "Validar" / "Contestar".
- Upload do documento do instrumento (regra 46) — depende do módulo de
  Documentos (Rodada 7, junto com Storage).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Sem ação de UI para transicionar `pending_validation` → `validated`/`contested` | Baixo | Schema já suporta; falta só a ação — não bloqueia a Rodada 5 |
| Obrigações não têm histórico de eventos (diferente do que a regra 24 prevê para cobranças) | Baixo | Deliberado — rule 24 fala de `cobranca_eventos`, não de obrigação; reavaliar se `obrigacoes` precisar do mesmo padrão |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Rodada 5 — Cobranças: a ação operacional de buscar a regularização de uma
obrigação (regra 22), incluindo o modelo de status com histórico
(`cobranca_eventos`, regra 24) e a timeline da cobrança (regra 25).
