import { NextResponse } from "next/server";
import { runCollectionSweep } from "@/lib/collection/engine";

/**
 * Disparado pelo Vercel Cron (ver vercel.json) — protegido pelo header
 * que a própria Vercel injeta em cron requests
 * (`Authorization: Bearer $CRON_SECRET`, ver
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * Sem `CRON_SECRET` configurado, o endpoint recusa qualquer chamada —
 * nunca roda "aberto" por padrão.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resultado = await runCollectionSweep();
  return NextResponse.json({ status: "ok", ...resultado });
}
