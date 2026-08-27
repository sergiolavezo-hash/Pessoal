"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function PlanCheckoutButtons({
  organizationId,
  planId,
  monthlyLabel,
  yearlyLabel,
  isCurrent,
  canManage,
  contactHref,
}: {
  organizationId: string;
  planId: "free" | "pro" | "business";
  monthlyLabel: string | null;
  yearlyLabel: string | null;
  isCurrent: boolean;
  canManage: boolean;
  /** Business plan: link to sales contact instead of checkout. */
  contactHref?: string;
}) {
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  async function checkout(interval: "monthly" | "yearly") {
    setLoading(interval);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, planId, interval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout failed");
      window.location.assign(json.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed", { duration: 8000 });
      setLoading(null);
    }
  }

  if (planId === "free") {
    return (
      <Button variant="outline" className="w-full" disabled>
        {isCurrent ? "Current plan" : "Free trial"}
      </Button>
    );
  }

  if (planId === "business") {
    return (
      <Button asChild variant="outline" className="w-full">
        <a href={contactHref ?? "https://atlas-partner.com/#contato"} target="_blank" rel="noreferrer">
          Talk to sales
        </a>
      </Button>
    );
  }

  if (isCurrent) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Current plan
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        className="w-full"
        loading={loading === "monthly"}
        disabled={!canManage || loading !== null}
        onClick={() => checkout("monthly")}
        title={canManage ? undefined : "Only OWNER/ADMIN can subscribe"}
      >
        Subscribe monthly {monthlyLabel ? `· ${monthlyLabel}` : ""}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        loading={loading === "yearly"}
        disabled={!canManage || loading !== null}
        onClick={() => checkout("yearly")}
      >
        Subscribe yearly {yearlyLabel ? `· ${yearlyLabel}` : ""}
      </Button>
    </div>
  );
}

export function ManageSubscriptionButton({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Portal unavailable");
      window.location.assign(json.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Portal unavailable");
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" loading={loading} onClick={openPortal}>
      Manage subscription
    </Button>
  );
}

/** Fires the GA purchase event after a successful checkout redirect. */
export function BillingAnalytics() {
  const params = useSearchParams();

  useEffect(() => {
    const status = params.get("status");
    if (status === "success") {
      const amount = Number(params.get("amount") ?? 0);
      window.gtag?.("event", "purchase", {
        transaction_id: params.get("session_id") ?? undefined,
        value: amount / 100,
        currency: "BRL",
        items: [
          {
            item_id: params.get("plan") ?? "pro",
            item_name: `Atlas Insight AI ${params.get("plan") ?? "pro"} (${params.get("interval") ?? "monthly"})`,
          },
        ],
      });
      toast.success("Assinatura ativada! Bem-vindo ao Atlas Insight AI.", { duration: 8000 });
    } else if (status === "canceled") {
      toast.info("Checkout cancelado — nada foi cobrado.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
