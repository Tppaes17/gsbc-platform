/**
 * Códigos canônicos de papéis e permissões — devem espelhar supabase/seed.sql.
 * Fonte de verdade em runtime é o banco (roles/permissions/role_permissions);
 * estas constantes existem para checagens tipadas no código do produto.
 */

export const ROLE_CODES = {
  gsbcSuperAdmin: "gsbc_super_admin",
  gsbcAdministrador: "gsbc_administrador",
  gsbcGestor: "gsbc_gestor",
  gsbcAnalista: "gsbc_analista",
  gsbcFinanceiro: "gsbc_financeiro",
  gsbcJuridico: "gsbc_juridico",
  gsbcConsulta: "gsbc_consulta",
  sindicatoAdministrador: "sindicato_administrador",
  sindicatoDirigente: "sindicato_dirigente",
  sindicatoFinanceiro: "sindicato_financeiro",
  sindicatoConsulta: "sindicato_consulta",
  empresaRepresentante: "empresa_representante",
  parceiro: "parceiro",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const PERMISSION_CODES = {
  tenantsManage: "tenants.manage",
  tenantsRead: "tenants.read",
  usersManage: "users.manage",
  auditLogsRead: "audit_logs.read",
} as const;

export type PermissionCode =
  (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

export interface CurrentMembership {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  tenantType: "platform" | "sindicato";
  tenantSlug: string;
  tenantOnboardingStatus: "onboarding" | "active";
  roleId: string;
  roleCode: RoleCode | string;
  roleName: string;
}

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  isPlatformStaff: boolean;
  /** "Owner" (Rodada 14) — mapeado ao papel gsbc_super_admin, decisão do usuário. */
  isOwner: boolean;
  memberships: CurrentMembership[];
}

/**
 * Terceiro tipo de principal na plataforma (STG-05, Portal de
 * Regularização Empresarial) — não tem membership/tenant, só um vínculo
 * 1:1 com um contato de uma empresa específica. Nunca combinar com
 * CurrentUser: são sessões e contextos de autorização distintos.
 */
export interface CurrentPortalContato {
  contatoId: string;
  userId: string;
  nome: string;
  email: string;
  empresaId: string;
  empresaNome: string;
  tenantId: string;
}
