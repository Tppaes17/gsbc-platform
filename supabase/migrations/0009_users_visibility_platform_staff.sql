-- GSBC — Rodada 5: staff GSBC visível a qualquer usuário autenticado
--
-- Bug encontrado testando a timeline/responsável de cobrança como usuária
-- de sindicato: nem o "Responsável" da cobrança nem o autor de cada evento
-- da timeline apareciam para ela — a policy de users_select só libera ver
-- o nome de alguém que compartilha uma membership no MESMO tenant, e um
-- analista GSBC pertence ao tenant platform, não ao tenant do sindicato.
--
-- Isso quebra a transparência que as regras 6 e 25 pedem explicitamente
-- ("a GSBC executa, o sindicato acompanha" — a timeline deve mostrar quem
-- fez o quê). A equipe GSBC atende todos os tenants, então seu nome não é
-- informação privada de um tenant específico — pode ser visível a
-- qualquer usuário autenticado do sistema, sem abrir acesso a dados de
-- OUTROS sindicatos.

drop policy if exists users_select on users;

create policy users_select on users for select
  using (
    id = auth.uid()
    or public.is_platform_staff(auth.uid())
    or public.is_platform_staff(id)
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
