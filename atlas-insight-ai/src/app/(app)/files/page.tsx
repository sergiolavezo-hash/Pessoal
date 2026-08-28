import { FileText } from "lucide-react";
import { getAppContext } from "@/services/context";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUpload } from "@/features/files/file-upload";
import { ObjectMenu } from "@/components/ui/object-menu";
import type { WorkspaceFile, Profile } from "@/types";

export const metadata = { title: "Enviar dados" };

const STATUS_VARIANT = {
  UPLOADING: "secondary",
  PROCESSING: "warning",
  READY: "success",
  ERROR: "destructive",
} as const;

const STATUS_LABEL: Record<string, string> = {
  UPLOADING: "Enviando",
  PROCESSING: "Processando",
  READY: "Pronto",
  ERROR: "Falhou",
};

/**
 * Acima disto, um arquivo "processando" não está mais sendo processado: a
 * função do servidor caiu ou estourou o tempo e nunca voltou para marcar o
 * fim. Mostrar isso como falha evita o registro congelado para sempre.
 */
const STUCK_AFTER_MS = 10 * 60 * 1000;

function isStuck(file: { status: string; created_at: string }): boolean {
  return (
    file.status === "PROCESSING" &&
    Date.now() - new Date(file.created_at).getTime() > STUCK_AFTER_MS
  );
}

export default async function FilesPage() {
  const ctx = await getAppContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("workspace_files")
    .select("*, profiles:uploaded_by(email, full_name)")
    .eq("workspace_id", ctx.workspace.id)
    .order("created_at", { ascending: false });

  const files = (data ?? []) as Array<WorkspaceFile & { profiles: Pick<Profile, "email" | "full_name"> | null }>;
  const canEdit = ctx.role !== "VIEWER";

  return (
    <div>
      <PageHeader
        title="Enviar dados"
        description="Envie arquivos CSV e XLSX. O Atlas lê o arquivo, entende os dados e deixa tudo pronto para análise."
        actions={canEdit ? <FileUpload workspaceId={ctx.workspace.id} /> : undefined}
      />

      {files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum arquivo enviado"
          description="Envie uma planilha para analisar com o Atlas."
          action={canEdit ? <FileUpload workspaceId={ctx.workspace.id} /> : undefined}
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Tamanho</TableHead>
                  <TableHead className="hidden lg:table-cell">Enviado por</TableHead>
                  <TableHead className="hidden md:table-cell">Quando</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      {f.name}
                      {(f as unknown as { folder?: string | null }).folder && (
                        <span className="ml-2 text-xs text-muted-foreground">📁 {(f as unknown as { folder?: string | null }).folder}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden uppercase text-muted-foreground sm:table-cell">
                      {f.name.split(".").pop()}
                    </TableCell>
                    <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                      {f.size_bytes != null ? `${(f.size_bytes / 1024).toFixed(0)} KB` : "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {f.profiles?.full_name || f.profiles?.email || "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {relativeTime(f.created_at)}
                    </TableCell>
                    <TableCell>
                      {isStuck(f) ? (
                        <>
                          <Badge variant="destructive">Interrompido</Badge>
                          <p className="mt-1 text-xs text-destructive">
                            O processamento não foi concluído. Exclua e envie novamente.
                          </p>
                        </>
                      ) : (
                        <Badge variant={STATUS_VARIANT[f.status]}>
                          {STATUS_LABEL[f.status] ?? f.status}
                        </Badge>
                      )}
                      {f.error && <p className="mt-1 text-xs text-destructive">{f.error}</p>}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <ObjectMenu
                          deleteEndpoint={`/api/files/${f.id}?workspaceId=${ctx.workspace.id}`}
                          deleteConfirm={`Excluir o arquivo "${f.name}"? A tabela de dados também será removida.`}
                          moveEndpoint={`/api/files/${f.id}`}
                          moveBody={{ workspaceId: ctx.workspace.id }}
                          currentFolder={(f as unknown as { folder?: string | null }).folder ?? null}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
