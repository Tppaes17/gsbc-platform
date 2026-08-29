-- GSBC — Phase 0: reforço explícito de grants service_role-only
--
-- O preflight de privilégios mostrou que funções administrativas podem
-- permanecer executáveis por roles autenticadas quando defaults/grants
-- anteriores deixam resíduo. Este bloco é deliberadamente explícito e
-- idempotente: backup_list_tables é uma primitive de service role para o
-- motor de backup, não API de usuário.

revoke all on function public.backup_list_tables() from public;
revoke all on function public.backup_list_tables() from anon;
revoke all on function public.backup_list_tables() from authenticated;
revoke all on function public.backup_list_tables() from service_role;
grant execute on function public.backup_list_tables() to service_role;

revoke all on function public.register_provider_pagamento(uuid, text, timestamptz, text) from public;
revoke all on function public.register_provider_pagamento(uuid, text, timestamptz, text) from anon;
revoke all on function public.register_provider_pagamento(uuid, text, timestamptz, text) from authenticated;
revoke all on function public.register_provider_pagamento(uuid, text, timestamptz, text) from service_role;
grant execute on function public.register_provider_pagamento(uuid, text, timestamptz, text) to service_role;
