import { cn } from "@/lib/utils";

// Reflects invoices.submission_status only (nrs_submission_status enum).
// Never inferred from invoices.status.
const MAP: Record<string, { label: string; cls: string }> = {
  not_submitted: { label: "Not submitted", cls: "bg-muted text-muted-foreground border-border" },
  pending: { label: "Submission pending", cls: "bg-warning/10 text-warning border-warning/30" },
  validated: { label: "NRS validated", cls: "bg-success/10 text-success border-success/30" },
  signed: { label: "NRS signed", cls: "bg-success/15 text-success border-success/40" },
  rejected: { label: "NRS rejected", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  timeout: { label: "Unconfirmed (timeout)", cls: "bg-warning/10 text-warning border-warning/30" },
  failed: { label: "Submission failed", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function submissionLabel(status: string | null | undefined): string {
  return (status && MAP[status]?.label) || "Status not recorded";
}

export function SubmissionBadge({ status, showUnknown = false, className }: {
  status: string | null | undefined; showUnknown?: boolean; className?: string;
}) {
  const entry = status ? MAP[status] : undefined;
  if (!entry && !showUnknown) return null;
  const { label, cls } = entry ?? { label: "Status not recorded", cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", cls, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
