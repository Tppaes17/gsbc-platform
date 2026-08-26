# GSBC — Rodada 3

## Objetivo
Empresas: cadastro real da entidade "empresa" como ficha 360º (regra 19),
incluindo dados cadastrais e contatos, com os placeholders honestos para as
seções que ainda não existem (instrumentos, cobranças, negociações,
financeiro, documentos, timeline).

## Estado inicial
Fundação SaaS (Rodada 1) + Clientes e usuários (Rodada 2) funcionando e
testadas. Nenhuma entidade operacional (empresas, instrumentos, cobranças
etc.) existia ainda — P1 começa aqui.

## Implementações

### Modelo de dados
- `empresas`: pertence a exatamente um tenant (o sindicato sob cuja
  jurisdição está) — CNPJ único por tenant, não globalmente (ver decisão
  abaixo). Campos: razão social, nome fantasia, CNPJ, CNAE, segmento,
  enquadramento sindical, endereço (jsonb), status.
- `empresa_contatos`: mesmo padrão de `sindicato_contatos` — nome, cargo,
  e-mail, telefone, principal.
- RLS idêntica ao padrão já validado para `sindicatos`: leitura para staff
  GSBC (todas) e membros do tenant (só as próprias); escrita exclusiva de
  staff GSBC. Grants explícitos incluídos na mesma migration (evita repetir
  o bug de `permission denied` da Rodada 1).

### UI — ficha 360º da empresa
- `/backoffice/empresas` — listagem (coluna "Sindicato" só aparece para
  staff GSBC, que opera múltiplos tenants; membros do sindicato já sabem
  que é o próprio).
- `/backoffice/empresas/novo` — cadastro (staff GSBC apenas), com seletor de
  sindicato.
- `/backoffice/empresas/[id]` — ficha 360º: dados cadastrais (editável só
  por staff GSBC, travado com aviso para os demais — mesmo padrão da ficha
  de sindicato), seção de Contatos (listar + adicionar, também restrito a
  staff GSBC na escrita), e um grid de `FutureModulePlaceholder` — um novo
  componente de design system — para as seções que a regra 19 prevê mas que
  ainda não existem: Instrumentos e obrigações (Rodada 4), Cobranças
  (Rodada 5), Negociações (Rodada 6), Financeiro e Documentos (Rodada 7),
  Timeline (Rodada 9). Cada placeholder diz explicitamente quando chega —
  nunca simula dado (regra 62).
- Dashboard: card "Empresas cadastradas" com contagem real, mesmo padrão de
  escopo por RLS dos demais cards.
- Menu lateral: item "Empresas" entre Sindicatos e Usuários.

### Auditoria
`empresa.created`, `empresa.updated`, `empresa.contato_added` — mesmo padrão
via `log_audit_event`, verificados na tela de Auditoria após cada ação.

## Arquivos criados
`src/app/backoffice/empresas/**`,
`src/components/design-system/future-module-placeholder.tsx`,
`src/lib/validation/empresa.ts`, `supabase/migrations/0006_empresas.sql`.

## Arquivos alterados
`src/app/backoffice/page.tsx` (card de empresas),
`src/components/backoffice/nav-items.ts`, `src/types/database.types.ts`,
`supabase/seed.sql` (2 empresas + 2 contatos de demonstração).

## Banco de dados
`0006_empresas.sql`: tabelas `empresas`/`empresa_contatos`, índices, RLS,
grants — tudo numa única migration coerente (regra 60).

## Segurança
Mesmo padrão já validado nas rodadas anteriores: RLS como autoridade final,
nenhuma tabela nova sem policy explícita, grants incluídos desde o início
(não deixados para depois — regra 94).

## Testes realizados
Verificação real pelo navegador com os dois usuários de demonstração —
build, typecheck e lint limpos, e fluxo completo testado antes de reportar
como concluído (regra 92):
- Cadastro de empresa nova (staff GSBC) → redireciona para a ficha 360º →
  dados corretos, contatos vazio, placeholders das 6 seções futuras
  visíveis com o texto certo.
- Adição de contato → toast de sucesso, contato aparece na lista, dialog
  fecha sozinho.
- **Isolamento de tenant**: a dirigente do sindicato vê as 3 empresas do
  próprio tenant (incluindo a recém-criada), mas a coluna "Sindicato" não
  aparece pra ela (só faz sentido para quem opera múltiplos tenants) e o
  botão "Nova empresa" está ausente.
- **Modo somente leitura confirmado**: a ficha da empresa aparece
  inteiramente travada para a dirigente, com o aviso "Dados cadastrais são
  gerenciados exclusivamente pela equipe GSBC" — ela vê o contato "Roberto
  Silva" já cadastrado, mas sem o botão "Adicionar contato".
- Auditoria confirmou `empresa.created` e `empresa.contato_added` na ordem
  certa.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.

Nenhum bug novo precisou de correção nesta rodada — os padrões estabelecidos
nas rodadas 1 e 2 (grants explícitos, `.guid()` em vez de `.uuid()`,
`nativeButton={false}` em Button+Link, Select uncontrolled com
`defaultValue`+`name` em vez de controlado) já vieram aplicados desde o
primeiro rascunho dos formulários.

## Decisões arquiteturais

### Empresa pertence a um único tenant; CNPJ único por tenant, não globalmente
Não há ADR novo — é uma aplicação direta do modelo de multi-tenancy do
ADR-001. **Isto é uma assunção de modelagem, não uma regra de negócio
confirmada pelo usuário**: presumi, por analogia com a decisão já confirmada
para sindicatos (regra 6 — "a GSBC executa, o sindicato acompanha"), que o
cadastro/edição de empresas também é exclusivo da equipe GSBC. Documentado
como tal no cabeçalho da migration `0006_empresas.sql`. Se a intenção for
outra (ex.: um mesmo CNPJ pertencendo a mais de um sindicato
simultaneamente, ou o próprio sindicato podendo cadastrar empresas), é uma
mudança de RLS pontual, não estrutural.

## Pendências
- Edição/remoção de contatos existentes (hoje só é possível adicionar).
- Busca/filtro na listagem de empresas (ainda não necessário com poucos
  registros — regra 38, não antecipar).
- Empresas inativas: campo `status` existe no schema mas não há ação de UI
  para inativar uma empresa ainda.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Assunção "cadastro de empresa é exclusivo da GSBC" não confirmada explicitamente pelo usuário | Baixo | Documentada como assunção; reversível via ajuste pontual de RLS se incorreta |
| Endereço armazenado como jsonb livre, sem validação de schema | Baixo | Adequado para o estágio atual; se precisar de relatórios/filtros por UF/cidade no futuro, vale normalizar em colunas |

## Regras de negócio pendentes
Nenhuma nova além da assunção documentada acima.

## Próxima rodada recomendada
Rodada 4 — Instrumentos e obrigações: instrumentos coletivos (CCT/ACT),
cláusulas e obrigações vinculadas a uma empresa, fechando a cadeia
`Instrumento → Cláusula → Obrigação` que alimentará as Cobranças na Rodada 5.
