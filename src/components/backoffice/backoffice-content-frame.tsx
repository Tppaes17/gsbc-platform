"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const FULL_OPERATIONAL_ROUTES = [
  "/backoffice/auditoria",
  "/backoffice/cobrancas",
  "/backoffice/conciliacao",
  "/backoffice/contestacoes",
  "/backoffice/financeiro",
  "/backoffice/negociacoes",
  "/backoffice/operacoes",
];

function frameClassForPath(pathname: string) {
  const isFullOperational = FULL_OPERATIONAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isFullOperational) return "max-w-none";
  return "max-w-[1440px]";
}

export function BackofficeContentFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={cn("mx-auto w-full", frameClassForPath(pathname))}>
      {children}
    </div>
  );
}
