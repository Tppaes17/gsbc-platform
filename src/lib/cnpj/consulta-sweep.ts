import "server-only";
import { consultarEAtualizarDossie } from "@/lib/cnpj/avaliacao";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Varredura periódica (cron, Rodada 30) que cobre o backlog de
 * prospectos importados antes da consulta automática existir, e
 * qualquer prospecto que fique "pesquisa_iniciada" por outro motivo
 * (ex.: falha isolada durante a importação). Roda sem sessão de
 * usuário — daí `createAdminClient()` (contorna RLS, mesmo padrão do
 * `collection-engine`, STG-02) e `consultado_por: null` nas evidências
 * gravadas (automação, não uma pessoa).
 *
 * BATCH_SIZE limita cada execução em vez de processar tudo de uma vez
 * (diferente do collection-engine): aqui cada item é uma chamada de
 * rede real à BrasilAPI, sem retry/rate-limit no cliente — um lote
 * grande demais arrisca estourar o timeout da function. Convergência é
 * automática: o que não coube nesta execução tem `ultima_consulta_em`
 * ainda nulo, então fica primeiro na fila (nulls first) na próxima.
 *
 * INTERVALO_MS e o registro de `ultima_consulta_em` mesmo em erro
 * (abaixo) existem por causa de um problema real observado ao vivo
 * durante o backfill do backlog desta rodada: a BrasilAPI começou a
 * responder 429 depois de ~70 chamadas sequenciais sem pausa, e como
 * `consultarEAtualizarDossie` não escreve nada em erro, os mesmos
 * dossiês malsucedidos voltavam pro topo da fila (nulls first) em
 * TODA execução seguinte — um lote inteiro (50/50) foi consumido só
 * repetindo os mesmos 429, sem progredir no backlog. O intervalo reduz
 * a chance de bater no rate limit; gravar `ultima_consulta_em` mesmo
 * em erro tira o item malsucedido da frente da fila (ele ainda tem
 * status "pesquisa_iniciada" — só não é mais o primeiro a ser
 * retentado).
 */
const BATCH_SIZE = 50;
const INTERVALO_ENTRE_CONSULTAS_MS = 300;

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ConsultaSweepResultado {
  candidatos: number;
  consultadas: number;
  validadas: number;
  descartadas: number;
  erros: string[];
}

export async function runConsultaProspectosSweep(): Promise<ConsultaSweepResultado> {
  const supabase = createAdminClient();
  const resultado: ConsultaSweepResultado = {
    candidatos: 0,
    consultadas: 0,
    validadas: 0,
    descartadas: 0,
    erros: [],
  };

  const { data: pendentes } = await supabase
    .from("dossies_cadastrais")
    .select("id, cnpj_consultado")
    .is("empresa_id", null)
    .is("promoted_at", null)
    .eq("status", "pesquisa_iniciada")
    .not("cnpj_consultado", "is", null)
    .order("ultima_consulta_em", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  resultado.candidatos = pendentes?.length ?? 0;

  for (const [indice, dossie] of (pendentes ?? []).entries()) {
    if (!dossie.cnpj_consultado) continue;

    if (indice > 0) {
      await esperar(INTERVALO_ENTRE_CONSULTAS_MS);
    }

    try {
      const consulta = await consultarEAtualizarDossie(supabase, dossie.id, dossie.cnpj_consultado, null);

      if (consulta.resultado === "erro") {
        // Falha de rede/validação (ex.: CNPJ com dígito verificador
        // inválido, ou rate limit da BrasilAPI) — não é uma decisão
        // sobre a empresa, o status continua "pesquisa_iniciada". Mas
        // registra a tentativa em ultima_consulta_em pra sair da
        // frente da fila (nulls first) — sem isso, um item que sempre
        // falha nunca deixa outros serem tentados.
        await supabase
          .from("dossies_cadastrais")
          .update({ ultima_consulta_em: new Date().toISOString() })
          .eq("id", dossie.id);
        resultado.erros.push(`dossie ${dossie.id}: ${consulta.mensagemErro ?? "falha desconhecida"}`);
        continue;
      }

      resultado.consultadas += 1;
      if (consulta.status === "descartado_receita") {
        resultado.descartadas += 1;
      } else {
        resultado.validadas += 1;
      }
    } catch (err) {
      resultado.erros.push(`dossie ${dossie.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return resultado;
}
