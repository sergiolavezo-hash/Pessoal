"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
 * O usuário nomeia o modelo e escolhe TABELA A TABELA o que entra nele.
 *
 * Antes a escolha era por fonte de dados, e isso quebrava o caso mais comum:
 * todo arquivo enviado cai na mesma fonte ("Arquivos enviados"), então um
 * clique arrastava todas as planilhas já subidas. Aqui cada tabela tem sua
 * própria marcação, agrupada pela origem — dá para juntar duas tabelas de um
 * banco com um arquivo, ou levar uma tabela sozinha para um painel só dela.
 */
export function NewModelDialog({
  workspaceId,
  tables,
  autoOpen = false,
  preselected = [],
}: {
  workspaceId: string;
  tables: SelectableTable[];
  /** Abre já aberto quando o usuário chega do envio de um arquivo. */
  autoOpen?: boolean;
  /** Tabelas já marcadas — normalmente a que acabou de ser importada. */
  preselected?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>(preselected);
  const [submitting, setSubmitting] = useState(false);

  // Agrupar por origem devolve a noção de "este arquivo" e "aquele banco"
  // sem obrigar o usuário a levar a origem inteira.
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
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])]
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name,
          description: description || undefined,
          tableIds: selected,
        }),
      });
      const json = (await readJson(res)) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Não foi possível criar o modelo");
      toast.success("Modelo criado");
      setOpen(false);
      setName("");
      setDescription("");
      setSelected([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o modelo");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = name.trim().length >= 2 && selected.length > 0 && !submitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={tables.length === 0}>
          <Plus />
          Novo modelo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar modelo</DialogTitle>
          <DialogDescription>
            Escolha as tabelas que você quer analisar juntas. Pode ser uma só, para um painel
            simples, ou várias de origens diferentes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="model-name">Nome do modelo</Label>
            <Input
              id="model-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Modelo Comercial"
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="model-description">Descrição (opcional)</Label>
            <Textarea
              id="model-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para que serve este modelo"
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
                ? "Escolha ao menos uma tabela."
                : `${selected.length} tabela(s) selecionada(s).`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!canSubmit} loading={submitting}>
            Criar modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
