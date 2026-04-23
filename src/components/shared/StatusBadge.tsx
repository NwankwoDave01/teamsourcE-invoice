import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/mock/data";

const styles: Record<InvoiceStatus, string> = {
  Draft: "bg-muted text-muted-foreground border-border",
  "In Review": "bg-warning/10 text-warning border-warning/30",
  Approved: "bg-info/10 text-info border-info/30",
  Ready: "bg-info/10 text-info border-info/30",
  Submitted: "bg-info/15 text-info border-info/40",
  Validated: "bg-success/10 text-success border-success/30",
  Signed: "bg-success/15 text-success border-success/40",
  Confirmed: "bg-success/20 text-success border-success/50",
  Rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
