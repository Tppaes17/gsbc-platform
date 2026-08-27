-- GSBC — Rodada 22: Portal de Regularização Empresarial (STG-05)
--
-- Terceiro tipo de principal na plataforma: além de staff GSBC e membros
-- de sindicato (users + memberships, tenant-escopado), agora um contato
-- de empresa (empresa_contatos) pode logar via magic link e ver só os
-- dados da própria empresa. Decisão confirmada com o usuário: reaproveitar
-- o Supabase Auth nativo (signInWithOtp/inviteUserByEmail) em vez de um
-- sistema de token bespoke fora do Supabase Auth — RLS continua sendo a
-- autoridade final (regra 2 do AGENTS.md) para este principal também,
-- exatamente como para todos os outros.
--
-- "Pagar" e "consultar parcelas" ficam de fora desta rodada (decisão
-- confirmada): não existe gateway de pagamento real (STG-06) nem
-- conceito de parcelamento no schema atual — nenhum dado/fluxo fake.

-- =========================================================================
-- empresa_contatos: colunas de acesso ao portal. Acesso nunca é
-- automático — só existe depois que um staff GSBC concede explicitamente
-- (decisão confirmada com o usuário, mesma lógica já usada para convite
-- de membership, Rodada 2).
-- =========================================================================
alter table empresa_contatos
  add column user_id uuid references users(id) on delete set null,
  add column portal_access_status text not null default 'none'
    check (portal_access_status in ('none', 'invited', 'active')),
  add column portal_invited_at timestamptz,
  add column portal_invited_by uuid references users(id) on delete set null;

comment on column empresa_contatos.portal_access_status is
  'none = nunca convidado. invited = staff concedeu acesso, aguardando '
  'primeiro login (clique no link). active = já logou pelo menos uma vez.';

create unique index empresa_contatos_user_id_idx on empresa_contatos (user_id)
  where user_id is not null;

-- invited -> active na confirmação de e-mail (clique no link de convite),
-- mesmo padrão de handle_user_email_confirmed() para memberships (Rodada
-- 2) — evita contar como "ativo" um convite que nunca foi aceito. Trigger
-- adicional no mesmo evento (Postgres permite múltiplos triggers por
-- evento) em vez de alterar a função existente — aditivo, não invasivo.
create or replace function public.handle_portal_contato_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update empresa_contatos
    set portal_access_status = 'active'
    where user_id = new.id and portal_access_status = 'invited';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed_portal_contato
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_portal_contato_email_confirmed();

-- =========================================================================
-- is_empresa_contato: true se o usuário logado é um contato com acesso
-- ativo ao portal daquela empresa específica — a checagem central de
-- todas as policies aditivas abaixo.
-- =========================================================================
create or replace function public.is_empresa_contato(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from empresa_contatos
    where user_id = auth.uid()
      and empresa_id = p_empresa_id
      and portal_access_status = 'active'
  );
$$;

comment on function public.is_empresa_contato is 'True se o usuário logado é um contato de empresa com acesso ativo ao Portal de Regularização (STG-05) daquela empresa.';

-- user_can_access_empresa (Rodada 10) já é usada por documentos + pelas
-- policies de storage.objects — estender aqui propaga automaticamente
-- leitura de documentos pro portal sem tocar em nenhuma das duas.
create or replace function public.user_can_access_empresa(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from empresas e
    where e.id = p_empresa_id
      and (
        public.is_platform_staff(auth.uid())
        or e.tenant_id in (select public.user_tenant_ids(auth.uid()))
        or public.is_empresa_contato(p_empresa_id)
      )
  );
$$;

-- =========================================================================
-- abrir_contestacao() redefinida como security definer (era security
-- invoker desde a Rodada 21). Motivo: a função encadeia
-- change_cobranca_status(), que escreve em cobrancas/cobranca_eventos —
-- tabelas que o portal nunca deve poder escrever livremente (um contato
-- mal-intencionado poderia chamar change_cobranca_status() direto via
-- RPC com QUALQUER status, não só 'contestada'). Abrir uma policy de
-- update ampla em cobrancas pro portal pra viabilizar isso seria pior:
-- o problema é o RPC change_cobranca_status ser genérico, não o
-- principal que o chama.
--
-- Em vez disso: a própria função explicita a checagem de autorização
-- (staff OU contato da empresa dona da cobrança) logo no início — o
-- mesmo que a RLS faria, só que dentro da função — e só then opera com
-- privilégio elevado (contorna RLS por construção, mesmo padrão já
-- usado por is_platform_staff/user_can_access_empresa/is_empresa_contato
-- pra conseguir ler tabelas fora do RLS do chamador). auth.uid() não
-- muda dentro de uma security definer (lê do JWT da requisição, não do
-- role Postgres efetivo) — a checagem continua sendo sobre quem
-- realmente fez a chamada.
create or replace function public.abrir_contestacao(
  p_cobranca_id uuid,
  p_tipo text,
  p_motivo text,
  p_valor_alegado numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_empresa_id uuid;
  v_contestacao_id uuid;
  v_existente uuid;
begin
  select tenant_id, empresa_id into v_tenant_id, v_empresa_id
  from cobrancas where id = p_cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança não encontrada.';
  end if;

  if not (public.is_platform_staff(auth.uid()) or public.is_empresa_contato(v_empresa_id)) then
    raise exception 'Sem permissão para abrir contestação para esta cobrança.';
  end if;

  select id into v_existente from contestacoes
  where cobranca_id = p_cobranca_id and status in ('aberta', 'em_analise');

  if v_existente is not null then
    raise exception 'Já existe uma contestação em aberto para esta cobrança.';
  end if;

  insert into contestacoes (tenant_id, empresa_id, cobranca_id, tipo, motivo, valor_alegado, aberta_por)
  values (v_tenant_id, v_empresa_id, p_cobranca_id, p_tipo, p_motivo, p_valor_alegado, auth.uid())
  returning id into v_contestacao_id;

  insert into contestacao_eventos (contestacao_id, tipo, descricao, valor, user_id)
  values (v_contestacao_id, 'abertura', p_motivo, p_valor_alegado, auth.uid());

  perform public.change_cobranca_status(
    p_cobranca_id,
    'contestada',
    'Contestação aberta: ' || p_tipo
  );

  return v_contestacao_id;
end;
$$;

-- =========================================================================
-- Policies aditivas (regra: nunca substituem as existentes — Postgres
-- combina policies permissivas com OR). Cada uma escopa estritamente à
-- própria empresa do contato logado, via is_empresa_contato().
-- =========================================================================

create policy empresas_select_portal on empresas for select
  using (public.is_empresa_contato(id));

create policy empresa_contatos_select_portal on empresa_contatos for select
  using (user_id = auth.uid());

create policy obrigacoes_select_portal on obrigacoes for select
  using (public.is_empresa_contato(empresa_id));

create policy clausulas_select_portal on clausulas for select
  using (
    exists (
      select 1 from obrigacoes o
      where o.clausula_id = clausulas.id and public.is_empresa_contato(o.empresa_id)
    )
  );

create policy instrumentos_select_portal on instrumentos for select
  using (
    exists (
      select 1 from obrigacoes o
      where o.instrumento_id = instrumentos.id and public.is_empresa_contato(o.empresa_id)
    )
  );

create policy cobrancas_select_portal on cobrancas for select
  using (public.is_empresa_contato(empresa_id));

create policy cobranca_eventos_select_portal on cobranca_eventos for select
  using (
    exists (
      select 1 from cobrancas c
      where c.id = cobranca_eventos.cobranca_id and public.is_empresa_contato(c.empresa_id)
    )
  );

create policy contestacoes_select_portal on contestacoes for select
  using (public.is_empresa_contato(empresa_id));

-- Sem policy de insert pro portal em contestacoes/contestacao_eventos: a
-- única porta de entrada continua sendo abrir_contestacao() (redefinida
-- abaixo como security definer) — nunca insert direto na tabela. Isso
-- também evita reabrir cobrancas/cobranca_eventos (staff-only) pro
-- portal só pra deixar a cascata "abrir contestação -> pausar cobrança"
-- funcionar; ver comentário na redefinição da função.

create policy contestacao_eventos_select_portal on contestacao_eventos for select
  using (
    exists (
      select 1 from contestacoes c
      where c.id = contestacao_eventos.contestacao_id and public.is_empresa_contato(c.empresa_id)
    )
  );

create policy contestacao_evidencias_select_portal on contestacao_evidencias for select
  using (
    exists (
      select 1 from contestacoes c
      where c.id = contestacao_evidencias.contestacao_id and public.is_empresa_contato(c.empresa_id)
    )
  );

-- "anexar documentos" / comentário como evidência.
create policy contestacao_evidencias_insert_portal on contestacao_evidencias for insert
  with check (
    exists (
      select 1 from contestacoes c
      where c.id = contestacao_evidencias.contestacao_id and public.is_empresa_contato(c.empresa_id)
    )
  );

create policy negociacoes_select_portal on negociacoes for select
  using (public.is_empresa_contato(empresa_id));

-- register_negociacao_evento() (security invoker, Rodada 7) atualiza
-- negociacoes.status/valor_atual internamente — sem esta policy, a
-- chamada da RPC feita pelo portal inseriria o evento mas o header
-- ficaria sem refletir a resposta da empresa (RLS bloqueando o UPDATE em
-- silêncio, sem erro). Nunca muda cobrancas.status (sem policy de update
-- em cobrancas/cobranca_eventos pro portal, de propósito — ver
-- responderPropostaPortalAction).
create policy negociacoes_update_portal on negociacoes for update
  using (public.is_empresa_contato(empresa_id))
  with check (public.is_empresa_contato(empresa_id));

create policy negociacao_eventos_select_portal on negociacao_eventos for select
  using (
    exists (
      select 1 from negociacoes n
      where n.id = negociacao_eventos.negociacao_id and public.is_empresa_contato(n.empresa_id)
    )
  );

-- "responder proposta": só contraproposta_empresa e aceite — nunca
-- proposta_gsbc (spoofing de oferta da GSBC) nem recusa/observacao
-- (autoria ambígua, mais consequente, fica com o humano por enquanto).
-- Mesmo princípio de "estado ambíguo fica com humano" já usado no
-- resultado de contestação (Rodada 21) e no aceite de negociação
-- (Rodada 7) — aqui adaptado: aceite É permitido porque só vincula o
-- próprio contato à proposta já feita pela GSBC, nunca manipula dado
-- alheio.
create policy negociacao_eventos_insert_portal on negociacao_eventos for insert
  with check (
    tipo in ('contraproposta_empresa', 'aceite')
    and exists (
      select 1 from negociacoes n
      where n.id = negociacao_eventos.negociacao_id and public.is_empresa_contato(n.empresa_id)
    )
  );

create policy pagamentos_select_portal on pagamentos for select
  using (public.is_empresa_contato(empresa_id));

-- "anexar documentos": só como evidência de contestação — nunca outras
-- categorias geridas por staff (instrumento, notificacao, acordo,
-- comprovante), mesmo raciocínio de menor privilégio das policies acima.
create policy documentos_insert_portal on documentos for insert
  with check (categoria = 'contestacao' and public.is_empresa_contato(empresa_id));

create policy documentos_empresas_insert_portal on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documentos-empresas'
    and public.is_empresa_contato((storage.foldername(name))[1]::uuid)
  );

-- Sem GRANTs novos: contestacoes/negociacao_eventos/etc já concedidos a
-- `authenticated` nas migrations de origem (0022, 0011) — RLS, não GRANT,
-- é quem decide o que um contato de empresa realmente enxerga/escreve.
