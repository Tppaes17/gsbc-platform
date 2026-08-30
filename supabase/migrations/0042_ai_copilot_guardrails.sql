-- GSBC — STG-12 completion hardening: AI guardrails linked to Policy Engine.
--
-- Keeps copilots at low autonomy and makes any human use of AI output
-- auditable through policy_decisoes.

alter table ai_interacoes
  add column autonomy_level integer not null default 1 check (autonomy_level between 0 and 4),
  add column context_safety jsonb not null default '{}'::jsonb,
  add column policy_decision_id uuid references policy_decisoes(id) on delete set null;

comment on column ai_interacoes.autonomy_level is
  'STG-12 autonomy level at generation/use time. Initial copilots must stay at levels 1-2; level 4 is not permitted in this stage.';
comment on column ai_interacoes.context_safety is
  'Prompt/context safety metadata such as redacted instruction-like content and truncation flags.';
comment on column ai_interacoes.policy_decision_id is
  'Policy decision associated with accepting or using AI output, when applicable.';

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
    'ai.suggestion_acceptance',
    'policy_decision_runtime',
    'ALLOW',
    'DENY',
    false,
    true,
    false,
    false,
    'medium',
    'Aceitar ou rejeitar sugestão de IA exige usuário GSBC e mantém decisão humana auditada.'
  ),
  (
    'ai.draft_send_notification',
    'policy_decision_runtime',
    'REQUIRE_CONFIRMATION',
    'DENY',
    false,
    true,
    false,
    false,
    'high',
    'Usar rascunho de IA em notificação exige confirmação humana explícita e registro de política.'
  )
on conflict (action_code) do nothing;

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
  v_decision_id uuid;
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
    )
    returning id into v_decision_id;

    return jsonb_build_object('allowed', false, 'result', v_result, 'reason', v_reason, 'decision_id', v_decision_id);
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
  )
  returning id into v_decision_id;

  return jsonb_build_object(
    'allowed', v_allowed,
    'result', v_result,
    'reason', v_reason,
    'policy_id', v_req.policy_id,
    'policy_version', coalesce(v_policy_versao, v_req.policy_versao),
    'risk_level', v_req.risk_level,
    'decision_id', v_decision_id
  );
end;
$$;
