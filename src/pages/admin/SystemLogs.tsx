import { Download, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { systemLogs } from "@/mock/data";
import { cn } from "@/lib/utils";

const levelStyle: Record<string, string> = {
  INFO: "text-info",
  WARN: "text-warning",
  ERROR: "text-destructive",
};

export default function AdminSystemLogs() {
  return (
    <div>
      <PageHeader
        title="System Logs"
        description="Platform-level operational events."
        actions={<Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" />Export</Button>}
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search messages, services…" className="h-9 pl-9" />
          </div>
          <Button variant="outline" size="sm">Level</Button>
          <Button variant="outline" size="sm">Service</Button>
          <Button variant="outline" size="sm">Date range</Button>
        </Card>

        <Card className="shadow-elegant-sm overflow-hidden">
          <div className="bg-[hsl(220_40%_10%)] font-mono text-xs">
            <div className="max-h-[640px] overflow-auto scrollbar-thin">
              {systemLogs.map((l) => (
                <div key={l.id} className="flex gap-3 border-b border-white/5 px-4 py-2 hover:bg-white/5">
                  <span className="shrink-0 text-white/50">{l.timestamp}</span>
                  <span className={cn("w-12 shrink-0 font-semibold", levelStyle[l.level])}>{l.level}</span>
                  <span className="w-40 shrink-0 truncate text-white/70">{l.service}</span>
                  <span className="text-white/90">{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
