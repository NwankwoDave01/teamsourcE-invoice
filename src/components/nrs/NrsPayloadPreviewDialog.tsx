import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildNrsPayload } from "@/lib/nrs/buildPayload";
import type { NrsBuildResult } from "@/lib/nrs/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NrsPayloadPreviewDialog({ invoiceId, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NrsBuildResult | null>(null);

  useEffect(() => {
    if (!open || !invoiceId) return;
    let cancelled = false;
    setLoading(true);
    setResult(null);
    buildNrsPayload(invoiceId)
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((e) => { if (!cancelled) toast.error(e?.message ?? "Failed to build NRS preview"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, invoiceId]);

  const errors = result?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings = result?.issues.filter((i) => i.severity === "warning") ?? [];
  const json = result?.payload ? JSON.stringify(result.payload, null, 2) : "";

  const copy = async () => {
    if (!json) return;
    await navigator.clipboard.writeText(json);
    toast.success("Payload JSON copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>NRS Payload Preview</DialogTitle>
          <DialogDescription>
            Internal UBL-style mapping. This is a preview only — no data is sent to NRS / FIRS.
            We will reconcile with the official NRS schema before live integration.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !result ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <Tabs defaultValue={errors.length ? "validation" : "json"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="validation" className="gap-1.5">
                {errors.length > 0 ? (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                ) : warnings.length > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                )}
                Validation ({errors.length + warnings.length})
              </TabsTrigger>
              <TabsTrigger value="json" disabled={!result.payload}>
                JSON Payload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="validation" className="mt-4">
              {errors.length === 0 && warnings.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  All required NRS checks passed.
                </div>
              ) : (
                <ScrollArea className="h-72 rounded-md border">
                  <ul className="divide-y">
                    {[...errors, ...warnings].map((iss, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 text-sm">
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[10px] font-semibold uppercase",
                            iss.severity === "error"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-warning/15 text-warning",
                          )}
                        >
                          {iss.severity}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{iss.message}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{iss.field}</span> · {iss.code}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
              {!result.payload && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Resolve the errors above to generate the payload preview.
                </p>
              )}
            </TabsContent>

            <TabsContent value="json" className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Internal mapping structure — not the final NRS API payload.
                </p>
                <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Copy JSON
                </Button>
              </div>
              <ScrollArea className="h-80 rounded-md border bg-muted/30">
                <pre className="p-4 text-xs leading-relaxed">
                  <code>{json}</code>
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
