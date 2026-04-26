import { useState } from "react";
import { Filter, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { customers as initialCustomers, type Customer } from "@/mock/data";
import { formatNGN } from "@/lib/format";
import { toast } from "sonner";

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [toDelete, setToDelete] = useState<Customer | null>(null);

  const confirmDelete = () => {
    if (!toDelete) return;
    setCustomers((prev) => prev.filter((c) => c.id !== toDelete.id));
    toast.success(`Customer "${toDelete.name}" deleted`);
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage the businesses you invoice."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><Upload className="h-4 w-4" />Import</Button>
            <Button size="sm" asChild className="gap-1.5">
              <Link to="/app/customers/new">
                <Plus className="h-4 w-4" />Add customer
              </Link>
            </Button>
          </>
        }
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, TIN, or email" className="h-9 pl-9" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />Status</Button>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />City</Button>
          <Button variant="outline" size="sm">Outstanding only</Button>
        </Card>

        <Card className="shadow-elegant-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Customer</th>
                  <th className="px-5 py-3 text-left font-medium">TIN</th>
                  <th className="px-5 py-3 text-left font-medium">City</th>
                  <th className="px-5 py-3 text-right font-medium">Invoices</th>
                  <th className="px-5 py-3 text-right font-medium">Outstanding</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="w-12 px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="group border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.email} · {c.phone}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{c.tin}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.city}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{c.invoices}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">{formatNGN(c.outstanding)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={c.status === "Active" ? "default" : "secondary"} className={c.status === "Active" ? "bg-success/15 text-success hover:bg-success/15" : ""}>{c.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
                            aria-label="Customer actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Actions
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`/app/customers/${c.id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            View invoices
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToDelete(c)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>Showing 1–{customers.length} of {customers.length}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled>Previous</Button>
              <Button variant="ghost" size="sm" disabled>Next</Button>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{toDelete?.name}</span> from your customer list. Existing invoices issued to this customer will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
