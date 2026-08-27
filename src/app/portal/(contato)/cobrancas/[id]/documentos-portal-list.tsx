import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";

interface DocumentoItem {
  id: string;
  nome_arquivo: string;
  created_at: string;
  url: string | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

/**
 * Só leitura — "ver documentos" do roadmap do STG-05. Upload de
 * documento como evidência acontece dentro da seção de contestação, não
 * aqui (categorias geridas pela GSBC continuam exclusivas da GSBC).
 */
export function DocumentosPortalList({ documentos }: { documentos: DocumentoItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Documentos</CardTitle>
      </CardHeader>
      <CardContent>
        {documentos.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento disponível"
            description="Instrumentos, notificações e comprovantes desta empresa aparecem aqui."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {documentos.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-b-0 last:pb-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{doc.nome_arquivo}</span>
                  <span className="text-muted-foreground">{formatDate(doc.created_at)}</span>
                </div>
                {doc.url ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    render={
                      <a href={doc.url} target="_blank" rel="noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
