"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Database, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface GenerateSourceOption {
  id: string;
  name: string;
  type: string;
  /** Whether an ACTIVE semantic model exists for this source. */
  hasModel: boolean;
  /** e.g. "Uploaded Files model v3" — shown as the option label. */
  modelLabel: string | null;
  /** Analysis contexts (Looker-style subjects) discovered in this source. */
  contexts: string[];
}

interface GenerateChoice {
  /** Option value: sourceId, or `${sourceId}::${context}` for one subject. */
  value: string;
  label: string;
  source: GenerateSourceOption;
}

function buildChoices(sources: GenerateSourceOption[]): GenerateChoice[] {
  const choices: GenerateChoice[] = [];
  for (const s of sources) {
    const base = s.modelLabel ? `${s.modelLabel} — ${s.name}` : `${s.name} (raw schema)`;
    if (s.contexts.length > 1) {
      // Vários assuntos na mesma fonte: analisar separadamente ou juntos.
      for (const c of s.contexts) {
        choices.push({ value: `${s.id}::${c}`, label: `${base} · assunto: ${c}`, source: s });
      }
      choices.push({ value: s.id, label: `${base} · todos os assuntos juntos`, source: s });
    } else {
      choices.push({ value: s.id, label: base, source: s });
    }
  }
  return choices;
}

const SUGGESTIONS = [
  "Executive sales dashboard with revenue, margin, sales by region and by salesperson",
  "Customer overview: active customers, orders per customer, revenue concentration",
  "Monthly revenue trend with top products and top customers",
];

export function GenerateDashboardDialog({
  workspaceId,
  sources,
}: {
  workspaceId: string;
  sources: GenerateSourceOption[];
}) {
  const router = useRouter();
  const choices = buildChoices(sources);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [choice, setChoice] = useState(choices.length === 1 ? choices[0].value : "");
  const [submitting, setSubmitting] = useState(false);

  const selected = choices.find((c) => c.value === choice)?.source;

  async function submit() {
    if (!choice) {
      toast.error("Select the data source that will ground this dashboard.");
      return;
    }
    setSubmitting(true);
    try {
      const [dataSourceId, context] = choice.split("::");
      const res = await fetch("/api/dashboards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, prompt, dataSourceId, ...(context ? { context } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      toast.success(`Dashboard "${json.dashboard.name}" generated`);
      setOpen(false);
      router.push(`/dashboards/${json.dashboard.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed", {
        duration: 10000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>What do you want to analyze?</DialogTitle>
          <DialogDescription>
            Pick the data source that grounds the dashboard, then describe it in plain language.
            Atlas only uses tables and columns that actually exist in the selected source.
          </DialogDescription>
        </DialogHeader>
        {sources.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            <Database className="mx-auto mb-2 h-6 w-6" />
            No data source connected yet.{" "}
            <Link href="/data-sources" className="text-primary hover:underline">
              Connect one first →
            </Link>
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
              <Label htmlFor="gen-source">Semantic model</Label>
              <select
                id="gen-source"
                required
                value={choice}
                onChange={(e) => setChoice(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Select the semantic model that grounds this dashboard…
                </option>
                {choices.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {selected && !selected.hasModel && (
                <p className="text-xs text-muted-foreground">
                  No semantic model yet — Atlas will use the source&apos;s synced schema. For
                  richer results, run Profile + Generate semantic model in Data Model.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Describe your goal</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder={SUGGESTIONS[0]}
                required
                minLength={5}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {s.slice(0, 48)}…
                </button>
              ))}
            </div>
            <Button type="submit" className="w-full" loading={submitting} disabled={!choice}>
              {submitting ? "Atlas is designing and validating your dashboard…" : "Generate dashboard"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
