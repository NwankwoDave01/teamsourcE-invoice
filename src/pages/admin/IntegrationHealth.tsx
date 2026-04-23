import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { integrationHealth } from "@/mock/data";
import { RefreshCw } from "lucide-react";

const tone: Record<string, string> = {
  Operational: "bg-success/15 text-success",
  Degraded: "bg-warning/15 text-warning",
  Maintenance: "bg-info/15 text-info",
  Down: "bg-destructive/10 text-destructive",
};

export default function AdminIntegrationHealth() {
  return (
    <div>
      <PageHeader
        title="Integration Health"
        description="Status of NRS / FIRS connectors and external services."
        actions={<Button variant="outline" size="sm" className="gap-1.5"><RefreshCw className="h-4 w-4" />Re-check now</Button>}
      />
      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {integrationHealth.map((i) => (
          <Card key={i.name} className="p-5 shadow-elegant-sm">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{i.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Last incident: {i.lastIncident}</p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${tone[i.status]}`}>{i.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Uptime (30d)</p>
                <p className="font-semibold tabular-nums">{i.uptime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg latency</p>
                <p className="font-semibold tabular-nums">{i.latency}</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${i.status === "Operational" ? "bg-success" : i.status === "Degraded" ? "bg-warning" : "bg-info"}`}
                style={{ width: i.uptime }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
