# GSBC — Product Constitution

**Document:** `docs/PRODUCT.en.md`  
**Status:** Functional and business source of truth  
**Version:** 1.0  
**Date:** 2026-08-29  
**Canonical language:** Portuguese (`docs/PRODUCT.md`)  
**Product:** GSBC — Gestora Sindical de Benefícios & Compliance

---

## 1. Purpose

GSBC is a premium B2B SaaS, multi-tenant platform focused on union compliance, revenue operations, and labor-relations operations.

The product MUST enable union entities to manage, with high levels of automation and traceability:

- collective instruments and versions;
- company/establishment coverage and classification;
- financial and non-financial obligations;
- revenue collection, dunning, reconciliation, and negotiation;
- disputes;
- extrajudicial notices;
- legal dossier preparation;
- company compliance;
- revenue potential and forecasts;
- human workflows;
- documents and evidence;
- decisions, approvals, and delegations;
- AI-assisted analysis and operations.

Collections are one product engine, not the complete product definition.

---

## 2. Initial Scope

### 2.1 Customers

Initial tenants are exclusively union entities:

- labor unions;
- employer-side unions;
- federations;
- confederations.

Companies are not tenants in the initial scope. They are subjects of classification, compliance, revenue, collections, and relationship management.

### 2.2 Union hierarchy

Federations and confederations MAY be linked to multiple entities.

Hierarchy alone MUST NOT grant unrestricted access. Visibility and execution require explicit permissions.

The product MUST NOT provide benchmarking or ranking between unions.

---

## 3. Non-Negotiable Principles

1. **Tenant scope by default.**
2. **Fail closed:** authorization uncertainty blocks access.
3. **History MUST NOT be overwritten.**
4. **Relevant events are immutable and corrected through subsequent events.**
5. **AI MUST NOT publish operational interpretations without human validation.**
6. **AI MUST NOT have authority beyond the invoking user.**
7. **Critical decisions require risk-proportionate controls.**
8. **Rules MUST be temporally reproducible.**
9. **Every obligation MUST be explainable back to its normative source.**
10. **Every collection action MUST be explainable through rule, calculation, and evidence.**
11. **Official data MUST be prioritized when classification, calculation, or collection is affected.**
12. **Human work MUST be orchestrated by the platform rather than parallel controls.**
13. **Cross-tenant data MUST NOT leak through UI, search, AI, logs, autocomplete, reports, or integrations.**
14. **Automation MUST NOT replace required legal or institutional authority.**

---

## 4. Multi-Tenant Model

Each contracting union, federation, or confederation operates within a tenant scope.

Tenant-scoped configuration includes:

- users;
- authorities;
- delegations;
- instruments;
- companies;
- establishments;
- rules;
- policies;
- contracts;
- integrations;
- financial accounts;
- templates;
- documents;
- workflows;
- tasks;
- notifications;
- scoring;
- forecasts.

Federation/confederation cross-entity access MUST use explicit links and permissions without breaking logical isolation.

---

## 5. Tenant Lifecycle

### 5.1 Structured onboarding

New tenants MUST use a GSBC-assisted onboarding wizard covering:

1. entity registration;
2. users and authorities;
3. delegations;
4. collective instruments;
5. territory/coverage;
6. classification criteria;
7. negotiation policy;
8. commercial contract and split;
9. financial account;
10. email;
11. collection/notice templates;
12. legal templates;
13. integrations;
14. compliance rules;
15. final validation;
16. activation.

### 5.2 Go-Live Gate

Production activation requires mandatory readiness.

Before Go-Live, configuration, imports, interpretation, simulations, and testing MAY occur, but the system MUST NOT execute:

- real collections;
- real external communications;
- real financial movements.

Go-Live requires dual approval:

- GSBC technical/operational readiness;
- entity approval by President, Vice-President, or formally delegated authority.

Approval MUST require MFA and immutable audit.

### 5.3 Termination

Upon contract termination:

- new collections and operations are blocked;
- tenant becomes read-only;
- documents, history, audit, financial records, and legal matters remain preserved.

Default read-only period: **3 years**.

### 5.4 Archival

After 3 years:

- tenant is archived;
- former entity users lose access;
- there is no ordinary contractual right to a final export;
- access is restricted to specifically authorized GSBC users for audit, legal defense, or legal obligations;
- every access is audited.

Legal/regulatory obligations and court orders override the contractual rule.

### 5.5 Reactivation

Archived tenants MAY be reactivated while preserving identity and history.

A full new onboarding or complete Go-Live process is NOT required.

A **Reactivation Integrity Check** MUST validate critical dependencies and selectively block only invalid, expired, or missing capabilities.

---

## 6. Users, Authorities, and Permissions

### 6.1 Entity authorities

President and board users receive managerial access according to permissions.

Formal authority for critical decisions belongs to:

- President;
- Vice-President;
- formal delegate within delegated scope.

### 6.2 Delegation

Delegation is a formal audited object containing:

- delegator;
- delegate;
- validity;
- scope;
- powers;
- usage history.

### 6.3 GSBC internal roles

Base roles:

- Owner;
- Administrator;
- Operations/Compliance;
- Finance;
- Legal;
- Service/Support.

Roles SHOULD be permission bundles rather than rigid architectural constraints.

### 6.4 View vs execute

View and execute permissions MUST be independent and granular across tenant, entity, module, information type, and action.

### 6.5 MFA

MFA is mandatory at login for Owner, Administrator, Finance, Legal, President, Vice-President, and delegates with critical authority.

Other profiles MAY have configurable MFA.

Sensitive actions require step-up MFA even during an authenticated session.

### 6.6 Maker-checker

Dual approval is configurable by module, tenant, amount, risk, and action.

High-impact bulk financial, legal, or external-communication operations MUST use maker-checker.

---

## 7. Collective Instruments

The system MUST support CCTs, ACTs, amendments, corrections, normative decisions/judgments, and other documents that create, modify, supplement, or terminate obligations.

In the MVP, instruments are provided/uploaded by the contracting entity. Automatic Mediador/MTE integration is a later evolution.

Mandatory interpretation flow:

**AI interprets → GSBC reviews → entity or authorized GSBC validator approves → rule is published.**

AI interpretation MUST NOT directly produce operational effects.

Every rule MUST trace to instrument, version, clause, paragraph/item, page, and source excerpt.

Traceability MUST support:

**rule → calculation → communication → charge → notice → negotiation → legal dossier.**

Base instruments remain preserved. Amendments/corrections modify only applicable rules. Expired rules remain available for historical reconstruction.

Conflicts identified by AI require GSBC analysis and entity validation before publication. If discovered during collections, only affected obligations/periods are suspended; unrelated flows continue. Suspension freezes the operational clock.

---

## 8. Companies, Establishments, and Coverage

Discovery MAY start from an entity-provided base or automated research using official CNPJ data, primary/secondary CNAEs, geography, qualified business contacts, and authorized APIs/sources.

Activation flow:

**AI identifies → GSBC reviews → entity validates → CNPJ becomes operationally in-scope.**

Unvalidated leads MUST NOT generate obligations or financial estimates.

Official-source monitoring runs daily at **06:00** under the configured operational timezone/calendar.

It MUST monitor existing CNPJs and discover potential new ones. Potentially impactful official changes create review tasks before coverage/rules/obligations change.

The data model MUST support corporate group, company, establishments/CNPJs, and relevant corporate genealogy.

Classification, instrument, obligation, debt, and history MAY differ by establishment.

Succession, merger, incorporation, spin-off, transformation, or transfer MAY create potential relationships and GSBC review, but MUST NOT automatically transfer debt.

Closed/suspended/inactive statuses MUST be flagged and MAY stop future obligations where legally applicable without removing historical debts.

CNAE changes create alerts/review and MUST NOT automatically suspend existing collections.

---

## 9. Obligations and Official Data

The system MUST support:

1. company-owned financial obligations;
2. duties to deduct/collect and remit amounts;
3. non-financial compliance obligations.

Non-financial examples include wage floors, meal/food benefits, childcare, insurance, health plans, working hours, time banks, premiums, and other normative clauses.

Non-financial evidence is supplied by the contracting entity.

For classification/calculation/collection data, legally and technically accessible official sources MUST be prioritized, including CNPJ, RAIS, GFIP, eSocial, and other relevant official sources.

Implementation MUST validate lawful access, purpose, technical availability, credentials, and permissions before assuming integration.

---

## 10. Retroactivity and Homologation

Retroactive instruments MUST trigger detection, reconstruction of affected periods, old/new rule comparison, payment consideration, difference calculation, new obligations/differences, and preserved history.

Retroactive interpretation correction without a new instrument requires entity authorization by President, Vice-President, or formal delegate and step-up MFA.

Before approval, a non-production impact simulation MUST show affected CNPJs, periods, open charges, additional amounts, overpayments/credits, negotiations, and legal matters. The impact report is preserved.

A sandbox/homologation layer MUST exist for instruments, rules, policies, models, and relevant changes. Simulations MUST NOT modify production.

Promotion records tester, results, approver, version, and effective date.

A completely segregated demo tenant using synthetic data MUST exist.

---

## 11. Preventive and Post-Due Collections

Pre-due preventive communication includes basis, amount, due date, and payment link/boleto and does NOT count as a collection attempt.

Timing is configurable by **entity → instrument → obligation**, with valid specific rules overriding general rules.

After default:

- 3 attempts;
- 3 business days between completed attempts.

Business-day calculation includes weekends and national, state, and municipal holidays applicable to the establishment/CNPJ.

Recipient escalation MAY progressively add Finance, HR/Labor Relations, Legal, and Management according to configurable policy. Recipient escalation does not change attempt count or timing.

---

## 12. Multichannel Collection

Each formal attempt initially requires both:

- email;
- WhatsApp.

GSBC operates its own WhatsApp channel while representing the corresponding union entity.

Every communication MUST be tenant-scoped and linked to the represented union, CNPJ, obligation/case, template, and automation/operator.

Attempt and channel delivery are distinct entities.

If one channel fails, only that channel is retried. Successful channel evidence remains valid.

An attempt completes at the timestamp of the last required successful delivery (`attempt_completed_at`). The next 3-business-day period begins from that time.

Hard bounce, invalid address, or definitive delivery failure:

- does not count as delivery;
- suspends progression;
- creates correction/enrichment work;
- preserves evidence.

Any valid company response through any channel immediately:

- interrupts automation;
- cancels pending sends/retries;
- routes to human service;
- preserves the attempt in its actual state, even if incomplete.

---

## 13. Business Contacts

Each CNPJ MAY have multiple contacts classified by purpose, priority, source, validation status, and usage history.

Categories MAY include Finance, Tax, HR, Legal, Labor Relations, Management, and General.

Definitive failure MAY trigger automated contact enrichment. Discovered contacts are candidates and require GSBC human validation before use.

The product MUST limit enrichment and collection outreach to **professional/institutional channels**.

Private personal contact data MUST NOT be used by this mechanism.

At extrajudicial notice stage, professional contacts of partners, administrators, or legal representatives MAY be used when source, relationship, purpose, and usage are traceable.

---

## 14. Human Service and SLA

Any company response routes to human handling and freezes the collection clock.

Upon authorized resumption, the workflow continues from the exact checkpoint and remaining time.

General maximum service SLA: **15 business days**.

Shorter SLAs MAY be configured by category, queue, criticality, or tenant.

Precedence:

1. applicable legal deadline;
2. tenant exception;
3. global GSBC SLA policy.

If SLA expires:

- collection does not automatically resume;
- case remains suspended;
- violation is recorded;
- management escalation occurs.

SLAs use the establishment/CNPJ business calendar.

If separable, each CNPJ has its own clock. If an indivisible matter spans multiple CNPJs, the most conservative calendar producing the earliest effective deadline applies.

---

## 15. Extrajudicial and Legal Escalation

After the third valid unresolved attempt, an extrajudicial notice is issued on the next business day using a pre-approved, versioned template and digital signature where applicable.

Notice period: **10 calendar days**.

After expiration, the entity has **10 calendar days** to:

- approve legal action;
- decline action;
- suspend for a defined period;
- request negotiation.

Justification is mandatory.

Without a decision, the flow automatically enters legal preparation.

Critical decisions belong to President, Vice-President, or formal delegate within authority.

---

## 16. Disputes

GSBC and the entity participate in analysis, but the entity has final authority. GSBC technical disagreement remains in audit.

If only one period in a consolidated charge is disputed, the system separates and suspends only that period while others continue, reissuing payment documents if necessary.

Coverage disputes do not automatically stop collections; suspension requires express entity decision.

If a judicial decision finds no representation for a period, the system identifies affected obligations, cancels open balances, recalculates history, converts improper payments into company credits, preserves originals, and links changes to the decision.

If representation is recognized historically, the system reconstructs the recognized period using applicable instruments/rules, official bases, payments, differences, interest, and penalties.

---

## 17. Financial Engine

Boleto/payment links are issued by an integrated external financial platform.

Reconciliation occurs in GSBC.

Funds MUST be handled by the payment institution/appropriate account; GSBC SHOULD NOT directly custody funds.

The financial institution performs contractual splits.

Contract management is core. AI MAY extract GSBC/entity/third-party percentages, validity, temporal changes, fees, extrajudicial/judicial rules, termination, and other financial terms. Production requires GSBC validation.

Payment confirmation automatically reconciles, updates obligations, generates internal notification, and applies the validated split.

Partial payments reconcile received amounts and keep the remaining balance delinquent.

Unidentified payments go to a GSBC reconciliation queue and MUST NOT be auto-assigned.

Overpayment/duplicate payment automatically creates company credit after settling the obligation. Each future use of credit requires entity authorization.

Reversals reopen obligations, restore/recalculate balances, preserve paid-then-reversed history, and resume the correct workflow point.

Each establishment/CNPJ has an immutable historical financial ledger.

---

## 18. Interest, Penalties, Negotiation, and Credits

Interest/penalty precedence:

1. collective instrument;
2. entity contract/specific rule;
3. applicable law.

AI MAY identify the rule, source, and validity, but production requires human validation. Calculation memory records source and precedence.

GSBC MAY negotiate within each entity's policy, including maximum discount, installments, minimum down payment, deadlines, and other authority limits.

Exceptions require President, Vice-President, or formal delegate, justification, and audit.

Credits MAY arise from overpayments, duplicates, retroactive recalculation, judicial decisions, and other valid events. Recognition MAY be automatic, but each use/offset requires entity authorization.

---

## 19. Legal Dossier

Persistent default MAY progress to legal preparation.

Legal work may be indicated or operated by GSBC subject to legal validation and may use a specialized judicial monitoring API/provider.

Initial product output is a downloadable **pre-litigation PDF dossier with draft initial petition and supporting documents ready for authorized filing**.

GSBC does NOT automatically file lawsuits in the initial scope.

AI MAY select and order applicable instruments, coverage evidence, calculation memory, communications, delivery evidence, notice, debt history, and other case documents, recording what was included and why.

Each obligation/action type uses a pre-approved, versioned legal template.

AI MUST NOT invent legal theories freely; it fills permitted facts, values, documents, specific foundations, and allowed requests.

The system only flags limitation/prescription risk. It does NOT autonomously decide prescription. The final decision is jointly governed by Legal and the entity, recording legal opinion, entity manifestation, final decision, operator, and rationale.

---

## 20. Compliance Score

Each CNPJ has a dynamic compliance status/index, potentially including Regular, Attention, Delinquent, Notified, Negotiating, and Judicialized.

Inputs MAY include obligations, payments, breaches, disputes, notices, negotiations, litigation, and history.

GSBC provides a default matrix; entities MAY customize weights/criteria. Models are versioned.

Score MAY increase monitoring, generate alerts, and prioritize GSBC queues.

Score MUST NOT create legal/financial obligations or alter the formal collection sequence.

Regularization does not erase history. After five years, negative historical weight MAY be reduced, while the event remains permanently recorded.

A new model version automatically recalculates history while preserving both:

- the score originally calculated at the time;
- the historical score recalculated under the current model.

New models MUST be homologated by GSBC before producing operational consequences.

---

## 21. Revenue Potential, Forecasts, and Targets

Pipeline:

**Potential identified → potential qualified → obligation constituted → charged → negotiated → received/recovered.**

No financial potential estimate is produced before CNPJ validation.

For validated CNPJs, automatic forecasts cover 3, 6, and 12 months.

Metrics:

- Gross Projected Revenue;
- Weighted Projected Revenue.

Weighted revenue considers history and compliance score. Methodology MUST be explainable and versioned.

Entities MAY set monthly, quarterly, and annual targets.

Comparison:

**Target → Gross Projected Revenue → Weighted Revenue → Charged → Received.**

Predictive intelligence MAY warn of target risk and explain factors such as delinquency, base reduction, concentration, employee decline, or disputes, and suggest GSBC priorities.

The system SHOULD support concentration and major-contributor loss/default impact simulation.

---

## 22. Aggregated Intelligence

GSBC MAY use anonymized and aggregated cross-tenant data to improve AI, scoring, forecasts, and product intelligence only when union/company/CNPJ identity is not exposed and reasonable re-identification is prevented.

Aggregated intelligence MUST be separated from individual tenant operational environments.

Two layers exist:

1. GSBC global intelligence;
2. tenant-specific configuration.

Global model changes MAY recalculate history, but operational effects require GSBC homologation.

---

## 23. Tasks, Queues, and Control Tower

GSBC has an internal task/workflow engine.

Tasks MAY contain tenant, origin/case, owner, team/queue, priority, SLA, status, comments, documents, links, and history.

Automatic routing considers specialization, portfolio, tenant, type, priority, SLA, workload, availability, and permissions.

Manual reassignment is allowed and audited.

Operator availability states such as active, vacation, leave, and unavailable affect routing and MAY trigger redistribution.

Specialized queues include, for example:

- Compliance/Coverage;
- Collections;
- Service/Disputes;
- Finance;
- Negotiation;
- Legal;
- Instruments/AI.

SLA escalation MAY notify responsible users/managers, raise priority, redistribute, and record violations.

GSBC managers have an operational Control Tower showing volume, backlog, unassigned tasks, capacity, SLA, violations, bottlenecks, productivity, and distribution, with authorized intervention.

Productivity SHOULD NOT be measured only by closed-task volume; quality, rework, time, and complexity must be considered in future metrics.

---

## 24. Collaborative Timeline

Each task/case has a timeline containing comments, mentions, documents, decisions, events, status changes, and responsibility changes.

Two immutable visibility classes exist:

1. **GSBC Internal**;
2. **Shared with Tenant**.

Visibility MUST NOT change after publication.

Comments MUST NOT be physically edited or deleted.

Corrections occur through linked rectification events.

---

## 25. Documents and Evidence

Attachments/documents are immutable.

A new version does not physically replace the prior file.

Relationships MAY include new version, rectification, and replacement.

Relevant documents SHOULD record, where applicable:

- file hash;
- timestamp;
- author;
- version;
- digital signature;
- signature proof;
- linked event/process.

The repository MUST support a verifiable documentary chain of custody.

External communications MUST preserve sender, recipients, timestamp, subject, actual sent content, attachments, technical identifier, delivery status, bounce/failure, read status where technically available, responses, and other available evidence.

Communication records are immutable and linked to CNPJ, obligation, period, and case.

---

## 26. Notification Center

Tasks require action; notifications require awareness.

The Notification Center exists only inside GSBC. Internal notifications are NOT sent by email or WhatsApp.

Formal acknowledgement is not required. Technical view/read state MAY be recorded but MUST NOT constitute approval.

Users MAY customize configurable notifications. GSBC MAY define mandatory categories.

Permissions apply to notifications.

The center has a recent operational area and searchable history. Audit-relevant events are not deleted merely because a notification is archived.

---

## 27. Global Search and Semantic AI Search

Global search MUST find authorized CNPJs, company names, unions, instruments, obligations, charges, boletos, payments, disputes, negotiations, tasks, communications, documents, and court cases.

Authorization MUST be enforced at query time. Unauthorized data MUST NOT leak through autocomplete, titles, counts, suggestions, or metadata.

Natural-language semantic search is exclusive to GSBC internal users.

It operates only over data authorized to the authenticated user and SHOULD cite the underlying records/sources.

AI MUST NOT bypass RBAC or tenant scope.

---

## 28. Operational AI

Authorized GSBC users MAY issue natural-language operational commands such as suspending collections, creating tasks, simulating impact, preparing notices, or recalculating obligations.

AI inherits the exact permissions and authority of the invoking user.

Low-risk, reversible actions within authority MAY execute directly.

Critical actions MUST first present proposed action, scope, affected objects, and expected consequences and require explicit confirmation.

MFA, maker-checker, and formal authority remain mandatory where applicable.

AI audit MUST record original command, model/agent, prompt/instruction version, sources, interpretation, output, confidence where available, proposed action, parameters, approval/rejection, reviewer, execution, result, and divergences.

---

## 29. Bulk Operations and Circuit Breakers

Every AI-commanded bulk operation MUST have a mandatory pre-execution impact simulation showing population, CNPJs, periods, obligations, values, communications, tasks/processes, exceptions, and predicted failures.

Approval applies only to the simulated scope.

Material data changes between simulation and execution require a new simulation and approval.

High-impact financial, legal, or external-communication bulk actions require maker-checker.

Bulk processing MUST implement configurable circuit breakers by operation type, including thresholds for abnormal error rate, financial impact, CNPJ count, integration failure, expected-vs-actual divergence, critical errors, and other configured criteria.

On trip:

- no new items start;
- completed work is preserved;
- pending/failed items are identified;
- batch is frozen;
- human review is created.

Resumption MUST be idempotent and MUST NOT duplicate completed effects.

---

## 30. Audit

Audit trails are immutable.

No user, including Owner or Administrator, may edit or delete audit events.

Corrections occur through linked rectification events.

Audit coverage includes authentication, permissions, delegations, approvals, rules, calculations, state changes, communications, payments, reconciliation, credits, negotiations, decisions, documents, AI, bulk operations, and exceptional archived-tenant access.

---

## 31. Dashboards

Union dashboards SHOULD include covered companies, overall compliance, expected values, charged, received, delinquency, negotiation, extrajudicial notices, legal cases, credits, pending decisions, revenue potential, forecasts, and targets.

Drill-down:

**entity → company → establishment/CNPJ → obligation → period.**

Federation/confederation dashboards MAY consolidate linked unions, companies, CNPJs, collections, recoveries, delinquency, compliance, legal matters, and operational performance according to permissions.

They MUST NOT create comparative union rankings.

---

## 32. Temporal Reproducibility

History is a core requirement.

The platform MUST be able to answer:

- which rule applied to a given period;
- which instrument created it;
- which calculation was made;
- which model version existed;
- who approved;
- which communications were sent;
- which payments occurred;
- which decision existed at that time.

Current state MUST NOT be the sole persisted representation of relevant facts.

---

## 33. Essential Precedence Rules

- Valid specific rules override general rules where permitted.
- More restrictive applicable legal deadlines override operational SLAs.
- AI/operators never exceed formal authority.
- A valid company response interrupts automation even if a multichannel attempt is incomplete.
- Suspension freezes the operational clock unless an explicit legal rule requires otherwise.
- New versions supplement history; they do not erase original historical facts.

---

## 34. Initial Out of Scope / Later Evolution

Not MVP blockers:

- companies as tenants;
- automatic court filing;
- mandatory automatic Mediador/MTE integration;
- inter-union benchmarking;
- private personal channels of partners/administrators;
- AI with independent authority;
- internal notifications through email/WhatsApp.

---

## 35. Premium Product Standard

GSBC MUST be designed as premium B2B SaaS, including:

- consistent UX;
- clear navigation;
- useful empty/error states;
- responsive behavior;
- operational tables;
- filters;
- drill-down;
- contextual traceability;
- feedback for long-running operations;
- destructive-action prevention;
- AI explainability;
- performance for large datasets;
- security by default;
- accessibility as a quality requirement;
- professional, decision-oriented language.

---

## 36. Engineering Invariants

Implementation MUST NOT:

1. create implicit cross-tenant access;
2. erase financial/audit history;
3. let AI publish rules without validation;
4. let score alter the formal collection sequence;
5. automatically transfer debt after corporate events;
6. automatically assign unidentified payments;
7. use credits without entity authorization;
8. count definitive delivery failures as valid delivery;
9. restart a collection sequence where checkpoint resumption is required;
10. change timeline visibility after publication;
11. physically edit/delete historical comments or attachments;
12. execute AI bulk actions without simulation;
13. let a maker approve their own action where checker is mandatory;
14. continue a batch after its circuit breaker trips;
15. use private personal data for collection contact enrichment;
16. produce operational effects from an unapproved global model;
17. perform real operations before Go-Live;
18. let former users access archived tenants;
19. expose unauthorized results through search/AI/autocomplete;
20. let administrative privilege erase audit trails.

---

## 37. Documentation Governance

The Portuguese `docs/PRODUCT.md` is the canonical product and functional source of truth.

Derived documents MUST remain consistent with it:

- `docs/DOMAIN_RULES.md`;
- `docs/ARCHITECTURE.md`;
- `docs/SECURITY.md`;
- `docs/MULTITENANCY.md`;
- `docs/DESIGN_SYSTEM.md`;
- `docs/DECISIONS.md`.

`docs/PRODUCT.en.md` MUST remain semantically equivalent to the canonical Portuguese version.

Material product changes MUST identify affected requirements, assess impact, record the decision, update derived documents, and preserve decision history.

---

## 38. Next Phase

Before broad autonomous implementation, this Constitution MUST undergo critical review for contradictions, gaps, legal/security risks, authority ambiguities, temporal inconsistencies, external dependencies, non-implementable requirements, and MVP boundaries.

Technical documents SHOULD then be derived from the approved Constitution before greater engineering-agent autonomy is enabled.
