import type { LucideIcon } from "lucide-react";
import {
  Building,
  Building2,
  FileText,
  Handshake,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Search,
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
  { href: "/backoffice/sindicatos", label: "Sindicatos", icon: Building2 },
  { href: "/backoffice/empresas", label: "Empresas", icon: Building },
  {
    // Owner apenas (mapeado a gsbc_super_admin) — regra explícita do
    // usuário para o módulo de inteligência cadastral (Rodada 14).
    href: "/backoffice/prospectos",
    label: "Prospectos",
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
  { href: "/backoffice/financeiro", label: "Financeiro", icon: Wallet },
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
