"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
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

const SUGGESTIONS = [
  "Executive sales dashboard with revenue, margin, sales by region and by salesperson",
  "Customer overview: active customers, orders per customer, revenue concentration",
  "Monthly revenue trend with top products and top customers",
];

export function GenerateDashboardDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      toast.success(`Dashboard "${json.dashboard.name}" generated`);
      setOpen(false);
      router.push(`/dashboards/${json.dashboard.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
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
            Describe the dashboard in plain language. Atlas resolves metrics, applies your
            business rules, generates and validates the queries, and builds the dashboard.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
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
          <Button type="submit" className="w-full" loading={submitting}>
            {submitting ? "Atlas is designing your dashboard…" : "Generate dashboard"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
