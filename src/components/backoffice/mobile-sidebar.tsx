"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

/**
 * Navegação mobile do backoffice (Stage 2 da revisão de design,
 * docs/design/stage-02-navigation.md) — abaixo de 768px a sidebar
 * desktop desaparece (`hidden md:flex`, src/app/backoffice/layout.tsx)
 * e este drawer é o único caminho de navegação. Lê a mesma SidebarNav/
 * NAV_ITEMS da sidebar desktop — nunca uma segunda lista de permissão.
 */
export function MobileSidebar({
  isPlatformStaff,
  isOwner,
  tenantLabel,
}: {
  isPlatformStaff: boolean;
  isOwner: boolean;
  tenantLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Abrir menu" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b bg-sidebar">
          <SheetTitle>GSBC</SheetTitle>
          <SheetDescription>{tenantLabel}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto bg-sidebar p-4">
          <SidebarNav
            isPlatformStaff={isPlatformStaff}
            isOwner={isOwner}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
