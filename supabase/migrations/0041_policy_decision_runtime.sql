-- GSBC — STG-11 completion hardening: explicit policy decision runtime.
--
-- This is intentionally not a rules language. It is a small, auditable
-- action matrix whose outcome is deterministic and logged in policy_decisoes.

insert into policies (id, nome, descricao, categoria, enforcement, parametros)
values (
  'policy_decision_runtime',
  'Runtime de decisão de políticas',
  'Avalia ações críticas contra uma matriz explícita de requisitos e registra resultado, motivo, inputs e versão em policy_decisoes. Não é DSL e não executa a ação avaliada.',
  'automacao',
  'aplicada',
  '{}'::jsonb
)
on conflict (id) do nothing;

create table policy_action_requirements (
  id uuid primary key default gen_random_uuid(),
  action_code text not null unique,
  policy_id text not null references policies(id),
  policy_versao integer not null default 1,
  pass_result text not null default 'ALLOW' check (pass_result in (
    'ALLOW',
    'DENY',
    'REQUIRE_CONFIRMATION',
    'REQUIRE_MFA',
    'REQUIRE_MAKER_CHECKER',
    'REQUIRE_ENTITY_AUTHORITY',
    'GSBC_VETO'
  )),
  fail_result text not null default 'DENY' check (fail_result in (
    'ALLOW',
    'DENY',
    'REQUIRE_CONFIRMATION',
    'REQUIRE_MFA',
    'REQUIRE_MAKER_CHECKER',
    'REQUIRE_ENTITY_AUTHORITY',
    'GSBC_VETO'
  )),
  requires_owner boolean not null default false,
  requires_platform_staff boolean not null default true,
  requires_mfa boolean not null default false,
  requires_maker_checker boolean not null default false,
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'critical')),
  reason text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table policy_action_requirements is
  'Matriz simples de ações críticas para o runtime de políticas STG-11. Não é linguagem própria; cada linha define requisitos explícitos e resultado esperado.';

create trigger set_updated_at before update on policy_action_requirements
  for each row execute function public.set_updated_at();

insert into policy_action_requirements (
  action_code,
  policy_id,
  pass_result,
  fail_result,
  requires_owner,
  requires_platform_staff,
  requires_mfa,
  requires_maker_checker,
  risk_level,
  reason
) values
  (
    'policy.toggle',
    'policy_decision_runtime',
    'ALLOW',
    'REQUIRE_ENTITY_AUTHORITY',
    true,
    true,
    false,
    false,
    'high',
    'Ativar/desativar política exige autoridade institucional Owner.'
  ),
  (
    'negociacao.discount_approval',
    'desconto_requer_aprovacao',
    'REQUIRE_MAKER_CHECKER',
    'REQUIRE_ENTITY_AUTHORITY',
    true,
    true,
    false,
    true,
    'high',
    'Desconto exige segregação de decisão e aprovação humana.'
  ),
  (
    'finance.critical_execution',
    'policy_decision_runtime',
    'ALLOW',
    'DENY',
    true,
    true,
    true,
    false,
    'critical',
    'Ação financeira crítica exige step-up MFA antes de execução.'
  ),
  (
    'ai.tool_execution',
    'policy_decision_runtime',
    'GSBC_VETO',
    'GSBC_VETO',
    true,
    true,
    false,
    false,
    'critical',
    'Execução autônoma de ferramenta por IA permanece vetada até STG-12 cumprir evals, RAG isolation e circuit breaker.'
  )
on conflict (action_code) do nothing;

alter table policy_action_requirements enable row level security;

create policy policy_action_requirements_select on policy_action_requirements for select
  using (public.is_platform_staff(auth.uid()));

grant select on public.policy_action_requirements to authenticated;

create or replace function public.evaluate_policy_action(
  p_action_code text,
  p_tenant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_inputs jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req policy_action_requirements%rowtype;
  v_policy_ativa boolean;
  v_policy_versao integer;
  v_result text;
  v_reason text;
  v_allowed boolean := false;
  v_actor uuid := auth.uid();
  v_is_owner boolean := public.is_owner(auth.uid());
  v_is_staff boolean := public.is_platform_staff(auth.uid());
begin
  if v_actor is null then
    raise exception 'Usuário autenticado obrigatório para avaliar política.';
  end if;

  select * into v_req
  from policy_action_requirements
  where action_code = p_action_code
    and active = true;

  if not found then
    v_result := 'DENY';
    v_reason := 'Ação sem requisito de política registrado.';

    insert into policy_decisoes (policy_id, policy_versao, tenant_id, entity_type, entity_id, inputs, resultado, motivo)
    values (
      'policy_decision_runtime',
      1,
      p_tenant_id,
      p_entity_type,
      p_entity_id,
      jsonb_build_object('action_code', p_action_code, 'actor_id', v_actor) || coalesce(p_inputs, '{}'::jsonb),
      v_result,
      v_reason
    );

    return jsonb_build_object('allowed', false, 'result', v_result, 'reason', v_reason);
  end if;

  select ativa, versao into v_policy_ativa, v_policy_versao
  from policies
  where id = v_req.policy_id;

  if not coalesce(v_policy_ativa, false) then
    v_result := 'DENY';
    v_reason := 'Política associada está inativa.';
  elsif v_req.requires_platform_staff and not v_is_staff then
    v_result := 'DENY';
    v_reason := 'Ação exige usuário da plataforma GSBC.';
  elsif v_req.requires_owner and not v_is_owner then
    v_result := v_req.fail_result;
    v_reason := v_req.reason;
  elsif v_req.pass_result = 'GSBC_VETO' then
    v_result := 'GSBC_VETO';
    v_reason := v_req.reason;
  elsif v_req.requires_mfa then
    v_result := 'REQUIRE_MFA';
    v_reason := v_req.reason;
  elsif v_req.requires_maker_checker then
    v_result := 'REQUIRE_MAKER_CHECKER';
    v_reason := v_req.reason;
  else
    v_result := v_req.pass_result;
    v_reason := v_req.reason;
  end if;

  v_allowed := v_result = 'ALLOW';

  insert into policy_decisoes (policy_id, policy_versao, tenant_id, entity_type, entity_id, inputs, resultado, motivo)
  values (
    v_req.policy_id,
    coalesce(v_policy_versao, v_req.policy_versao),
    p_tenant_id,
    p_entity_type,
    p_entity_id,
    jsonb_build_object(
      'action_code', p_action_code,
      'actor_id', v_actor,
      'requires_owner', v_req.requires_owner,
      'requires_platform_staff', v_req.requires_platform_staff,
      'requires_mfa', v_req.requires_mfa,
      'requires_maker_checker', v_req.requires_maker_checker,
      'risk_level', v_req.risk_level
    ) || coalesce(p_inputs, '{}'::jsonb),
    v_result,
    v_reason
  );

  return jsonb_build_object(
    'allowed', v_allowed,
    'result', v_result,
    'reason', v_reason,
    'policy_id', v_req.policy_id,
    'policy_version', coalesce(v_policy_versao, v_req.policy_versao),
    'risk_level', v_req.risk_level
  );
end;
$$;

comment on function public.evaluate_policy_action is
  'STG-11 decision API: avalia uma action_code contra matriz simples, retorna ALLOW/DENY/REQUIRE_* ou GSBC_VETO e registra policy_decisoes. Não executa a ação avaliada.';

grant execute on function public.evaluate_policy_action(text, uuid, text, uuid, jsonb) to authenticated;
