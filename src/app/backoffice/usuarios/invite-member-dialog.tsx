"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteMembershipAction,
  type InviteMembershipState,
} from "./actions";

const initialState: InviteMembershipState = { error: null, success: false };

interface TenantOption {
  id: string;
  name: string;
  type: "platform" | "sindicato";
}

interface RoleOption {
  id: string;
  name: string;
  tenantType: "platform" | "sindicato";
}

interface InviteMemberDialogProps {
  tenants: TenantOption[];
  roles: RoleOption[];
}

export function InviteMemberDialog({ tenants, roles }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [roleId, setRoleId] = useState("");
  const [state, formAction, isPending] = useActionState(
    inviteMembershipAction,
    initialState,
  );

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const availableRoles = useMemo(
    () => roles.filter((r) => r.tenantType === selectedTenant?.type),
    [roles, selectedTenant],
  );

  function handleTenantChange(value: string) {
    setTenantId(value);
    setRoleId(""); // o papel depende do tipo do tenant selecionado
  }

  useEffect(() => {
    if (state.success) {
      toast.success("Convite enviado com sucesso.");
      // Fechar o dialog em resposta à conclusão da Server Action (sistema
      // externo ao React) é o caso de uso pretendido para este efeito — sem
      // risco de loop, dispara no máximo uma vez por submissão bem-sucedida.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  if (tenants.length === 0) {
    return null;
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setRoleId("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="h-4 w-4" />
            Convidar usuário
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>
              A pessoa recebe um e-mail para definir a senha e acessar a
              plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" name="fullName" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          {/* O <Select> controla apenas a UI; o hidden input abaixo é a
              única fonte de verdade submetida no FormData (evita depender
              da sincronização do input nativo do Base UI com um `value`
              controlado externamente). */}
          <input type="hidden" name="tenantId" value={tenantId} />

          {tenants.length > 1 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="tenantId">Tenant</Label>
              <Select
                value={tenantId}
                onValueChange={(value) => handleTenantChange(value as string)}
              >
                <SelectTrigger id="tenantId" className="w-full">
                  <SelectValue placeholder="Selecione um tenant">
                    {(value: string | null) =>
                      tenants.find((t) => t.id === value)?.name ??
                      "Selecione um tenant"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Tenant</Label>
              <p className="text-sm text-muted-foreground">
                {selectedTenant?.name}
              </p>
            </div>
          )}

          <input type="hidden" name="roleId" value={roleId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="roleId">Papel</Label>
            <Select
              value={roleId}
              onValueChange={(value) => setRoleId(value as string)}
            >
              <SelectTrigger id="roleId" className="w-full">
                <SelectValue placeholder="Selecione um papel">
                  {(value: string | null) =>
                    availableRoles.find((r) => r.id === value)?.name ??
                    "Selecione um papel"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
