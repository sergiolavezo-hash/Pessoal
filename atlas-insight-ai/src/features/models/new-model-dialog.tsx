"use client";

import { useState } from "react";
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

export interface SelectableDataset {
  id: string;
  name: string;
  qualityScore: number | null;
  rowCount: number | null;
}

/**
 * O usuário dá o nome e escolhe quais conjuntos de dados entram no modelo.
 *
 * O nome é dele e não carrega versão: quem cria "Modelo Comercial" espera
 * encontrar "Modelo Comercial" depois, não "Modelo Comercial V3". A revisão
 * interna sobe a cada alteração, mas fica no banco.
 */
export function NewModelDialog({
  workspaceId,
  datasets,
  autoOpen = false,
  preselected = [],
}: {
  workspaceId: string;
  datasets: SelectableDataset[];
  /** Abre já aberto quando o usuário chega do envio de um arquivo. */
  autoOpen?: boolean;
  /** Conjuntos já marcados — normalmente o que acabou de ser importado. */
  preselected?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>(preselected);
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
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
          dataSourceIds: selected,
        }),
      });
      const json = await readJson(res);
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
        <Button disabled={datasets.length === 0}>
          <Plus />
          Novo modelo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar modelo</DialogTitle>
          <DialogDescription>
            Um modelo reúne os conjuntos de dados que você quer analisar juntos. O mesmo conjunto
            pode participar de vários modelos.
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
            <Label>Conjuntos de dados</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              {datasets.map((dataset) => (
                <label
                  key={dataset.id}
                  className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={selected.includes(dataset.id)}
                    onChange={() => toggle(dataset.id)}
                  />
                  <span className="flex-1 truncate">{dataset.name}</span>
                  {dataset.rowCount != null && (
                    <span className="text-xs text-muted-foreground">
                      {dataset.rowCount.toLocaleString("pt-BR")} linhas
                    </span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selected.length === 0
                ? "Escolha ao menos um conjunto."
                : `${selected.length} selecionado(s).`}
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
