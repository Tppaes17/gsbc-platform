import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/logo-gsbc.png";

/**
 * Arquivo real fornecido pelo usuário (extraído de Logo_GSBC.svg — um SVG
 * que só empacota este PNG em base64). Não redesenhar: exibir a imagem
 * como está, ajustando apenas o tamanho de exibição via CSS. A imagem tem
 * fundo branco embutido (não é transparente), por isso `dark` embrulha
 * num cartão branco arredondado ao usar sobre fundo escuro (rodapé, hero
 * da página Sobre) — isso não altera a arte, só evita um retângulo branco
 * “quebrado” sobre o navy.
 */
export function SiteLogo({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const img = (
    <Image
      src={LOGO_SRC}
      alt="GSBC — Gestora Sindical de Benefícios & Compliance"
      width={1254}
      height={1254}
      priority
      className="h-12 w-auto sm:h-14"
    />
  );

  if (!dark) {
    return <span className={cn("inline-flex items-center", className)}>{img}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl bg-white px-3 py-1.5",
        className,
      )}
    >
      {img}
    </span>
  );
}

export function LogoFull({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const img = (
    <Image
      src={LOGO_SRC}
      alt="GSBC — Gestora Sindical de Benefícios & Compliance"
      width={1254}
      height={1254}
      className="h-32 w-auto sm:h-40"
    />
  );

  if (!dark) {
    return <span className={cn("inline-flex items-center", className)}>{img}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-2xl bg-white px-6 py-4",
        className,
      )}
    >
      {img}
    </span>
  );
}
