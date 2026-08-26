-- GSBC — Rodada 10: Documentos
--
-- Bloqueado nas Rodadas 8/9 porque o Supabase Storage estava desligado
-- neste Docker local (rodada-01.md) — reavaliado nesta rodada: o problema
-- real era só `analytics`/`vector` (Logflare) estourando o healthcheck,
-- não o Storage em si. Com os dois desabilitados em supabase/config.toml,
-- o stack completo (incluindo Storage) sobe normalmente em ~1.1GB, bem
-- dentro do limite de 3.8GB do Docker Desktop. Ver rodada-10.md.

insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos-empresas', 'documentos-empresas', false, 52428800)
on conflict (id) do nothing;

-- Resolve se o usuário logado pode acessar arquivos de uma empresa —
-- mesma regra de visibilidade de sempre (staff GSBC vê tudo, sindicato só
-- a própria empresa), usada tanto pela policy de storage.objects quanto
-- pela RLS da tabela de metadados abaixo.
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
      )
  );
$$;

comment on function public.user_can_access_empresa is 'True se o usuário pode ver dados da empresa (staff GSBC ou membro do tenant dono da empresa) — usado em Documentos.';

-- Convenção de path: documentos-empresas/{empresa_id}/{arquivo}. A policy
-- de storage lê o primeiro segmento do path como o empresa_id.
create policy documentos_empresas_select on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentos-empresas'
    and public.user_can_access_empresa((storage.foldername(name))[1]::uuid)
  );

create policy documentos_empresas_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documentos-empresas'
    and public.is_platform_staff(auth.uid())
  );

create policy documentos_empresas_delete on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documentos-empresas'
    and public.is_platform_staff(auth.uid())
  );

-- Metadados: nome legível, categoria e quem enviou — evita ter que listar
-- o bucket via API de Storage só para mostrar a lista na ficha 360º.
create table documentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  storage_path text not null unique,
  nome_arquivo text not null,
  categoria text not null check (categoria in ('instrumento', 'notificacao', 'acordo', 'comprovante', 'outro')),
  tamanho_bytes bigint,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

comment on table documentos is 'Metadados dos arquivos em storage.objects/documentos-empresas — o arquivo em si vive no Storage, esta tabela só descreve.';

create or replace function public.enforce_documento_matches_empresa()
returns trigger language plpgsql as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from empresas where id = new.empresa_id;

  if v_tenant_id is null then
    raise exception 'Empresa não encontrada.';
  end if;

  if new.tenant_id <> v_tenant_id then
    raise exception 'tenant_id do documento deve bater com o da empresa.';
  end if;

  return new;
end;
$$;

create trigger documentos_enforce_match
  before insert on documentos
  for each row execute function public.enforce_documento_matches_empresa();

alter table documentos enable row level security;

create policy documentos_select on documentos for select
  using (public.user_can_access_empresa(empresa_id));

create policy documentos_insert on documentos for insert
  with check (public.is_platform_staff(auth.uid()));

create policy documentos_delete on documentos for delete
  using (public.is_platform_staff(auth.uid()));

grant select, insert, delete on public.documentos to authenticated;
