"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { readJson } from "@/lib/api-client";
import type { SelectableTable } from "@/services/analysis-models";

/**
 * Editar um modelo já criado: renomear e trocar as tabelas.
 *
 * Sem isto, errar a composição na criação obrigava a refazer o modelo do
 * zero — e refazer significa perder o nome que o usuário já usava para
 * encontrá-lo, além dos painéis que apontam para ele.
 */
export function EditModelDialog({
  modelId,
  workspaceId,
  currentName,
  currentDescription,
  currentTableIds,
  tables,
}: {
  modelId: string;
  workspaceId: string;
  currentName: string;
  currentDescription: string | null;
  currentTableIds: string[];
  tables: SelectableTable[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription ?? "");
  const [selected, setSelected] = useState<string[]>(currentTableIds);
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const bySource = new Map<string, { name: string; tables: SelectableTable[] }>();
    for (const table of tables) {
      const group = bySource.get(table.sourceId) ?? { name: table.sourceName, tables: [] };
      group.tables.push(table);
      bySource.set(table.sourceId, group);
    }
    return [...bySource.entries()].map(([id, group]) => ({ id, ...group }));
  }, [tables]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  function toggleGroup(groupTables: SelectableTable[]) {
    const ids = groupTables.map((t) => t.id);
    const allSelected = ids.every((id) => selected.includes(id));
    setSelected((current) =>
      allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]
    );
  }

  function reset() {
    setName(currentName);
    setDescription(currentDescription ?? "");
    setSelected(currentTableIds);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/models/${modelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name,
          description: description.trim() || null,
          tableIds: selected,
        }),
      });
      const json = (await readJson(res)) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar");
      toast.success("Modelo atualizado");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  const canSave = name.trim().length >= 2 && selected.length > 0 && !saving;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Fechar sem salvar descarta as marcações: deixá-las na tela faria o
        // usuário acreditar numa composição que não foi gravada.
        if (!next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar modelo</DialogTitle>
          <DialogDescription>
            Renomeie o modelo ou mude quais tabelas ele reúne.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-model-name">Nome do modelo</Label>
            <Input
              id="edit-model-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-model-description">Descrição (opcional)</Label>
            <Textarea
              id="edit-model-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Tabelas e arquivos</Label>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-2">
              {groups.map((group) => {
                const ids = group.tables.map((t) => t.id);
                const allSelected = ids.every((id) => selected.includes(id));
                return (
                  <div key={group.id}>
                    <div className="flex items-center justify-between px-2 pb-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.name}
                      </span>
                      {group.tables.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.tables)}
                          className="text-xs text-primary hover:underline"
                        >
                          {allSelected ? "Limpar" : "Selecionar todas"}
                        </button>
                      )}
                    </div>
                    {group.tables.map((table) => (
                      <label
                        key={table.id}
                        className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selected.includes(table.id)}
                          onChange={() => toggle(table.id)}
                        />
                        <span className="flex-1 truncate">{table.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {table.rowCount != null
                            ? `${table.rowCount.toLocaleString("pt-BR")} linhas · `
                            : ""}
                          {table.columnCount} campos
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {selected.length === 0
                ? "Um modelo precisa de ao menos uma tabela."
                : `${selected.length} tabela(s) selecionada(s).`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!canSave} loading={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
