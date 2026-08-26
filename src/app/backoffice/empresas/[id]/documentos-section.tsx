"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Download, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/design-system/empty-state";
import { ConfirmationDialog } from "@/components/design-system/confirmation-dialog";
import { documentoCategoriaOptions } from "@/lib/validation/documento";
import {
  deleteDocumentoAction,
  uploadDocumentoAction,
  type DocumentoActionState,
} from "./documentos-actions";

interface DocumentoItem {
  id: string;
  nome_arquivo: string;
  categoria: string;
  tamanho_bytes: number | null;
  created_at: string;
  uploadedPorNome: string | null;
  url: string | null;
}

const CATEGORIA_LABEL = Object.fromEntries(
  documentoCategoriaOptions.map((o) => [o.value, o.label]),
);

const initialState: DocumentoActionState = { error: null, success: false };

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function DocumentosSection({
  empresaId,
  documentos,
  canManage,
}: {
  empresaId: string;
  documentos: DocumentoItem[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState("outro");
  const [state, formAction, isPending] = useActionState(
    uploadDocumentoAction,
    initialState,
  );
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      toast.success("Documento enviado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setCategoria("outro");
  }

  function handleDelete(documentoId: string) {
    startDeleteTransition(async () => {
      try {
        await deleteDocumentoAction(documentoId);
        toast.success("Documento removido.");
      } catch {
        toast.error("Não foi possível remover o documento.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Documentos</CardTitle>
        {canManage ? (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                  Enviar documento
                </Button>
              }
            />
            <DialogContent>
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="empresaId" value={empresaId} />
                <input type="hidden" name="categoria" value={categoria} />

                <DialogHeader>
                  <DialogTitle>Enviar documento</DialogTitle>
                  <DialogDescription>
                    Instrumentos, notificações, acordos e comprovantes desta
                    empresa. Limite de 50MB por arquivo.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="categoriaSelect">Categoria *</Label>
                  <Select
                    value={categoria}
                    onValueChange={(value) => setCategoria(value as string)}
                  >
                    <SelectTrigger id="categoriaSelect" className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          documentoCategoriaOptions.find((opt) => opt.value === value)
                            ?.label ?? value
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {documentoCategoriaOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="file">Arquivo *</Label>
                  <input
                    id="file"
                    name="file"
                    type="file"
                    required
                    className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-2.5 file:py-1 file:text-sm"
                  />
                </div>

                {state.error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}
                  </p>
                ) : null}

                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Enviando..." : "Enviar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardHeader>
      <CardContent>
        {documentos.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento enviado"
            description="Instrumentos, notificações, acordos e comprovantes desta empresa."
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
                  <span className="text-muted-foreground">
                    {CATEGORIA_LABEL[doc.categoria] ?? doc.categoria}
                    {" · "}
                    {formatSize(doc.tamanho_bytes)}
                    {" · "}
                    {formatDate(doc.created_at)}
                    {doc.uploadedPorNome ? ` · por ${doc.uploadedPorNome}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1">
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
                  {canManage ? (
                    <ConfirmationDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" disabled={isDeleting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                      title="Remover documento?"
                      description={`"${doc.nome_arquivo}" será removido permanentemente do armazenamento.`}
                      confirmLabel="Remover"
                      destructive
                      onConfirm={() => handleDelete(doc.id)}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
