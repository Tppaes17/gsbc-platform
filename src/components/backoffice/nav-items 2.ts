import type { LucideIcon } from "lucide-react";
import {
  Building,
  Building2,
  LayoutDashboard,
  ScrollText,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresPlatformStaff?: boolean;
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
