import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  icon,
  title,
  description,
  phase,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Fase do roadmap em que o módulo fica funcional. */
  phase?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 px-8 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-panel-2 text-accent">
          {icon}
        </div>
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
        {phase && <Badge variant="neutral">disponível na {phase}</Badge>}
        {action}
      </CardContent>
    </Card>
  );
}
