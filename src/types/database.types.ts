/**
 * Tipos do banco mantidos manualmente até existir um projeto Supabase provisionado.
 * Quando o projeto for criado, substituir por:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
 * Manter em sincronia com supabase/migrations/*.sql até lá.
 *
 * `Relationships` em cada tabela é obrigatório para que o supabase-js resolva
 * corretamente o tipo de selects com embed (ex.: `.select("*, tenants(name)")`).
 */

export type TenantType = "platform" | "sindicato";
export type TenantStatus = "active" | "suspended" | "archived";
export type TenantOnboardingStatus = "onboarding" | "active";
export type MembershipStatus = "active" | "invited" | "suspended";
export type InstrumentoTipo = "cct" | "act" | "termo_aditivo" | "outro";
export type InstrumentoStatus = "draft" | "active" | "expired" | "revoked";
export type ObrigacaoPeriodicidade = "unica" | "mensal" | "anual" | "outra";
export type ObrigacaoStatus =
  | "pending_validation"
  | "validated"
  | "contested"
  | "fulfilled"
  | "cancelled";
export type CobrancaPrioridade = "low" | "medium" | "high";
export type NegociacaoStatus = "aberta" | "em_negociacao" | "aceita" | "recusada" | "encerrada";
export type NegociacaoEventoTipo = "proposta_gsbc" | "contraproposta_empresa" | "aceite" | "recusa" | "observacao";
export type PagamentoFormaPagamento = "pix" | "boleto" | "transferencia" | "outro";
export type DocumentoCategoria = "instrumento" | "notificacao" | "acordo" | "comprovante" | "outro";
export type NotificacaoStatus = "enviada" | "falha";
export type DossieStatus =
  | "novo"
  | "pesquisa_iniciada"
  | "cadastro_validado"
  | "conflito_identificado"
  | "revisao_cadastral";
export type NivelConfianca =
  | "confirmado"
  | "provavel"
  | "nao_confirmado"
  | "conflitante"
  | "desatualizado";
export type ScoreClassificacao = "excelente" | "alta" | "media" | "baixa" | "insuficiente";
export type DossieOrigem = "consulta_api" | "importacao_planilha";
export type DossieEvidenciaTipo =
  | "cnpj"
  | "razao_social"
  | "situacao_cadastral"
  | "endereco"
  | "cnae"
  | "qsa"
  | "site"
  | "email"
  | "telefone"
  | "redes_sociais"
  | "decisor"
  | "outro";
export type SiteLeadOrigem = "diagnostico" | "contato";
export type SiteLeadStatus = "novo" | "em_contato" | "convertido" | "descartado";
export type CobrancaStatus =
  | "draft"
  | "pending_validation"
  | "approved"
  | "notified"
  | "contacted"
  | "negotiating"
  | "agreement_reached"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "suspended"
  | "cancelled"
  | "legal_escalation"
  | "closed";
export type CollectionStepCanal = "email" | "tarefa_humana" | "wait" | "escalonamento";
export type CollectionEnrollmentStatus =
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "escalated";
export type CollectionExecutionStatus =
  | "scheduled"
  | "processing"
  | "sent"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";
export type WorkItemTipo =
  | "tarefa_regua_cobranca"
  | "falha_automacao"
  | "escalonamento"
  | "pagamento_vencido"
  | "negociacao_parada";
export type WorkItemEntityType = "cobranca" | "negociacao" | "collection_enrollment";
export type WorkItemPrioridade = "low" | "medium" | "high";
export type WorkItemStatus = "aberto" | "concluido" | "adiado" | "cancelado";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          type: TenantType;
          name: string;
          slug: string;
          status: TenantStatus;
          onboarding_status: TenantOnboardingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: TenantType;
          name: string;
          slug: string;
          status?: TenantStatus;
          onboarding_status?: TenantOnboardingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };
      sindicatos: {
        Row: {
          id: string;
          tenant_id: string;
          razao_social: string;
          nome_fantasia: string | null;
          cnpj: string;
          categoria: string | null;
          base_territorial: string | null;
          email_institucional: string | null;
          telefone: string | null;
          endereco: Record<string, unknown> | null;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          razao_social: string;
          nome_fantasia?: string | null;
          cnpj: string;
          categoria?: string | null;
          base_territorial?: string | null;
          email_institucional?: string | null;
          telefone?: string | null;
          endereco?: Record<string, unknown> | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sindicatos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sindicatos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      sindicato_contatos: {
        Row: {
          id: string;
          sindicato_id: string;
          nome: string;
          cargo: string | null;
          email: string | null;
          telefone: string | null;
          principal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sindicato_id: string;
          nome: string;
          cargo?: string | null;
          email?: string | null;
          telefone?: string | null;
          principal?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["sindicato_contatos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "sindicato_contatos_sindicato_id_fkey";
            columns: ["sindicato_id"];
            isOneToOne: false;
            referencedRelation: "sindicatos";
            referencedColumns: ["id"];
          },
        ];
      };
      empresas: {
        Row: {
          id: string;
          tenant_id: string;
          razao_social: string;
          nome_fantasia: string | null;
          cnpj: string;
          cnae: string | null;
          segmento: string | null;
          enquadramento: string | null;
          endereco: Record<string, unknown> | null;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          razao_social: string;
          nome_fantasia?: string | null;
          cnpj: string;
          cnae?: string | null;
          segmento?: string | null;
          enquadramento?: string | null;
          endereco?: Record<string, unknown> | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["empresas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "empresas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      empresa_contatos: {
        Row: {
          id: string;
          empresa_id: string;
          nome: string;
          cargo: string | null;
          email: string | null;
          telefone: string | null;
          principal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          nome: string;
          cargo?: string | null;
          email?: string | null;
          telefone?: string | null;
          principal?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["empresa_contatos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "empresa_contatos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      instrumentos: {
        Row: {
          id: string;
          tenant_id: string;
          empresa_id: string | null;
          tipo: InstrumentoTipo;
          numero: string | null;
          titulo: string;
          data_base: string | null;
          vigencia_inicio: string | null;
          vigencia_fim: string | null;
          origem: string | null;
          status: InstrumentoStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          empresa_id?: string | null;
          tipo: InstrumentoTipo;
          numero?: string | null;
          titulo: string;
          data_base?: string | null;
          vigencia_inicio?: string | null;
          vigencia_fim?: string | null;
          origem?: string | null;
          status?: InstrumentoStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["instrumentos"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "instrumentos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "instrumentos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      clausulas: {
        Row: {
          id: string;
          instrumento_id: string;
          numero: string | null;
          titulo: string;
          texto: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instrumento_id: string;
          numero?: string | null;
          titulo: string;
          texto?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clausulas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "clausulas_instrumento_id_fkey";
            columns: ["instrumento_id"];
            isOneToOne: false;
            referencedRelation: "instrumentos";
            referencedColumns: ["id"];
          },
        ];
      };
      obrigacoes: {
        Row: {
          id: string;
          tenant_id: string;
          instrumento_id: string;
          clausula_id: string | null;
          empresa_id: string;
          fundamento: string | null;
          descricao: string;
          periodicidade: ObrigacaoPeriodicidade;
          periodo_inicio: string | null;
          periodo_fim: string | null;
          vencimento: string | null;
          valor_referencia: number | null;
          status: ObrigacaoStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          instrumento_id: string;
          clausula_id?: string | null;
          empresa_id: string;
          fundamento?: string | null;
          descricao: string;
          periodicidade?: ObrigacaoPeriodicidade;
          periodo_inicio?: string | null;
          periodo_fim?: string | null;
          vencimento?: string | null;
          valor_referencia?: number | null;
          status?: ObrigacaoStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obrigacoes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "obrigacoes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obrigacoes_instrumento_id_fkey";
            columns: ["instrumento_id"];
            isOneToOne: false;
            referencedRelation: "instrumentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obrigacoes_clausula_id_fkey";
            columns: ["clausula_id"];
            isOneToOne: false;
            referencedRelation: "clausulas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "obrigacoes_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      cobrancas: {
        Row: {
          id: string;
          tenant_id: string;
          empresa_id: string;
          obrigacao_id: string;
          valor_principal: number;
          valor_atualizacao: number;
          valor_cobranca: number;
          vencimento: string | null;
          prioridade: CobrancaPrioridade;
          responsavel_id: string | null;
          status: CobrancaStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          empresa_id: string;
          obrigacao_id: string;
          valor_principal: number;
          valor_atualizacao?: number;
          vencimento?: string | null;
          prioridade?: CobrancaPrioridade;
          responsavel_id?: string | null;
          status?: CobrancaStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["cobrancas"]["Insert"], "valor_cobranca">
        >;
        Relationships: [
          {
            foreignKeyName: "cobrancas_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobrancas_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobrancas_obrigacao_id_fkey";
            columns: ["obrigacao_id"];
            isOneToOne: true;
            referencedRelation: "obrigacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobrancas_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cobranca_eventos: {
        Row: {
          id: string;
          cobranca_id: string;
          from_status: string | null;
          to_status: string;
          user_id: string | null;
          reason: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cobranca_id: string;
          from_status?: string | null;
          to_status: string;
          user_id?: string | null;
          reason?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "cobranca_eventos_cobranca_id_fkey";
            columns: ["cobranca_id"];
            isOneToOne: false;
            referencedRelation: "cobrancas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranca_eventos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      negociacoes: {
        Row: {
          id: string;
          tenant_id: string;
          empresa_id: string;
          cobranca_id: string;
          status: NegociacaoStatus;
          valor_atual: number | null;
          responsavel_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          empresa_id: string;
          cobranca_id: string;
          status?: NegociacaoStatus;
          valor_atual?: number | null;
          responsavel_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["negociacoes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "negociacoes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "negociacoes_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "negociacoes_cobranca_id_fkey";
            columns: ["cobranca_id"];
            isOneToOne: true;
            referencedRelation: "cobrancas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "negociacoes_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      negociacao_eventos: {
        Row: {
          id: string;
          negociacao_id: string;
          tipo: NegociacaoEventoTipo;
          valor: number | null;
          condicoes: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          negociacao_id: string;
          tipo: NegociacaoEventoTipo;
          valor?: number | null;
          condicoes?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "negociacao_eventos_negociacao_id_fkey";
            columns: ["negociacao_id"];
            isOneToOne: false;
            referencedRelation: "negociacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "negociacao_eventos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pagamentos: {
        Row: {
          id: string;
          tenant_id: string;
          empresa_id: string;
          cobranca_id: string;
          valor: number;
          data_pagamento: string;
          forma_pagamento: PagamentoFormaPagamento;
          observacao: string | null;
          registrado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          empresa_id: string;
          cobranca_id: string;
          valor: number;
          data_pagamento: string;
          forma_pagamento: PagamentoFormaPagamento;
          observacao?: string | null;
          registrado_por?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "pagamentos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pagamentos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pagamentos_cobranca_id_fkey";
            columns: ["cobranca_id"];
            isOneToOne: false;
            referencedRelation: "cobrancas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pagamentos_registrado_por_fkey";
            columns: ["registrado_por"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacoes: {
        Row: {
          id: string;
          tenant_id: string;
          empresa_id: string;
          cobranca_id: string | null;
          destinatario_email: string;
          assunto: string;
          status: NotificacaoStatus;
          erro: string | null;
          enviado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          empresa_id: string;
          cobranca_id?: string | null;
          destinatario_email: string;
          assunto: string;
          status: NotificacaoStatus;
          erro?: string | null;
          enviado_por?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "notificacoes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificacoes_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificacoes_cobranca_id_fkey";
            columns: ["cobranca_id"];
            isOneToOne: false;
            referencedRelation: "cobrancas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificacoes_enviado_por_fkey";
            columns: ["enviado_por"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dossies_cadastrais: {
        Row: {
          id: string;
          tenant_id: string | null;
          empresa_id: string | null;
          status: DossieStatus;
          cnpj_consultado: string | null;
          razao_social: string | null;
          origem: DossieOrigem;
          dados_oficiais: Record<string, unknown> | null;
          dados_enriquecimento: Record<string, unknown> | null;
          qsa: Record<string, unknown>[] | null;
          score_confiabilidade: number | null;
          score_classificacao: ScoreClassificacao | null;
          ultima_consulta_em: string | null;
          criado_por: string | null;
          created_at: string;
          updated_at: string;
          promoted_at: string | null;
          promoted_by: string | null;
          promoted_empresa_id: string | null;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          empresa_id?: string | null;
          status?: DossieStatus;
          cnpj_consultado?: string | null;
          razao_social?: string | null;
          origem?: DossieOrigem;
          dados_oficiais?: Record<string, unknown> | null;
          dados_enriquecimento?: Record<string, unknown> | null;
          qsa?: Record<string, unknown>[] | null;
          score_confiabilidade?: number | null;
          score_classificacao?: ScoreClassificacao | null;
          ultima_consulta_em?: string | null;
          criado_por?: string | null;
          created_at?: string;
          updated_at?: string;
          promoted_at?: string | null;
          promoted_by?: string | null;
          promoted_empresa_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["dossies_cadastrais"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "dossies_cadastrais_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossies_cadastrais_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: true;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossies_cadastrais_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossies_cadastrais_promoted_by_fkey";
            columns: ["promoted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossies_cadastrais_promoted_empresa_id_fkey";
            columns: ["promoted_empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      dossie_evidencias: {
        Row: {
          id: string;
          dossie_id: string;
          tipo: DossieEvidenciaTipo;
          campo: string | null;
          valor: string | null;
          fonte: string;
          url: string | null;
          nivel_confianca: NivelConfianca;
          observacao: string | null;
          consultado_em: string;
          consultado_por: string | null;
        };
        Insert: {
          id?: string;
          dossie_id: string;
          tipo: DossieEvidenciaTipo;
          campo?: string | null;
          valor?: string | null;
          fonte: string;
          url?: string | null;
          nivel_confianca: NivelConfianca;
          observacao?: string | null;
          consultado_em?: string;
          consultado_por?: string | null;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "dossie_evidencias_dossie_id_fkey";
            columns: ["dossie_id"];
            isOneToOne: false;
            referencedRelation: "dossies_cadastrais";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossie_evidencias_consultado_por_fkey";
            columns: ["consultado_por"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dossie_importacoes: {
        Row: {
          id: string;
          nome_arquivo: string;
          total_linhas: number;
          linhas_importadas: number;
          linhas_atualizadas: number;
          linhas_com_erro: number;
          erros: Record<string, unknown> | null;
          importado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome_arquivo: string;
          total_linhas: number;
          linhas_importadas: number;
          linhas_atualizadas: number;
          linhas_com_erro: number;
          erros?: Record<string, unknown> | null;
          importado_por?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "dossie_importacoes_importado_por_fkey";
            columns: ["importado_por"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      documentos: {
        Row: {
          id: string;
          tenant_id: string;
          empresa_id: string;
          storage_path: string;
          nome_arquivo: string;
          categoria: DocumentoCategoria;
          tamanho_bytes: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          empresa_id: string;
          storage_path: string;
          nome_arquivo: string;
          categoria: DocumentoCategoria;
          tamanho_bytes?: number | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "documentos_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documentos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documentos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_strategies: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          ativa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          ativa?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collection_strategies"]["Insert"]>;
        Relationships: [];
      };
      collection_templates: {
        Row: {
          id: string;
          canal: "email";
          nome: string;
          versao: number;
          assunto: string | null;
          corpo_texto: string;
          corpo_html: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          canal: "email";
          nome: string;
          versao?: number;
          assunto?: string | null;
          corpo_texto: string;
          corpo_html: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      collection_strategy_steps: {
        Row: {
          id: string;
          strategy_id: string;
          ordem: number;
          dias_apos_inscricao: number;
          canal: CollectionStepCanal;
          template_id: string | null;
          descricao: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          strategy_id: string;
          ordem: number;
          dias_apos_inscricao: number;
          canal: CollectionStepCanal;
          template_id?: string | null;
          descricao: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "collection_strategy_steps_strategy_id_fkey";
            columns: ["strategy_id"];
            isOneToOne: false;
            referencedRelation: "collection_strategies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_strategy_steps_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "collection_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_enrollments: {
        Row: {
          id: string;
          cobranca_id: string;
          strategy_id: string;
          tenant_id: string;
          empresa_id: string;
          status: CollectionEnrollmentStatus;
          current_step_ordem: number;
          enrolled_at: string;
          enrolled_by: string | null;
          paused_at: string | null;
          paused_by: string | null;
          paused_reason: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          cancelled_reason: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cobranca_id: string;
          strategy_id: string;
          tenant_id: string;
          empresa_id: string;
          status?: CollectionEnrollmentStatus;
          current_step_ordem?: number;
          enrolled_at?: string;
          enrolled_by?: string | null;
          paused_at?: string | null;
          paused_by?: string | null;
          paused_reason?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancelled_reason?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collection_enrollments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "collection_enrollments_cobranca_id_fkey";
            columns: ["cobranca_id"];
            isOneToOne: false;
            referencedRelation: "cobrancas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_enrollments_strategy_id_fkey";
            columns: ["strategy_id"];
            isOneToOne: false;
            referencedRelation: "collection_strategies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_enrollments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_enrollments_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      collection_executions: {
        Row: {
          id: string;
          enrollment_id: string;
          step_id: string;
          scheduled_for: string;
          status: CollectionExecutionStatus;
          attempt_count: number;
          last_error: string | null;
          resultado: Record<string, unknown> | null;
          executed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          enrollment_id: string;
          step_id: string;
          scheduled_for: string;
          status?: CollectionExecutionStatus;
          attempt_count?: number;
          last_error?: string | null;
          resultado?: Record<string, unknown> | null;
          executed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collection_executions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "collection_executions_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "collection_enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_executions_step_id_fkey";
            columns: ["step_id"];
            isOneToOne: false;
            referencedRelation: "collection_strategy_steps";
            referencedColumns: ["id"];
          },
        ];
      };
      work_items: {
        Row: {
          id: string;
          tenant_id: string;
          tipo: WorkItemTipo;
          entity_type: WorkItemEntityType;
          entity_id: string;
          titulo: string;
          descricao: string | null;
          prioridade: WorkItemPrioridade;
          due_at: string | null;
          status: WorkItemStatus;
          assigned_to: string | null;
          motivo: string | null;
          metadata: Record<string, unknown> | null;
          resolved_at: string | null;
          resolved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tipo: WorkItemTipo;
          entity_type: WorkItemEntityType;
          entity_id: string;
          titulo: string;
          descricao?: string | null;
          prioridade?: WorkItemPrioridade;
          due_at?: string | null;
          status?: WorkItemStatus;
          assigned_to?: string | null;
          motivo?: string | null;
          metadata?: Record<string, unknown> | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["work_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "work_items_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_items_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_items_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      site_leads: {
        Row: {
          id: string;
          origem: SiteLeadOrigem;
          nome: string;
          sindicato_nome: string | null;
          cargo: string | null;
          email: string;
          telefone: string | null;
          mensagem: string | null;
          status: SiteLeadStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          origem: SiteLeadOrigem;
          nome: string;
          sindicato_nome?: string | null;
          cargo?: string | null;
          email: string;
          telefone?: string | null;
          mensagem?: string | null;
          status?: SiteLeadStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["site_leads"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          tenant_type: TenantType;
          code: string;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_type: TenantType;
          code: string;
          name: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Insert"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role_id: string; permission_id: string };
        Insert: { role_id: string; permission_id: string };
        Update: Partial<
          Database["public"]["Tables"]["role_permissions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey";
            columns: ["permission_id"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["id"];
          },
        ];
      };
      memberships: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role_id: string;
          status: MembershipStatus;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role_id: string;
          status?: MembershipStatus;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["memberships"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "memberships_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          metadata: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          correlation_id: string | null;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_platform_staff: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      user_tenant_ids: {
        Args: { p_user_id: string };
        Returns: string[];
      };
      user_can_access_empresa: {
        Args: { p_empresa_id: string };
        Returns: boolean;
      };
      is_owner: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      valor_referencia_cobranca: {
        Args: { p_cobranca_id: string };
        Returns: number;
      };
      can_manage_tenant_members: {
        Args: { p_user_id: string; p_tenant_id: string };
        Returns: boolean;
      };
      create_sindicato_tenant: {
        Args: {
          p_name: string;
          p_slug: string;
          p_razao_social: string;
          p_nome_fantasia: string | null;
          p_cnpj: string;
          p_categoria: string | null;
          p_base_territorial: string | null;
          p_email_institucional: string | null;
          p_telefone: string | null;
        };
        Returns: string;
      };
      change_cobranca_status: {
        Args: {
          p_cobranca_id: string;
          p_new_status: string;
          p_reason?: string | null;
        };
        Returns: string;
      };
      register_negociacao_evento: {
        Args: {
          p_negociacao_id: string;
          p_tipo: string;
          p_valor?: number | null;
          p_condicoes?: string | null;
        };
        Returns: string;
      };
      register_pagamento: {
        Args: {
          p_cobranca_id: string;
          p_valor: number;
          p_data_pagamento: string;
          p_forma_pagamento: string;
          p_observacao?: string | null;
        };
        Returns: string;
      };
      log_audit_event: {
        Args: {
          p_tenant_id: string | null;
          p_action: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_old_data?: Record<string, unknown> | null;
          p_new_data?: Record<string, unknown> | null;
          p_metadata?: Record<string, unknown> | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
