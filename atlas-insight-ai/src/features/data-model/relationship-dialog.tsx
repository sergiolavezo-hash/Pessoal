"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface RelTable {
  id: string;
  name: string;
}
export interface RelColumn {
  id: string;
  name: string;
  table_id: string;
}

const TYPES = [
  { value: "many-to-one", label: "Many to one (N:1) — ex.: vendas → clientes" },
  { value: "one-to-many", label: "One to many (1:N)" },
  { value: "one-to-one", label: "One to one (1:1)" },
  { value: "many-to-many", label: "Many to many (N:N)" },
];

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function TableColumnPicker({
  label,
  tables,
  columns,
  tableId,
  columnId,
  onTable,
  onColumn,
}: {
  label: string;
  tables: RelTable[];
  columns: RelColumn[];
  tableId: string;
  columnId: string;
  onTable: (v: string) => void;
  onColumn: (v: string) => void;
}) {
  const tableColumns = useMemo(() => columns.filter((c) => c.table_id === tableId), [columns, tableId]);
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1.5">
        <Label>{label} — table</Label>
        <select className={selectCls} value={tableId} onChange={(e) => { onTable(e.target.value); onColumn(""); }}>
          <option value="" disabled>
            Select…
          </option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Column</Label>
        <select className={selectCls} value={columnId} onChange={(e) => onColumn(e.target.value)} disabled={!tableId}>
          <option value="" disabled>
            Select…
          </option>
          {tableColumns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function NewRelationshipDialog({
  workspaceId,
  tables,
  columns,
}: {
  workspaceId: string;
  tables: RelTable[];
  columns: RelColumn[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fromTable, setFromTable] = useState("");
  const [fromColumn, setFromColumn] = useState("");
  const [toTable, setToTable] = useState("");
  const [toColumn, setToColumn] = useState("");
  const [type, setType] = useState("many-to-one");
  const [saving, setSaving] = useState(false);

  const singleTable = tables.length < 2;

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          sourceColumnId: fromColumn,
          targetColumnId: toColumn,
          relationshipType: type,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create relationship");
      toast.success("Relationship created");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create relationship");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 />
          New relationship
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Declare a relationship</DialogTitle>
          <DialogDescription>
            Connect a column of one table to the matching column of another — like the model view
            in Power BI. The AI uses declared relationships to build correct joins.
          </DialogDescription>
        </DialogHeader>
        {singleTable ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            You need at least two tables to create a relationship. Upload another file or connect
            another source — automatic detection also runs when you click &quot;Profile data&quot;.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <TableColumnPicker
              label="From (many side)"
              tables={tables}
              columns={columns}
              tableId={fromTable}
              columnId={fromColumn}
              onTable={setFromTable}
              onColumn={setFromColumn}
            />
            <TableColumnPicker
              label="To (one side)"
              tables={tables.filter((t) => t.id !== fromTable)}
              columns={columns}
              tableId={toTable}
              columnId={toColumn}
              onTable={setToTable}
              onColumn={setToColumn}
            />
            <div className="space-y-1.5">
              <Label>Cardinality</Label>
              <select className={selectCls} value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full" loading={saving} disabled={!fromColumn || !toColumn}>
              Create relationship
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
