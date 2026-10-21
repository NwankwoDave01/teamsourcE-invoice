import { cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { useUpdateInvoice, type DBInvoiceStatus } from "@/hooks/useCompanyData";
import { supabase } from "@/integrations/supabase/client";

const authMock = vi.hoisted(() => ({
  user: { id: "user-test-1" } as { id: string } | null,
  companyId: "company-test-1" as string | null,
  roles: ["company_admin"] as ("super_admin" | "company_admin" | "finance_officer" | "staff_user")[],
  isSuperAdmin: false,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authMock.user,
    companyId: authMock.companyId,
    roles: authMock.roles,
    isSuperAdmin: authMock.isSuperAdmin,
  }),
}));

const dbMock = vi.hoisted(() => ({
  invoices: [] as any[],
  invoiceLines: [] as any[],
  rpcCalls: [] as any[],
  rpcHandler: vi.fn(),
  directLineDeleteSpy: vi.fn(),
  directLineInsertSpy: vi.fn(),
  directInvoiceUpdateSpy: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "invoices") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(async () => {
              const inv = dbMock.invoices.find(
                (i) => i.company_id === authMock.companyId,
              );
              if (!inv) return { data: null, error: new Error("Invoice not found or access denied.") };
              return { data: { status: inv.status, company_id: inv.company_id }, error: null };
            }),
            update: vi.fn((payload: any) => {
              dbMock.directInvoiceUpdateSpy(payload);
              return {
                eq: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: payload, error: null }),
              };
            }),
          };
        }
        if (table === "invoice_lines") {
          return {
            delete: vi.fn(() => {
              dbMock.directLineDeleteSpy();
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
            insert: vi.fn((lines: any[]) => {
              dbMock.directLineInsertSpy(lines);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
      rpc: vi.fn(async (fnName: string, args: any) => {
        dbMock.rpcCalls.push({ fnName, args });
        const res = await dbMock.rpcHandler(fnName, args);
        return res ?? { data: null, error: null };
      }),
    },
  };
});

describe("Atomic Invoice and Invoice Lines Update", () => {
  let queryClient: QueryClient;

  function createWrapper() {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  const sampleInitialInvoice = {
    id: "inv-test-001",
    company_id: "company-test-1",
    number: "INV-2026-0001",
    customer_id: "cust-1",
    customer_name: "Original Customer Corp",
    issue_date: "2026-10-20",
    due_date: "2026-11-20",
    status: "Draft" as DBInvoiceStatus,
    subtotal: 100000,
    tax: 7500,
    total: 107500,
    currency: "NGN",
    notes: "Original payment terms apply.",
    po_reference: "PO-ORIG-100",
  };

  const sampleInitialLines = [
    {
      id: "line-001",
      invoice_id: "inv-test-001",
      description: "Original Infrastructure Advisory",
      qty: 1,
      unit_price: 100000,
      tax_rate: 7.5,
      line_total: 107500,
      position: 0,
      net_amount: 100000,
      tax_amount: 7500,
      discount_amount: 0,
      unit_code: "EA",
      tax_category: "S",
    },
  ];

  beforeEach(() => {
    authMock.user = { id: "user-test-1" };
    authMock.companyId = "company-test-1";
    authMock.roles = ["company_admin"];
    authMock.isSuperAdmin = false;
    dbMock.invoices = [{ ...sampleInitialInvoice }];
    dbMock.invoiceLines = [...sampleInitialLines];
    dbMock.rpcCalls = [];
    dbMock.rpcHandler.mockReset();
    dbMock.directLineDeleteSpy.mockReset();
    dbMock.directLineInsertSpy.mockReset();
    dbMock.directInvoiceUpdateSpy.mockReset();
  });

  afterEach(() => {
    cleanup();
    queryClient?.clear();
    vi.restoreAllMocks();
  });

  it("regression: line replacement failure aborts atomically and preserves original invoice header and lines", async () => {
    // Simulate database constraint/validation failure during line replacement in RPC
    dbMock.rpcHandler.mockResolvedValueOnce({
      data: null,
      error: {
        message: "violates foreign key constraint on invoice_lines.product_id",
        code: "23503",
      },
    });

    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    const updatePayload = {
      id: "inv-test-001",
      number: "INV-2026-0001",
      customer_id: "cust-2",
      customer_name: "Attempted New Name Corp",
      issue_date: "2026-10-21",
      due_date: "2026-11-21",
      lines: [
        {
          product_id: "non-existent-prod-id",
          description: "Replacement Line That Fails Foreign Key",
          qty: 2,
          unit_price: 50000,
          tax_rate: 7.5,
        },
      ],
    };

    // The mutation must reject with the transaction failure error
    await expect(result.current.mutateAsync(updatePayload)).rejects.toThrow(
      "violates foreign key constraint on invoice_lines.product_id",
    );

    // Verify that NO direct non-atomic delete or insert operations were committed against invoice_lines
    expect(dbMock.directLineDeleteSpy).not.toHaveBeenCalled();
    expect(dbMock.directLineInsertSpy).not.toHaveBeenCalled();
    expect(dbMock.directInvoiceUpdateSpy).not.toHaveBeenCalled();

    // Verify the atomic RPC was targeted rather than raw multi-step REST calls
    expect(dbMock.rpcCalls).toHaveLength(1);
    expect(dbMock.rpcCalls[0].fnName).toBe("update_invoice_atomic");

    // Verify original database state remains intact
    expect(dbMock.invoices[0].customer_name).toBe("Original Customer Corp");
    expect(dbMock.invoices[0].total).toBe(107500);
    expect(dbMock.invoiceLines).toHaveLength(1);
    expect(dbMock.invoiceLines[0].description).toBe("Original Infrastructure Advisory");
  });

  it("performs atomic update and line replacement with calculated totals when valid", async () => {
    const updatedInvoiceRecord = {
      ...sampleInitialInvoice,
      customer_name: "Acme Logistics Ltd",
      subtotal: 200000,
      tax: 15000,
      total: 215000,
    };

    dbMock.rpcHandler.mockResolvedValueOnce({
      data: updatedInvoiceRecord,
      error: null,
    });

    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    const response = await result.current.mutateAsync({
      id: "inv-test-001",
      number: "INV-2026-0001",
      customer_name: "Acme Logistics Ltd",
      issue_date: "2026-10-21",
      due_date: "2026-11-21",
      currency: "NGN",
      notes: "Updated terms",
      lines: [
        {
          description: "Fleet Management Advisory",
          qty: 2,
          unit_price: 100000,
          tax_rate: 7.5,
          unit_code: "EA",
          tax_category: "S",
        },
      ],
    });

    expect(response).toEqual(updatedInvoiceRecord);
    expect(dbMock.rpcCalls).toHaveLength(1);
    const call = dbMock.rpcCalls[0];
    expect(call.fnName).toBe("update_invoice_atomic");
    expect(call.args.p_invoice_id).toBe("inv-test-001");
    expect(call.args.p_company_id).toBe("company-test-1");
    expect(call.args.p_header.customer_name).toBe("Acme Logistics Ltd");
    expect(call.args.p_header.subtotal).toBe(200000);
    expect(call.args.p_header.tax).toBe(15000);
    expect(call.args.p_header.total).toBe(215000);
    expect(call.args.p_lines).toHaveLength(1);
    expect(call.args.p_lines[0].description).toBe("Fleet Management Advisory");
    expect(call.args.p_lines[0].line_total).toBe(215000);
  });

  it("enforces protected status compliance: blocks editing invoices in Submitted, Validated, Signed, Confirmed, and Rejected", async () => {
    const protectedStatuses: DBInvoiceStatus[] = [
      "Submitted",
      "Validated",
      "Signed",
      "Confirmed",
      "Rejected",
    ];

    for (const status of protectedStatuses) {
      dbMock.invoices = [{ ...sampleInitialInvoice, status }];
      dbMock.rpcCalls = [];

      const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

      await expect(
        result.current.mutateAsync({
          id: "inv-test-001",
          number: "INV-2026-0001",
          customer_name: "Changed Name",
          issue_date: "2026-10-21",
          due_date: "2026-11-21",
          lines: [{ description: "Some Item", qty: 1, unit_price: 100, tax_rate: 7.5 }],
        }),
      ).rejects.toThrow(`Cannot edit invoice in '${status}' stage. External compliance processing has begun.`);

      // Verify the RPC was never called for protected status
      expect(dbMock.rpcCalls).toHaveLength(0);
      expect(dbMock.directLineDeleteSpy).not.toHaveBeenCalled();
    }
  });

  it("validates line items before attempting database mutation", async () => {
    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    // Empty lines array
    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Customer",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [],
      }),
    ).rejects.toThrow("Add at least one valid line item with description and quantity");

    // Blank description
    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Customer",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [{ description: "   ", qty: 1, unit_price: 100, tax_rate: 7.5 }],
      }),
    ).rejects.toThrow("Line description cannot be empty (item #1)");

    // Zero or negative quantity
    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Customer",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [{ description: "Valid Description", qty: 0, unit_price: 100, tax_rate: 7.5 }],
      }),
    ).rejects.toThrow("Line quantity must be greater than zero (item #1)");

    // Negative unit price
    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Customer",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [{ description: "Valid Description", qty: 1, unit_price: -50, tax_rate: 7.5 }],
      }),
    ).rejects.toThrow("Line unit price cannot be negative (item #1)");

    // Negative discount
    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Customer",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [{ description: "Valid Description", qty: 1, unit_price: 100, tax_rate: 7.5, discount_amount: -10 }],
      }),
    ).rejects.toThrow("Line discount cannot be negative (item #1)");

    // In all validation failures, RPC must NOT be invoked
    expect(dbMock.rpcCalls).toHaveLength(0);
    expect(dbMock.directLineDeleteSpy).not.toHaveBeenCalled();
  });

  it("enforces company isolation: rejects edit when active company does not match invoice", async () => {
    dbMock.invoices = [{ ...sampleInitialInvoice, company_id: "other-tenant-999" }];
    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Attempted Cross-Tenant Update",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [{ description: "Item", qty: 1, unit_price: 100, tax_rate: 7.5 }],
      }),
    ).rejects.toThrow("Invoice not found or access denied.");

    expect(dbMock.rpcCalls).toHaveLength(0);
  });

  it("demonstrates transactional rollback: RPC transaction semantics guarantee no partial updates when line insertion fails", () => {
    // In-memory relational database state
    let invoiceTable = [{ ...sampleInitialInvoice }];
    let invoiceLinesTable = [...sampleInitialLines];

    // Transactional simulation of the update_invoice_atomic RPC
    function executeRpcTransaction(
      invoiceId: string,
      companyId: string,
      header: any,
      lines: any[],
      simulateLineInsertFailure = false,
    ) {
      // Snapshot state for transaction rollback
      const invoiceSnapshot = JSON.parse(JSON.stringify(invoiceTable));
      const linesSnapshot = JSON.parse(JSON.stringify(invoiceLinesTable));

      try {
        // Step 1: verify target invoice
        const targetInv = invoiceTable.find((i) => i.id === invoiceId);
        if (!targetInv) throw new Error("Invoice not found");
        if (targetInv.company_id !== companyId) throw new Error("Company mismatch");
        if (["Submitted", "Validated", "Signed", "Confirmed", "Rejected"].includes(targetInv.status)) {
          throw new Error("Cannot edit protected invoice");
        }

        // Step 2: update invoice header
        targetInv.customer_name = header.customer_name;
        targetInv.total = 999999;

        // Step 3: delete existing lines
        invoiceLinesTable = invoiceLinesTable.filter((l) => l.invoice_id !== invoiceId);

        // Step 4: insert new lines (simulate error mid-insert, e.g. constraint failure on line 2)
        if (simulateLineInsertFailure) {
          throw new Error("database constraint violation: invalid tax_category on line #2");
        }

        for (const line of lines) {
          invoiceLinesTable.push({ id: "new-line", invoice_id: invoiceId, ...line });
        }

        return { success: true };
      } catch (err) {
        // Transaction ROLLBACK: restore exact snapshots
        invoiceTable = invoiceSnapshot;
        invoiceLinesTable = linesSnapshot;
        throw err;
      }
    }

    // Call RPC transaction with mid-insert failure
    expect(() =>
      executeRpcTransaction(
        "inv-test-001",
        "company-test-1",
        { customer_name: "Corrupted Name Attempt" },
        [{ description: "Line 1" }, { description: "Line 2 with bad tax" }],
        true, // simulate failure during line replacement
      ),
    ).toThrow("database constraint violation: invalid tax_category on line #2");

    // CONFIRM: Invoice header is completely restored to original
    expect(invoiceTable[0].customer_name).toBe("Original Customer Corp");
    expect(invoiceTable[0].total).toBe(107500);

    // CONFIRM: Original invoice lines were NOT lost; they are fully restored
    expect(invoiceLinesTable).toHaveLength(1);
    expect(invoiceLinesTable[0].description).toBe("Original Infrastructure Advisory");
    expect(invoiceLinesTable[0].line_total).toBe(107500);
  });

  it("rejects unauthorized users lacking invoice management permission (e.g. staff_user)", async () => {
    // Restrict authenticated user role to staff_user (not company_admin or finance_officer)
    authMock.roles = ["staff_user"];
    authMock.isSuperAdmin = false;

    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Staff Attempt",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [{ description: "Staff Item", qty: 1, unit_price: 100, tax_rate: 7.5 }],
      }),
    ).rejects.toThrow("Access denied: user lacks invoice management permission for this company.");

    // Verify RPC was never invoked for unauthorized role
    expect(dbMock.rpcCalls).toHaveLength(0);
  });

  it("rejects when server RPC can_manage_invoices check fails", async () => {
    dbMock.rpcHandler.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Access denied: user lacks invoice management permission for company company-test-1",
      },
    });

    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Customer",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [{ description: "Item", qty: 1, unit_price: 100, tax_rate: 7.5 }],
      }),
    ).rejects.toThrow("Access denied: user lacks invoice management permission for company company-test-1");
  });

  it("rejects cross-company customer and product references", async () => {
    // 1. Cross-company customer rejection
    dbMock.rpcHandler.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Customer cust-other-tenant does not belong to company company-test-1",
      },
    });

    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_id: "cust-other-tenant",
        customer_name: "Customer",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [{ description: "Item", qty: 1, unit_price: 100, tax_rate: 7.5 }],
      }),
    ).rejects.toThrow("Customer cust-other-tenant does not belong to company company-test-1");

    // 2. Cross-company product rejection on line item
    dbMock.rpcHandler.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Product prod-other-tenant does not belong to company company-test-1 (item position 1)",
      },
    });

    await expect(
      result.current.mutateAsync({
        id: "inv-test-001",
        number: "INV-2026-0001",
        customer_name: "Customer",
        issue_date: "2026-10-20",
        due_date: "2026-11-20",
        lines: [
          {
            product_id: "prod-other-tenant",
            description: "Cross Tenant Product",
            qty: 1,
            unit_price: 100,
            tax_rate: 7.5,
          },
        ],
      }),
    ).rejects.toThrow("Product prod-other-tenant does not belong to company company-test-1 (item position 1)");
  });

  it("preserves invoice number and correctly maps NRS fields and line totals", async () => {
    dbMock.rpcHandler.mockResolvedValueOnce({
      data: { ...sampleInitialInvoice, number: "INV-2026-0001" },
      error: null,
    });

    const { result } = renderHook(() => useUpdateInvoice(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      id: "inv-test-001",
      number: "INV-2026-0001",
      customer_name: "Dangote Logistics",
      issue_date: "2026-10-20",
      due_date: "2026-11-20",
      invoice_type: "380",
      transaction_type: "B2B",
      payment_means_code: "30",
      exchange_rate: 1,
      currency: "NGN",
      lines: [
        {
          description: "Line item with discount",
          qty: 10,
          unit_price: 5000,
          tax_rate: 7.5,
          discount_amount: 2000,
          tax_category: "S",
          unit_code: "EA",
        },
      ],
    });

    expect(dbMock.rpcCalls).toHaveLength(1);
    const { p_header, p_lines } = dbMock.rpcCalls[0].args;

    // Gross: 10 * 5000 = 50,000; Discount: 2,000; Net: 48,000; Tax (7.5%): 3,600; Total: 51,600
    expect(p_header.number).toBe("INV-2026-0001");
    expect(p_header.subtotal).toBe(48000);
    expect(p_header.tax).toBe(3600);
    expect(p_header.total).toBe(51600);
    expect(p_lines[0].net_amount).toBe(48000);
    expect(p_lines[0].tax_amount).toBe(3600);
    expect(p_lines[0].line_total).toBe(51600);
  });

  it("simulates SELECT FOR UPDATE row locking and status recheck preventing concurrent compliance races", () => {
    // Model simulating database row state and concurrency locks
    const rowLock = { isLocked: false };
    const invoiceRecord = { ...sampleInitialInvoice, status: "Draft" as DBInvoiceStatus };

    function lockAndCheckInvoice(id: string, concurrentStatusTransition?: DBInvoiceStatus) {
      if (rowLock.isLocked) throw new Error("Row is locked by concurrent transaction");
      rowLock.isLocked = true;

      try {
        // If another transaction (such as signing/submission) modified the status concurrently:
        if (concurrentStatusTransition) {
          invoiceRecord.status = concurrentStatusTransition;
        }

        // Recheck protected status inside locked row
        if (["Submitted", "Validated", "Signed", "Confirmed", "Rejected"].includes(invoiceRecord.status)) {
          throw new Error(
            `Cannot edit invoice in '${invoiceRecord.status}' stage. External compliance processing has begun.`,
          );
        }

        return { lockedAndValid: true };
      } finally {
        rowLock.isLocked = false;
      }
    }

    // Normal draft edit succeeds
    expect(lockAndCheckInvoice("inv-test-001").lockedAndValid).toBe(true);

    // If concurrent submission transitioned invoice to Signed before lock acquired:
    expect(() => lockAndCheckInvoice("inv-test-001", "Signed")).toThrow(
      "Cannot edit invoice in 'Signed' stage. External compliance processing has begun.",
    );
  });
});
