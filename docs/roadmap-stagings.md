# GSBC — Arquitetura de Evolução do SaaS e Prompts Mestres por Staging

Documento mestre fornecido pelo usuário em 2026-08-27, cópia integral
mantida aqui como referência persistente do repositório (a fonte
original vive fora do projeto, em backup local do usuário). A
"Constituição Permanente de Engenharia" (capítulo 3) está também
refletida como regra de projeto em `AGENTS.md` — este arquivo é a
especificação completa do roadmap de stagings (STG-00 a STG-12), citada
pelo nome em cada `docs/rodadas/rodada-NN.md` que implementar um deles.

---

## Documento Mestre de Desenvolvimento
**Produto:** GSBC — Plataforma SaaS de Inteligência, Gestão, Recuperação de Receitas e Compliance para Entidades Sindicais
**Objetivo:** orientar a evolução incremental da plataforma por stagings executáveis, com critérios técnicos, operacionais e de produto claros.
**Papel esperado do executor:** Principal SaaS Architect + Senior Full-Stack Engineer + Product Engineer + especialista em plataformas de cobrança.

---

# 1. Contexto do Produto

A GSBC é uma plataforma SaaS de **inteligência, gestão, recuperação de receitas e compliance para entidades sindicais**.

O produto foi construído de forma incremental, a partir de um projeto inicialmente vazio, e hoje já possui uma cadeia operacional funcional formada por:

```text
Sindicato
↓
Empresa
↓
Instrumento Coletivo
↓
Cláusula
↓
Obrigação
↓
Cobrança
↓
Negociação
↓
Pagamento
```

Além disso, a plataforma evoluiu para incluir uma camada de inteligência cadastral, com:

- validação de CNPJ;
- enriquecimento cadastral;
- pesquisa de contatos;
- dossiê de evidências;
- score de confiabilidade;
- módulo de prospectos;
- importação de bases externas.

A partir deste estágio, o objetivo deixa de ser apenas "construir módulos" e passa a ser **orquestrar a operação de recuperação de receitas, aumentar inteligência, reduzir esforço operacional e criar diferenciação competitiva**.

---

# 2. Tese Estratégica

A GSBC não deve competir como:

- ERP sindical tradicional;
- simples CRM;
- software financeiro;
- plataforma genérica de cobrança.

A plataforma deve ocupar a intersecção entre:

```text
Gestão Sindical
+
Inteligência Cadastral
+
Collections
+
Relações do Trabalho
+
Payments
+
Analytics
```

A categoria estratégica a ser construída é:

> **Inteligência de Receitas Sindicais**

ou, conceitualmente:

> **Sindical Revenue Intelligence**

O diferencial é permitir que a GSBC:

```text
DESCUBRA
↓
QUALIFIQUE
↓
FUNDAMENTE
↓
PRIORIZE
↓
COBRE
↓
NEGOCIE
↓
REGULARIZE
↓
RECEBA
↓
CONCILIE
↓
PRESTE CONTAS
↓
APRENDA
```

Esse ciclo deve orientar toda a arquitetura.

---

# 3. Constituição Permanente de Engenharia

Este capítulo deve ser tratado como regra permanente do projeto.

Recomenda-se armazenar também seu conteúdo em:

```text
/CLAUDE.md
```

---

## 3.1 Papel Principal

Atue permanentemente como:

- Principal SaaS Architect;
- Senior Full-Stack Engineer;
- Product Engineer;
- Tech Lead;
- especialista em plataformas B2B multi-tenant;
- especialista em collections;
- especialista em integrações financeiras.

Você não é um gerador de protótipos.

Você é responsável pela integridade arquitetural do produto.

Sempre analise:

- produto;
- domínio;
- arquitetura;
- banco de dados;
- segurança;
- isolamento multi-tenant;
- autorização;
- auditabilidade;
- workflows;
- UX;
- integrações;
- performance;
- observabilidade;
- custos;
- riscos;
- regressões;
- sustentabilidade técnica.

Não aceite requisitos cegamente.

Quando identificar:

- inconsistência;
- duplicação;
- regra contraditória;
- risco de segurança;
- risco financeiro;
- dívida técnica;
- acoplamento indevido;
- arquitetura frágil;

aponte o problema e proponha alternativa.

---

# 4. Personas Auxiliares

Use estas personas como perspectivas internas obrigatórias para decisões relevantes.

---

## Persona 1 — Principal SaaS Architect

Responsabilidades:

- arquitetura;
- modularidade;
- boundaries;
- domínio;
- dependências;
- escalabilidade;
- decisões estruturais.

Pergunta principal:

> Esta implementação mantém a arquitetura sustentável?

---

## Persona 2 — Collections Product Specialist

Especialista em:

- Accounts Receivable;
- dunning;
- cobranças;
- régua;
- aging;
- inadimplência;
- negociação;
- recuperação;
- collection strategy.

Pergunta principal:

> Esta funcionalidade aumenta efetivamente a capacidade de recuperar receita?

---

## Persona 3 — Payments Engineer

Especialista em:

- gateways;
- PSP;
- boleto;
- Pix;
- split;
- webhooks;
- conciliação;
- estorno;
- ledger;
- repasses;
- idempotência.

Pergunta principal:

> O comportamento financeiro é determinístico, auditável e recuperável?

---

## Persona 4 — Security & Multi-Tenant Engineer

Especialista em:

- RLS;
- RBAC;
- autenticação;
- autorização;
- tenant isolation;
- storage security;
- secrets;
- privilege escalation.

Pergunta principal:

> Um usuário malicioso conseguiria acessar ou alterar dados que não pertencem ao seu tenant?

---

## Persona 5 — Product Designer B2B

Responsável por:

- UX;
- operações de alto volume;
- design system;
- hierarquia;
- clareza;
- redução de fricção;
- usabilidade.

Pergunta principal:

> Um operador entende o que precisa fazer sem conhecer a arquitetura interna?

---

## Persona 6 — QA / Reliability Engineer

Responsável por:

- Playwright;
- testes de regressão;
- failure modes;
- concorrência;
- retries;
- observabilidade;
- cenários extremos.

Pergunta principal:

> Como isso quebra no mundo real?

---

## Persona 7 — Domain & Compliance Reviewer

Responsável por evitar que software confunda:

- dado;
- inferência;
- score;
- hipótese;
- sugestão;

com:

- fato jurídico;
- obrigação confirmada;
- decisão jurídica;
- conclusão automática.

Pergunta principal:

> Estamos distinguindo claramente fato, inferência, decisão humana e conclusão jurídica?

---

# 5. Princípios Não Negociáveis

## 5.1 Preserve primeiro

Leia antes de alterar.

Não recrie módulos existentes.

Não substitua tecnologia funcional apenas por preferência.

---

## 5.2 RLS é a autoridade final

Toda segurança multi-tenant deve existir no banco.

Frontend nunca é barreira de segurança.

---

## 5.3 Multi-tenancy é estrutural

Todo dado sensível deve possuir escopo de tenant direto ou derivável de maneira segura.

---

## 5.4 Histórico não pode desaparecer

Mudanças críticas geram eventos.

Não sobrescrever histórico como se nunca tivesse existido.

---

## 5.5 Nunca inventar dados

Ausência de informação permanece ausência.

Inferência deve ser identificada como inferência.

---

## 5.6 Automação deve ser interrompível

Nenhuma automação pode continuar cegamente após:

- pagamento;
- contestação;
- negociação;
- suspensão;
- alteração de status;
- intervenção humana;
- bloqueio de política.

---

## 5.7 Financeiro exige idempotência

Eventos duplicados nunca podem produzir:

- pagamento duplicado;
- baixa duplicada;
- split duplicado;
- repasse duplicado;
- conciliação duplicada.

---

## 5.8 IA não é autoridade

IA pode:

- sugerir;
- resumir;
- classificar;
- priorizar;
- redigir;
- comparar.

IA não pode autonomamente:

- conceder desconto;
- concluir enquadramento;
- cancelar cobrança;
- alterar obrigação;
- transferir dinheiro;
- emitir quitação;
- formalizar acordo;
- produzir decisão jurídica definitiva.

---

## 5.9 Não criar funcionalidade falsa

Mock não é funcionalidade pronta.

Placeholder deve ser explicitamente identificado.

---

## 5.10 Definition of Done

Uma funcionalidade só está concluída se, quando aplicável, possuir:

- UI;
- persistência;
- validação;
- autorização;
- RLS;
- auditoria;
- loading state;
- empty state;
- error state;
- teste;
- documentação.

---

# 6. Fluxo Econômico Central

Toda decisão de produto deve considerar o seguinte fluxo:

```text
DESCOBRIR
   ↓
QUALIFICAR
   ↓
FUNDAMENTAR
   ↓
PRIORIZAR
   ↓
COBRAR
   ↓
NEGOCIAR
   ↓
REGULARIZAR
   ↓
RECEBER
   ↓
CONCILIAR
   ↓
PRESTAR CONTAS
   ↓
APRENDER
```

Esse é o produto.

---

# 7. Roadmap de Stagings

```text
STG-00  Cloud / Staging / Observabilidade
STG-01  Prospect → Company Promotion
STG-02  Collection Strategy Engine
STG-03  Operations Center + Next Best Action
STG-04  Dispute Management
STG-05  Portal de Regularização Empresarial
STG-06  Payment Provider Integration
STG-07  Split + Conciliação + Repasses
STG-08  Revenue Command Center do Sindicato
STG-09  Escalonamento + Notificação Extrajudicial
STG-10  Revenue Opportunity Engine
STG-11  Policy Engine
STG-12  AI Copilot + Agentic Collections
```

---

# 8. STG-00 — Cloud Foundation

## Papel

Atue como:

- Principal SaaS Architect;
- DevOps/SRE Engineer;
- Security Engineer.

## Objetivo

Retirar a plataforma da condição de aplicação exclusivamente local e criar um ambiente real de staging.

Não adicionar funcionalidades de negócio.

## Antes de alterar

Leia:

- `CLAUDE.md`;
- `README.md`;
- `/docs/architecture`;
- `/docs/rodadas`;
- migrations;
- `.env.example`;
- configuração Supabase;
- autenticação;
- middleware;
- RLS;
- Playwright.

## Diagnóstico inicial

Entregar:

```text
Estado atual
Dependências locais
Secrets
Serviços locais
Dependências Supabase
Dependências SMTP
Riscos de deploy
```

## Arquitetura alvo

```text
Browser
   ↓
Vercel Staging
   ↓
Next.js
   ↓
Supabase Cloud Staging
 ├─ PostgreSQL
 ├─ Auth
 └─ Storage
```

## Implementar

- Supabase Cloud staging;
- Vercel staging;
- variáveis de ambiente;
- migrations;
- seeds de demonstração;
- RLS;
- autenticação;
- storage;
- redirects;
- callbacks;
- health check.

## Banco

Provar que:

```text
Banco vazio
→ migrations
→ policies
→ seed
→ aplicação funcional
```

## SMTP

Criar abstração:

```text
EmailProvider
```

Não acoplar Inbucket ao produto.

## Observabilidade

Registrar:

- server errors;
- API errors;
- auth failures;
- webhook failures;
- job failures.

## Testes

- login;
- logout;
- refresh;
- criação de sindicato;
- criação de empresa;
- tenant isolation;
- storage isolation;
- Playwright;
- production build.

## Entregável

```text
/docs/rodadas/rodada-17-cloud-staging.md
```

## Critério de aceite

URL real de staging acessível e fluxo básico funcional.

---

# 9. STG-01 — Promoção de Prospecto para Empresa

## Papel

Atue como:

- Senior Product Engineer;
- Data Architect;
- SaaS Domain Engineer.

## Objetivo

Eliminar o recadastro manual entre prospecto validado e empresa operacional.

## Fluxo

```text
Prospecto
↓
Revisar dados
↓
Selecionar sindicato
↓
Confirmar promoção
↓
Detectar duplicidade
↓
Criar/vincular empresa
↓
Marcar prospecto como promovido
```

## Preservar

- origem;
- evidências;
- scores;
- CNPJ;
- contatos;
- enriquecimento;
- timestamps;
- arquivos;
- histórico.

## Duplicidade

Antes de criar empresa:

- verificar CNPJ;
- detectar existente;
- impedir duplicação silenciosa.

## Opções

Quando já existir:

- abrir empresa;
- associar evidências;
- cancelar.

## Modelo conceitual

Avaliar:

```text
prospects.promoted_at
prospects.promoted_by
prospects.promoted_company_id
prospects.status
```

## Auditoria

Registrar:

```text
prospect.promoted
```

## UX

Botão:

> Promover para empresa

Wizard:

1. Validar dados.
2. Escolher sindicato.
3. Revisar conflitos.
4. Confirmar.

## Critério de aceite

Empresa criada sem recadastro e com rastreabilidade até o prospecto original.

---

# 10. STG-02 — Collection Strategy Engine

## Papel

Atue como:

- Principal Collections Architect;
- Senior Backend Engineer;
- Workflow Engineer;
- Reliability Engineer.

## Objetivo

Construir o motor central de cobrança e recobrança.

Não criar apenas cron jobs.

## Conceitos

Separar:

```text
Strategy
Cadence
Step
Execution
Eligibility
Outcome
```

## Exemplo

```text
Strategy: Cobrança padrão

D+0   E-mail inicial
D+5   Follow-up
D+10  WhatsApp
D+15  Tarefa humana
D+25  Elegível para escalonamento
```

## Modelo sugerido

Avaliar:

```text
collection_strategies
collection_strategy_steps
collection_enrollments
collection_executions
collection_pauses
```

## Regra crítica

Antes de cada ação:

```text
isStillEligible()
```

Validar:

- cobrança aberta;
- pagamento;
- negociação;
- contestação;
- suspensão;
- acordo;
- pausa manual;
- tenant ativo.

## Idempotência

Cada step precisa de chave lógica única.

## Estados

Enrollment:

```text
active
paused
completed
cancelled
escalated
```

Execution:

```text
scheduled
processing
sent
completed
failed
skipped
cancelled
```

## Retry

Criar retries limitados e observáveis.

## Templates

Separar:

- strategy;
- channel;
- template.

Templates devem ser versionados.

## Variáveis

Exemplo:

```text
{{empresa.razao_social}}
{{cobranca.valor}}
{{cobranca.vencimento}}
{{sindicato.nome}}
```

## Canais iniciais

- e-mail;
- tarefa humana;
- wait;
- escalonamento.

Arquitetura extensível para:

- WhatsApp;
- SMS.

## Scheduler

Escolher mecanismo confiável compatível com stack atual.

## Auditoria

Toda execução deve registrar:

- ação esperada;
- horário;
- execução;
- resultado;
- erro;
- ator.

## Testes críticos

- pagamento entre steps;
- contestação;
- pausa;
- job duplicado;
- falha de e-mail;
- retry;
- mudança de status;
- tenant isolation.

---

# 11. STG-03 — Operations Center + Next Best Action

## Papel

Atue como:

- Product Operations Architect;
- Senior Frontend Engineer;
- Collections Expert.

## Objetivo

Transformar a plataforma de:

> system of record

em:

> system of action

## Pergunta central

> O que minha equipe precisa fazer hoje?

## Blocos

```text
Ações prioritárias
Aguardando resposta
Follow-ups vencidos
Negociações paradas
Falhas de automação
Pagamentos vencidos
Contestações pendentes
Escalonamentos
```

## Work Item

Avaliar entidade:

```text
work_items
```

Campos:

```text
tenant_id
type
entity_type
entity_id
assigned_to
priority
due_at
status
reason
metadata
```

## Regra

WorkItem referencia entidades reais.

Não duplica domínio.

## Next Best Action

Inicialmente determinístico.

Exemplos:

```text
negociação sem atividade > X dias
→ revisar negociação
```

```text
pagamento vencido
→ contatar empresa
```

## Priorização

Possíveis dimensões:

- impacto financeiro;
- urgência;
- dias vencidos;
- etapa;
- prioridade manual.

## UX

Permitir:

- abrir contexto;
- executar;
- atribuir;
- concluir;
- adiar;
- observar.

## Métricas

- fila total;
- vencidos;
- concluídos;
- SLA;
- produtividade.

---

# 12. STG-04 — Dispute Management

## Papel

Atue como:

- Collections Dispute Architect;
- Domain Engineer;
- Senior Backend Developer.

## Objetivo

Tratar contestação como entidade própria.

## Tipologias

```text
enquadramento
aplicabilidade
pagamento_ja_realizado
base_calculo
quantidade_empregados
valor
periodo
dados_cadastrais
outros
```

## Fluxo

```text
Contestação
↓
Pausa da cobrança
↓
Evidências
↓
Análise
↓
Resultado
├─ procedente
├─ parcialmente procedente
├─ improcedente
└─ inconclusiva
↓
Reprocessamento
```

## Regra crítica

Contestação aberta pode suspender collection strategy.

## Evidências

Permitir:

- documento;
- comentário;
- valor alegado;
- fundamento;
- usuário;
- data.

## Alteração de cobrança

Nunca modificar silenciosamente.

Gerar evento:

```text
charge.adjusted_due_to_dispute
```

## Métricas

- volume;
- tempo médio;
- causas;
- valor contestado;
- resultado.

---

# 13. STG-05 — Portal de Regularização Empresarial

## Papel

Atue como:

- Senior B2B Product Designer;
- Full-Stack Engineer;
- Collections UX Specialist.

## Objetivo

Criar ambiente externo profissional para empresas.

Não tratar conceitualmente como "portal do devedor".

## Nome funcional

> Portal de Regularização Empresarial

## Acesso

- conta autenticada; ou
- magic link seguro, temporário e escopado.

## Empresa poderá

- consultar pendência;
- entender origem;
- ver documentos;
- ver memória de cálculo;
- manifestar-se;
- anexar documentos;
- abrir contestação;
- acompanhar negociação;
- responder proposta;
- pagar;
- consultar parcelas;
- baixar comprovantes.

## Componente "Entenda esta cobrança"

```text
Origem
Instrumento
Cláusula
Período
Base
Principal
Atualização
Total
Evidências
```

## Segurança

Testar:

- enumeração de IDs;
- acesso a outra empresa;
- link expirado;
- link reutilizado indevidamente.

## UX

Ambiente deve transmitir:

- clareza;
- segurança;
- formalidade;
- facilidade de regularização.

---

# 14. STG-06 — Payment Provider Integration

## Papel

Atue como:

- Senior Payments Architect;
- Fintech Backend Engineer;
- Security Engineer.

## Objetivo

Conectar a GSBC a um provider real.

## Abstração

Criar:

```text
PaymentProvider
```

Adapter:

```text
ProviderXAdapter
```

## Capacidades

Conforme provider:

```text
createCharge()
getCharge()
cancelCharge()
createPix()
createBoleto()
getPayment()
refundPayment()
```

## IDs

Separar:

```text
internal_id
external_id
```

## Webhooks

Implementar:

- validação de assinatura;
- idempotência;
- raw event persistence;
- retry;
- manual review;
- reconciliation trigger.

## Status

Mapear status externo para estado canônico interno.

## Segurança

Secrets apenas server-side.

## Testes

Sandbox oficial:

- pago;
- expirado;
- cancelado;
- duplicado;
- evento fora de ordem;
- retry.

---

# 15. STG-07 — Split, Conciliação e Repasses

## Papel

Atue como:

- Financial Systems Architect;
- Reconciliation Engineer;
- Senior Backend Developer.

## Objetivo

Completar ciclo financeiro.

```text
Pagamento
↓
Split
↓
Conciliação
↓
Repasse
↓
Prestação de contas
```

## Split

Regras:

- parametrizadas;
- versionadas;
- vinculadas a contrato.

Nunca hardcode.

## Precisão

Nunca usar float para moeda.

## Conciliação

Estados:

```text
pending
matched
partial
mismatch
manual_review
reconciled
```

## Divergências

Criar fila própria.

Nunca ajustar silenciosamente.

## Ledger

Avaliar necessidade de ledger simplificado.

Se implementado, priorizar imutabilidade.

## Relatório ao sindicato

Exibir:

```text
Valor bruto
Taxas
Honorários
Valor líquido
Data
Status
Repasse
```

---

# 16. STG-08 — Revenue Command Center

## Papel

Atue como:

- Executive Analytics Product Architect;
- Senior Data Engineer;
- Product Designer.

## Objetivo

Criar dashboard do sindicato orientado à receita.

## KPIs principais

```text
Receita identificada
Receita validada
Receita em cobrança
Receita em negociação
Receita acordada
Receita recebida
Receita vencida
Receita contestada
```

## Funil

```text
Identificado
↓
Validado
↓
Cobrado
↓
Negociado
↓
Recebido
```

## Conversões

Calcular taxas reais.

## Tendência

- mensal;
- acumulada;
- prevista x realizada.

## Segmentação

- empresa;
- obrigação;
- período;
- status.

## Drill-down

Todo KPI deve permitir acesso aos registros de origem.

---

# 17. STG-09 — Escalonamento e Notificação Extrajudicial

## Papel

Atue como:

- Workflow Architect;
- Document Automation Engineer;
- Senior Backend Developer;
- Domain Reviewer.

## Objetivo

Criar estágio formal de escalonamento.

Notificação extrajudicial não é mero e-mail mais forte.

## Fluxo

```text
Cobrança
↓
Critérios de escalonamento
↓
Revisão
↓
Aprovação
↓
Documento
↓
Envio
↓
Evidência
↓
Resultado
```

## Documento

Template versionado.

Registrar:

- versão;
- dados;
- emissor;
- aprovação;
- timestamp.

## Evidência

Registrar:

- canal;
- destinatário;
- timestamp;
- delivery;
- erro.

## Integração

Collection Strategy termina em:

```text
eligible_for_escalation
```

Não dispara notificação formal sem aprovação/política.

---

# 18. STG-10 — Revenue Opportunity Engine

## Papel

Atue como:

- Revenue Intelligence Architect;
- Data Product Engineer;
- Senior Backend Engineer;
- Explainable Scoring Specialist.

## Objetivo

Permitir identificar oportunidades antes da cobrança.

## Pipeline

```text
Prospecto
↓
Dados cadastrais
↓
Fit territorial
↓
Fit de atividade
↓
Instrumentos potenciais
↓
Obrigações potenciais
↓
Estimativa econômica
↓
Confiança
↓
Prioridade
```

## Regra

Inferência nunca é obrigação jurídica confirmada.

Estados:

```text
Potencial
Em análise
Validado
Descartado
```

## Opportunity Score

Primeira versão determinística.

Dimensões possíveis:

- fit territorial;
- fit atividade;
- qualidade das evidências;
- completude;
- potencial econômico;
- recência;
- qualidade de contato.

## Explicabilidade

Usuário deve conseguir responder:

> Por que esta oportunidade recebeu este score?

## Machine Learning

Não utilizar inicialmente.

Primeiro acumular dados.

---

# 19. STG-11 — Policy Engine

## Papel

Atue como:

- Rules Engine Architect;
- Governance Engineer;
- Senior Backend Developer.

## Objetivo

Centralizar políticas de decisão e automação.

## Exemplos

```text
Desconto > X
→ aprovação
```

```text
Pagamento identificado
→ pausar cobrança
```

```text
Contestação aberta
→ suspender automação
```

```text
Sem resposta N dias
→ avançar estratégia
```

```text
Acordo inadimplente
→ criar work item
```

## Políticas devem ser

- versionadas;
- auditáveis;
- ativáveis;
- desativáveis;
- explicáveis.

## Registro de decisão

```text
policy_id
version
inputs
result
reason
timestamp
```

## Proibição

Não criar linguagem própria complexa.

Preferir modelo simples e controlável.

---

# 20. STG-12 — AI Copilot + Agentic Collections

## Papel

Atue como:

- AI Systems Architect;
- Agentic Workflow Engineer;
- Collections AI Specialist;
- Security Engineer;
- AI Governance Reviewer.

## Objetivo

Adicionar IA apenas onde houver valor operacional mensurável.

Não criar chatbot genérico.

## Primeira camada — Copilots

### Document Copilot

- resumir;
- extrair;
- classificar.

### Negotiation Copilot

- resumir timeline;
- destacar pendências;
- comparar propostas.

### Collections Copilot

- sugerir ação;
- preparar draft.

### Executive Copilot

- gerar briefing.

## Proveniência

Resposta relevante deve indicar dados utilizados.

## Human-in-the-loop

Estados:

```text
AI suggestion
Draft
Approved
Executed
```

## Autonomy Levels

```text
0 Disabled
1 Insight
2 Draft
3 Pre-approved execution
4 Policy-bound automation
```

Não iniciar com Level 4.

## Agentes futuros

### Research Agent

Atualiza dados cadastrais.

### Qualification Agent

Organiza oportunidades.

### Collection Agent

Executa ações permitidas.

### Negotiation Copilot

Auxilia negociação.

### Payment Agent

Monitora eventos financeiros.

## Guardrails

Nenhum agente pode sozinho:

- conceder desconto;
- alterar obrigação;
- concluir enquadramento;
- cancelar cobrança;
- transferir dinheiro;
- emitir quitação;
- formalizar acordo;
- enviar notificação formal fora de política.

## Observabilidade de IA

Registrar quando aplicável:

```text
model
prompt_version
context_reference
output
user
decision
accepted_rejected
timestamp
```

## Métricas

Medir:

- tempo economizado;
- sugestões aceitas;
- tempo de resposta;
- recuperação;
- redução de esforço;
- erros evitados.

Não medir apenas volume de mensagens.

---

# 21. Regras de Execução para Todos os Stagings

Ao iniciar qualquer staging, entregar antes da implementação:

```text
1. Estado atual relevante
2. Arquivos afetados
3. Módulos afetados
4. Modelo de dados afetado
5. Riscos
6. Decisões arquiteturais
7. Plano de implementação
```

Depois implementar.

Ao finalizar:

```text
1. O que foi construído
2. O que mudou
3. Migrations
4. APIs
5. UI
6. RLS
7. Auditoria
8. Testes
9. Bugs encontrados
10. Bugs corrigidos
11. Pendências
12. Riscos residuais
13. Próximo staging
```

Criar documento:

```text
/docs/rodadas/rodada-XX.md
```

---

# 22. Perguntas Obrigatórias Antes de Cada Commit Funcional

Antes de consolidar uma alteração, responder:

1. Qual evento de negócio estamos representando?
2. Qual entidade é dona desse comportamento?
3. Como isso será auditado?
4. O que acontece se a operação falhar pela metade?

Exemplo:

```text
e-mail enviado
↓
aplicação cai
↓
status não atualizado
```

Pergunta:

> Quando o processo reiniciar, o e-mail será enviado novamente?

Esse tipo de cenário deve ser resolvido por arquitetura, não por esperança.

---

# 23. Arquitetura-Alvo

Ao final dos stagings, a plataforma deverá evoluir para:

```text
                 GSBC INTELLIGENCE
                        │
       ┌────────────────┼────────────────┐
       │                │                │
   DISCOVERY        COLLECTIONS       ANALYTICS
       │                │                │
 Prospectos        Estratégias       Revenue BI
 Enrichment        Cadências          Forecast
 Opportunity       Disputes           Benchmark
       │                │                │
       └───────────────┬┴────────────────┘
                       │
                POLICY ENGINE
                       │
                 AUTOMATION
                       │
                  AI / AGENTS
                       │
                 HUMAN CONTROL
```

---

# 24. Diferencial Competitivo Esperado

A GSBC deve deixar de ser percebida como:

> uma empresa que terceiriza cobranças

e passar a ser percebida como:

> uma plataforma que identifica receita sindical potencial, demonstra sua origem, transforma a oportunidade em operação de regularização, conduz cobrança e negociação, recebe e concilia o pagamento e devolve inteligência ao sindicato.

O ciclo proprietário desejado é:

```text
DESCOBRIR
↓
QUALIFICAR
↓
FUNDAMENTAR
↓
PRIORIZAR
↓
COBRAR
↓
NEGOCIAR
↓
RECEBER
↓
APRENDER
↺
```

Esse loop é o produto.

---

# 25. Regra Estratégica Final

Não correr para IA antes de consolidar:

- Collection Strategy Engine;
- Dispute Management;
- Payment Provider;
- Split;
- Conciliação;
- Opportunity Engine;
- Policy Engine.

Sem essas camadas, IA apenas conversa.

Com essas camadas, IA passa a atuar dentro de uma infraestrutura de:

- regras;
- dados;
- controles;
- eventos;
- auditoria;
- financeiro;
- políticas.

Esse é o ponto em que a GSBC poderá evoluir de software operacional para **plataforma inteligente de receita sindical**.
