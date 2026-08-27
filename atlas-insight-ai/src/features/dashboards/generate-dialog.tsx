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
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [dataSourceId, setDataSourceId] = useState(sources.length === 1 ? sources[0].id : "");
  const [submitting, setSubmitting] = useState(false);

  const selected = sources.find((s) => s.id === dataSourceId);

  async function submit() {
    if (!dataSourceId) {
      toast.error("Select the data source that will ground this dashboard.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, prompt, dataSourceId }),
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
              <Label htmlFor="gen-source">Data source</Label>
              <select
                id="gen-source"
                required
                value={dataSourceId}
                onChange={(e) => setDataSourceId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Select the source that grounds this dashboard…
                </option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type}
                    {s.hasModel ? " · semantic model" : ""})
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
            <Button type="submit" className="w-full" loading={submitting} disabled={!dataSourceId}>
              {submitting ? "Atlas is designing and validating your dashboard…" : "Generate dashboard"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
