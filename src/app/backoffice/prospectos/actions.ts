"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { consultarEAtualizarDossie, type EvidenciaInput } from "@/lib/cnpj/avaliacao";
import { createClient } from "@/lib/supabase/server";
import {
  PROSPECTO_COLUNAS_ESPERADAS,
  validarLinhaProspecto,
  type LinhaComErro,
  type ProspectoPlanilhaRow,
} from "@/lib/validation/prospecto";
import {
  formatarCnpj,
  promoverProspectoSchema,
} from "@/lib/validation/promocao-prospecto";

export interface ImportarProspectosState {
  error: string | null;
  success: boolean;
  resumo?: {
    totalLinhas: number;
    importadas: number;
    atualizadas: number;
    comErro: number;
    consultadas: number;
    descartadas: number;
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
    .is("promoted_at", null)
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
  let consultadas = 0;
  let descartadas = 0;

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

    // Consulta automática da Receita Federal pra cada prospecto recém-
    // importado (Rodada 30, decisão confirmada com o usuário: síncrona,
    // sequencial, dentro da própria importação — não em background).
    // Sequencial de propósito: a BrasilAPI não tem rate-limit documentado
    // e o cliente atual (consultarCnpjOficial) não tem retry/backoff;
    // rodar em paralelo arriscaria mais falha, não menos. Cada item tem
    // seu próprio try/catch — uma falha isolada nunca derruba o resto da
    // importação.
    for (const dossie of inseridos ?? []) {
      if (!dossie.cnpj_consultado) continue;

      try {
        const consulta = await consultarEAtualizarDossie(supabase, dossie.id, dossie.cnpj_consultado, user.id);
        consultadas += 1;
        if (consulta.status === "descartado_receita") descartadas += 1;
      } catch {
        // Falha inesperada num item isolado não derruba a importação —
        // o prospecto fica "pesquisa_iniciada" pra consulta manual depois.
      }
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
      consultadas,
      descartadas,
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
      consultadas,
      descartadas,
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
    .is("promoted_at", null)
    .single();

  if (!prospecto || !prospecto.cnpj_consultado) {
    return { error: "Prospecto não encontrado.", success: false };
  }

  const consulta = await consultarEAtualizarDossie(supabase, dossieId, prospecto.cnpj_consultado, user.id);

  if (consulta.resultado === "erro") {
    return { error: consulta.mensagemErro ?? "Não foi possível consultar.", success: false };
  }

  await logAuditEvent({
    tenantId: null,
    action: "prospecto.consultado",
    entityType: "prospecto",
    entityId: dossieId,
    newData: { resultado: consulta.resultado, status: consulta.status },
  });

  revalidatePath(`/backoffice/prospectos/${dossieId}`);
  return { error: null, success: true };
}

export interface PromoverProspectoState {
  status: "idle" | "erro" | "duplicado";
  error: string | null;
  empresaExistente: { id: string; razaoSocial: string; tenantNome: string } | null;
}

interface EvidenciaParaContato {
  tipo: string;
  valor: string | null;
}

function extrairContatoDeEvidencias(evidencias: EvidenciaParaContato[]) {
  const decisor = evidencias.find((e) => e.tipo === "decisor" && e.valor);
  const email = evidencias.find((e) => e.tipo === "email" && e.valor)?.valor ?? null;
  const telefone = evidencias.find((e) => e.tipo === "telefone" && e.valor)?.valor ?? null;

  if (!decisor && !email && !telefone) return null;

  let nome = "Contato principal";
  let cargo: string | null = null;
  if (decisor?.valor) {
    const [nomeParte, cargoParte] = decisor.valor.split(" — ");
    nome = nomeParte?.trim() || nome;
    cargo = cargoParte?.trim() || null;
  }

  return { nome, cargo, email, telefone };
}

/**
 * STG-01 do roadmap (docs/roadmap-stagings.md) — elimina o recadastro
 * manual entre prospecto validado e empresa operacional. Dois caminhos:
 *
 * 1. Nenhuma empresa com esse CNPJ no sindicato escolhido: cria a
 *    empresa e o MESMO dossiê do prospecto vira o dossiê dela
 *    (empresa_id/tenant_id preenchidos — reaproveita a modelagem já
 *    existente desde a Rodada 16, sem tabela nova).
 * 2. Já existe uma empresa com esse CNPJ nesse sindicato: nunca duplica
 *    silenciosamente. As evidências do prospecto são copiadas (nunca
 *    reparentadas — dossie_evidencias é append-only) para o dossiê já
 *    existente da empresa, e o prospecto fica marcado como promovido via
 *    `promoted_empresa_id`, sem tocar seu próprio `empresa_id`.
 */
export async function promoverProspectoAction(
  _prevState: PromoverProspectoState,
  formData: FormData,
): Promise<PromoverProspectoState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return {
      status: "erro",
      error: "Apenas Owners podem promover prospectos.",
      empresaExistente: null,
    };
  }

  const confirmarAssociacao = formData.get("confirmarAssociacao") === "true";

  const parsed = promoverProspectoSchema.safeParse({
    dossieId: formData.get("dossieId"),
    tenantId: formData.get("tenantId"),
    razaoSocial: formData.get("razaoSocial"),
    nomeFantasia: formData.get("nomeFantasia") || undefined,
    cnae: formData.get("cnae") || undefined,
    segmento: formData.get("segmento") || undefined,
    enquadramento: formData.get("enquadramento") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "erro",
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      empresaExistente: null,
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: prospecto } = await supabase
    .from("dossies_cadastrais")
    .select("id, cnpj_consultado")
    .eq("id", input.dossieId)
    .is("empresa_id", null)
    .is("promoted_at", null)
    .single();

  if (!prospecto || !prospecto.cnpj_consultado) {
    return {
      status: "erro",
      error: "Prospecto não encontrado ou já promovido.",
      empresaExistente: null,
    };
  }

  const cnpjFormatado = formatarCnpj(prospecto.cnpj_consultado);

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("id", input.tenantId)
    .single();

  if (!tenant) {
    return { status: "erro", error: "Sindicato não encontrado.", empresaExistente: null };
  }

  const { data: empresaExistente } = await supabase
    .from("empresas")
    .select("id, razao_social")
    .eq("tenant_id", input.tenantId)
    .eq("cnpj", cnpjFormatado)
    .maybeSingle();

  if (empresaExistente && !confirmarAssociacao) {
    return {
      status: "duplicado",
      error: null,
      empresaExistente: {
        id: empresaExistente.id,
        razaoSocial: empresaExistente.razao_social,
        tenantNome: tenant.name,
      },
    };
  }

  const { data: evidencias } = await supabase
    .from("dossie_evidencias")
    .select("tipo, campo, valor, fonte, nivel_confianca, observacao")
    .eq("dossie_id", input.dossieId);

  if (empresaExistente) {
    const { data: dossieExistente } = await supabase
      .from("dossies_cadastrais")
      .select("id")
      .eq("empresa_id", empresaExistente.id)
      .maybeSingle();

    if (dossieExistente) {
      // A empresa já tem seu próprio dossiê canônico — não dá pra
      // reparentar (dossie_evidencias é append-only, e empresa_id de
      // dossies_cadastrais é único). Copia as evidências do prospecto
      // para lá em vez de perdê-las.
      if (evidencias && evidencias.length > 0) {
        await supabase.from("dossie_evidencias").insert(
          evidencias.map((e) => ({
            dossie_id: dossieExistente.id,
            tipo: e.tipo,
            campo: e.campo,
            valor: e.valor,
            fonte: e.fonte,
            nivel_confianca: e.nivel_confianca,
            observacao: e.observacao
              ? `${e.observacao} (copiado do prospecto promovido)`
              : "Copiado do prospecto promovido.",
            consultado_por: user.id,
          })),
        );
      }

      const { error: updateError } = await supabase
        .from("dossies_cadastrais")
        .update({
          promoted_at: new Date().toISOString(),
          promoted_by: user.id,
          promoted_empresa_id: empresaExistente.id,
        })
        .eq("id", input.dossieId);

      if (updateError) {
        return {
          status: "erro",
          error: "Não foi possível concluir a associação.",
          empresaExistente: null,
        };
      }
    } else {
      // A empresa existe mas ainda não tem dossiê — nada com que
      // conflitar, então o próprio dossiê do prospecto vira o dela
      // (mesmo caminho do cadastro novo, só sem criar a empresa).
      const { error: updateError } = await supabase
        .from("dossies_cadastrais")
        .update({
          empresa_id: empresaExistente.id,
          tenant_id: input.tenantId,
          promoted_at: new Date().toISOString(),
          promoted_by: user.id,
          promoted_empresa_id: empresaExistente.id,
        })
        .eq("id", input.dossieId);

      if (updateError) {
        return {
          status: "erro",
          error: "Não foi possível concluir a associação.",
          empresaExistente: null,
        };
      }
    }

    await logAuditEvent({
      tenantId: input.tenantId,
      action: "prospecto.promovido",
      entityType: "prospecto",
      entityId: input.dossieId,
      newData: { resultado: "associado_a_empresa_existente", empresa_id: empresaExistente.id },
    });

    revalidatePath("/backoffice/prospectos");
    revalidatePath(`/backoffice/empresas/${empresaExistente.id}`);
    redirect(`/backoffice/empresas/${empresaExistente.id}`);
  }

  const { data: empresaCriada, error: insertError } = await supabase
    .from("empresas")
    .insert({
      tenant_id: input.tenantId,
      razao_social: input.razaoSocial,
      nome_fantasia: input.nomeFantasia || null,
      cnpj: cnpjFormatado,
      cnae: input.cnae || null,
      segmento: input.segmento || null,
      enquadramento: input.enquadramento || null,
    })
    .select("id")
    .single();

  if (insertError || !empresaCriada) {
    return {
      status: "erro",
      error: "Não foi possível cadastrar a empresa.",
      empresaExistente: null,
    };
  }

  const contato = extrairContatoDeEvidencias(evidencias ?? []);
  if (contato) {
    await supabase.from("empresa_contatos").insert({
      empresa_id: empresaCriada.id,
      nome: contato.nome,
      cargo: contato.cargo,
      email: contato.email,
      telefone: contato.telefone,
      principal: true,
    });
  }

  const { error: updateError } = await supabase
    .from("dossies_cadastrais")
    .update({
      empresa_id: empresaCriada.id,
      tenant_id: input.tenantId,
      promoted_at: new Date().toISOString(),
      promoted_by: user.id,
      promoted_empresa_id: empresaCriada.id,
    })
    .eq("id", input.dossieId);

  if (updateError) {
    return {
      status: "erro",
      error: "Empresa criada, mas houve falha ao vincular o dossiê. Contate o suporte.",
      empresaExistente: null,
    };
  }

  await logAuditEvent({
    tenantId: input.tenantId,
    action: "prospecto.promovido",
    entityType: "prospecto",
    entityId: input.dossieId,
    newData: {
      resultado: "empresa_criada",
      empresa_id: empresaCriada.id,
      razao_social: input.razaoSocial,
      cnpj: cnpjFormatado,
    },
  });

  revalidatePath("/backoffice/prospectos");
  revalidatePath("/backoffice/empresas");
  revalidatePath(`/backoffice/empresas/${empresaCriada.id}`);
  redirect(`/backoffice/empresas/${empresaCriada.id}`);
}
