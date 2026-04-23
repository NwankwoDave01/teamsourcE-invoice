import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive: boolean };
  icon: LucideIcon;
  hint?: string;
}

export function StatCard({ label, value, delta, icon: Icon, hint }: StatCardProps) {
  return (
    <Card className="p-5 shadow-elegant-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-lg bg-accent p-2.5 text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {delta && (
        <div className={cn("mt-3 flex items-center gap-1 text-xs font-medium", delta.positive ? "text-success" : "text-destructive")}>
          {delta.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          <span>{delta.value}</span>
          <span className="text-muted-foreground font-normal">vs last month</span>
        </div>
      )}
    </Card>
  );
}
