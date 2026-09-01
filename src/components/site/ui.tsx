import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto max-w-6xl px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-xs font-semibold tracking-[0.2em] uppercase",
        dark ? "text-brand-gold-light" : "text-brand-teal",
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  dark = false,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  dark?: boolean;
  /** "h1" quando esta é a referência principal da página (Seção 56 do
   * master prompt) — algumas páginas secundárias do site institucional
   * usavam SectionHeading como título de página sem nenhum h1 real
   * existir antes dele. Padrão "h2", pra uso como título de subseção. */
  as?: "h1" | "h2";
}) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-3",
        align === "center" && "mx-auto items-center text-center",
      )}
    >
      {eyebrow ? <Eyebrow dark={dark}>{eyebrow}</Eyebrow> : null}
      <Heading
        className={cn(
          "text-3xl font-bold tracking-tight sm:text-4xl",
          dark ? "text-white" : "text-brand-ink",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p
          className={cn(
            "text-base",
            dark ? "text-brand-ice/85" : "text-brand-slate",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function IconCircle({
  icon: Icon,
  tone = "teal",
}: {
  icon: LucideIcon;
  tone?: "teal" | "gold" | "navy";
}) {
  const toneClasses = {
    teal: "bg-brand-teal/10 text-brand-teal",
    gold: "bg-brand-gold/15 text-brand-gold",
    navy: "bg-brand-navy/10 text-brand-navy",
  } as const;

  return (
    <div
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl",
        toneClasses[tone],
      )}
    >
      <Icon className="size-5" />
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "teal" | "gold" | "navy";
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-ice bg-white p-6 shadow-sm">
      <IconCircle icon={icon} tone={tone} />
      <h3 className="text-base font-semibold text-brand-ink">{title}</h3>
      <p className="text-sm text-brand-slate">{description}</p>
    </div>
  );
}

export function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-4xl font-bold text-white sm:text-5xl">{value}</span>
      <span className="text-sm text-brand-ice/80">{label}</span>
    </div>
  );
}
