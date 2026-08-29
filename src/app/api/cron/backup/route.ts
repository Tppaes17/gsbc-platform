import { NextResponse } from "next/server";
import { runBackup } from "@/lib/backup/engine";

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
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resultado = await runBackup();
  return NextResponse.json({ status: "ok", ...resultado });
}
