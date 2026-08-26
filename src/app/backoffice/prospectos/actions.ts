"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { avaliarCnpj, FONTE_BRASIL_API, type EvidenciaInput } from "@/lib/cnpj/avaliacao";
import { createClient } from "@/lib/supabase/server";
import {
  PROSPECTO_COLUNAS_ESPERADAS,
  validarLinhaProspecto,
  type LinhaComErro,
  type ProspectoPlanilhaRow,
} from "@/lib/validation/prospecto";

export interface ImportarProspectosState {
  error: string | null;
  success: boolean;
  resumo?: {
    totalLinhas: number;
    importadas: number;
    atualizadas: number;
    comErro: number;
  };
}

// As planilhas de referência do usuário têm 323 e 1257 linhas — 20MB
// cobre isso com folga sem abrir espaço para upload de arquivos enormes.
const MAX_ARQUIVO_BYTES = 20 * 1024 * 1024;
const MAX_ERROS_REGISTRADOS = 200;
const CONCORRENCIA_ATUALIZACAO = 20;

async function emLotes<T>(items: T[], tamanho: number, fn: (lote: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += tamanho) {
    await fn(items.slice(i, i + tamanho));
  }
}

function evidenciasDaLinha(linha: ProspectoPlanilhaRow, fonte: string): EvidenciaInput[] {
  const evidencias: EvidenciaInput[] = [];

  evidencias.push({
    tipo: "razao_social",
    campo: "razao_social",
    valor: linha.razaoSocial,
    fonte,
    nivel_confianca: "provavel",
    observacao: "Dado importado — ainda não confirmado contra a Receita Federal.",
  });

  if (linha.email) {
    evidencias.push({
      tipo: "email",
      campo: "email",
      valor: linha.email,
      fonte,
      nivel_confianca: "provavel",
      observacao: null,
    });
  }

  const enderecoPartes = [linha.logradouro, linha.numero, linha.bairro, linha.municipio, linha.uf, linha.cep]
    .filter(Boolean)
    .join(", ");
  if (enderecoPartes) {
    evidencias.push({
      tipo: "endereco",
      campo: "endereco",
      valor: enderecoPartes,
      fonte,
      nivel_confianca: "provavel",
      observacao: null,
    });
  }

  if (linha.cnaeDescricao) {
    evidencias.push({
      tipo: "cnae",
      campo: "cnae_descricao",
      valor: linha.cnaeSecundarios ? `${linha.cnaeDescricao} (secundários: ${linha.cnaeSecundarios})` : linha.cnaeDescricao,
      fonte,
      nivel_confianca: "provavel",
      observacao: null,
    });
  }

  if (linha.capitalSocial) {
    evidencias.push({
      tipo: "outro",
      campo: "capital_social",
      valor: linha.capitalSocial,
      fonte,
      nivel_confianca: "provavel",
      observacao: null,
    });
  }

  return evidencias;
}

export async function importarProspectosAction(
  _prevState: ImportarProspectosState,
  formData: FormData,
): Promise<ImportarProspectosState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return { error: "Apenas Owners podem importar prospectos.", success: false };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione uma planilha (.xlsx).", success: false };
  }
  if (file.size > MAX_ARQUIVO_BYTES) {
    return { error: "Arquivo maior que o limite de 20MB.", success: false };
  }

  let linhasBrutas: Record<string, unknown>[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const primeiraAba = workbook.SheetNames[0];
    if (!primeiraAba) {
      return { error: "A planilha não tem nenhuma aba.", success: false };
    }
    linhasBrutas = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba], { defval: null });
  } catch {
    return {
      error: "Não foi possível ler o arquivo — confirme que é um .xlsx válido.",
      success: false,
    };
  }

  if (linhasBrutas.length === 0) {
    return { error: "A planilha não tem nenhuma linha de dados.", success: false };
  }

  const colunasEncontradas = new Set(Object.keys(linhasBrutas[0]));
  const colunasFaltando = PROSPECTO_COLUNAS_ESPERADAS.filter((c) => !colunasEncontradas.has(c));
  if (colunasFaltando.length > 0) {
    return {
      error: `Planilha fora do template esperado — colunas faltando: ${colunasFaltando.join(", ")}.`,
      success: false,
    };
  }

  const errosLinha: LinhaComErro[] = [];
  const validas: ProspectoPlanilhaRow[] = [];
  linhasBrutas.forEach((raw, idx) => {
    const numeroLinha = idx + 2; // linha 1 = cabeçalho
    const resultado = validarLinhaProspecto(raw, numeroLinha);
    if (resultado.ok) {
      validas.push(resultado.linha);
    } else {
      errosLinha.push(resultado.erro);
    }
  });

  if (validas.length === 0) {
    return {
      error: "Nenhuma linha válida encontrada — confirme que a planilha segue o template.",
      success: false,
    };
  }

  const supabase = await createClient();

  // CNPJ repetido dentro da própria planilha: a última ocorrência vence.
  const porCnpj = new Map<string, ProspectoPlanilhaRow>();
  for (const linha of validas) {
    porCnpj.set(linha.cnpj, linha);
  }
  const linhasUnicas = Array.from(porCnpj.values());
  const cnpjs = linhasUnicas.map((l) => l.cnpj);

  const { data: existentes } = await supabase
    .from("dossies_cadastrais")
    .select("id, cnpj_consultado")
    .is("empresa_id", null)
    .in("cnpj_consultado", cnpjs);

  const idPorCnpj = new Map(
    (existentes ?? [])
      .filter((d): d is { id: string; cnpj_consultado: string } => !!d.cnpj_consultado)
      .map((d) => [d.cnpj_consultado, d.id]),
  );

  const novas = linhasUnicas.filter((l) => !idPorCnpj.has(l.cnpj));
  const paraAtualizar = linhasUnicas.filter((l) => idPorCnpj.has(l.cnpj));

  const fonte = `Planilha importada: ${file.name}`;
  let importadas = 0;
  let atualizadas = 0;

  if (novas.length > 0) {
    const { data: inseridos, error: insertError } = await supabase
      .from("dossies_cadastrais")
      .insert(
        novas.map((l) => ({
          tenant_id: null,
          empresa_id: null,
          razao_social: l.razaoSocial,
          origem: "importacao_planilha" as const,
          status: "pesquisa_iniciada" as const,
          cnpj_consultado: l.cnpj,
          dados_oficiais: null,
          dados_enriquecimento: null,
          qsa: null,
          score_confiabilidade: null,
          score_classificacao: null,
          ultima_consulta_em: null,
          criado_por: user.id,
        })),
      )
      .select("id, cnpj_consultado");

    if (insertError) {
      return { error: "Falha ao gravar os prospectos novos.", success: false };
    }

    importadas = inseridos?.length ?? 0;

    const evidenciasNovas = (inseridos ?? []).flatMap((dossie) => {
      const linha = porCnpj.get(dossie.cnpj_consultado ?? "");
      if (!linha) return [];
      return evidenciasDaLinha(linha, fonte).map((e) => ({
        dossie_id: dossie.id,
        tipo: e.tipo,
        campo: e.campo,
        valor: e.valor,
        fonte: e.fonte,
        nivel_confianca: e.nivel_confianca,
        observacao: e.observacao,
        consultado_por: user.id,
      }));
    });

    if (evidenciasNovas.length > 0) {
      await supabase.from("dossie_evidencias").insert(evidenciasNovas);
    }
  }

  await emLotes(paraAtualizar, CONCORRENCIA_ATUALIZACAO, async (lote) => {
    const evidenciasDoLote = (
      await Promise.all(
        lote.map(async (linha) => {
          const id = idPorCnpj.get(linha.cnpj);
          if (!id) return [];

          const { error } = await supabase
            .from("dossies_cadastrais")
            .update({ razao_social: linha.razaoSocial })
            .eq("id", id);

          if (error) return [];

          atualizadas += 1;
          return evidenciasDaLinha(linha, fonte).map((e) => ({
            dossie_id: id,
            tipo: e.tipo,
            campo: e.campo,
            valor: e.valor,
            fonte: e.fonte,
            nivel_confianca: e.nivel_confianca,
            observacao: e.observacao,
            consultado_por: user.id,
          }));
        }),
      )
    ).flat();

    if (evidenciasDoLote.length > 0) {
      await supabase.from("dossie_evidencias").insert(evidenciasDoLote);
    }
  });

  const errosParaAuditoria = errosLinha.slice(0, MAX_ERROS_REGISTRADOS);

  const { error: importacaoError } = await supabase.from("dossie_importacoes").insert({
    nome_arquivo: file.name,
    total_linhas: linhasBrutas.length,
    linhas_importadas: importadas,
    linhas_atualizadas: atualizadas,
    linhas_com_erro: errosLinha.length,
    erros: errosParaAuditoria.length > 0 ? { linhas: errosParaAuditoria } : null,
    importado_por: user.id,
  });

  if (importacaoError) {
    return {
      error: "Prospectos gravados, mas houve falha ao registrar o log de importação.",
      success: false,
    };
  }

  await logAuditEvent({
    tenantId: null,
    action: "prospecto.importado",
    entityType: "dossie_importacao",
    entityId: null,
    newData: {
      nome_arquivo: file.name,
      total_linhas: linhasBrutas.length,
      importadas,
      atualizadas,
      com_erro: errosLinha.length,
    },
  });

  revalidatePath("/backoffice/prospectos");

  return {
    error: null,
    success: true,
    resumo: {
      totalLinhas: linhasBrutas.length,
      importadas,
      atualizadas,
      comErro: errosLinha.length,
    },
  };
}

export interface ConsultarProspectoState {
  error: string | null;
  success: boolean;
}

export async function consultarProspectoAction(
  dossieId: string,
): Promise<ConsultarProspectoState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return { error: "Apenas Owners podem usar a inteligência cadastral.", success: false };
  }

  const supabase = await createClient();

  const { data: prospecto } = await supabase
    .from("dossies_cadastrais")
    .select("id, cnpj_consultado, empresa_id")
    .eq("id", dossieId)
    .is("empresa_id", null)
    .single();

  if (!prospecto || !prospecto.cnpj_consultado) {
    return { error: "Prospecto não encontrado.", success: false };
  }

  const resultado = await avaliarCnpj(prospecto.cnpj_consultado);

  if (resultado.status === "erro") {
    return { error: resultado.mensagem, success: false };
  }

  if (resultado.status === "nao_encontrado") {
    const { error: updateError } = await supabase
      .from("dossies_cadastrais")
      .update({
        status: "revisao_cadastral",
        ultima_consulta_em: new Date().toISOString(),
      })
      .eq("id", dossieId);

    if (updateError) {
      return { error: "Não foi possível atualizar o prospecto.", success: false };
    }

    await supabase.from("dossie_evidencias").insert({
      dossie_id: dossieId,
      tipo: "cnpj",
      campo: "cnpj",
      valor: prospecto.cnpj_consultado,
      fonte: FONTE_BRASIL_API,
      nivel_confianca: "nao_confirmado",
      observacao: "CNPJ não localizado na Receita Federal.",
      consultado_por: user.id,
    });

    await logAuditEvent({
      tenantId: null,
      action: "prospecto.consultado",
      entityType: "prospecto",
      entityId: dossieId,
      newData: { resultado: "nao_encontrado" },
    });

    revalidatePath(`/backoffice/prospectos/${dossieId}`);
    return { error: null, success: true };
  }

  const status = !resultado.ativa ? "revisao_cadastral" : "cadastro_validado";

  const { error: updateError } = await supabase
    .from("dossies_cadastrais")
    .update({
      status,
      razao_social: resultado.dadosOficiais.razaoSocial,
      dados_oficiais: resultado.dadosOficiais as unknown as Record<string, unknown>,
      dados_enriquecimento: resultado.dadosEnriquecimento,
      qsa: resultado.dadosOficiais.qsa as unknown as Record<string, unknown>[],
      score_confiabilidade: resultado.score,
      score_classificacao: resultado.classificacao,
      ultima_consulta_em: new Date().toISOString(),
    })
    .eq("id", dossieId);

  if (updateError) {
    return { error: "Não foi possível atualizar o prospecto.", success: false };
  }

  const { error: evidenciasError } = await supabase.from("dossie_evidencias").insert(
    resultado.evidencias.map((e) => ({
      dossie_id: dossieId,
      tipo: e.tipo,
      campo: e.campo,
      valor: e.valor,
      fonte: e.fonte,
      nivel_confianca: e.nivel_confianca,
      observacao: e.observacao,
      consultado_por: user.id,
    })),
  );

  if (evidenciasError) {
    return { error: "Prospecto atualizado, mas houve falha ao registrar as evidências.", success: false };
  }

  await logAuditEvent({
    tenantId: null,
    action: "prospecto.consultado",
    entityType: "prospecto",
    entityId: dossieId,
    newData: { resultado: "encontrado", score: resultado.score, status },
  });

  revalidatePath(`/backoffice/prospectos/${dossieId}`);
  return { error: null, success: true };
}
