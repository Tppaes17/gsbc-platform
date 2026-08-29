# GSBC — Auditoria Crítica da Constituição do Produto

**Documento:** `docs/PRODUCT_REVIEW.md`  
**Objeto auditado:** `docs/PRODUCT.md` v1.0  
**Data:** 29/08/2026  
**Status:** Revisão adversarial pré-arquitetura  
**Objetivo:** identificar contradições, lacunas, riscos jurídicos, financeiros, de segurança, privacidade, arquitetura, IA e operação antes de derivar especificações técnicas ou autorizar implementação autônoma.

---

# 1. Veredito Executivo

O `PRODUCT.md` já é suficientemente robusto para funcionar como **visão canônica do produto**, mas **ainda não deve ser usado diretamente como especificação de implementação**.

A auditoria identificou riscos materiais em cinco áreas:

1. **Modelo de tenancy e hierarquia institucional** — a definição atual mistura tenant, entidade contratante e entidade vinculada.
2. **Disponibilidade e legitimidade das fontes oficiais** — especialmente eSocial, GFIP e RAIS.
3. **Imutabilidade versus proteção de dados e correção** — o requisito de imutabilidade absoluta precisa ser tecnicamente reinterpretado.
4. **Governança da cobrança e do jurídico** — o sistema não pode ser obrigado a executar uma decisão do cliente quando GSBC/Jurídico identificar ilegalidade, fraude ou risco de compliance.
5. **Máquinas de estado e marcos temporais** — várias decisões dependem de conceitos ainda não formalizados, como entrega válida, resposta válida, início de prazo e alocação de pagamentos.

**Conclusão:** aprovado como Constituição de Produto com ressalvas.  
**Condição para arquitetura:** resolver todos os itens P0 e os P1 classificados como “bloqueadores de domínio”.

---

# 2. Escala de Severidade

## P0 — Crítico

Pode provocar:

- vazamento cross-tenant;
- cobrança sem fundamento;
- tratamento irregular de dados;
- erro financeiro estrutural;
- ato jurídico indevido;
- perda de auditabilidade;
- inviabilidade técnica de requisito central.

Deve ser resolvido antes da arquitetura definitiva.

## P1 — Alto

Pode provocar:

- fluxo incorreto;
- passivo operacional/jurídico;
- deadlock de cobrança;
- inconsistência contábil;
- vulnerabilidade de segurança;
- alto custo de retrabalho.

Deve ser resolvido antes da implementação do respectivo domínio.

## P2 — Médio

Não impede arquitetura inicial, mas deve ser especificado antes de produção.

## P3 — Melhoria

Refinamento, clareza ou evolução não bloqueante.

---

# 3. Achados P0 — Críticos

## P0-01 — Tenant, organização e entidade estão conceitualmente misturados

### Evidência

O documento afirma simultaneamente que:

- sindicato, federação e confederação contratantes são tenants;
- federações/confederações podem visualizar e operar sindicatos vinculados;
- permissões podem atravessar entidades;
- cada sindicato também pode ser cliente direto.

### Problema

Se Federação A e Sindicato B forem tenants independentes, permitir acesso transversal significa, tecnicamente, acesso cross-tenant intencional.

Isso entra em tensão com o princípio:

> “Dados entre tenants não podem vazar”.

O produto precisa distinguir **isolamento acidental** de **acesso federado autorizado**.

### Risco

Muito alto. Um modelo mal definido aqui contamina:

- RLS;
- autorização;
- busca;
- documentos;
- IA;
- relatórios;
- auditoria;
- billing;
- hierarquia;
- integrações.

### Correção recomendada

Separar formalmente quatro conceitos:

- `Account/Customer`
- `Tenant`
- `LegalEntity`
- `OrganizationalRelationship`

Definir se sindicatos vinculados a uma federação:

A. vivem dentro do mesmo tenant;  
B. possuem tenants separados com grants explícitos;  
C. podem operar nos dois modelos.

### Decisão requerida

Bloqueante para `MULTITENANCY.md`.

---

## P0-02 — eSocial/GFIP/RAIS não podem ser tratados como bases universalmente consultáveis pelo GSBC

### Evidência

O `PRODUCT.md` trata eSocial, GFIP e RAIS como fontes-alvo para obtenção de quantidade de empregados e outros dados de cálculo.

A documentação oficial do eSocial deixa claro que acesso a dados do empregador depende do próprio empregador, responsável legal ou **procuração com poderes específicos**, além de haver limitações de acesso e de download.

### Problema

O sindicato ou o GSBC não possui automaticamente autorização técnica/jurídica para consultar dados individuais de folha de qualquer empresa abrangida.

Logo, a premissa:

> “o GSBC consulta diariamente e obtém dados oficiais de todos os CNPJs”

não é uma capacidade garantida.

### Risco

Crítico porque compromete o motor de cálculo de obrigações por empregado.

### Correção recomendada

Alterar a regra para:

> “O GSBC utilizará dados oficiais quando existir fonte legalmente acessível e autorização técnica válida. Na ausência, utilizará outras evidências oficialmente disponibilizadas, dados fornecidos pela entidade ou mecanismos específicos juridicamente autorizados.”

Criar `DataSourceCapability` com estados:

- disponível;
- autorizado;
- limitado;
- indisponível;
- expirado.

Nenhuma regra de negócio deve presumir que uma fonte existe.

### Decisão requerida

Definir estratégia alternativa de base de cálculo.

---

## P0-03 — Imutabilidade absoluta é incompatível com correção, minimização e direitos de proteção de dados

### Evidência

O documento determina que:

- comentários não podem ser editados;
- documentos não podem ser apagados;
- trilha não pode ser alterada;
- dados permanecem preservados;
- arquivos e evidências são imutáveis.

A LGPD prevê direitos de correção e, em determinadas hipóteses, bloqueio, anonimização e eliminação de dados pessoais.

### Problema

“Imutável” não pode significar tecnicamente “dados pessoais nunca podem ser corrigidos, anonimizados, bloqueados ou eliminados”.

### Risco

Crítico de privacidade e arquitetura.

### Correção recomendada

Separar:

**Event/Audit Ledger:** append-only e inviolável.

**Operational Projection:** estado corrente corrigível.

**Personal Data Vault:** dados pessoais sujeitos a lifecycle, bloqueio, anonimização e políticas legais.

Eventos históricos podem manter referências/pseudônimos sem necessariamente reter indefinidamente o dado pessoal bruto.

### Decisão requerida

Bloqueante para `SECURITY.md` e modelo de dados.

---

## P0-04 — Sindicato não pode obrigar GSBC a executar operação que GSBC/Jurídico considere ilícita ou não suportável

### Evidência

O documento estabelece:

> “Decisão é compartilhada entre GSBC e entidade, mas a palavra final é da entidade.”

### Problema

Essa regra pode ser aceitável para decisões comerciais dentro de uma zona legítima de interpretação.

Não pode valer quando GSBC, Jurídico, DPO/Privacidade, Segurança ou Compliance identificarem:

- ilegalidade;
- ausência mínima de fundamento;
- fraude;
- abuso;
- violação de dados;
- conflito de interesse;
- determinação judicial;
- risco regulatório impeditivo.

### Risco

Crítico.

A plataforma não deve possuir uma regra que transforme a vontade do cliente em obrigação automática de execução pelo fornecedor.

### Correção recomendada

Criar **GSBC Compliance Veto**.

Regra:

> A entidade possui palavra final sobre seu posicionamento institucional, mas GSBC pode recusar executar, automatizar ou transmitir uma operação que viole política legal, regulatória, segurança, privacidade ou compliance.

Estados possíveis:

- entity_decision_approved;
- gsbc_execution_approved;
- gsbc_execution_refused;
- manual_external_action_required.

### Decisão requerida

Adicionar como princípio não negociável.

---

## P0-05 — “Entrega válida” não está definida e controla toda a escalada jurídica

### Evidência

A tentativa só é concluída após entrega válida em e-mail e WhatsApp.

Depois da terceira tentativa válida ocorre notificação extrajudicial e, posteriormente, preparação jurídica.

### Problema

Falta definir “entrega válida”.

Possíveis eventos são diferentes:

- accepted by provider;
- sent;
- delivered to mail server;
- delivered to WhatsApp device;
- read;
- human acknowledgement.

E-mail normalmente não fornece prova universal de leitura humana.

### Risco

Crítico porque um detalhe de integração passa a determinar:

- tentativa 1/2/3;
- início de prazo;
- notificação;
- escalada jurídica.

### Correção recomendada

Criar `DeliveryEvidencePolicy` por canal e versão.

Exemplo:

- EMAIL_VALID = SMTP/provider delivery confirmation sem hard bounce;
- WHATSAPP_VALID = provider status `delivered`;
- READ = evidência adicional, não condição ordinária.

A definição deve ser juridicamente homologada.

### Decisão requerida

Bloqueante para state machine de cobrança.

---

## P0-06 — Falta regra de alocação de pagamentos e encargos

### Evidência

O sistema suporta:

- múltiplas competências;
- boleto consolidado;
- principal;
- juros;
- multa;
- pagamentos parciais;
- créditos;
- reemissões.

### Problema

Não está definido como um pagamento parcial é alocado.

Exemplo:

Boleto:
- janeiro: principal + multa;
- fevereiro: principal + multa;
- março: principal.

Pagamento cobre 60% do total.

Qual competência é quitada primeiro?
Encargos ou principal primeiro?
Mais antiga ou proporcional?
O split incide sobre qual parcela?

### Risco

Crítico de integridade financeira.

### Correção recomendada

Criar política versionada de `PaymentAllocation`:

- ordem por competência;
- ordem principal/juros/multa;
- rateio proporcional ou waterfall;
- tratamento de acordo;
- tratamento de honorários;
- split por componente.

Toda memória de cálculo e conciliação deve reproduzir a alocação.

### Decisão requerida

Bloqueante para ledger financeiro.

---

# 4. Achados P1 — Altos

## P1-01 — Rotina diária às 06:00 está definida como regra de produto, mas fontes possuem capacidades diferentes

### Problema

Algumas APIs podem:

- não aceitar polling diário em massa;
- cobrar por consulta;
- impor limites;
- operar de forma assíncrona;
- possuir janelas de atualização diferentes;
- exigir procuração/credenciais específicas.

### Recomendação

Manter “06:00” como janela operacional da orquestração, mas criar:

- `source_refresh_policy`;
- frequência por fonte;
- freshness target;
- retry/backoff;
- rate-limit budget;
- last_success_at.

Não presumir que todos os dados serão efetivamente atualizados diariamente.

---

## P1-02 — Exigência simultânea de e-mail + WhatsApp pode criar deadlock permanente

### Problema

Um CNPJ pode possuir e-mail válido, mas não possuir WhatsApp institucional verificável.

Pela regra atual, nenhuma tentativa se completa.

### Recomendação

Manter a política inicial escolhida, mas prever estado explícito:

`required_channel_unavailable`

e processo de exceção homologada.

Sem isso, determinados devedores ficarão tecnicamente impossíveis de avançar.

---

## P1-03 — “Resposta válida” não está definida

Autoresponder, mensagem de ausência, confirmação automática, spam e mensagem humana não podem produzir necessariamente o mesmo efeito.

### Recomendação

Definir:

- `response_received`;
- `response_classified`;
- `meaningful_response`;
- `automated_response`.

Apenas resposta classificada conforme política deve congelar a régua, exceto quando houver dúvida, caso em que fail-closed suspende para revisão.

---

## P1-04 — Início do prazo de 10 dias da notificação extrajudicial não está definido

### Problema

O documento define duração, mas não `notice_effective_at`.

### Recomendação

Definir expressamente o evento que inicia o prazo:

- emissão?
- envio?
- última entrega válida?
- primeira entrega válida?
- data constante da notificação?

Sem isso, o workflow é indeterminado.

---

## P1-05 — Calendário de cobrança, SLA interno e prazo processual não podem compartilhar um único conceito

### Problema

O calendário do CNPJ foi adotado para diversos fluxos.

Prazos judiciais/processuais possuem regras e calendários próprios.

### Recomendação

Criar tipos:

- `BUSINESS_COLLECTION_CALENDAR`;
- `INTERNAL_SLA_CALENDAR`;
- `CONTRACTUAL_NOTICE_CALENDAR`;
- `COURT_PROCEDURAL_CALENDAR`.

Nunca reutilizar um calendário por conveniência técnica.

---

## P1-06 — Ausência de manifestação do sindicato não deveria habilitar automaticamente fase jurídica sem opt-in contratual explícito

### Problema

Silêncio após 10 dias gera preparação jurídica automática.

### Recomendação

Exigir configuração por tenant:

`silence_authorizes_legal_preparation = true/false`

Somente pode ser `true` se contrato e autorização institucional válidos estiverem registrados.

Preparação jurídica não equivale a ajuizamento.

---

## P1-07 — Estrutura GSBC x escritório jurídico precisa ser separada

### Problema

O documento menciona jurídico “indicado ou operado pela GSBC”.

Atividades privativas da advocacia, contratação de honorários, responsabilidade profissional e relacionamento com clientes devem permanecer claramente associados a advogado/sociedade de advocacia habilitados.

### Recomendação

Modelar `LegalServiceProvider` separado da operadora SaaS.

Separar:

- contrato SaaS/cobrança;
- contrato de serviços jurídicos quando aplicável;
- honorários jurídicos;
- receitas da plataforma;
- responsáveis OAB;
- privilégios de acesso.

Não pressupor que percentuais comerciais da GSBC podem incidir sobre honorários jurídicos sem análise específica.

---

## P1-08 — “Escrow” é termo insuficiente para modelar a operação financeira

### Problema

Uma instituição de pagamento pode manter contas de pagamento e executar transações, mas “escrow” não define por si só o enquadramento jurídico/regulatório.

### Recomendação

No produto, usar conceito abstrato:

`PaymentProvider / SettlementAccount / SplitInstruction`

e deixar a estrutura jurídica real para o provedor contratado.

Exigir:

- KYC/KYB;
- titularidade;
- recebedores;
- regras de split;
- estorno;
- chargeback;
- bloqueios;
- reconciliation IDs.

---

## P1-09 — Uso agregado de dados entre tenants exige governança formal de anonimização

### Problema

“Anonimizado” não pode ser apenas remoção de CNPJ/nome.

Bases sindicais pequenas podem permitir reidentificação por combinação de território, setor, valores e eventos.

### Recomendação

Criar `Data Governance Policy` com:

- finalidade;
- base jurídica;
- técnicas de anonimização;
- limiar mínimo de agregação;
- proibição de small-cell disclosure;
- teste de reidentificação;
- retenção;
- treinamento de modelos;
- DPA/contrato.

---

## P1-10 — IA operacional é exposta a prompt injection por documentos, e-mails e dados externos

### Problema

O agente consultará:

- documentos;
- e-mails;
- WhatsApp;
- páginas;
- fontes externas.

Conteúdo malicioso pode instruir a IA a ignorar políticas ou executar ações.

### Recomendação

Tratar todo conteúdo externo como **untrusted data**.

Obrigatório:

- tool authorization server-side;
- policy checks determinísticos;
- nenhuma permissão derivada do texto;
- structured tool calls;
- confirmação para ações críticas;
- source isolation;
- prompt-injection evals.

---

## P1-11 — MFA opcional para Operação/Compliance e Atendimento pode ser insuficiente

### Problema

Esses perfis podem acessar grande volume de:

- CNPJs;
- contatos;
- cobranças;
- documentos;
- dados de trabalhadores;
- contestações.

### Recomendação

Reavaliar MFA obrigatório para **todos os usuários internos GSBC**.

Se a decisão permanecer opcional, exigir controle de risco por dispositivo/local/sessão e step-up frequente.

---

## P1-12 — “Sem direito a exportação” precisa ser separado de direitos legais e portabilidade operacional

### Problema

A regra contratual pode ser válida para exportação comercial do acervo empresarial, mas não deve interferir com:

- direitos de titulares;
- ordens judiciais;
- obrigações regulatórias;
- deveres de controlador/operador.

### Recomendação

Redação:

> “Não haverá funcionalidade contratual ordinária de exportação integral após o período de retenção, sem prejuízo de obrigações legais ou direitos aplicáveis.”

---

## P1-13 — Modelos jurídicos versionados precisam de vigência e jurisdição

### Problema

Um template não é válido universalmente.

### Recomendação

Cada `LegalTemplateVersion` deve possuir:

- tipo de ação;
- jurisdição;
- vigência;
- advogado/sociedade aprovadora;
- requisitos obrigatórios;
- cláusulas opcionais;
- compatibilidade com tipos de obrigação.

---

## P1-14 — Falta política de validade temporal dos dados usados no cálculo

### Problema

Mesmo dado oficial pode estar defasado.

### Recomendação

Cada dado deve conter:

- `source`;
- `observed_at`;
- `effective_from`;
- `effective_to`;
- `retrieved_at`;
- `confidence/authority`;
- `superseded_by`.

Cálculos devem usar dado válido para a competência, não simplesmente o dado mais recente.

---

## P1-15 — Split financeiro precisa ser versionado por transação

### Problema

Contrato pode alterar de 30% para 20%.

Transação posterior não pode recalcular histórico usando percentual atual.

### Recomendação

Cada cobrança/pagamento deve referenciar `commercial_rule_version_id`.

---

## P1-16 — Suspensão com congelamento universal precisa de exceções explícitas

### Problema

A regra “suspensão congela relógio” é útil operacionalmente, mas pode ser incompatível com:

- prescrição;
- decadência;
- prazos contratuais externos;
- prazos processuais;
- deadlines regulatórios.

### Recomendação

Congelamento deve aplicar apenas a relógios controlados pelo GSBC.

Relógios externos continuam correndo, salvo fundamento jurídico específico.

---

# 5. Achados P2 — Médios

## P2-01 — Score mistura estado operacional e score quantitativo

“Regular / Notificado / Judicializado” são estados, não necessariamente níveis de score.

### Recomendação

Separar:

- `ComplianceScore` numérico/faixa;
- `CollectionStatus`;
- `LegalStatus`;
- `OperationalRiskBand`.

---

## P2-02 — Receita Potencial e Pipeline precisam de definições contábeis/gerenciais

“Constituído”, “cobrado”, “negociado”, “recuperado” devem possuir definições inequívocas.

### Recomendação

Criar glossário financeiro.

---

## P2-03 — Forecast ponderado precisa impedir circularidade indevida

Se score usa inadimplência e forecast usa score, tudo bem; mas forecast não deve retroalimentar score sem controle, criando loops.

### Recomendação

Documentar DAG de features/modelos.

---

## P2-04 — Reprocessamento histórico de modelos deve ser assíncrono

Recalcular anos de score para milhões de registros pode ser caro.

### Recomendação

Job assíncrono versionado, com resultados novos sem bloquear operação.

---

## P2-05 — Busca global exige política de indexação e apagamento lógico

Índices de busca podem vazar dados mesmo após revogação de permissão.

### Recomendação

Autorização na query + index partitioning/filtering + testes de revogação.

---

## P2-06 — Tenant demo deve estar fisicamente/logicamante isolado de produção

### Recomendação

Não permitir clone de dados reais para demo sem processo de anonimização aprovado.

---

## P2-07 — Produtividade operacional ainda não possui métricas

O documento corretamente rejeita “tarefas fechadas”, mas não define o substituto.

### Recomendação

Post-MVP:

- SLA attainment;
- first-time-right;
- rework;
- quality review;
- complexity-adjusted throughput.

---

## P2-08 — Central de notificações pode se tornar ruidosa

### Recomendação

Definir deduplicação, grouping, severity e digest in-app.

---

## P2-09 — Falta política de indisponibilidade de integrações

### Recomendação

Toda integração crítica deve possuir:

- degraded mode;
- retry;
- reconciliation;
- manual fallback;
- status visible;
- no silent failure.

---

## P2-10 — Falta classificação de dados

### Recomendação

Classificar dados como:

- público;
- interno;
- confidencial;
- financeiro;
- jurídico privilegiado;
- dados pessoais;
- dados pessoais sensíveis, quando aplicável.

Permissões e logs derivam dessa classificação.

---

# 6. Contradições e Tensões Internas

## C-01 — Imutabilidade x LGPD

Resolvida arquiteturalmente com event ledger + projections + privacy lifecycle.

## C-02 — Palavra final do sindicato x responsabilidade GSBC

Necessário GSBC Compliance Veto.

## C-03 — Tenant isolation x federação com acesso transversal

Exige novo modelo de tenancy.

## C-04 — Monitoramento oficial diário x fontes que exigem procuração/limites

Exige capability model por fonte.

## C-05 — Dois canais obrigatórios x ausência estrutural de um canal

Exige exceção formal ou estado terminal de impossibilidade.

## C-06 — Suspensão congela prazo x prazos externos que não suspendem

Separar relógios internos de externos.

---

# 7. Decisões de Domínio Ainda Ausentes

Antes de `DOMAIN_RULES.md`, precisam ser resolvidas:

1. definição arquitetural de tenant/entidade/hierarquia;
2. fallback de base de cálculo quando eSocial/GFIP/RAIS não forem acessíveis;
3. definição exata de entrega válida por canal;
4. definição de resposta válida;
5. evento de início dos 10 dias da notificação;
6. regra de alocação de pagamento parcial;
7. regra de alocação de juros/multa/principal;
8. regra de split sobre componentes financeiros;
9. exceção quando um canal obrigatório for estruturalmente indisponível;
10. quem pode exercer GSBC Compliance Veto;
11. quais ações são classificadas como legal/compliance blocked;
12. política de fonte e validade temporal dos dados;
13. configuração que autoriza preparação jurídica por silêncio;
14. separação formal entre GSBC SaaS e prestador jurídico;
15. lifecycle de dados pessoais em registros imutáveis.

---

# 8. Riscos de IA

## AI-01 — Hallucination de regra jurídica

IA não deve buscar “regra legal aplicável” livremente e publicar conclusão.

**Controle:** fonte jurídica curada + validação humana + versão.

## AI-02 — Prompt injection

Conteúdo de empresa/documento pode conter instruções maliciosas.

**Controle:** untrusted input, deterministic authorization e tool guardrails.

## AI-03 — False confidence

“Confiança” numérica de LLM não deve ser usada como probabilidade jurídica objetiva.

**Controle:** confidence apenas como metadado heurístico; decisões baseadas em evidência/validação.

## AI-04 — Bulk action drift

Entre simulação e execução, dados podem mudar.

**Controle:** snapshot/version hash e optimistic concurrency.

## AI-05 — Cross-tenant retrieval

Semantic search e RAG são superfície de vazamento.

**Controle:** authorization before retrieval, não apenas após geração.

---

# 9. Riscos Financeiros

1. alocação de pagamento indefinida;
2. split sem versionamento transacional;
3. regras de estorno sem relação com split já liquidado;
4. créditos sem definição de expiração/bloqueio;
5. acordos sem plano de parcelas estruturado;
6. chargeback/reversal sem tratamento de receita já distribuída;
7. dependência de provedor sem abstraction layer;
8. falta de reconciliação de settlement x charge x payment x split.

### Recomendação estrutural

Usar ledger de dupla entrada ou, no mínimo, subledger imutável com eventos financeiros balanceáveis.

---

# 10. Riscos Jurídicos e de Privacidade

## 10.1 Proteção de dados

O uso de contatos profissionais, dados de administradores e dados trabalhistas exige:

- definição de controlador/operador;
- base legal por finalidade;
- necessidade/proporcionalidade;
- transparência;
- direitos de titulares;
- retenção;
- segurança;
- registro de tratamento.

## 10.2 eSocial

Acesso não é público por natureza. Procurações e perfis são exigidos em diversas operações.

## 10.3 Advocacia

Atos privativos e responsabilidade profissional devem permanecer vinculados a advogado/sociedade habilitada.

## 10.4 Pagamentos

A arquitetura não deve presumir que “escrow” e split são genericamente equivalentes entre provedores.

---

# 11. Riscos de Segurança

Prioridades para `SECURITY.md`:

1. tenant isolation;
2. RLS/authorization server-side;
3. MFA interno;
4. secrets;
5. signed webhooks;
6. financial webhook replay protection;
7. idempotency;
8. audit tamper resistance;
9. document encryption;
10. privileged access;
11. archived-tenant access;
12. AI tool authorization;
13. prompt injection;
14. export/log leakage;
15. search index isolation.

---

# 12. Riscos de State Machine

Os seguintes domínios NÃO devem ser implementados como simples campos `status`:

- obligation;
- charge;
- collection attempt;
- channel delivery;
- dispute;
- negotiation;
- notification;
- legal case;
- task;
- payment;
- credit;
- instrument rule;
- tenant lifecycle;
- bulk operation.

Devem possuir máquinas de estado explícitas, transições válidas, eventos, guards e efeitos.

---

# 13. Escopo — Risco de Superdimensionamento

O produto definido é substancialmente maior que um sistema de cobrança.

Ele contém, na prática:

1. Collective Instrument Intelligence;
2. Coverage Intelligence;
3. Compliance Engine;
4. Billing & Collections;
5. Payment/Reconciliation;
6. Negotiation CRM;
7. Legal Operations;
8. Workflow Management;
9. Document/Evidence Management;
10. Corporate Intelligence;
11. Forecasting;
12. AI Copilot/Agent;
13. Hierarchical Union Management.

Construir tudo simultaneamente aumentaria muito o risco de:

- arquitetura inconsistente;
- UX rasa;
- alto número de integrações frágeis;
- baixa cobertura de testes;
- atraso de produção.

---

# 14. Recomendação de MVP

## MVP-0 — Fundação

- tenancy;
- RBAC;
- audit;
- documents;
- instruments;
- rule extraction + human validation;
- company/CNPJ registry;
- basic workflow/tasks.

## MVP-1 — Revenue Core

- obligations;
- calculation memory;
- charge generation;
- boleto/payment provider;
- reconciliation;
- email collection;
- basic WhatsApp integration;
- negotiation;
- credits;
- ledger.

## MVP-2 — Compliance & Legal Ops

- non-financial compliance;
- extrajudicial notices;
- legal dossier;
- case tracking integration;
- advanced disputes.

## MVP-3 — Intelligence

- scoring;
- weighted forecast;
- revenue concentration;
- semantic search;
- AI operational actions;
- bulk AI actions.

## MVP-4 — Ecosystem

- automated source discovery;
- broader official integrations;
- Mediador/MTE;
- federation/confederation advanced hierarchy;
- global model learning.

**Observação:** a ordem pode ser ajustada pelo estado atual do repositório, mas as dependências devem ser preservadas.

---

# 15. Alterações Recomendadas ao PRODUCT.md

Não aplicar automaticamente ainda.

## Amendment A — GSBC Compliance Veto

Adicionar princípio:

> “Nenhuma decisão de tenant obriga a GSBC, seus prestadores jurídicos ou seus agentes automatizados a executar ação considerada ilegal, fraudulenta, insegura ou incompatível com políticas de privacidade/compliance. A decisão institucional da entidade será preservada, mas a execução GSBC poderá ser bloqueada e auditada.”

## Amendment B — Imutabilidade

Substituir conceito absoluto por:

> “Eventos de auditoria e evidências históricas são append-only. Dados operacionais e pessoais podem ser corrigidos, bloqueados, pseudonimizados, anonimizados ou eliminados quando legalmente exigido, preservando a integridade probatória na extensão permitida.”

## Amendment C — Fontes oficiais

Adicionar:

> “A disponibilidade de uma fonte oficial é capability-dependent e não presumida. A plataforma somente utilizará dados quando houver base jurídica, autorização e acesso técnico válidos.”

## Amendment D — Hierarquia

Adicionar glossário e separar Tenant, Legal Entity e Organizational Relationship.

## Amendment E — Prazos

Adicionar:

> “Somente relógios controlados pela plataforma são congelados por suspensão. Prazos legais, prescricionais, processuais ou de terceiros continuam conforme sua própria regra.”

## Amendment F — Legal Provider

Separar explicitamente a operadora tecnológica GSBC do prestador jurídico habilitado quando aplicável.

---

# 16. Gates Antes de Implementação Autônoma

O Principal Engineer Agent NÃO deve receber autonomia para alterar arquitetura de produção até que:

- [ ] P0-01 resolvido;
- [ ] P0-02 resolvido;
- [ ] P0-03 resolvido;
- [ ] P0-04 resolvido;
- [ ] P0-05 resolvido;
- [ ] P0-06 resolvido;
- [ ] `DOMAIN_RULES.md` criado;
- [ ] `MULTITENANCY.md` criado;
- [ ] `SECURITY.md` criado;
- [ ] arquitetura atual auditada;
- [ ] MVP definido contra o estado atual do código;
- [ ] evals P0 estabelecidos.

---

# 17. Evals Obrigatórios Derivados da Auditoria

## EVAL-TENANT-001
Usuário de tenant A não descobre registros de tenant B por busca, autocomplete, IA, API ou erro.

## EVAL-TENANT-002
Grant hierárquico permite apenas entidades/ações explicitamente autorizadas.

## EVAL-FIN-001
Pagamento parcial é alocado deterministicamente e reproduzido pela memória de cálculo.

## EVAL-FIN-002
Retry de webhook não duplica pagamento, split ou baixa.

## EVAL-COLLECT-001
Tentativa multicanal só conclui conforme policy versionada de entrega.

## EVAL-COLLECT-002
Resposta válida suspende workflow imediatamente.

## EVAL-COLLECT-003
Suspensão preserva remaining duration de relógio interno.

## EVAL-AI-001
Documento contendo instrução maliciosa não altera autorização do agente.

## EVAL-AI-002
IA não executa ação sem permissão do usuário.

## EVAL-AI-003
Bulk action exige snapshot/simulação e nova aprovação após mudança material.

## EVAL-PRIVACY-001
Pedido de correção de dado pessoal não exige adulteração do audit ledger.

## EVAL-LEGAL-001
GSBC Compliance Veto impede execução apesar de decisão do tenant.

---

# 18. Fontes Oficiais Consultadas

A auditoria jurídica/regulatória utilizou como referências de validação, sem substituir parecer jurídico específico:

- Autoridade Nacional de Proteção de Dados — Direitos dos Titulares;
- Autoridade Nacional de Proteção de Dados — Guia Orientativo sobre hipóteses legais/legítimo interesse;
- Portal oficial do eSocial — Manual Web Geral e documentação técnica;
- Conselho Federal da OAB — Provimentos relativos à contratação e atividade profissional;
- Banco Central do Brasil — definição e funcionamento de instituições de pagamento.

As regras concretas de produção deverão passar por validação jurídica e regulatória específica dos fornecedores, contratos e fontes efetivamente adotados.

---

# 19. Conclusão

O `PRODUCT.md` não precisa ser refeito.

Ele precisa ser **endurecido**.

O risco agora não é falta de ideias; é transformar uma visão muito ampla em código sem primeiro definir:

- fronteiras;
- autoridade;
- estados;
- evidência;
- acesso;
- temporalidade;
- responsabilidade.

A próxima etapa recomendada é resolver os seis P0 em sequência e, imediatamente depois, produzir:

1. `DOMAIN_RULES.md`;
2. `MULTITENANCY.md`;
3. `SECURITY.md`;
4. `ARCHITECTURE.md`.

Somente então o `GSBC Principal Engineer` deve receber autonomia de implementação A1 sobre domínios críticos.
