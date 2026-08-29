"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readJson } from "@/lib/api-client";

/** Papéis em linguagem de negócio, com o que cada um faz na prática. */
const ROLES: Array<{ value: string; label: string; hint: string }> = [
  { value: "MEASURE", label: "Valor", hint: "soma, média — dinheiro, quantidade" },
  { value: "DATE", label: "Data", hint: "evolução no tempo" },
  { value: "CATEGORY", label: "Categoria", hint: "quebra a análise" },
  { value: "BOOLEAN", label: "Sim/Não", hint: "verdadeiro ou falso" },
  { value: "TEXT", label: "Texto", hint: "nomes, descrições — para ranking e detalhe" },
  { value: "ID", label: "Identificador", hint: "identifica a linha; nunca somar" },
  { value: "FOREIGN_KEY", label: "Ligação", hint: "liga com outra tabela" },
];

const AUTO = "__auto__";

export interface EditableColumn {
  name: string;
  dataType: string;
  displayName: string | null;
  description: string | null;
  role: string | null;
  roleOverride: string | null;
  excluded: boolean;
}

/**
 * Editor do que o Atlas entendeu de uma tabela.
 *
 * O motivo de existir é econômico e de precisão, não estético: o rótulo da
 * tabela e o papel de cada coluna vão para o prompt. Uma coluna classificada
 * como categoria quando na verdade é valor faz o painel contar registros em
 * vez de somar dinheiro — e o usuário não tem como perceber pelo gráfico.
 *
 * O papel volta a "Automático" quando limpo: assim dá para desfazer uma
 * correção sem precisar adivinhar qual era o palpite original.
 */
export function TableSemanticsEditor({
  tableId,
  workspaceId,
  physicalName,
  initialDisplayName,
  initialDescription,
  initialColumns,
}: {
  tableId: string;
  workspaceId: string;
  physicalName: string;
  initialDisplayName: string | null;
  initialDescription: string | null;
  initialColumns: EditableColumn[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [columns, setColumns] = useState(initialColumns);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function update(name: string, patch: Partial<EditableColumn>) {
    setColumns((current) =>
      current.map((c) => (c.name === name ? { ...c, ...patch } : c))
    );
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/catalog/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          displayName: displayName.trim() || null,
          description: description.trim() || null,
          columns: columns.map((c) => ({
            name: c.name,
            displayName: c.displayName,
            description: c.description,
            role: c.roleOverride,
            excluded: c.excluded,
          })),
        }),
      });
      const json = (await readJson(res)) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar");
      toast.success("Entendimento atualizado. A IA passa a usar suas definições.");
      setDirty(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${tableId}`}>Nome desta tabela</Label>
          <Input
            id={`name-${tableId}`}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setDirty(true);
            }}
            placeholder={physicalName}
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">
            O nome técnico ({physicalName}) continua sendo usado nas consultas.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`desc-${tableId}`}>O que estes dados representam</Label>
          <Input
            id={`desc-${tableId}`}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setDirty(true);
            }}
            placeholder="Ex.: vendas fechadas, uma linha por pedido"
            maxLength={500}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Coluna</th>
              <th className="px-3 py-2 font-medium">Nome de negócio</th>
              <th className="px-3 py-2 font-medium">Papel</th>
              <th className="px-3 py-2 font-medium">O que significa</th>
              <th className="px-3 py-2 font-medium">Usar</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => (
              <tr key={col.name} className="border-t align-top">
                <td className="px-3 py-2">
                  <span className={col.excluded ? "text-muted-foreground line-through" : ""}>
                    {col.name}
                  </span>
                  <p className="text-xs text-muted-foreground">{col.dataType}</p>
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={col.displayName ?? ""}
                    onChange={(e) => update(col.name, { displayName: e.target.value || null })}
                    placeholder={col.name}
                    maxLength={120}
                    className="h-8"
                  />
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={col.roleOverride ?? AUTO}
                    onValueChange={(v) =>
                      update(col.name, { roleOverride: v === AUTO ? null : v })
                    }
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AUTO}>
                        Automático
                        {col.role ? ` (${ROLES.find((r) => r.value === col.role)?.label ?? col.role})` : ""}
                      </SelectItem>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={col.description ?? ""}
                    onChange={(e) => update(col.name, { description: e.target.value || null })}
                    placeholder="Ex.: valor líquido, sem frete"
                    maxLength={500}
                    className="h-8"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => update(col.name, { excluded: !col.excluded })}
                    title={col.excluded ? "Voltar a usar esta coluna" : "Ignorar esta coluna"}
                    aria-label={col.excluded ? "Voltar a usar esta coluna" : "Ignorar esta coluna"}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <EyeOff className={col.excluded ? "h-4 w-4 text-destructive" : "h-4 w-4"} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} loading={saving} disabled={!dirty}>
          <Save />
          Salvar entendimento
        </Button>
        {dirty && (
          <span className="text-xs text-muted-foreground">
            Alterações ainda não salvas.
          </span>
        )}
      </div>
    </div>
  );
}
