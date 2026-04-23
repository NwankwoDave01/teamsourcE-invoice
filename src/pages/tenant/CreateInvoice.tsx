import { ArrowLeft, Plus, Send, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { customers, products } from "@/mock/data";
import { formatNGN } from "@/lib/format";

export default function CreateInvoice() {
  const subtotal = 235_500;
  const tax = Math.round(subtotal * 0.075);

  return (
    <div>
      <PageHeader
        title="Create invoice"
        description="Draft a new invoice. It will enter the workflow as Draft."
        breadcrumbs={[{ label: "Invoices" }, { label: "New" }]}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/invoices"><ArrowLeft className="mr-1.5 h-4 w-4" />Cancel</Link>
            </Button>
            <Button variant="outline" size="sm">Save draft</Button>
            <Button size="sm" className="gap-1.5"><Send className="h-4 w-4" />Submit for review</Button>
          </>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5 shadow-elegant-sm">
            <h2 className="mb-4 text-base font-semibold">Customer & details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Customer">
                <Select defaultValue={customers[0].id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Invoice number">
                <Input defaultValue="INV-2025-01041" />
              </Field>
              <Field label="Issue date"><Input type="date" defaultValue="2025-10-28" /></Field>
              <Field label="Due date"><Input type="date" defaultValue="2025-11-27" /></Field>
              <Field label="Currency">
                <Select defaultValue="NGN">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NGN">NGN — Nigerian Naira</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="PO Reference"><Input placeholder="Optional" /></Field>
            </div>
          </Card>

          <Card className="p-5 shadow-elegant-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Line items</h2>
              <Button variant="outline" size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Add line</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 text-left font-medium">Item</th>
                    <th className="py-2 px-3 text-right font-medium w-20">Qty</th>
                    <th className="py-2 px-3 text-right font-medium w-32">Unit price</th>
                    <th className="py-2 px-3 text-right font-medium w-20">Tax</th>
                    <th className="py-2 pl-3 text-right font-medium w-32">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {[products[0], products[1], products[8]].map((p, i) => {
                    const qty = [10, 5, 2][i];
                    const total = p.price * qty;
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">{qty}</td>
                        <td className="py-3 px-3 text-right tabular-nums">{formatNGN(p.price)}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-muted-foreground">{p.taxRate}%</td>
                        <td className="py-3 pl-3 text-right tabular-nums font-medium">{formatNGN(total)}</td>
                        <td className="py-3 pl-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5 shadow-elegant-sm">
            <Field label="Notes for customer">
              <Textarea placeholder="Payment terms, bank details, thank-you note…" rows={3} />
            </Field>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 shadow-elegant-sm">
            <h2 className="mb-4 text-base font-semibold">Summary</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={formatNGN(subtotal)} />
              <Row label="VAT (7.5%)" value={formatNGN(tax)} />
              <Row label="Discount" value={formatNGN(0)} muted />
              <div className="my-2 border-t border-border" />
              <Row label="Total due" value={formatNGN(subtotal + tax)} bold />
            </dl>
          </Card>

          <Card className="p-5 shadow-elegant-sm">
            <h2 className="mb-3 text-base font-semibold">Compliance preview</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Customer TIN verified ✓</li>
              <li>• Tax rates match catalog ✓</li>
              <li>• Will route to Finance Officer for review</li>
              <li>• Eligible for NRS submission after approval</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</dt>
      <dd className={`tabular-nums ${bold ? "text-base font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>{value}</dd>
    </div>
  );
}
