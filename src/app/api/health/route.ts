import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Health check (STG-00) — confirma que a aplicação está de pé e que a
 * conexão com o Supabase (API + Postgres) está funcionando, sem expor
 * dados. A consulta a `tenants` retorna 0 linhas para um cliente anônimo
 * (RLS), mas uma consulta bem-sucedida já prova conectividade de ponta a
 * ponta — é isso que este endpoint mede, não o conteúdo da tabela.
 */
export async function GET() {
  const supabase = await createClient();
  const { error } = await supabase.from("tenants").select("id").limit(1);

  if (error) {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "ok", database: "reachable" });
}
