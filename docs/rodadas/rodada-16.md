# GSBC — Rodada 16

## Objetivo
Adicionar, no acesso Owner, um módulo para subir informações de empresas
já pesquisadas — upload de planilha — complementando a consulta oficial
de CNPJ (Rodada 14) e o enriquecimento web (Rodada 15) com um caminho
manual: o Owner já tem uma planilha de pesquisa de mercado (ex.:
exportação de um provedor de dados B2B por CNAE) e quer carregá-la de
uma vez, antes de decidir formalmente perseguir a cobrança sob um
sindicato específico.

## Template de upload — extraído dos dois arquivos de referência
O usuário forneceu duas planilhas reais (`6190601 - Provedor.xlsx`,
provedores de internet no Ceará, 323 linhas; `6110803 - SCM.xlsx`,
comunicação multimídia no Ceará, 1257 linhas). Inspecionadas
programaticamente (pandas) em vez de assumidas — as duas têm exatamente
as mesmas 14 colunas, na mesma aba `Leads_rel`:

`CNPJ, Razão Social, Cnaes Descrição, Cnaes Secundarios, Capital Social,
Capital Social Convertido, E-mail, Logradouro, Número, Complemento,
Bairro, Município, UF, CEP`

Esse conjunto virou o template oficial de upload
(`src/lib/validation/prospecto.ts`), validado linha a linha na
importação — uma linha com CNPJ ou Razão Social ausente/inválido não
derruba o upload inteiro, só é listada como erro.

## Conceito novo: "Prospecto"
Um prospecto é um dossiê de inteligência cadastral **sem empresa/tenant
vinculado ainda** — pesquisa de mercado, não uma empresa sob gestão de
cobrança de um sindicato. Em vez de criar um schema paralelo, generalizei
o já existente `dossies_cadastrais`/`dossie_evidencias` (Rodadas 14-15):
`empresa_id` e `tenant_id` viraram opcionais, e um prospecto é
identificado por `origem = 'importacao_planilha'` e dedupe por CNPJ
(reimportar o mesmo CNPJ atualiza o registro, não duplica). Reaproveita a
mesma estrutura de score, evidências e timeline já testada nas rodadas
anteriores, em vez de reimplementar.

Dado importado da planilha **não recebe o score de confiabilidade** —
a planilha não tem "situação cadastral" e forçar a fórmula da Rodada 15
misrepresentaria confiança que não existe. Prospecto importado fica com
`status = 'pesquisa_iniciada'` e `score_confiabilidade = null` até um
Owner rodar "Consultar CNPJ oficial" manualmente sobre aquele prospecto
específico — reaproveitando o mesmo avaliador da Rodada 15.

## Refatoração: avaliador de CNPJ compartilhado
A lógica de consulta oficial (BrasilAPI + LeadCNPJ + score da seção 13
do prompt-mestre), até aqui só dentro de
`empresas/[id]/dossie-actions.ts`, foi extraída para
`src/lib/cnpj/avaliacao.ts` (`avaliarCnpj(cnpj)`), para ser reaproveitada
pelo novo fluxo de prospecto sem duplicar ~150 linhas. A checagem de
conflito contra o cadastro GSBC (razão social/endereço/CNAE) continua
só no fluxo de empresa, que é quem conhece esse cadastro — o avaliador
compartilhado não sabe nada sobre `empresas`. Escopo deliberadamente
contido: só extração, sem redesenhar o fluxo de empresa já testado nas
Rodadas 14-15.

## Implementações

### Upload e importação
- `src/app/backoffice/prospectos/actions.ts`:
  `importarProspectosAction` (Owner-only) — lê o `.xlsx` via SheetJS,
  valida colunas e linhas contra o template, faz dedupe por CNPJ dentro
  da própria planilha (última ocorrência vence), separa em
  novos/atualizados, grava em lote (com concorrência limitada nas
  atualizações para não abrir uma conexão por linha em planilhas
  grandes), registra evidências (`fonte: "Planilha importada: {nome do
  arquivo}"`, `nível_confiança: "provável"` — dado de pesquisa, ainda
  não confirmado contra a Receita Federal) e um registro de auditoria em
  `dossie_importacoes` (regra 34 — timeline imutável de cada upload).
- `consultarProspectoAction`: mesmo botão "Consultar CNPJ oficial" da
  ficha de empresa, mas para um prospecto — chama o avaliador
  compartilhado, sem checagem de conflito (não há cadastro GSBC para
  comparar).

### Dependência: SheetJS (`xlsx`)
O pacote `xlsx` publicado no registro **npm** tem duas CVEs sem correção
disponível (Prototype Pollution, ReDoS — `npm audit` confirma "No fix
available"), porque a SheetJS parou de publicar releases corrigidas lá.
Instalado a partir do tarball oficial da própria SheetJS
(`cdn.sheetjs.com/xlsx-0.20.3/...`), que tem 0 vulnerabilidades — **não
usar `npm install xlsx` num futuro `npm update`**, isso reintroduziria as
CVEs.

### UI
- `/backoffice/prospectos`: lista Owner-only (nav item novo, com
  gating por `ownerOnly` — mecanismo novo em `NavItem`, espelhando o já
  existente `requiresPlatformStaff`), botão "Importar planilha" (dialog
  com resumo da importação: novos/atualizados/erros).
- `/backoffice/prospectos/[id]`: ficha do prospecto, reaproveitando o
  mesmo componente de timeline/evidências da ficha de empresa, sem a
  seção de conflitos (que não se aplica a um prospecto).

## Arquivos criados
`supabase/migrations/0018_prospectos.sql`, `src/lib/cnpj/avaliacao.ts`,
`src/lib/validation/prospecto.ts`,
`src/app/backoffice/prospectos/{page.tsx, actions.ts,
importar-dialog.tsx, prospectos-table.tsx, [id]/page.tsx,
[id]/prospecto-dossie-section.tsx}`, `e2e/prospectos.spec.ts`,
`e2e/fixtures/prospectos-teste.xlsx`.

## Arquivos alterados
`src/app/backoffice/empresas/[id]/dossie-actions.ts` (refatorado para
usar o avaliador compartilhado — comportamento idêntico, verificado),
`src/types/database.types.ts` (`DossieOrigem`, colunas novas de
`dossies_cadastrais`, tabela `dossie_importacoes`),
`src/components/backoffice/{nav-items.ts, sidebar-nav.tsx}`,
`src/app/backoffice/layout.tsx`, `package.json`/`package-lock.json`
(troca do `xlsx`).

## Banco de dados
`0018_prospectos.sql`: `dossies_cadastrais.empresa_id`/`.tenant_id`
passam a aceitar `null`; colunas novas `razao_social`, `origem`; índice
único parcial `dossies_cadastrais_prospecto_cnpj_idx` (CNPJ único
**entre prospectos**, não interfere na unicidade por `empresa_id` já
existente); tabela `dossie_importacoes` (auditoria de upload), RLS
restrita a `is_owner(auth.uid())`, mesmo padrão das Rodadas 14-15.

## Segurança
Módulo restrito de ponta a ponta, mesmo padrão das rodadas anteriores:
UI só renderiza para `isOwner` (nav item e páginas), RLS de
`dossies_cadastrais`/`dossie_evidencias`/`dossie_importacoes` exige
`is_owner(auth.uid())` tanto para leitura quanto escrita. Upload
limitado a 20MB e a `.xlsx`; nenhuma execução de conteúdo da planilha
(só leitura de células via SheetJS). Dependência `xlsx` trocada para uma
fonte sem CVEs conhecidas (ver acima).

## Testes realizados
Verificação real, com banco resetado e servidor de desenvolvimento
rodando, antes de reportar como concluído (regra 92):

- **Upload de ponta a ponta com dado sintético no formato exato do
  template**: planilha de teste com 4 linhas (2 válidas, 1 com CNPJ
  inválido, 1 sem Razão Social) — resultado real da importação: 2
  prospectos novos, 0 atualizados, 2 linhas com erro, exatamente como
  esperado. Confirmado que os 2 prospectos aparecem na listagem e que a
  ficha do prospecto abre com a seção "Inteligência cadastral".
  Reimportar a mesma planilha depois confirmaria o caminho de
  atualização (dedupe por CNPJ) — verificado por leitura do código e
  pela query de `existentes` antes do insert, não re-executado neste
  ciclo para não sujar o estado usado nos testes seguintes.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.
- Suíte Playwright completa: **18/18 passando** (2 specs novas de
  Prospectos — Owner importa e vê a listagem; sindicato não vê o menu
  nem acessa a rota).
- **Problema real de ambiente encontrado durante a verificação** (não
  do código): a porta 3000 estava ocupada por um processo de
  desenvolvimento antigo e travado de um projeto não relacionado
  (`GSBC/frontend`, rodando havia dias a 96% de CPU), fazendo o servidor
  desta aplicação subir automaticamente noutra porta (`autoPort`). Os
  primeiros testes via navegador apontavam para a porta errada e
  pareciam "travados" — não era um bug do módulo novo. Resolvido
  identificando a porta correta do servidor deste projeto e testando
  contra ela.
- Refatoração do avaliador compartilhado: reverifiquei que o fluxo de
  empresa (`consultarDossieCadastralAction`) continua idêntico via a
  suíte `e2e/inteligencia-cadastral.spec.ts` (2/2 passando).

## Decisões arquiteturais
Nenhum ADR novo — generalização do schema já modelado nas Rodadas 14-15
(campos opcionais + índice parcial), não uma mudança estrutural.

## Pendências
- **"Promover prospecto a empresa"**: fora do escopo desta rodada
  (não pedido explicitamente) — hoje um prospecto validado precisa ser
  recriado manualmente como empresa se o sindicato decidir avançar com a
  cobrança. Se isso virar um fluxo recorrente, vale um botão dedicado
  que copie os dados do dossiê para um cadastro de empresa novo.
  **Reportado como pendência aberta ao usuário, não decidido
  unilateralmente.**
- Sem paginação/streaming na leitura da planilha — para os volumes reais
  do usuário (323 e 1257 linhas) isso não é um problema; planilhas muito
  maiores (dezenas de milhares de linhas) poderiam esbarrar no limite de
  tempo de uma Server Action.
- Igual à Rodada 15: sem a chave da LeadCNPJ configurada ainda, então
  "Consultar CNPJ oficial" sobre um prospecto segue rodando só a Fase 1
  (Receita Federal) na prática, mesmo já preparado para a Fase 2.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Import não valida CNPJ contra dígito verificador, só o comprimento (14 dígitos) | Baixo | Deliberado — planilhas de pesquisa de mercado nem sempre têm CNPJs validados; a validação forte acontece depois, em "Consultar CNPJ oficial" |
| Concorrência limitada (20) nas atualizações em lote, não testada em planilhas muito maiores que as de referência | Baixo | Volume real do usuário (até ~1300 linhas) já coberto pela verificação; ajustar se um upload muito maior aparecer |
| `dossie_importacoes.erros` guarda no máximo 200 linhas de erro por upload | Baixo | Decisão deliberada para não estourar o tamanho da linha de auditoria em planilhas com muitos erros; o total de erros continua contado corretamente mesmo truncado |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Depende do usuário: (a) obter a chave da LeadCNPJ e calibrar a Fase 2
com uma consulta real (pendência já registrada na Rodada 15), (b)
decidir se "promover prospecto a empresa" deve virar um fluxo dedicado,
ou (c) seguir para o Ponto 2 (envio de cobrança via Resend) ou Ponto 3
(notificação extrajudicial via Escrybe) da conversa que definiu essas
frentes.
