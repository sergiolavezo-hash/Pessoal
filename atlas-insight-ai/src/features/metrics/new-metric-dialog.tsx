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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readJson } from "@/lib/api-client";

const EXAMPLES = [
  "SUM(Sales.revenue)",
  "COUNT_DISTINCT(Sales.order_id)",
  "metric(revenue) - metric(cost)",
  "metric(gross_profit) / metric(revenue)",
];

export function NewMetricDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formula, setFormula] = useState("");
  const [format, setFormat] = useState("number");
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  async function submit() {
    setSubmitting(true);
    setValidationErrors([]);
    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name, description: description || undefined, formula, format }),
      });
      const json = await readJson<{
        validation?: { valid?: boolean; errors?: string[] };
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to create metric");
      if (json.validation?.valid) {
        toast.success(`Metric "${name}" created and validated`);
      } else {
        toast.warning("Metric saved as draft — formula has validation issues");
        setValidationErrors(json.validation?.errors ?? []);
      }
      setOpen(false);
      setName("");
      setDescription("");
      setFormula("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create metric");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New metric
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create metric</DialogTitle>
          <DialogDescription>
            Define a reusable, governed calculation over your semantic model.
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
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Revenue" required minLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Total sales revenue"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Formula</Label>
            <Textarea
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="SUM(Sales.revenue)"
              className="font-mono text-xs"
              rows={2}
              required
            />
            <p className="text-xs text-muted-foreground">
              Examples: {EXAMPLES.join(" · ")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="percent">Percent</SelectItem>
                <SelectItem value="decimal">Decimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {validationErrors.length > 0 && (
            <ul className="space-y-1 text-xs text-destructive">
              {validationErrors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}
          <Button type="submit" className="w-full" loading={submitting}>
            Create metric
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
