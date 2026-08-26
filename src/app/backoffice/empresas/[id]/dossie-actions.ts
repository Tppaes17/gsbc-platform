"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { consultarCnpjOficial } from "@/lib/cnpj/brasil-api";
import { createClient } from "@/lib/supabase/server";
import { classificarScore } from "@/lib/validation/dossie-cadastral";
import type { NivelConfianca } from "@/types/database.types";

export interface ConsultarDossieState {
  error: string | null;
  success: boolean;
}

interface EvidenciaInput {
  tipo: "cnpj" | "razao_social" | "situacao_cadastral" | "endereco" | "cnae" | "qsa" | "outro";
  campo: string | null;
  valor: string | null;
  nivel_confianca: NivelConfianca;
  observacao: string | null;
}

const FONTE_BRASIL_API = "BrasilAPI / Receita Federal (Minha Receita)";

function normalizar(valor: string | null | undefined) {
  return (valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
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

  const resultado = await consultarCnpjOficial(empresa.cnpj);

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

    await supabase.from("dossie_evidencias").insert({
      dossie_id: dossie.id,
      tipo: "cnpj",
      campo: "cnpj",
      valor: empresa.cnpj,
      fonte: FONTE_BRASIL_API,
      nivel_confianca: "nao_confirmado",
      observacao: "CNPJ não localizado na Receita Federal — não conclua irregularidade automaticamente; encaminhar para revisão cadastral.",
      consultado_por: user.id,
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

  const dados = resultado.dados;
  const evidencias: EvidenciaInput[] = [];
  let score = 0;

  evidencias.push({
    tipo: "cnpj",
    campo: "cnpj",
    valor: dados.cnpj,
    nivel_confianca: "confirmado",
    observacao: null,
  });

  const ativa = normalizar(dados.situacaoCadastral) === "ATIVA";
  score += ativa ? 40 : 0;
  evidencias.push({
    tipo: "situacao_cadastral",
    campo: "situacao_cadastral",
    valor: dados.situacaoCadastral,
    nivel_confianca: "confirmado",
    observacao: ativa
      ? null
      : "CNPJ não está ativo na Receita Federal — indício identificado, não conclui irregularidade automaticamente (regra 23 do prompt-mestre).",
  });

  const razaoBate = normalizar(empresa.razao_social) === normalizar(dados.razaoSocial);
  score += razaoBate ? 20 : 0;
  evidencias.push({
    tipo: "razao_social",
    campo: "razao_social",
    valor: dados.razaoSocial,
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
      score += 15;
    } else {
      enderecoNivel = "conflitante";
      enderecoObs = `Cadastro GSBC: ${enderecoLocal.cidade ?? "—"}/${enderecoLocal.uf ?? "—"}. Receita Federal: ${dados.municipio ?? "—"}/${dados.uf ?? "—"}.`;
    }
  }
  evidencias.push({
    tipo: "endereco",
    campo: "municipio_uf",
    valor: `${dados.municipio ?? "—"}/${dados.uf ?? "—"}`,
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
      score += 10;
    } else {
      cnaeNivel = "conflitante";
      cnaeObs = `Cadastro GSBC: ${empresa.cnae}. Receita Federal: ${dados.cnaePrincipalCodigo ?? "—"} (${dados.cnaePrincipalDescricao ?? "—"}).`;
    }
  }
  evidencias.push({
    tipo: "cnae",
    campo: "cnae_principal",
    valor: `${dados.cnaePrincipalCodigo ?? "—"} — ${dados.cnaePrincipalDescricao ?? "—"}`,
    nivel_confianca: cnaeNivel,
    observacao: cnaeObs,
  });

  if (dados.qsa.length > 0) {
    score += 15;
    evidencias.push({
      tipo: "qsa",
      campo: "quadro_societario",
      valor: dados.qsa.map((s) => s.nome).join("; "),
      nivel_confianca: "confirmado",
      observacao: `${dados.qsa.length} sócio(s)/administrador(es) identificado(s) na Receita Federal.`,
    });
  } else {
    evidencias.push({
      tipo: "qsa",
      campo: "quadro_societario",
      valor: null,
      nivel_confianca: "nao_confirmado",
      observacao: "QSA não disponível na Receita Federal para este CNPJ.",
    });
  }

  const scoreFinal = Math.min(score, 100);
  const classificacao = classificarScore(scoreFinal);
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

  const { error: evidenciasError } = await supabase.from("dossie_evidencias").insert(
    evidencias.map((e) => ({
      dossie_id: dossie.id,
      tipo: e.tipo,
      campo: e.campo,
      valor: e.valor,
      fonte: FONTE_BRASIL_API,
      nivel_confianca: e.nivel_confianca,
      observacao: e.observacao,
      consultado_por: user.id,
    })),
  );

  if (evidenciasError) {
    return { error: "Dossiê salvo, mas houve falha ao registrar as evidências.", success: false };
  }

  await logAuditEvent({
    tenantId: empresa.tenant_id,
    action: "dossie_cadastral.consultado",
    entityType: "empresa",
    entityId: empresaId,
    newData: { resultado: "encontrado", score: scoreFinal, status },
  });

  revalidatePath(`/backoffice/empresas/${empresaId}`);
  return { error: null, success: true };
}
