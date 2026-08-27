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
import type { WorkspaceFile, Profile } from "@/types";

export const metadata = { title: "Files" };

const STATUS_VARIANT = {
  UPLOADING: "secondary",
  PROCESSING: "warning",
  READY: "success",
  ERROR: "destructive",
} as const;

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
        title="Files"
        description="Upload CSV and XLSX files. Atlas detects the schema and makes the data queryable."
        actions={canEdit ? <FileUpload workspaceId={ctx.workspace.id} /> : undefined}
      />

      {files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No files uploaded"
          description="Upload a spreadsheet to analyze it with Atlas."
          action={canEdit ? <FileUpload workspaceId={ctx.workspace.id} /> : undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded by</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="uppercase text-muted-foreground">
                      {f.name.split(".").pop()}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {f.size_bytes != null ? `${(f.size_bytes / 1024).toFixed(0)} KB` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.profiles?.full_name || f.profiles?.email || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{relativeTime(f.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[f.status]}>{f.status}</Badge>
                      {f.error && <p className="mt-1 text-xs text-destructive">{f.error}</p>}
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
