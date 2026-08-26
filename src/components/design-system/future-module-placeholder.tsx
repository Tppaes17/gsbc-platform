import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FutureModulePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  rodada: string;
}

/**
 * Placeholder honesto para seções da ficha 360º (regra 19) cujos dados ainda
 * não existem no produto — nunca mostrar dado fictício no lugar (regra 62).
 */
export function FutureModulePlaceholder({
  icon: Icon,
  title,
  description,
  rodada,
}: FutureModulePlaceholderProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Chega na {rodada}.
        </p>
      </CardContent>
    </Card>
  );
}
