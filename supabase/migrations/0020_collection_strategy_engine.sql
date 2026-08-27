-- GSBC — Rodada 19 (STG-02): Collection Strategy Engine
--
-- Motor de cobrança/recobrança determinístico (regra 5.8 do AGENTS.md —
-- nenhuma IA envolvida): régua de contatos com cadência configurável
-- (D+N), elegibilidade checada antes de cada execução, idempotência,
-- auditoria completa. Conceitos separados conforme docs/roadmap-stagings.md
-- (STG-02): Strategy, Step, Enrollment, Execution.
--
-- DECISÃO CONFIRMADA COM O USUÁRIO (2026-08-27, substitui a decisão da
-- Rodada 14): disparo de e-mail nos steps da régua acontece de forma
-- 100% autônoma via cron (Vercel Cron), sem clique de um Owner por
-- envio — diferente da decisão original ("nunca agendamento autônomo
-- sem supervisão"), mantida apenas para a notificação extrajudicial
-- (STG-09, ainda não construída, continua exigindo aprovação humana).
-- O que preserva segurança aqui: toda execução passa por
-- isStillEligible() antes de agir (pagamento, negociação, suspensão,
-- cancelamento e pausa manual sempre interrompem a régua), e iniciar a
-- régua em si continua sendo uma ação explícita da equipe GSBC (regra 6).

-- =========================================================================
-- collection_strategies / collection_strategy_steps
-- =========================================================================
create table collection_strategies (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table collection_strategies is 'Régua de cobrança — definida pela GSBC, não por sindicato (regra 6). Sem tenant_id: é um padrão operacional da plataforma, não um dado de cliente.';

create table collection_templates (
  id uuid primary key default gen_random_uuid(),
  canal text not null check (canal in ('email')),
  nome text not null,
  versao integer not null default 1,
  assunto text,
  corpo_texto text not null,
  corpo_html text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table collection_templates is 'Templates de mensagem, versionados por linha nova (nunca editados in-place — histórico de qual versão foi realmente enviada fica em collection_executions.template_id).';

create table collection_strategy_steps (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references collection_strategies(id) on delete cascade,
  ordem integer not null,
  dias_apos_inscricao integer not null,
  canal text not null check (canal in ('email', 'tarefa_humana', 'wait', 'escalonamento')),
  template_id uuid references collection_templates(id),
  descricao text not null,
  created_at timestamptz not null default now(),
  constraint collection_strategy_steps_ordem_unique unique (strategy_id, ordem),
  constraint collection_strategy_steps_email_precisa_template
    check (canal <> 'email' or template_id is not null)
);

comment on table collection_strategy_steps is 'Um step por posição na régua (D+N). canal=wait é só espaçador (sem ação); canal=escalonamento marca o enrollment como escalated e para a régua — não dispara notificação extrajudicial sozinho (isso é STG-09, com aprovação humana).';

create index collection_strategy_steps_strategy_id_idx on collection_strategy_steps (strategy_id, ordem);

-- =========================================================================
-- collection_enrollments — uma empresa/cobrança "matriculada" numa régua
-- =========================================================================
create table collection_enrollments (
  id uuid primary key default gen_random_uuid(),
  cobranca_id uuid not null references cobrancas(id) on delete cascade,
  strategy_id uuid not null references collection_strategies(id),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'cancelled', 'escalated')),
  current_step_ordem integer not null default 1,
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references users(id),
  paused_at timestamptz,
  paused_by uuid references users(id),
  paused_reason text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  updated_at timestamptz not null default now()
);

comment on table collection_enrollments is 'Uma cobrança só pode ter 1 enrollment ATIVO por vez (índice parcial abaixo) — pode ser reinscrita depois de completed/cancelled se necessário.';

create unique index collection_enrollments_cobranca_active_unique
  on collection_enrollments (cobranca_id)
  where status = 'active';

create index collection_enrollments_status_idx on collection_enrollments (status);
create index collection_enrollments_tenant_id_idx on collection_enrollments (tenant_id);

create trigger set_updated_at before update on collection_enrollments
  for each row execute function public.set_updated_at();

-- =========================================================================
-- collection_executions — uma linha por step efetivamente processado
-- =========================================================================
create table collection_executions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references collection_enrollments(id) on delete cascade,
  step_id uuid not null references collection_strategy_steps(id),
  scheduled_for timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'sent', 'completed', 'failed', 'skipped', 'cancelled')),
  attempt_count integer not null default 0,
  last_error text,
  resultado jsonb,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint collection_executions_idempotency_unique unique (enrollment_id, step_id)
);

comment on table collection_executions is 'Idempotência via unique(enrollment_id, step_id): a régua nunca processa o mesmo step duas vezes para o mesmo enrollment, mesmo com sweeps de cron sobrepostos.';

create index collection_executions_scheduled_idx on collection_executions (status, scheduled_for) where status = 'scheduled';
create index collection_executions_enrollment_id_idx on collection_executions (enrollment_id);

-- =========================================================================
-- RLS
-- =========================================================================
alter table collection_strategies enable row level security;
alter table collection_templates enable row level security;
alter table collection_strategy_steps enable row level security;
alter table collection_enrollments enable row level security;
alter table collection_executions enable row level security;

-- Configuração da régua (strategies/templates/steps) é interna da GSBC —
-- mesmo padrão de "GSBC executa" já usado pra outras entidades de config.
create policy collection_strategies_select on collection_strategies for select
  using (public.is_platform_staff(auth.uid()));
create policy collection_templates_select on collection_templates for select
  using (public.is_platform_staff(auth.uid()));
create policy collection_strategy_steps_select on collection_strategy_steps for select
  using (public.is_platform_staff(auth.uid()));

-- Enrollments/executions são visíveis também ao sindicato dono da cobrança
-- (regra 6 — "a plataforma registra", mesma transparência de
-- cobranca_eventos/notificacoes). Escrita fica só com staff GSBC pelo
-- client normal; o cron usa service role (contorna RLS por design).
create policy collection_enrollments_select on collection_enrollments for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

create policy collection_enrollments_insert on collection_enrollments for insert
  with check (public.is_platform_staff(auth.uid()));

create policy collection_enrollments_update on collection_enrollments for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy collection_executions_select on collection_executions for select
  using (
    public.is_platform_staff(auth.uid())
    or exists (
      select 1 from collection_enrollments e
      where e.id = collection_executions.enrollment_id
        and e.tenant_id in (select public.user_tenant_ids(auth.uid()))
    )
  );

grant select on public.collection_strategies to authenticated;
grant select on public.collection_templates to authenticated;
grant select on public.collection_strategy_steps to authenticated;
grant select, insert, update on public.collection_enrollments to authenticated;
grant select on public.collection_executions to authenticated;

-- =========================================================================
-- Seed: a régua padrão do exemplo do próprio roadmap (STG-02)
-- =========================================================================
insert into collection_templates (id, canal, nome, assunto, corpo_texto, corpo_html) values
  (
    '00000000-0000-0000-0000-000000000101',
    'email',
    'Cobrança padrão — e-mail inicial',
    '{{sindicato.nome}} — Pendência identificada: {{cobranca.valor}}',
    E'Prezados, {{empresa.razao_social}},\n\nIdentificamos uma pendência no valor de {{cobranca.valor}}, com vencimento em {{cobranca.vencimento}}.\n\nEm nome de {{sindicato.nome}}, solicitamos a regularização o quanto antes.\n\nAtenciosamente,\nGSBC — Gestora Sindical de Benefícios & Compliance',
    '<p>Prezados, {{empresa.razao_social}},</p><p>Identificamos uma pendência no valor de <strong>{{cobranca.valor}}</strong>, com vencimento em <strong>{{cobranca.vencimento}}</strong>.</p><p>Em nome de {{sindicato.nome}}, solicitamos a regularização o quanto antes.</p><p>Atenciosamente,<br>GSBC — Gestora Sindical de Benefícios &amp; Compliance</p>'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'email',
    'Cobrança padrão — follow-up',
    '{{sindicato.nome}} — Lembrete: pendência de {{cobranca.valor}} em aberto',
    E'Prezados, {{empresa.razao_social}},\n\nReforçamos o contato anterior sobre a pendência de {{cobranca.valor}}, vencida em {{cobranca.vencimento}}.\n\nPor favor, entre em contato com {{sindicato.nome}} para regularização.\n\nAtenciosamente,\nGSBC — Gestora Sindical de Benefícios & Compliance',
    '<p>Prezados, {{empresa.razao_social}},</p><p>Reforçamos o contato anterior sobre a pendência de <strong>{{cobranca.valor}}</strong>, vencida em <strong>{{cobranca.vencimento}}</strong>.</p><p>Por favor, entre em contato com {{sindicato.nome}} para regularização.</p><p>Atenciosamente,<br>GSBC — Gestora Sindical de Benefícios &amp; Compliance</p>'
  );

insert into collection_strategies (id, nome, descricao) values
  (
    '00000000-0000-0000-0000-000000000100',
    'Cobrança padrão',
    'Régua padrão da GSBC: e-mail inicial, follow-up, tarefa de contato humano, e sinalização de elegibilidade para escalonamento — mesmo exemplo do roadmap (STG-02).'
  );

insert into collection_strategy_steps (strategy_id, ordem, dias_apos_inscricao, canal, template_id, descricao) values
  ('00000000-0000-0000-0000-000000000100', 1, 0, 'email', '00000000-0000-0000-0000-000000000101', 'E-mail inicial'),
  ('00000000-0000-0000-0000-000000000100', 2, 5, 'email', '00000000-0000-0000-0000-000000000102', 'Follow-up por e-mail'),
  ('00000000-0000-0000-0000-000000000100', 3, 10, 'tarefa_humana', null, 'Tarefa: contato telefônico com a empresa'),
  ('00000000-0000-0000-0000-000000000100', 4, 15, 'tarefa_humana', null, 'Tarefa: segunda tentativa de contato humano'),
  ('00000000-0000-0000-0000-000000000100', 5, 25, 'escalonamento', null, 'Elegível para escalonamento — aguarda decisão humana (STG-09)');
