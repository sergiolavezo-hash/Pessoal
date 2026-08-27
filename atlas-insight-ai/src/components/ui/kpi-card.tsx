import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: number | string;
  format?: string;
  delta?: number | null;
  deltaLabel?: string;
  invertDelta?: boolean;
  className?: string;
}

export function KpiCard({ label, value, format, delta, deltaLabel, invertDelta, className }: KpiCardProps) {
  const numeric = typeof value === "number";
  const positive = delta != null && (invertDelta ? delta < 0 : delta > 0);
  const negative = delta != null && (invertDelta ? delta > 0 : delta < 0);

  return (
    <Card className={cn("p-5", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {numeric ? formatNumber(value, format) : value}
      </p>
      {delta != null && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            positive && "text-success",
            negative && "text-destructive",
            !positive && !negative && "text-muted-foreground"
          )}
        >
          {delta > 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : delta < 0 ? (
            <ArrowDownRight className="h-3.5 w-3.5" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
          {new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(delta))}
          {deltaLabel && <span className="font-normal text-muted-foreground">{deltaLabel}</span>}
        </p>
      )}
    </Card>
  );
}
