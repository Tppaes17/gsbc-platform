-- GSBC — Rodada 2: corrige visibilidade de convites pendentes
--
-- A policy original de `users_select` exigia que AMBAS as memberships (quem
-- pergunta e quem é consultado) estivessem com status='active' para dois
-- membros do mesmo tenant se enxergarem. Isso escondia o nome/e-mail de
-- pessoas recém-convidadas (status='invited') da lista de usuários do
-- próprio tenant, mostrando "—" no lugar — encontrado testando o convite
-- ponta a ponta nesta rodada.
--
-- Nova regra: quem pergunta precisa estar com membership ativa (m1.status =
-- 'active' — só quem já confirmou acesso enxerga a lista); quem é
-- consultado pode estar 'active' OU 'invited' (convite pendente também deve
-- aparecer com nome/e-mail para os colegas do mesmo tenant).

drop policy if exists users_select on users;

create policy users_select on users for select
  using (
    id = auth.uid()
    or public.is_platform_staff(auth.uid())
    or exists (
      select 1
      from memberships m1
      join memberships m2 on m2.tenant_id = m1.tenant_id
      where m1.user_id = auth.uid()
        and m1.status = 'active'
        and m2.user_id = users.id
        and m2.status in ('active', 'invited')
    )
  );
