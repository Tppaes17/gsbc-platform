"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  avaliarCnpj,
  FONTE_BRASIL_API,
  normalizar,
  type EvidenciaInput,
} from "@/lib/cnpj/avaliacao";
import { createClient } from "@/lib/supabase/server";
import type { NivelConfianca } from "@/types/database.types";

export interface ConsultarDossieState {
  error: string | null;
  success: boolean;
}

async function salvarEvidenciasEDossie({
  dossieId,
  evidencias,
  userId,
}: {
  dossieId: string;
  evidencias: EvidenciaInput[];
  userId: string;
}) {
  const supabase = await createClient();
  return supabase.from("dossie_evidencias").insert(
    evidencias.map((e) => ({
      dossie_id: dossieId,
      tipo: e.tipo,
      campo: e.campo,
      valor: e.valor,
      fonte: e.fonte,
      nivel_confianca: e.nivel_confianca,
      observacao: e.observacao,
      consultado_por: userId,
    })),
  );
}

export async function consultarDossieCadastralAction(
  empresaId: string,
): Promise<ConsultarDossieState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return {
      error: "Apenas Owners podem usar a inteligência cadastral.",
      success: false,
    };
  }

  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, tenant_id, cnpj, razao_social, cnae, endereco")
    .eq("id", empresaId)
    .single();

  if (!empresa) {
    return { error: "Empresa não encontrada.", success: false };
  }

  const resultado = await avaliarCnpj(empresa.cnpj);

  if (resultado.status === "erro") {
    return { error: resultado.mensagem, success: false };
  }

  if (resultado.status === "nao_encontrado") {
    const { data: dossie, error: upsertError } = await supabase
      .from("dossies_cadastrais")
      .upsert(
        {
          tenant_id: empresa.tenant_id,
          empresa_id: empresaId,
          status: "revisao_cadastral",
          cnpj_consultado: empresa.cnpj,
          dados_oficiais: null,
          dados_enriquecimento: null,
          qsa: null,
          score_confiabilidade: 0,
          score_classificacao: "insuficiente",
          ultima_consulta_em: new Date().toISOString(),
          criado_por: user.id,
        },
        { onConflict: "empresa_id" },
      )
      .select("id")
      .single();

    if (upsertError || !dossie) {
      return { error: "Não foi possível salvar o dossiê.", success: false };
    }

    await salvarEvidenciasEDossie({
      dossieId: dossie.id,
      userId: user.id,
      evidencias: [
        {
          tipo: "cnpj",
          campo: "cnpj",
          valor: empresa.cnpj,
          fonte: FONTE_BRASIL_API,
          nivel_confianca: "nao_confirmado",
          observacao:
            "CNPJ não localizado na Receita Federal — não conclua irregularidade automaticamente; encaminhar para revisão cadastral.",
        },
      ],
    });

    await logAuditEvent({
      tenantId: empresa.tenant_id,
      action: "dossie_cadastral.consultado",
      entityType: "empresa",
      entityId: empresaId,
      newData: { resultado: "nao_encontrado" },
    });

    revalidatePath(`/backoffice/empresas/${empresaId}`);
    return { error: null, success: true };
  }

  const dados = resultado.dadosOficiais;
  const ativa = resultado.ativa;
  // Evidências vindas do avaliador compartilhado (identidade oficial +
  // enriquecimento web + score) — as evidências de conflito abaixo, que
  // dependem do cadastro GSBC desta empresa, são adicionadas aqui.
  const evidencias: EvidenciaInput[] = [...resultado.evidencias];

  // --- Conflitos entre o cadastro GSBC e a Receita Federal (regra 4 do
  // prompt-mestre: destacar, nunca escolher silenciosamente uma versão).
  // Não pontuam no score de confiabilidade — são uma checagem à parte
  // ("nosso cadastro está certo?"), diferente do score ("dá pra achar e
  // contatar essa empresa?").
  const razaoBate = normalizar(empresa.razao_social) === normalizar(dados.razaoSocial);
  evidencias.push({
    tipo: "razao_social",
    campo: "razao_social",
    valor: dados.razaoSocial,
    fonte: FONTE_BRASIL_API,
    nivel_confianca: razaoBate ? "confirmado" : "conflitante",
    observacao: razaoBate
      ? null
      : `Cadastro GSBC: "${empresa.razao_social}". Receita Federal: "${dados.razaoSocial}".`,
  });

  const enderecoLocal = empresa.endereco as { uf?: string; cidade?: string } | null;
  let enderecoNivel: NivelConfianca = "nao_confirmado";
  let enderecoObs: string | null = "Empresa não tem endereço cadastrado na GSBC para comparar.";
  if (enderecoLocal?.uf || enderecoLocal?.cidade) {
    const ufBate = !enderecoLocal.uf || normalizar(enderecoLocal.uf) === normalizar(dados.uf);
    const cidadeBate =
      !enderecoLocal.cidade || normalizar(enderecoLocal.cidade) === normalizar(dados.municipio);
    if (ufBate && cidadeBate) {
      enderecoNivel = "confirmado";
      enderecoObs = null;
    } else {
      enderecoNivel = "conflitante";
      enderecoObs = `Cadastro GSBC: ${enderecoLocal.cidade ?? "—"}/${enderecoLocal.uf ?? "—"}. Receita Federal: ${dados.municipio ?? "—"}/${dados.uf ?? "—"}.`;
    }
  }
  evidencias.push({
    tipo: "endereco",
    campo: "municipio_uf",
    valor: `${dados.municipio ?? "—"}/${dados.uf ?? "—"}`,
    fonte: FONTE_BRASIL_API,
    nivel_confianca: enderecoNivel,
    observacao: enderecoObs,
  });

  const cnaeLocalDigits = (empresa.cnae ?? "").replace(/\D/g, "");
  const cnaeOficialDigits = (dados.cnaePrincipalCodigo ?? "").replace(/\D/g, "");
  let cnaeNivel: NivelConfianca = "nao_confirmado";
  let cnaeObs: string | null = "Empresa não tem CNAE cadastrado na GSBC para comparar.";
  if (cnaeLocalDigits) {
    if (cnaeLocalDigits === cnaeOficialDigits) {
      cnaeNivel = "confirmado";
      cnaeObs = null;
    } else {
      cnaeNivel = "conflitante";
      cnaeObs = `Cadastro GSBC: ${empresa.cnae}. Receita Federal: ${dados.cnaePrincipalCodigo ?? "—"} (${dados.cnaePrincipalDescricao ?? "—"}).`;
    }
  }
  evidencias.push({
    tipo: "cnae",
    campo: "cnae_principal",
    valor: `${dados.cnaePrincipalCodigo ?? "—"} — ${dados.cnaePrincipalDescricao ?? "—"}`,
    fonte: FONTE_BRASIL_API,
    nivel_confianca: cnaeNivel,
    observacao: cnaeObs,
  });

  const dadosEnriquecimento = resultado.dadosEnriquecimento;
  const enriquecimentoStatus = resultado.enriquecimentoStatus;

  const scoreFinal = resultado.score;
  const classificacao = resultado.classificacao;
  const temConflito = evidencias.some((e) => e.nivel_confianca === "conflitante");
  const status = !ativa ? "revisao_cadastral" : temConflito ? "conflito_identificado" : "cadastro_validado";

  const { data: dossie, error: upsertError } = await supabase
    .from("dossies_cadastrais")
    .upsert(
      {
        tenant_id: empresa.tenant_id,
        empresa_id: empresaId,
        status,
        cnpj_consultado: empresa.cnpj,
        dados_oficiais: dados as unknown as Record<string, unknown>,
        dados_enriquecimento: dadosEnriquecimento,
        qsa: dados.qsa as unknown as Record<string, unknown>[],
        score_confiabilidade: scoreFinal,
        score_classificacao: classificacao,
        ultima_consulta_em: new Date().toISOString(),
        criado_por: user.id,
      },
      { onConflict: "empresa_id" },
    )
    .select("id")
    .single();

  if (upsertError || !dossie) {
    return { error: "Não foi possível salvar o dossiê.", success: false };
  }

  const { error: evidenciasError } = await salvarEvidenciasEDossie({
    dossieId: dossie.id,
    userId: user.id,
    evidencias,
  });

  if (evidenciasError) {
    return { error: "Dossiê salvo, mas houve falha ao registrar as evidências.", success: false };
  }

  await logAuditEvent({
    tenantId: empresa.tenant_id,
    action: "dossie_cadastral.consultado",
    entityType: "empresa",
    entityId: empresaId,
    newData: {
      resultado: "encontrado",
      score: scoreFinal,
      status,
      enriquecimento_web: enriquecimentoStatus,
    },
  });

  revalidatePath(`/backoffice/empresas/${empresaId}`);
  return { error: null, success: true };
}
