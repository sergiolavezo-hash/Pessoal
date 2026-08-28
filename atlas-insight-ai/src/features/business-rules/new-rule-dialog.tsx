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
import { readJson } from "@/lib/api-client";

export function NewRuleDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/business-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name, definition }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to create rule");
      toast.success("Business rule created");
      setOpen(false);
      setName("");
      setDefinition("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create rule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New rule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create business rule</DialogTitle>
          <DialogDescription>
            Write the rule in plain language. Atlas structures it and applies it to every relevant
            analysis.
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Approved sales only"
              required
              minLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rule definition</Label>
            <Textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder='e.g. "Only count sales with status = approved" or "An active customer is one who purchased in the last 90 days"'
              rows={4}
              required
              minLength={5}
            />
          </div>
          <Button type="submit" className="w-full" loading={submitting}>
            Create rule
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
