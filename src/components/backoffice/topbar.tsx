import { Search } from "lucide-react";
import { MobileSidebar } from "@/components/backoffice/mobile-sidebar";
import { UserMenu } from "@/components/backoffice/user-menu";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/types/domain";

export function Topbar({
  user,
  tenantLabel,
}: {
  user: CurrentUser;
  tenantLabel: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <MobileSidebar
        isPlatformStaff={user.isPlatformStaff}
        isOwner={user.isOwner}
        tenantLabel={tenantLabel}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight md:hidden">GSBC</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block md:text-sm">
          {tenantLabel}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="hidden min-w-56 justify-start gap-2 text-muted-foreground md:inline-flex lg:min-w-72"
          aria-disabled="true"
          title="Busca global segura será implementada quando consultas permission-aware estiverem prontas."
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Buscar no GSBC</span>
          <span className="ml-auto rounded border px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
            Ctrl K
          </span>
        </Button>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
