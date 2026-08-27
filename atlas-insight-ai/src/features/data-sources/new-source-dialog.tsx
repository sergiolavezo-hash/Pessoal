"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ArrowLeft } from "lucide-react";
import { CONNECTOR_CATALOG, type ConnectorDefinition } from "@/features/data-sources/connector-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CATEGORIES = ["Cloud", "Databases", "Lakehouse", "Files", "APIs"] as const;
// Keys owned by the credentials payload (never stored in plain config).
const SECRET_KEYS = new Set(["username", "password", "serviceAccountJson"]);

export function NewSourceDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ConnectorDefinition | null>(null);
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setSelected(null);
    setName("");
    setValues({});
  }

  function pick(def: ConnectorDefinition) {
    if (!def.implemented) {
      toast.info(`${def.name} is coming soon`);
      return;
    }
    setSelected(def);
    setName(def.name);
    const defaults: Record<string, unknown> = {};
    for (const f of def.fields) if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
    setValues(defaults);
  }

  async function submit() {
    if (!selected) return;
    if (selected.type === "file") {
      setOpen(false);
      router.push("/files");
      return;
    }
    setSubmitting(true);
    try {
      const config: Record<string, unknown> = {};
      const credentials: Record<string, unknown> = {};
      for (const f of selected.fields) {
        const v = values[f.key];
        if (v === undefined || v === "") continue;
        if (SECRET_KEYS.has(f.key)) credentials[f.key] = v;
        else config[f.key] = f.type === "number" ? Number(v) : v;
      }
      const res = await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name, type: selected.type, config, credentials }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create data source");
      if (json.test?.ok) {
        toast.success("Data source connected");
      } else {
        toast.warning(`Saved, but connection failed: ${json.test?.message ?? "unknown error"}`);
      }
      setOpen(false);
      reset();
      router.push(`/data-sources/${json.dataSource.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create data source");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add data source
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        {!selected ? (
          <>
            <DialogHeader>
              <DialogTitle>Connect a data source</DialogTitle>
              <DialogDescription>Choose where your data lives.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              {CATEGORIES.map((category) => {
                const items = CONNECTOR_CATALOG.filter((c) => c.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {category}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {items.map((c) => (
                        <button
                          key={c.type}
                          onClick={() => pick(c)}
                          className="flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent disabled:opacity-60"
                        >
                          <span className="flex w-full items-center justify-between text-sm font-medium">
                            {c.name}
                            {!c.implemented && (
                              <Badge variant="secondary" className="text-[10px]">Soon</Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">{c.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button onClick={reset} className="rounded p-1 hover:bg-accent">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Connect {selected.name}
              </DialogTitle>
              <DialogDescription>
                Credentials are encrypted at rest and never leave the server.
              </DialogDescription>
            </DialogHeader>
            {selected.type === "file" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload CSV or XLSX files from the Files page. Atlas will detect the schema,
                  infer types and make the data queryable.
                </p>
                <Button onClick={submit} className="w-full">Go to Files</Button>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <div className="space-y-1.5">
                  <Label>Display name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
                </div>
                {selected.fields.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    {f.type === "boolean" ? (
                      <div className="flex items-center justify-between">
                        <Label>{f.label}</Label>
                        <Switch
                          checked={Boolean(values[f.key])}
                          onCheckedChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                        />
                      </div>
                    ) : f.type === "textarea" ? (
                      <>
                        <Label>{f.label}</Label>
                        <Textarea
                          rows={5}
                          placeholder={f.placeholder}
                          value={String(values[f.key] ?? "")}
                          onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                          className="font-mono text-xs"
                        />
                      </>
                    ) : (
                      <>
                        <Label>{f.label}</Label>
                        <Input
                          type={f.type}
                          placeholder={f.placeholder}
                          value={String(values[f.key] ?? "")}
                          onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                        />
                      </>
                    )}
                  </div>
                ))}
                <Button type="submit" className="w-full" loading={submitting}>
                  Test & connect
                </Button>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
