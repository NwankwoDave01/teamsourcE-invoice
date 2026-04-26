import { useState } from "react";
import { Copy, Filter, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { products as initialProducts, type Product } from "@/mock/data";
import { formatNGN } from "@/lib/format";
import { toast } from "sonner";

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const confirmDelete = () => {
    if (!toDelete) return;
    setProducts((prev) => prev.filter((p) => p.id !== toDelete.id));
    toast.success(`Item "${toDelete.name}" deleted`);
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        title="Products & Services"
        description="Catalog of items and services you sell."
        actions={
          <Button size="sm" asChild className="gap-1.5">
            <Link to="/app/products/new">
              <Plus className="h-4 w-4" />Add item
            </Link>
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <Card className="flex flex-wrap items-center gap-2 p-3 shadow-elegant-sm">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by SKU or name" className="h-9 pl-9" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="h-4 w-4" />Category</Button>
          <Button variant="outline" size="sm">Active only</Button>
        </Card>

        <Card className="shadow-elegant-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">SKU</th>
                  <th className="px-5 py-3 text-left font-medium">Item</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-left font-medium">Unit</th>
                  <th className="px-5 py-3 text-right font-medium">Unit price</th>
                  <th className="px-5 py-3 text-right font-medium">Tax</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="w-12 px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="group border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                    <td className="px-5 py-3 font-medium">{p.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.unit}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatNGN(p.price)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{p.taxRate}%</td>
                    <td className="px-5 py-3">
                      <Badge variant="secondary" className={p.active ? "bg-success/15 text-success hover:bg-success/15" : ""}>
                        {p.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
                            aria-label="Item actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Actions
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`/app/products/${p.id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToDelete(p)}
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
        </Card>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{toDelete?.name}</span> from your catalog. Existing invoices that reference this item will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
