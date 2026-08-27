import { NextResponse } from "next/server";
import { runCollectionSweep } from "@/lib/collection/engine";
import { syncWorkItemsFromState } from "@/lib/operations/sync";

/**
 * Disparado pelo Vercel Cron (ver vercel.json) — protegido pelo header
 * que a própria Vercel injeta em cron requests
 * (`Authorization: Bearer $CRON_SECRET`, ver
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * Sem `CRON_SECRET` configurado, o endpoint recusa qualquer chamada —
 * nunca roda "aberto" por padrão.
 *
 * Roda os dois jobs periódicos do projeto na mesma varredura (régua de
 * cobrança + sincronização de work items, STG-03) em vez de dois crons
 * separados — o plano Hobby da Vercel já limita a frequência de cron, e
 * ambos são baratos o suficiente pra rodar juntos sem problema.
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

  const collection = await runCollectionSweep();
  const workItems = await syncWorkItemsFromState();
  return NextResponse.json({ status: "ok", collection, workItems });
}
