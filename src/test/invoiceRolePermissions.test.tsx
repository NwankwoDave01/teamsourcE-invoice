import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Invoices from "@/pages/tenant/Invoices";
import InvoiceDetails from "@/pages/tenant/InvoiceDetails";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

const authMock = vi.hoisted(() => ({
  user: { id: "user-test" },
  companyId: "company-test",
  roles: ["staff_user"] as string[],
  isSuperAdmin: false,
}));

const invoiceDataMock = vi.hoisted(() => ({
  invoices: [] as any[],
  currentInvoice: null as any,
  updateStatusMutateAsync: vi.fn(),
  deleteMutateAsync: vi.fn(),
  nrsSubmit: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: authMock.user,
    companyId: authMock.companyId,
    roles: authMock.roles,
    isSuperAdmin: authMock.isSuperAdmin,
  }),
}));

vi.mock("@/hooks/useCompanyData", async () => {
  const actual = await vi.importActual<any>("@/hooks/useCompanyData");
  return {
    ...actual,
    useCurrentCompany: () => ({
      data: { name: "Tenant Test Co", tin: "11223344-0001" },
      isLoading: false,
    }),
    useInvoices: () => ({ data: invoiceDataMock.invoices, isLoading: false }),
    useInvoice: () => ({ data: invoiceDataMock.currentInvoice, isLoading: false, refetch: vi.fn() }),
    useCustomer: () => ({ data: { name: "Acme Corp", tin: "12345678" } }),
    useUpdateInvoiceStatus: () => ({
      mutateAsync: invoiceDataMock.updateStatusMutateAsync,
      isPending: false,
    }),
    useDeleteInvoice: () => ({
      mutateAsync: invoiceDataMock.deleteMutateAsync,
      isPending: false,
    }),
  };
});

vi.mock("@/hooks/useNrsSubmissionHistory", () => ({
  useNrsSubmissionHistory: () => ({ isSuccess: true, isFetching: false, data: new Set<string>() }),
}));

vi.mock("@/hooks/useNrsSubmit", () => ({
  useNrsSubmit: () => invoiceDataMock.nrsSubmit,
}));

vi.mock("@/lib/pdfExport", () => ({
  downloadInvoicePdf: vi.fn(),
  generateInvoicePdf: vi.fn(),
}));

let queryClient: QueryClient;

function renderInvoicesPage() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/invoices"]}>
        <Routes>
          <Route path="/app/invoices" element={<Invoices />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderInvoiceDetailsPage(id = "inv-001") {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/app/invoices/${id}`]}>
        <Routes>
          <Route path="/app/invoices/:id" element={<InvoiceDetails />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.roles = ["staff_user"];
  authMock.isSuperAdmin = false;

  invoiceDataMock.invoices = [
    {
      id: "inv-draft-001",
      company_id: "company-test",
      number: "INV-2026-DRAFT",
      customer_id: "cust-1",
      customer_name: "Draft Client Ltd",
      issue_date: "2026-10-20",
      due_date: "2026-11-20",
      status: "Draft",
      subtotal: 100000,
      tax: 7500,
      total: 107500,
      irn: null,
      created_by: "user-test",
    },
    {
      id: "inv-review-002",
      company_id: "company-test",
      number: "INV-2026-REVIEW",
      customer_id: "cust-2",
      customer_name: "Review Client Ltd",
      issue_date: "2026-10-19",
      due_date: "2026-11-19",
      status: "In Review",
      subtotal: 200000,
      tax: 15000,
      total: 215000,
      irn: null,
      created_by: "user-other",
    },
  ];

  invoiceDataMock.currentInvoice = invoiceDataMock.invoices[0];
});

afterEach(() => {
  cleanup();
  queryClient?.clear();
});

function openRowActions(invoiceNumber: string) {
  const trigger = screen.getByRole("button", { name: `Actions for ${invoiceNumber}` });
  fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 });
  fireEvent.keyDown(trigger, { key: "Enter" });
  return trigger;
}

function openBulkMore() {
  const bulkSubmitBtn = screen.getByRole("button", { name: /Validate & sign/i });
  const moreBtn = within(bulkSubmitBtn.parentElement!).getByRole("button", { name: /More/i });
  fireEvent.pointerDown(moreBtn, { pointerId: 1, button: 0 });
  fireEvent.keyDown(moreBtn, { key: "Enter" });
  return moreBtn;
}

describe("Invoice role permissions enforcement", () => {
  describe("Staff Users permissions", () => {
    it("allows Staff User to edit Draft invoices but restricts non-draft invoices", async () => {
      authMock.roles = ["staff_user"];
      renderInvoicesPage();

      // Check actions on Draft invoice row
      openRowActions("INV-2026-DRAFT");

      // Edit item should be an enabled link for draft invoice
      const editDraftItem = await screen.findByRole("menuitem", { name: /^Edit$/i });
      expect(editDraftItem).not.toHaveAttribute("aria-disabled", "true");
      expect(editDraftItem.closest("a")).toHaveAttribute(
        "href",
        "/app/invoices/inv-draft-001/edit",
      );

      // Submit and Mark as Draft should be disabled for staff user
      const validateItem = await screen.findByRole("menuitem", { name: /Validate & sign/i });
      expect(validateItem).toHaveAttribute("aria-disabled", "true");
      const markDraftItem = await screen.findByRole("menuitem", { name: /Mark as Draft/i });
      expect(markDraftItem).toHaveAttribute("aria-disabled", "true");

      cleanup();

      // Now check actions on In Review invoice row
      renderInvoicesPage();
      openRowActions("INV-2026-REVIEW");

      // Edit item should be disabled with staff restriction title
      const editReviewItem = await screen.findByRole("menuitem", { name: /^Edit$/i });
      expect(editReviewItem).toHaveAttribute("aria-disabled", "true");
      expect(editReviewItem).toHaveAttribute(
        "title",
        "Staff users can only edit draft invoices.",
      );
    });

    it("does not render advance status or reject buttons on InvoiceDetails for Staff Users", async () => {
      authMock.roles = ["staff_user"];
      invoiceDataMock.currentInvoice = {
        ...invoiceDataMock.invoices[0],
        status: "Draft",
      };

      renderInvoiceDetailsPage("inv-draft-001");

      // Advance button (Submit for review) must not be rendered
      expect(screen.queryByRole("button", { name: /Submit for review/i })).not.toBeInTheDocument();
      // Mark as rejected button must not be rendered
      expect(screen.queryByRole("button", { name: /Mark as rejected/i })).not.toBeInTheDocument();
    });

    it("disables bulk submit, mark as draft, and delete for Staff Users", async () => {
      authMock.roles = ["staff_user"];
      renderInvoicesPage();

      // Select all invoices on page
      const selectAll = screen.getByLabelText("Select all");
      fireEvent.click(selectAll);

      // Bulk action bar should show disabled Validate & sign
      const bulkSubmitBtn = screen.getByRole("button", { name: /Validate & sign \(NRS sandbox\)/i });
      expect(bulkSubmitBtn).toBeDisabled();

      // More dropdown in bulk actions
      openBulkMore();

      const bulkDraftItem = await screen.findByRole("menuitem", { name: /Mark as Draft/i });
      expect(bulkDraftItem).toHaveAttribute("aria-disabled", "true");

      const bulkDeleteItem = await screen.findByRole("menuitem", { name: /Delete/i });
      expect(bulkDeleteItem).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Finance Officers permissions", () => {
    it("allows Finance Officers to edit invoices, advance status, and submit", async () => {
      authMock.roles = ["finance_officer"];
      renderInvoicesPage();

      // Check actions on In Review invoice row: Finance Officer can edit pre-submission invoices
      openRowActions("INV-2026-REVIEW");

      const editReviewItem = await screen.findByRole("menuitem", { name: /^Edit$/i });
      expect(editReviewItem).not.toHaveAttribute("aria-disabled", "true");
      expect(editReviewItem.closest("a")).toHaveAttribute(
        "href",
        "/app/invoices/inv-review-002/edit",
      );

      // Mark as draft is enabled for finance officers
      const markDraftItem = await screen.findByRole("menuitem", { name: /Mark as Draft/i });
      expect(markDraftItem).not.toHaveAttribute("aria-disabled", "true");

      cleanup();

      // Check InvoiceDetails for Finance Officer
      invoiceDataMock.currentInvoice = {
        ...invoiceDataMock.invoices[0],
        status: "Draft",
      };
      renderInvoiceDetailsPage("inv-draft-001");

      // Advance and Reject buttons must be rendered and accessible
      expect(screen.getByRole("button", { name: /Submit for review/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Mark as rejected/i })).toBeInTheDocument();
    });
  });

  describe("Company Admins permissions", () => {
    it("allows Company Admins full invoice management", async () => {
      authMock.roles = ["company_admin"];
      renderInvoicesPage();

      openRowActions("INV-2026-REVIEW");

      const editReviewItem = await screen.findByRole("menuitem", { name: /^Edit$/i });
      expect(editReviewItem).not.toHaveAttribute("aria-disabled", "true");

      cleanup();

      invoiceDataMock.currentInvoice = {
        ...invoiceDataMock.invoices[0],
        status: "Draft",
      };
      renderInvoiceDetailsPage("inv-draft-001");

      expect(screen.getByRole("button", { name: /Submit for review/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Mark as rejected/i })).toBeInTheDocument();
    });
  });

  it("shows confirmed NRS rejection details and validation stage in InvoiceDetails", async () => {
    authMock.roles = ["finance_officer"];
    invoiceDataMock.currentInvoice = {
      ...invoiceDataMock.invoices[0],
      status: "Ready",
      submission_status: "not_submitted",
    };
    invoiceDataMock.nrsSubmit.mockResolvedValueOnce({
      kind: "rejected",
      stage: "validate",
      retrySafe: false,
      message: "NRS validation rejected: Invoice validation failed.",
      details: "invoicerequest.invoice.billingreference: [REQUIRED] billingreference is required for credit note and debit note invoices.",
    });

    renderInvoiceDetailsPage("inv-draft-001");
    fireEvent.click(screen.getByRole("button", { name: /Validate & sign \(NRS sandbox\)/i }));

    const result = await screen.findByRole("alert");
    expect(result).toHaveTextContent("Rejected");
    expect(result).toHaveTextContent("Stage: NRS validation · Status: rejected");
    expect(result).toHaveTextContent("billingreference is required for credit note and debit note invoices");
    expect(result).not.toHaveTextContent("Result unconfirmed");
  });
});
