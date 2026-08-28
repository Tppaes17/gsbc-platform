import { NextResponse } from "next/server";
import { runConsultaProspectosSweep } from "@/lib/cnpj/consulta-sweep";

/**
 * Disparado pelo Vercel Cron (ver vercel.json) — mesma proteção do
 * `collection-engine` (`Authorization: Bearer $CRON_SECRET`, injetado
 * pela própria Vercel). Sem `CRON_SECRET` configurado, recusa qualquer
 * chamada.
 *
 * Endpoint separado (não empilhado no cron do collection-engine,
 * Rodada 30): cada item aqui é uma chamada de rede real à BrasilAPI —
 * bem mais lento que uma varredura só de banco. `maxDuration` só tem
 * efeito real em plano Vercel Pro ou superior; no Hobby a function
 * pode ser encerrada no meio do lote — sem problema, o que não coube
 * fica pra próxima execução (ver consulta-sweep.ts).
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

  const resultado = await runConsultaProspectosSweep();
  return NextResponse.json({ status: "ok", ...resultado });
}
