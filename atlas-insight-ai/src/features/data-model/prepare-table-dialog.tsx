"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { readJson } from "@/lib/api-client";

export interface PrepColumn {
  id: string;
  name: string;
  data_type: string;
  excluded: boolean;
  expression: string | null;
}

const TYPES = ["text", "numeric", "bigint", "double precision", "date", "timestamptz", "boolean"];

const EXPRESSION_EXAMPLES = [
  "quantidade * preco_unitario",
  "upper(nome_cliente)",
  "case when status = 'A' then 'Ativo' else 'Inativo' end",
  "date_trunc('month', data_venda)",
];

export function PrepareTableDialog({
  workspaceId,
  tableId,
  tableName,
  isFile,
  columns,
}: {
  workspaceId: string;
  tableId: string;
  tableName: string;
  isFile: boolean;
  columns: PrepColumn[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("numeric");
  const [expression, setExpression] = useState("");

  async function act(payload: Record<string, unknown>, busyKey: string, success: string) {
    setBusy(busyKey);
    try {
      const res = await fetch(`/api/data-prep/${tableId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...payload }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Operation failed");
      toast.success(success);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed", { duration: 9000 });
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 />
          Prepare
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prepare data · {tableName}</DialogTitle>
          <DialogDescription>
            Shape this table like Power Query: hide columns from the AI, rename or remove them, and
            create computed columns with expressions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {columns.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                c.excluded ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0">
                <span className="font-mono text-xs">{c.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{c.data_type}</span>
                {c.expression && (
                  <Badge variant="secondary" className="ml-2">
                    calculated
                  </Badge>
                )}
                {c.excluded && (
                  <Badge variant="outline" className="ml-2">
                    hidden from AI
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  title={c.excluded ? "Include in AI context" : "Hide from AI context"}
                  disabled={busy !== null}
                  onClick={() => act({ action: "toggle_exclude", columnId: c.id }, c.id, c.excluded ? "Column included" : "Column hidden from AI")}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {c.excluded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {isFile && (
                  <>
                    <button
                      type="button"
                      title="Rename column"
                      disabled={busy !== null}
                      onClick={() => {
                        const name = prompt(`New name for "${c.name}" (lowercase, no spaces):`, c.name);
                        if (name && name !== c.name) {
                          void act({ action: "rename_column", columnId: c.id, newName: name }, c.id, "Column renamed");
                        }
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete column (permanent)"
                      disabled={busy !== null}
                      onClick={() => {
                        if (confirm(`Delete column "${c.name}" and its data? This cannot be undone.`)) {
                          void act({ action: "drop_column", columnId: c.id }, c.id, "Column deleted");
                        }
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {isFile ? (
          <form
            className="mt-2 space-y-3 rounded-lg border p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await act(
                { action: "add_column", name: newName, type: newType, expression },
                "add",
                `Column "${newName}" created`
              );
              if (ok) {
                setNewName("");
                setExpression("");
              }
            }}
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4 text-primary" />
              New computed column (attribute or measure)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prep-name">Column name</Label>
                <Input
                  id="prep-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex.: receita_total"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prep-type">Type</Label>
                <select
                  id="prep-type"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prep-expr">Expression (SQL, only this table&apos;s columns)</Label>
              <Textarea
                id="prep-expr"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                rows={2}
                placeholder={EXPRESSION_EXAMPLES[0]}
                required
              />
              <div className="flex flex-wrap gap-1.5">
                {EXPRESSION_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setExpression(ex)}
                    className="rounded-full border px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm" loading={busy === "add"}>
              Create column
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Physical transformations (add/rename/delete columns) apply to uploaded file tables.
            Database sources are read-only — hide columns from the AI instead.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
