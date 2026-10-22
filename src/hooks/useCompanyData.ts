import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { invokeTenantAdmin, parseTeam, tenantRoles, type TeamChange } from "@/lib/tenantAdmin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/integrations/supabase/appSchema";
import type { Json } from "@/integrations/supabase/types";

export type DBInvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export const INVOICE_STATUSES: DBInvoiceStatus[] = [
  "Draft", "In Review", "Approved", "Ready",
  "Submitted", "Validated", "Signed", "Confirmed", "Rejected",
];

export type DBCompany = Database["public"]["Tables"]["companies"]["Row"];
export type DBCustomer = Database["public"]["Tables"]["customers"]["Row"] & { notes?: string | null };
export type DBProduct = Database["public"]["Tables"]["products"]["Row"] & { description?: string | null };
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

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DBCustomer> & { id: string }) => {
      const { data, error } = await supabase.from("customers").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", vars.id] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
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

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DBProduct> & { id: string }) => {
      const { data, error } = await supabase.from("products").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", vars.id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<DBCompany> & { id: string }) => {
      const { data, error } = await supabase.from("companies").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company"] }),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  const { roles = [], isSuperAdmin = false } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const isManager = isSuperAdmin || roles.includes("company_admin") || roles.includes("finance_officer");
      if (roles.length > 0 && !isManager) {
        throw new Error("Access denied: staff users cannot delete invoices.");
      }
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

/* ----------------------------- Invoices ----------------------------- */
export function useInvoices() {
  const { companyId, user } = useAuth();
  return useQuery({
    queryKey: ["invoices", companyId, user?.id],
    enabled: Boolean(companyId && user),
    queryFn: async () => {
      if (!companyId || !user) throw new Error("An active company is required.");
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInvoice(id: string | undefined) {
  const { companyId, user } = useAuth();
  return useQuery({
    queryKey: ["invoice", id, companyId, user?.id],
    enabled: Boolean(id && companyId && user),
    queryFn: async () => {
      if (!id || !companyId || !user) throw new Error("An active company and invoice are required.");
      const { data: inv, error } = await supabase.from("invoices").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (error) throw error;
      if (!inv) return null;
      const { data: lines, error: lineError } = await supabase.from("invoice_lines").select("*").eq("invoice_id", inv.id).order("position");
      if (lineError) throw lineError;
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
      invoice_type?: string;
      transaction_type?: string;
      supply_date?: string | null;
      payment_terms?: string | null;
      payment_means_code?: string | null;
      exchange_rate?: number | null;
      currency?: string;
      lines: Array<{
        product_id?: string | null;
        description: string;
        qty: number;
        unit_price: number;
        tax_rate: number;
        unit_code?: string;
        tax_category?: string;
        discount_amount?: number;
        item_classification_code?: string | null;
        hsn_code?: string | null;
        product_category?: string | null;
      }>;
    }) => {
      const subtotal = input.lines.reduce(
        (s, l) => s + (l.qty * l.unit_price - (l.discount_amount ?? 0)),
        0,
      );
      const tax = input.lines.reduce(
        (s, l) =>
          s +
          (l.qty * l.unit_price - (l.discount_amount ?? 0)) *
            ((l.tax_category ?? "S") !== "Z" && (l.tax_category ?? "S") !== "E" && (l.tax_category ?? "S") !== "O"
              ? l.tax_rate / 100
              : 0),
        0,
      );
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
          ...(input.invoice_type ? { invoice_type: input.invoice_type } : {}),
          ...(input.transaction_type ? { transaction_type: input.transaction_type } : {}),
          ...(input.supply_date ? { supply_date: input.supply_date } : {}),
          ...(input.payment_terms ? { payment_terms: input.payment_terms } : {}),
          ...(input.payment_means_code ? { payment_means_code: input.payment_means_code } : {}),
          ...(input.exchange_rate != null ? { exchange_rate: input.exchange_rate } : {}),
          ...(input.currency ? { currency: input.currency } : {}),
        } as any)
        .select()
        .single();
      if (error) throw error;

      const { error: linesError } = await supabase.from("invoice_lines").insert(
        input.lines.map((l, i) => {
          const discount = l.discount_amount ?? 0;
          const cat = l.tax_category ?? "S";
          const net = l.qty * l.unit_price - discount;
          const lineTax = cat !== "Z" && cat !== "E" && cat !== "O" ? net * (l.tax_rate / 100) : 0;
          return {
            invoice_id: inv.id,
            product_id: l.product_id ?? null,
            description: l.description,
            qty: l.qty,
            unit_price: l.unit_price,
            tax_rate: l.tax_rate,
            line_total: net + lineTax,
            position: i,
            net_amount: net,
            tax_amount: lineTax,
            discount_amount: discount,
            unit_code: (l.unit_code ?? "EA").toUpperCase(),
            tax_category: cat,
            tax_scheme: "VAT",
            item_classification_code: l.item_classification_code ?? null,
            hsn_code: l.hsn_code ?? null,
            product_category: l.product_category ?? null,
          };
        }) as any,
      );
      if (linesError) throw linesError;
      return inv;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const { companyId, user, roles = [], isSuperAdmin = false } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      number: string;
      customer_id?: string | null;
      customer_name: string;
      issue_date: string;
      due_date: string;
      notes?: string;
      po_reference?: string;
      invoice_type?: string;
      transaction_type?: string;
      supply_date?: string | null;
      payment_terms?: string | null;
      payment_means_code?: string | null;
      exchange_rate?: number | null;
      currency?: string;
      lines: Array<{
        product_id?: string | null;
        description: string;
        qty: number;
        unit_price: number;
        tax_rate: number;
        unit_code?: string;
        tax_category?: string;
        discount_amount?: number;
        item_classification_code?: string | null;
        hsn_code?: string | null;
        product_category?: string | null;
      }>;
    }) => {
      if (!companyId || !user) throw new Error("An active company is required.");

      // Check client-side role authorization matching can_edit_invoice
      const isManager = isSuperAdmin || roles.includes("company_admin") || roles.includes("finance_officer");
      const isStaff = roles.includes("staff_user");

      if (roles.length > 0 && !isManager && !isStaff) {
        throw new Error("Access denied: user lacks invoice edit permission for this company.");
      }

      // Check current invoice status to protect external compliance stages and enforce staff draft restrictions
      const { data: currentInv, error: fetchErr } = await supabase
        .from("invoices")
        .select("status, company_id")
        .eq("id", input.id)
        .eq("company_id", companyId)
        .single();
      if (fetchErr || !currentInv) throw new Error("Invoice not found or access denied.");

      if (!isManager && isStaff && currentInv.status !== "Draft") {
        throw new Error("Access denied: staff users can only edit draft invoices.");
      }

      const protectedStatuses: DBInvoiceStatus[] = [
        "Submitted",
        "Validated",
        "Signed",
        "Confirmed",
        "Rejected",
      ];
      if (protectedStatuses.includes(currentInv.status as DBInvoiceStatus)) {
        throw new Error(
          `Cannot edit invoice in '${currentInv.status}' stage. External compliance processing has begun.`,
        );
      }

      // Pre-validate replacement lines before initiating database changes
      if (!input.lines || input.lines.length === 0) {
        throw new Error("Add at least one valid line item with description and quantity");
      }
      for (let i = 0; i < input.lines.length; i++) {
        const l = input.lines[i];
        if (!l.description || !l.description.trim()) {
          throw new Error(`Line description cannot be empty (item #${i + 1})`);
        }
        if (l.qty == null || l.qty <= 0) {
          throw new Error(`Line quantity must be greater than zero (item #${i + 1})`);
        }
        if (l.unit_price == null || l.unit_price < 0) {
          throw new Error(`Line unit price cannot be negative (item #${i + 1})`);
        }
        if ((l.discount_amount ?? 0) < 0) {
          throw new Error(`Line discount cannot be negative (item #${i + 1})`);
        }
      }

      const subtotal = input.lines.reduce(
        (s, l) => s + (l.qty * l.unit_price - (l.discount_amount ?? 0)),
        0,
      );
      const tax = input.lines.reduce(
        (s, l) =>
          s +
          (l.qty * l.unit_price - (l.discount_amount ?? 0)) *
            ((l.tax_category ?? "S") !== "Z" && (l.tax_category ?? "S") !== "E" && (l.tax_category ?? "S") !== "O"
              ? l.tax_rate / 100
              : 0),
        0,
      );
      const total = subtotal + tax;

      const headerPayload = {
        number: input.number,
        customer_id: input.customer_id ?? null,
        customer_name: input.customer_name,
        issue_date: input.issue_date,
        due_date: input.due_date,
        notes: input.notes ?? null,
        po_reference: input.po_reference ?? null,
        subtotal,
        tax,
        total,
        invoice_type: input.invoice_type ?? null,
        transaction_type: input.transaction_type ?? null,
        supply_date: input.supply_date ?? null,
        payment_terms: input.payment_terms ?? null,
        payment_means_code: input.payment_means_code ?? null,
        exchange_rate: input.exchange_rate ?? null,
        currency: input.currency ?? null,
      };

      const linesPayload = input.lines.map((l, i) => {
        const discount = l.discount_amount ?? 0;
        const cat = l.tax_category ?? "S";
        const net = l.qty * l.unit_price - discount;
        const lineTax = cat !== "Z" && cat !== "E" && cat !== "O" ? net * (l.tax_rate / 100) : 0;
        return {
          product_id: l.product_id ?? null,
          description: l.description.trim(),
          qty: l.qty,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          line_total: net + lineTax,
          position: i,
          net_amount: net,
          tax_amount: lineTax,
          discount_amount: discount,
          unit_code: (l.unit_code ?? "EA").toUpperCase(),
          tax_category: cat,
          tax_scheme: "VAT",
          item_classification_code: l.item_classification_code ?? null,
          hsn_code: l.hsn_code ?? null,
          product_category: l.product_category ?? null,
        };
      });

      // Atomic update via PostgreSQL RPC in a single transaction
      const { data, error } = await (supabase as SupabaseClient<AppDatabase>).rpc("update_invoice_atomic", {
        p_invoice_id: input.id,
        p_company_id: companyId,
        p_header: headerPayload as Json,
        p_lines: linesPayload as Json,
      });

      if (error) {
        throw new Error(error.message || "Failed to update invoice atomically");
      }

      return data;

    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", vars.id] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  const { roles = [], isSuperAdmin = false } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DBInvoiceStatus }) => {
      const isManager = isSuperAdmin || roles.includes("company_admin") || roles.includes("finance_officer");
      if (roles.length > 0 && !isManager) {
        throw new Error("Access denied: staff users cannot elevate invoice status or submit invoices.");
      }
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
  const { companyId, roles, isSuperAdmin } = useAuth();
  return useQuery({
    queryKey: ["team", companyId],
    enabled: !!companyId && (isSuperAdmin || roles.includes("company_admin")),
    queryFn: async () => {
      if (!companyId) throw new Error("No active company selected.");
      return parseTeam(await invokeTenantAdmin({ action: "list", company_id: companyId }));
    },
  });
}

function useTeamChange<Action extends TeamChange["action"]>(action: Action) {
  const { companyId, roles, isSuperAdmin, refreshMembership } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Extract<TeamChange, { action: Action }>, "action">) => {
      if (!companyId || (!isSuperAdmin && !roles.includes("company_admin"))) throw new Error("An active company admin is required.");
      // Allowlist request fields even if a caller supplies extra runtime values.
      const change = { ...input, action } as TeamChange;
      if ((change.action === "invite" || change.action === "set_role") && !tenantRoles.some((role) => role === change.role)) {
        throw new Error("Choose a supported tenant role.");
      }
      let body: Record<string, unknown>;
      switch (change.action) {
        case "invite":
          body = { action, company_id: companyId, email: change.email, display_name: change.display_name, role: change.role };
          break;
        case "set_role":
          body = { action, company_id: companyId, user_id: change.user_id, role: change.role };
          break;
        case "remove_member":
          body = { action, company_id: companyId, user_id: change.user_id };
          break;
        case "revoke_invitation":
          body = { action, company_id: companyId, invitation_id: change.invitation_id };
          break;
      }
      await invokeTenantAdmin(body);
      return companyId;
    },
    onSuccess: async (changedCompanyId) => {
      await qc.invalidateQueries({ queryKey: ["team", changedCompanyId] });
      await refreshMembership();
    },
  });
}

export const useInviteTeamMember = () => useTeamChange("invite");
export const useSetTeamRole = () => useTeamChange("set_role");
export const useRemoveTeamMember = () => useTeamChange("remove_member");
export const useRevokeTeamInvitation = () => useTeamChange("revoke_invitation");

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

/* ----------------------------- Admin: platform users ----------------------------- */
export function useAllPlatformUsers() {
  return useQuery({
    queryKey: ["platform_users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("id, display_name, created_at");
      if (error) throw error;
      if (!profiles?.length) return [];
      const ids = profiles.map((p) => p.id);
      const [{ data: roles }, { data: members }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role, company_id").in("user_id", ids),
        supabase.from("company_members").select("user_id, company_id, status, last_active_at").in("user_id", ids),
      ]);
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name");
      return profiles.map((p) => {
        const member = members?.find((m) => m.user_id === p.id);
        const role = roles?.find((r) => r.user_id === p.id);
        const company = companies?.find((c) => c.id === member?.company_id);
        return {
          id: p.id,
          name: p.display_name ?? "—",
          email: "—",
          company: company?.name ?? "—",
          role: role?.role ?? "staff_user",
          status: member?.status ?? "Active",
          lastActive: member?.last_active_at ?? null,
        };
      });
    },
  });
}

/* ----------------------------- Admin: platform-wide invoice traffic ----------------------------- */
export function useAllInvoices() {
  return useQuery({
    queryKey: ["all_invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, status, total, issue_date, customer_name, company_id, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ----------------------------- One-time seed for new workspaces ----------------------------- */
export async function seedDemoData(companyId: string, userId: string) {
  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    console.error("Failed to check existing customers count:", error);
    return;
  }

  // If any customers exist, skip
  if (count && count > 0) return;

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

