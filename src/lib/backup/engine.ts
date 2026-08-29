import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Backup lógico periódico — stopgap enquanto o projeto estiver no
 * plano Free do Supabase (sem PITR, sem backup automático nenhum,
 * confirmado ao vivo via `supabase backups list`). Não é um dump
 * físico como `pg_dump` — é uma exportação via PostgREST (linha por
 * linha, paginada), o que basta pra recuperar de um delete acidental
 * ou de uma migration ruim, mas não é um substituto real de PITR:
 * não é transacionalmente consistente entre tabelas (cada tabela é
 * lida em requisições HTTP separadas, sem uma transação única
 * cobrindo o backup inteiro), e valores `numeric` chegam como number
 * do JS (perda de precisão só é um risco teórico em valores muito
 * grandes — não é o caso dos valores monetários desta plataforma).
 *
 * Tabelas nunca ficam hardcoded aqui — `backup_list_tables()`
 * (migration 0031) enumera o schema public dinamicamente, então uma
 * tabela nova de uma rodada futura entra no backup automaticamente,
 * sem precisar lembrar de atualizar este arquivo.
 */

const BUCKET = "db-backups";
const PAGE_SIZE = 1000;
const RETENCAO_DIAS = 14;

// Tabelas sem coluna `id` (chave composta) — não dá pra paginar com
// `order by id`. Único caso hoje: role_permissions (role_id, permission_id).
const SEM_COLUNA_ID = new Set(["role_permissions"]);

export interface BackupResultado {
  tabelas: number;
  linhasTotais: number;
  usuariosAuth: number;
  arquivo: string;
  tamanhoBytes: number;
  removidos: string[];
  erros: string[];
}

export async function runBackup(): Promise<BackupResultado> {
  const supabase = createAdminClient();
  const resultado: BackupResultado = {
    tabelas: 0,
    linhasTotais: 0,
    usuariosAuth: 0,
    arquivo: "",
    tamanhoBytes: 0,
    removidos: [],
    erros: [],
  };

  const { data: tabelas, error: tabelasError } = await supabase.rpc("backup_list_tables");
  if (tabelasError || !tabelas) {
    throw new Error(`Não foi possível listar as tabelas: ${tabelasError?.message ?? "sem dados"}`);
  }

  const dump: Record<string, unknown[]> = {};

  for (const { table_name: tabela } of tabelas as { table_name: string }[]) {
    const linhas: unknown[] = [];
    let from = 0;

    try {
      for (;;) {
        let query = supabase.from(tabela).select("*").range(from, from + PAGE_SIZE - 1);
        if (!SEM_COLUNA_ID.has(tabela)) {
          query = query.order("id", { ascending: true });
        }
        const { data, error } = await query;

        if (error) {
          resultado.erros.push(`${tabela}: ${error.message}`);
          break;
        }
        if (!data || data.length === 0) break;

        linhas.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
    } catch (err) {
      resultado.erros.push(`${tabela}: ${err instanceof Error ? err.message : String(err)}`);
    }

    dump[tabela] = linhas;
    resultado.tabelas += 1;
    resultado.linhasTotais += linhas.length;
  }

  // auth.users vive fora do schema public — só acessível via o admin
  // API do Supabase Auth, nunca via PostgREST direto.
  const usuariosAuth: unknown[] = [];
  try {
    let page = 1;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        resultado.erros.push(`auth.users: ${error.message}`);
        break;
      }
      usuariosAuth.push(...data.users);
      if (data.users.length < 1000) break;
      page += 1;
    }
  } catch (err) {
    resultado.erros.push(`auth.users: ${err instanceof Error ? err.message : String(err)}`);
  }
  resultado.usuariosAuth = usuariosAuth.length;

  const payload = {
    geradoEm: new Date().toISOString(),
    tabelas: dump,
    authUsers: usuariosAuth,
  };

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const nomeArquivo = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(nomeArquivo, bytes, {
    contentType: "application/json",
  });
  if (uploadError) {
    throw new Error(`Falha ao enviar backup pro storage: ${uploadError.message}`);
  }

  resultado.arquivo = nomeArquivo;
  resultado.tamanhoBytes = bytes.byteLength;

  const { data: arquivos } = await supabase.storage.from(BUCKET).list();
  const limite = Date.now() - RETENCAO_DIAS * 24 * 60 * 60 * 1000;
  const paraRemover = (arquivos ?? [])
    .filter((f) => f.name.startsWith("backup-") && new Date(f.created_at ?? 0).getTime() < limite)
    .map((f) => f.name);

  if (paraRemover.length > 0) {
    await supabase.storage.from(BUCKET).remove(paraRemover);
    resultado.removidos = paraRemover;
  }

  return resultado;
}
