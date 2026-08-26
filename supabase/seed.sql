-- GSBC — Dados de demonstração (Rodada 1)
-- Executado automaticamente por `supabase db reset` em ambiente local.
-- Objetivo: permitir visualizar o produto de ponta a ponta (regra 61).
-- NUNCA executar em produção.

-- =========================================================================
-- Tenants: platform (GSBC) + 1 sindicato de demonstração
-- =========================================================================
-- onboarding_status='active' no sindicato de demonstração: simula um cliente
-- já implantado, para exercitar o self-service de convites do dirigente
-- (regra confirmada na Rodada 1 — só libera após onboarding concluído).
insert into tenants (id, type, name, slug, status, onboarding_status) values
  ('00000000-0000-0000-0000-000000000001', 'platform', 'GSBC', 'gsbc', 'active', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'sindicato', 'Sindicato Demonstração', 'sindicato-demonstracao', 'active', 'active');

insert into sindicatos (tenant_id, razao_social, nome_fantasia, cnpj, categoria, base_territorial, email_institucional, telefone, status) values
  (
    '00000000-0000-0000-0000-000000000002',
    'Sindicato Demonstração dos Trabalhadores',
    'Sindicato Demonstração',
    '12.345.678/0001-90',
    'Comércio e Serviços',
    'Estado de São Paulo',
    'contato@sindicatodemonstracao.org.br',
    '(11) 4000-0000',
    'active'
  );

-- =========================================================================
-- Roles (P0 — catálogo mínimo por perfil, seção 16 do prompt-mestre)
-- =========================================================================
insert into roles (id, tenant_type, code, name, description, is_system) values
  ('10000000-0000-0000-0000-000000000001', 'platform', 'gsbc_super_admin', 'Super Admin', 'Acesso irrestrito à plataforma GSBC.', true),
  ('10000000-0000-0000-0000-000000000002', 'platform', 'gsbc_administrador', 'Administrador', 'Administração operacional da GSBC.', true),
  ('10000000-0000-0000-0000-000000000003', 'platform', 'gsbc_gestor', 'Gestor', 'Gestão de carteira de sindicatos.', true),
  ('10000000-0000-0000-0000-000000000004', 'platform', 'gsbc_analista', 'Analista', 'Operação do dia a dia (cobrança, negociação).', true),
  ('10000000-0000-0000-0000-000000000005', 'platform', 'gsbc_financeiro', 'Financeiro', 'Operação financeira e conciliação.', true),
  ('10000000-0000-0000-0000-000000000006', 'platform', 'gsbc_juridico', 'Jurídico', 'Acompanhamento jurídico e compliance.', true),
  ('10000000-0000-0000-0000-000000000007', 'platform', 'gsbc_consulta', 'Consulta', 'Acesso somente leitura.', true),
  ('10000000-0000-0000-0000-000000000008', 'sindicato', 'sindicato_administrador', 'Administrador do Sindicato', 'Administração do ambiente do sindicato no portal.', true),
  ('10000000-0000-0000-0000-000000000009', 'sindicato', 'sindicato_dirigente', 'Dirigente', 'Acompanhamento executivo da operação.', true),
  ('10000000-0000-0000-0000-000000000010', 'sindicato', 'sindicato_financeiro', 'Financeiro', 'Acompanhamento financeiro e recebimentos.', true),
  ('10000000-0000-0000-0000-000000000011', 'sindicato', 'sindicato_consulta', 'Consulta', 'Acesso somente leitura ao portal do sindicato.', true);

-- Papéis reservados para portais externos futuros (P4/P5 — não vinculados a RLS ainda).
insert into roles (id, tenant_type, code, name, description, is_system) values
  ('10000000-0000-0000-0000-000000000012', 'sindicato', 'empresa_representante', 'Representante de Empresa', 'Reservado para o Portal da Empresa (não implementado em P0).', true),
  ('10000000-0000-0000-0000-000000000013', 'sindicato', 'parceiro', 'Parceiro', 'Reservado para o Portal de Parceiros (não implementado em P0).', true);

-- =========================================================================
-- Permissions (P0 — apenas o necessário para a fundação; cresce por módulo)
-- =========================================================================
insert into permissions (id, code, description) values
  ('20000000-0000-0000-0000-000000000001', 'tenants.manage', 'Provisionar e administrar tenants (sindicatos).'),
  ('20000000-0000-0000-0000-000000000002', 'tenants.read', 'Visualizar dados do próprio tenant.'),
  ('20000000-0000-0000-0000-000000000003', 'users.manage', 'Gerenciar usuários e memberships.'),
  ('20000000-0000-0000-0000-000000000004', 'audit_logs.read', 'Consultar trilha de auditoria.');

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r
cross join permissions p
where r.code in ('gsbc_super_admin', 'gsbc_administrador')
union all
select r.id, p.id
from roles r, permissions p
where r.code = 'gsbc_gestor' and p.code in ('tenants.read', 'users.manage', 'audit_logs.read')
union all
select r.id, p.id
from roles r, permissions p
where r.code in ('gsbc_analista', 'gsbc_financeiro', 'gsbc_juridico') and p.code in ('tenants.read', 'audit_logs.read')
union all
select r.id, p.id
from roles r, permissions p
where r.code = 'gsbc_consulta' and p.code = 'tenants.read'
union all
select r.id, p.id
from roles r, permissions p
where r.code = 'sindicato_administrador' and p.code in ('tenants.read', 'users.manage', 'audit_logs.read')
union all
select r.id, p.id
from roles r, permissions p
where r.code in ('sindicato_dirigente', 'sindicato_financeiro', 'sindicato_consulta') and p.code = 'tenants.read';

-- =========================================================================
-- Usuários de demonstração (auth.users + trigger cria public.users automaticamente)
-- Senha para ambos: Demo@12345
-- =========================================================================
-- Colunas de token (confirmation_token, recovery_token, etc.) precisam ser ''
-- e não NULL: o scanner SQL do GoTrue falha com "converting NULL to string"
-- ao ler essas colunas caso não sejam explicitadas.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token,
  created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin.demo@gsbc.com.br',
    crypt('Demo@12345', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin GSBC (Demo)"}',
    '', '', '', '', '', '', '', '',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'dirigente.demo@sindicatodemonstracao.org.br',
    crypt('Demo@12345', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Dirigente Demonstração"}',
    '', '', '', '', '', '', '', '',
    now(), now()
  );

insert into memberships (tenant_id, user_id, role_id, status) values
  (
    '00000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000009',
    'active'
  );

-- =========================================================================
-- Empresas de demonstração (Rodada 3) — sob jurisdição do Sindicato Demonstração
-- =========================================================================
insert into empresas (id, tenant_id, razao_social, nome_fantasia, cnpj, cnae, segmento, enquadramento, endereco, status) values
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Comércio de Alimentos Bom Preço Ltda.',
    'Mercado Bom Preço',
    '11.222.333/0001-44',
    '47.11-3-02',
    'Varejo alimentício',
    'Comércio e Serviços',
    '{"logradouro":"Rua das Flores, 100","cidade":"São Paulo","uf":"SP","cep":"01000-000"}',
    'active'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Confecções Estrela do Sul S.A.',
    'Estrela do Sul',
    '22.333.444/0001-55',
    '14.12-6-01',
    'Vestuário',
    'Comércio e Serviços',
    '{"logradouro":"Av. Industrial, 500","cidade":"São Paulo","uf":"SP","cep":"02000-000"}',
    'active'
  );

insert into empresa_contatos (empresa_id, nome, cargo, email, telefone, principal) values
  (
    '40000000-0000-0000-0000-000000000001',
    'Carlos Mendes',
    'Gerente Administrativo',
    'carlos.mendes@bompreco.example.com.br',
    '(11) 3000-1111',
    true
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Fernanda Lima',
    'Diretora Financeira',
    'fernanda.lima@estreladosul.example.com.br',
    '(11) 3000-2222',
    true
  );

-- =========================================================================
-- Instrumentos, cláusulas e obrigações de demonstração (Rodada 4)
-- =========================================================================
insert into instrumentos (id, tenant_id, tipo, numero, titulo, data_base, vigencia_inicio, vigencia_fim, origem, status) values
  (
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'cct',
    'CCT-2026/001',
    'Convenção Coletiva de Trabalho 2026 — Comércio e Serviços',
    '2026-01-01',
    '2026-01-01',
    '2026-12-31',
    'Negociação coletiva anual com o sindicato patronal',
    'active'
  );

insert into clausulas (id, instrumento_id, numero, titulo, texto) values
  (
    '51000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '5ª',
    'Contribuição Assistencial',
    'As empresas abrangidas por esta Convenção recolherão contribuição assistencial mensal correspondente a 1% da folha de pagamento.'
  ),
  (
    '51000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '12ª',
    'Piso Salarial',
    'Fica estabelecido o piso salarial da categoria conforme tabela anexa, com reajuste retroativo à data-base.'
  );

insert into obrigacoes (id, tenant_id, instrumento_id, clausula_id, empresa_id, fundamento, descricao, periodicidade, periodo_inicio, periodo_fim, vencimento, valor_referencia, status) values
  (
    '52000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '51000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'Cláusula 5ª da CCT-2026/001',
    'Contribuição assistencial mensal — Mercado Bom Preço',
    'mensal',
    '2026-08-01',
    '2026-08-31',
    '2026-09-10',
    1250.00,
    'validated'
  ),
  (
    '52000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000001',
    '51000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    'Cláusula 5ª da CCT-2026/001',
    'Contribuição assistencial mensal — Estrela do Sul',
    'mensal',
    '2026-08-01',
    '2026-08-31',
    '2026-09-10',
    2100.00,
    'pending_validation'
  );

-- =========================================================================
-- Cobrança de demonstração (Rodada 5) — gerada a partir da obrigação já
-- validada do Mercado Bom Preço.
-- =========================================================================
insert into cobrancas (id, tenant_id, empresa_id, obrigacao_id, valor_principal, valor_atualizacao, vencimento, prioridade, responsavel_id, status) values
  (
    '60000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '52000000-0000-0000-0000-000000000001',
    1250.00,
    35.00,
    '2026-09-10',
    'high',
    '30000000-0000-0000-0000-000000000001',
    'notified'
  );

insert into cobranca_eventos (cobranca_id, from_status, to_status, user_id, reason) values
  (
    '60000000-0000-0000-0000-000000000001',
    null,
    'draft',
    '30000000-0000-0000-0000-000000000001',
    'Cobrança criada a partir da obrigação de contribuição assistencial.'
  ),
  (
    '60000000-0000-0000-0000-000000000001',
    'draft',
    'approved',
    '30000000-0000-0000-0000-000000000001',
    'Valores conferidos e aprovados para notificação.'
  ),
  (
    '60000000-0000-0000-0000-000000000001',
    'approved',
    'notified',
    '30000000-0000-0000-0000-000000000001',
    'Notificação extrajudicial enviada à empresa.'
  ),
  (
    '60000000-0000-0000-0000-000000000001',
    'notified',
    'negotiating',
    '30000000-0000-0000-0000-000000000001',
    'Negociação iniciada.'
  );

-- =========================================================================
-- Negociação de demonstração (Rodada 7) — a empresa respondeu à
-- notificação com uma contraproposta de valor.
-- =========================================================================
update cobrancas set status = 'negotiating' where id = '60000000-0000-0000-0000-000000000001';

insert into negociacoes (id, tenant_id, empresa_id, cobranca_id, status, valor_atual, responsavel_id) values
  (
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'em_negociacao',
    1150.00,
    '30000000-0000-0000-0000-000000000001'
  );

insert into negociacao_eventos (negociacao_id, tipo, valor, condicoes, user_id) values
  (
    '70000000-0000-0000-0000-000000000001',
    'proposta_gsbc',
    1285.00,
    'Pagamento à vista do valor total da cobrança (principal + atualização).',
    '30000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000001',
    'contraproposta_empresa',
    1150.00,
    'Empresa propôs pagamento à vista com desconto sobre a atualização monetária.',
    '30000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000001',
    'aceite',
    1150.00,
    'GSBC aceitou o pagamento à vista com desconto.',
    '30000000-0000-0000-0000-000000000001'
  );

update negociacoes set status = 'aceita', valor_atual = 1150.00 where id = '70000000-0000-0000-0000-000000000001';

insert into cobranca_eventos (cobranca_id, from_status, to_status, user_id, reason) values
  (
    '60000000-0000-0000-0000-000000000001',
    'negotiating',
    'agreement_reached',
    '30000000-0000-0000-0000-000000000001',
    'Acordo firmado na negociação.'
  );

update cobrancas set status = 'agreement_reached' where id = '60000000-0000-0000-0000-000000000001';

-- =========================================================================
-- Pagamento de demonstração (Rodada 8) — a empresa pagou o valor
-- negociado (R$ 1.150,00), abaixo do valor_cobranca original (R$
-- 1.285,00). Desde a Rodada 13, a quitação é avaliada contra o valor
-- ACORDADO quando existe negociação aceita (migration
-- 0015_reconciliacao_valor_negociado.sql) — então este único pagamento já
-- fecha a cobrança como "Paga", refletindo o acordo cumprido
-- integralmente. O valor_cobranca original continua intacto (histórico).
-- =========================================================================
insert into pagamentos (id, tenant_id, empresa_id, cobranca_id, valor, data_pagamento, forma_pagamento, observacao, registrado_por) values
  (
    '80000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    1150.00,
    '2026-08-15',
    'pix',
    'Pagamento à vista conforme acordo da negociação.',
    '30000000-0000-0000-0000-000000000001'
  );

insert into cobranca_eventos (cobranca_id, from_status, to_status, user_id, reason) values
  (
    '60000000-0000-0000-0000-000000000001',
    'agreement_reached',
    'paid',
    '30000000-0000-0000-0000-000000000001',
    'Pagamento de 1150.00 registrado.'
  );

update cobrancas set status = 'paid' where id = '60000000-0000-0000-0000-000000000001';
