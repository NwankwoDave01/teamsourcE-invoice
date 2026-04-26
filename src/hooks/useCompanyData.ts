import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type DBInvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export const INVOICE_STATUSES: DBInvoiceStatus[] = [
  "Draft", "In Review", "Approved", "Ready",
  "Submitted", "Validated", "Signed", "Confirmed", "Rejected",
];

export type DBCompany = Database["public"]["Tables"]["companies"]["Row"];
export type DBCustomer = Database["public"]["Tables"]["customers"]["Row"];
export type DBProduct = Database["public"]["Tables"]["products"]["Row"];
export type DBInvoice = Database["public"]["Tables"]["invoices"]["Row"];
export type DBInvoiceLine = Database["public"]["Tables"]["invoice_lines"]["Row"];

/* ----------------------------- Company ----------------------------- */
export function useCurrentCompany() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ["company", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ----------------------------- Customers ----------------------------- */
export function useCustomers() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ["customers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCustomer() {
  const { companyId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DBCustomer> & { name: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert({ ...input, company_id: companyId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}

/* ----------------------------- Products ----------------------------- */
export function useProducts() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateProduct() {
  const { companyId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DBProduct> & { name: string; sku: string }) => {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...input, company_id: companyId! } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

/* ----------------------------- Invoices ----------------------------- */
export function useInvoices() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ["invoices", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId!)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: inv, error } = await supabase.from("invoices").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!inv) return null;
      const { data: lines } = await supabase.from("invoice_lines").select("*").eq("invoice_id", id!).order("position");
      return { ...inv, lines: lines ?? [] };
    },
  });
}

export function useCreateInvoice() {
  const { companyId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      number: string;
      customer_id?: string | null;
      customer_name: string;
      issue_date: string;
      due_date: string;
      notes?: string;
      po_reference?: string;
      lines: Array<{ product_id?: string | null; description: string; qty: number; unit_price: number; tax_rate: number }>;
    }) => {
      const subtotal = input.lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
      const tax = input.lines.reduce((s, l) => s + l.qty * l.unit_price * (l.tax_rate / 100), 0);
      const total = subtotal + tax;

      const { data: inv, error } = await supabase
        .from("invoices")
        .insert({
          company_id: companyId!,
          number: input.number,
          customer_id: input.customer_id ?? null,
          customer_name: input.customer_name,
          issue_date: input.issue_date,
          due_date: input.due_date,
          notes: input.notes,
          po_reference: input.po_reference,
          subtotal,
          tax,
          total,
          created_by: user?.id,
          status: "Draft",
        })
        .select()
        .single();
      if (error) throw error;

      const { error: linesError } = await supabase.from("invoice_lines").insert(
        input.lines.map((l, i) => ({
          invoice_id: inv.id,
          product_id: l.product_id ?? null,
          description: l.description,
          qty: l.qty,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          line_total: l.qty * l.unit_price * (1 + l.tax_rate / 100),
          position: i,
        })),
      );
      if (linesError) throw linesError;
      return inv;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DBInvoiceStatus }) => {
      const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", vars.id] });
    },
  });
}

/* ----------------------------- Team ----------------------------- */
export function useTeam() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ["team", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("company_members")
        .select("id, user_id, status, last_active_at")
        .eq("company_id", companyId!);
      if (error) throw error;
      if (!members?.length) return [];

      const ids = members.map((m) => m.user_id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids).eq("company_id", companyId!),
      ]);

      return members.map((m) => ({
        ...m,
        display_name: profiles?.find((p) => p.id === m.user_id)?.display_name ?? "Unknown",
        role: roles?.find((r) => r.user_id === m.user_id)?.role ?? "staff_user",
      }));
    },
  });
}

/* ----------------------------- Audit logs ----------------------------- */
export function useAuditLogs() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ["audit_logs", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ----------------------------- Integration health (admin) ----------------------------- */
export function useIntegrationHealth() {
  return useQuery({
    queryKey: ["integration_health"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integration_health").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSystemLogs() {
  return useQuery({
    queryKey: ["system_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllCompanies() {
  return useQuery({
    queryKey: ["all_companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*, company_members(count), invoices(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ----------------------------- One-time seed for new workspaces ----------------------------- */
export async function seedDemoData(companyId: string, userId: string) {
  const { data: existing } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  // If any customers exist, skip
  if ((existing as any)?.length) return;

  const customers = [
    { name: "Adeola Ventures", email: "billing@adeolaventures.ng", phone: "+234 802 145 9921", tin: "NG-44192011", city: "Lagos" },
    { name: "Okonkwo & Sons", email: "ap@okonkwo.com", phone: "+234 803 998 4421", tin: "NG-22091887", city: "Enugu" },
    { name: "Northern Grains Co.", email: "finance@ngrains.ng", phone: "+234 805 332 0021", tin: "NG-77004412", city: "Kano" },
    { name: "Heritage Bank Plc", email: "vendors@heritage.ng", phone: "+234 700 100 2200", tin: "NG-10094211", city: "Lagos" },
    { name: "MTN Nigeria", email: "vendors@mtn.com.ng", phone: "+234 803 000 0001", tin: "NG-99001122", city: "Lagos" },
    { name: "Dangote Cement", email: "ap@dangote.com", phone: "+234 802 991 4400", tin: "NG-88112233", city: "Obajana" },
  ];
  const { data: insertedCustomers } = await supabase
    .from("customers")
    .insert(customers.map((c) => ({ ...c, company_id: companyId, status: "Active" as const })))
    .select();

  const products = [
    { sku: "SF-RICE-50", name: "Premium Parboiled Rice 50kg", category: "Grains", unit: "Bag", price: 78500, tax_rate: 7.5 },
    { sku: "SF-OIL-25", name: "Refined Palm Oil 25L", category: "Oils", unit: "Jerry can", price: 42000, tax_rate: 7.5 },
    { sku: "SF-SUGAR-50", name: "Granulated Sugar 50kg", category: "Sweeteners", unit: "Bag", price: 36750, tax_rate: 7.5 },
    { sku: "SF-FLOUR-50", name: "Wheat Flour 50kg", category: "Grains", unit: "Bag", price: 41200, tax_rate: 7.5 },
    { sku: "SVC-DELIV", name: "Logistics & Delivery Service", category: "Service", unit: "Trip", price: 35000, tax_rate: 7.5 },
    { sku: "SVC-CONSULT", name: "Compliance Consulting", category: "Service", unit: "Hour", price: 25000, tax_rate: 7.5 },
  ];
  const { data: insertedProducts } = await supabase
    .from("products")
    .insert(products.map((p) => ({ ...p, company_id: companyId, active: true })))
    .select();

  if (!insertedCustomers || !insertedProducts) return;

  const statuses: DBInvoiceStatus[] = [
    "Confirmed", "Confirmed", "Signed", "Validated", "Submitted",
    "Approved", "In Review", "Draft", "Rejected", "Confirmed",
    "Validated", "Signed", "Submitted", "Draft", "Confirmed",
  ];

  for (let i = 0; i < statuses.length; i++) {
    const customer = insertedCustomers[i % insertedCustomers.length];
    const product = insertedProducts[i % insertedProducts.length];
    const qty = ((i % 5) + 1) * 5;
    const subtotal = Number(product.price) * qty;
    const tax = Math.round(subtotal * 0.075);
    const issue = new Date();
    issue.setDate(issue.getDate() - (40 - i));
    const due = new Date(issue);
    due.setDate(due.getDate() + 30);

    const { data: inv } = await supabase
      .from("invoices")
      .insert({
        company_id: companyId,
        number: `INV-2025-${String(1000 + i).padStart(5, "0")}`,
        customer_id: customer.id,
        customer_name: customer.name,
        issue_date: issue.toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
        status: statuses[i],
        subtotal,
        tax,
        total: subtotal + tax,
        irn: ["Submitted", "Validated", "Signed", "Confirmed"].includes(statuses[i])
          ? `NRS-${(2000000 + i * 137).toString(36).toUpperCase()}`
          : null,
        created_by: userId,
      })
      .select()
      .single();

    if (inv) {
      await supabase.from("invoice_lines").insert([
        {
          invoice_id: inv.id,
          product_id: product.id,
          description: product.name,
          qty,
          unit_price: product.price,
          tax_rate: 7.5,
          line_total: subtotal + tax,
          position: 0,
        },
      ]);
    }
  }

  // A few audit log seed entries
  await supabase.from("audit_logs").insert([
    { company_id: companyId, actor_id: userId, action: "created workspace", target: "—", category: "Settings", ip: "102.89.10.1" },
    { company_id: companyId, actor_id: userId, action: "imported demo data", target: "—", category: "Settings", ip: "102.89.10.1" },
  ]);
}