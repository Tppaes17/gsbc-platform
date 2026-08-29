import { NextResponse } from "next/server";
import { runBackup } from "@/lib/backup/engine";
import { recordOperationalEvent } from "@/lib/observability/events";

/**
 * Disparado pelo Vercel Cron (ver vercel.json) — mesma proteção dos
 * outros crons (`Authorization: Bearer $CRON_SECRET`).
 *
 * Stopgap enquanto o projeto está no plano Free do Supabase (sem
 * PITR/backup automático nenhum, Rodada 32) — não é um substituto de
 * PITR, ver comentário em src/lib/backup/engine.ts.
 */
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    recordOperationalEvent({
      area: "cron",
      event: "backup_cron_unauthorized",
      severity: "warn",
      message: "Tentativa de execução do backup cron sem credencial válida.",
    });
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const resultado = await runBackup();
    recordOperationalEvent({
      area: "backup",
      event: "backup_completed",
      severity: "info",
      message: "Backup lógico concluído.",
      metadata: {
        tabelas: resultado.tabelas,
        linhasTotais: resultado.linhasTotais,
        usuariosAuth: resultado.usuariosAuth,
        tamanhoBytes: resultado.tamanhoBytes,
      },
    });
    return NextResponse.json({ status: "ok", ...resultado });
  } catch (err) {
    recordOperationalEvent({
      area: "backup",
      event: "backup_failed",
      severity: "error",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Falha ao executar backup." }, { status: 500 });
  }
}
