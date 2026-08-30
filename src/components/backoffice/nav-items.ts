import type { LucideIcon } from "lucide-react";
import {
  Building,
  Building2,
  CircleDollarSign,
  FileText,
  Gavel,
  Handshake,
  Landmark,
  LayoutDashboard,
  ListTodo,
  Receipt,
  ScaleIcon,
  ScrollText,
  Search,
  Settings2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresPlatformStaff?: boolean;
  ownerOnly?: boolean;
}

/**
 * Itens do menu do backoffice (regra 39). Cresce por rodada, conforme os
 * módulos P1+ são implementados — nunca antes disso (regra 62: não expor
 * navegação para telas inexistentes ou mockadas).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/backoffice", label: "Visão Geral", icon: LayoutDashboard },
  {
    // Visível a todos (regra 6, "o sindicato acompanha") — dashboard de
    // receita do próprio sindicato, RLS escopa por tenant (STG-08).
    href: "/backoffice/receita",
    label: "Receita",
    icon: TrendingUp,
  },
  {
    // Staff GSBC apenas — fila operacional interna (STG-03), não é sobre
    // transparência pro sindicato como Auditoria; é ferramenta de execução.
    href: "/backoffice/operacoes",
    label: "Central Operacional",
    icon: ListTodo,
    requiresPlatformStaff: true,
  },
  { href: "/backoffice/sindicatos", label: "Sindicatos", icon: Building2 },
  { href: "/backoffice/empresas", label: "Empresas", icon: Building },
  {
    // Owner apenas (mapeado a gsbc_super_admin) — regra explícita do
    // usuário para o módulo de inteligência cadastral (Rodada 14).
    href: "/backoffice/prospectos",
    label: "Empresas Prospectadas",
    icon: Search,
    ownerOnly: true,
  },
  {
    href: "/backoffice/instrumentos",
    label: "Instrumentos",
    icon: FileText,
  },
  { href: "/backoffice/cobrancas", label: "Cobranças", icon: Receipt },
  { href: "/backoffice/negociacoes", label: "Negociações", icon: Handshake },
  { href: "/backoffice/contestacoes", label: "Contestações", icon: ScaleIcon },
  {
    // Visível a todos (regra 6, transparência) — aprovação em si é
    // restrita ao papel Jurídico via RPC/RLS (STG-09), não na navegação.
    href: "/backoffice/escalonamentos",
    label: "Escalonamentos",
    icon: Gavel,
  },
  { href: "/backoffice/financeiro", label: "Financeiro", icon: Wallet },
  {
    href: "/backoffice/contratos-financeiros",
    label: "Contratos Financeiros",
    icon: Landmark,
    requiresPlatformStaff: true,
  },
  {
    href: "/backoffice/conciliacao",
    label: "Conciliação",
    icon: CircleDollarSign,
    requiresPlatformStaff: true,
  },
  {
    // Staff GSBC apenas — governança de políticas de decisão/automação
    // (STG-11), mesmo nível de acesso de Central Operacional; ativar/
    // desativar em si é restrito a Owner via RPC (alternar_policy_ativa).
    href: "/backoffice/politicas",
    label: "Políticas",
    icon: Settings2,
    requiresPlatformStaff: true,
  },
  { href: "/backoffice/usuarios", label: "Usuários", icon: Users },
  {
    // Visível a todos: a auditoria é o mecanismo de transparência da GSBC
    // com o sindicato (regra 6 — "a GSBC executa, o sindicato acompanha, a
    // plataforma registra"). RLS escopa cada usuário ao seu próprio tenant.
    href: "/backoffice/auditoria",
    label: "Auditoria",
    icon: ScrollText,
  },
];
