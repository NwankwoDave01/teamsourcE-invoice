import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Invoices from "@/pages/tenant/Invoices";
import { INVOICE_STATUSES, type DBInvoice, type DBInvoiceStatus } from "@/hooks/useCompanyData";
import * as csvExportModule from "@/lib/csvExport";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mocks = vi.hoisted(() => ({
  invoices: [] as InvoiceFixture[],
  updateStatusMutateAsync: vi.fn(),
  deleteMutateAsync: vi.fn(),
  nrsSubmit: vi.fn(),
}));

type InvoiceFixture = Pick<
  DBInvoice,
  "id" | "company_id" | "number" | "customer_id" | "customer_name" | "issue_date" | "due_date" |
    "subtotal" | "tax" | "total" | "status" | "irn"
> & Partial<DBInvoice> & { submission_status?: string | null };

vi.mock("@/hooks/useCompanyData", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useCompanyData")>("@/hooks/useCompanyData");
  return {
    ...actual,
    useCurrentCompany: () => ({
      data: { name: "TS-Flow Tenant", tin: "12345678-0001" },
      isLoading: false,
    }),
    useInvoices: () => ({ data: mocks.invoices, isLoading: false }),
    useUpdateInvoiceStatus: () => ({
      mutateAsync: mocks.updateStatusMutateAsync,
      isPending: false,
    }),
    useDeleteInvoice: () => ({
      mutateAsync: mocks.deleteMutateAsync,
      isPending: false,
    }),
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" }, companyId: "company-1" }),
}));

vi.mock("@/hooks/useNrsSubmissionHistory", () => ({
  useNrsSubmissionHistory: () => ({ isSuccess: true, isFetching: false, data: new Set<string>() }),
}));

vi.mock("@/hooks/useNrsSubmit", () => ({
  useNrsSubmit: () => mocks.nrsSubmit,
}));

vi.mock("@/lib/pdfExport", () => ({
  downloadInvoicePdf: vi.fn(),
  generateInvoicePdf: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    supabase: {
      from: vi.fn().mockReturnValue(builder),
    },
  };
});

function createSampleInvoices(count: number): InvoiceFixture[] {
  const statuses: DBInvoiceStatus[] = [
    "Draft",
    "In Review",
    "Approved",
    "Ready",
    "Submitted",
    "Validated",
    "Signed",
    "Confirmed",
    "Rejected",
  ];

  return Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    const status = statuses[idx % statuses.length];
    return {
      id: `inv-${num}`,
      company_id: "company-1",
      number: `INV-2026-${String(num).padStart(3, "0")}`,
      customer_id: `cust-${(num % 3) + 1}`,
      customer_name: `Customer ${String.fromCharCode(65 + (num % 5))}`,
      issue_date: `2026-10-${String((num % 28) + 1).padStart(2, "0")}`,
      due_date: `2026-11-${String((num % 28) + 1).padStart(2, "0")}`,
      subtotal: 10000 * num,
      tax: 750 * num,
      total: 10750 * num,
      status,
      irn: status === "Confirmed" ? `IRN-SAMPLE-${num}` : null,
      submission_status: null,
    };
  });
}

function expectShowingText(expectedText: string) {
  expect(
    screen.getByText((_content, element) => {
      return (
        element?.tagName.toLowerCase() === "span" &&
        element.textContent?.replace(/\s+/g, " ").trim() === expectedText
      );
    }),
  ).toBeInTheDocument();
}

function openRowActions(invoiceNumber: string) {
  const trigger = screen.getByRole("button", { name: `Actions for ${invoiceNumber}` });
  fireEvent.pointerDown(trigger, { pointerId: 1, button: 0 });
  fireEvent.keyDown(trigger, { key: "Enter" });
  return trigger;
}

describe("Invoices Page Workflow", () => {
  let queryClient: QueryClient;

  function renderInvoices(initialUrl = "/app/invoices") {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialUrl]}>
          <Routes>
            <Route path="/app/invoices" element={<Invoices />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    mocks.invoices = createSampleInvoices(20);
    mocks.updateStatusMutateAsync.mockReset();
    mocks.deleteMutateAsync.mockReset();
    mocks.nrsSubmit.mockReset();
    window.print = vi.fn();
  });

  afterEach(() => {
    cleanup();
    queryClient?.clear();
    vi.restoreAllMocks();
  });

  describe("1. URL-driven status filtering", () => {
    it("synchronizes the active filter with the 'status' query parameter on initial load", () => {
      renderInvoices("/app/invoices?status=Draft");

      const draftPill = screen.getByRole("button", { name: /^Draft/i });
      expect(draftPill.className).toContain("bg-primary");

      const draftInvoices = mocks.invoices.filter((i) => i.status === "Draft");
      expect(draftInvoices.length).toBeGreaterThan(0);
      for (const inv of draftInvoices) {
        expect(screen.getByText(inv.number)).toBeInTheDocument();
      }

      const nonDraft = mocks.invoices.find((i) => i.status === "Approved");
      expect(screen.queryByText(nonDraft.number)).not.toBeInTheDocument();
    });

    it("falls back to 'All' filter when an invalid or unknown status query parameter is provided", () => {
      renderInvoices("/app/invoices?status=InvalidBogusStatus");

      const allPill = screen.getByRole("button", { name: /^All/i });
      expect(allPill.className).toContain("bg-primary");

      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    it("clicking a status pill updates the active status filter", () => {
      renderInvoices("/app/invoices");

      const inReviewPill = screen.getByRole("button", { name: /^In Review/i });
      fireEvent.click(inReviewPill);

      expect(inReviewPill.className).toContain("bg-primary");
      const inReviewInvoices = mocks.invoices.filter((i) => i.status === "In Review");
      for (const inv of inReviewInvoices) {
        expect(screen.getByText(inv.number)).toBeInTheDocument();
      }
    });

    it("clears the status filter when 'Clear filters' is clicked", () => {
      renderInvoices("/app/invoices?status=Ready");

      const clearBtn = screen.getByRole("button", { name: /clear/i });
      fireEvent.click(clearBtn);

      const allPill = screen.getByRole("button", { name: /^All/i });
      expect(allPill.className).toContain("bg-primary");
    });
  });

  describe("2. Client-side pagination", () => {
    it("paginates 15 rows per page and displays accurate counts", () => {
      renderInvoices("/app/invoices");

      // Verify 15 rows on the first page
      expectShowingText("Showing 1 to 15 of 20 invoices");
      const table = screen.getByRole("table");
      const page1Rows = within(table.querySelector("tbody")!).getAllByRole("row");
      expect(page1Rows).toHaveLength(15);

      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
      expect(screen.getByText("INV-2026-015")).toBeInTheDocument();
      expect(screen.queryByText("INV-2026-016")).not.toBeInTheDocument();

      const prevBtn = screen.getByRole("button", { name: /previous/i });
      const nextBtn = screen.getByRole("button", { name: /next/i });
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeEnabled();

      // Navigation to the next page
      fireEvent.click(nextBtn);

      // Verify correct count and rows on the final page
      expectShowingText("Showing 16 to 20 of 20 invoices");
      const page2Rows = within(table.querySelector("tbody")!).getAllByRole("row");
      expect(page2Rows).toHaveLength(5);

      expect(screen.queryByText("INV-2026-015")).not.toBeInTheDocument();
      expect(screen.getByText("INV-2026-016")).toBeInTheDocument();
      expect(screen.getByText("INV-2026-020")).toBeInTheDocument();

      expect(prevBtn).toBeEnabled();
      expect(nextBtn).toBeDisabled();
    });

    it("wires Next and Previous controls with boundary disabling", () => {
      renderInvoices("/app/invoices");

      const nextBtn = screen.getByRole("button", { name: /next/i });
      const prevBtn = screen.getByRole("button", { name: /previous/i });

      fireEvent.click(nextBtn);

      expectShowingText("Showing 16 to 20 of 20 invoices");
      expect(screen.queryByText("INV-2026-015")).not.toBeInTheDocument();
      expect(screen.getByText("INV-2026-016")).toBeInTheDocument();
      expect(screen.getByText("INV-2026-020")).toBeInTheDocument();

      expect(nextBtn).toBeDisabled();
      expect(prevBtn).toBeEnabled();

      fireEvent.click(prevBtn);
      expectShowingText("Showing 1 to 15 of 20 invoices");
      expect(prevBtn).toBeDisabled();
      expect(nextBtn).toBeEnabled();
    });

    it("resets to page 1 when search or status filters change", () => {
      renderInvoices("/app/invoices");

      const nextBtn = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextBtn);
      expectShowingText("Showing 16 to 20 of 20 invoices");

      const searchInput = screen.getByPlaceholderText(/search invoice number/i);
      fireEvent.change(searchInput, { target: { value: "Customer A" } });

      expectShowingText("Showing 1 to 4 of 4 invoices");
    });

    it("handles zero results gracefully without invalid page indexes", () => {
      mocks.invoices = [];
      renderInvoices("/app/invoices");

      expect(screen.getByText(/No invoices created yet/i)).toBeInTheDocument();
      expect(screen.queryByText(/Showing/i)).not.toBeInTheDocument();
    });
  });

  describe("3. CSV Export", () => {
    it("calls downloadCsv for filtered result set when header Export is clicked", () => {
      const downloadSpy = vi.spyOn(csvExportModule, "downloadCsv").mockImplementation(() => {});
      renderInvoices("/app/invoices?status=Draft");

      const exportButtons = screen.getAllByRole("button", { name: /^Export$/i });
      fireEvent.click(exportButtons[0]);

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const [csvContent, filename] = downloadSpy.mock.calls[0];
      expect(filename).toMatch(/^invoices-draft-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(csvContent).toContain("Invoice Number,Customer Name");
      expect(csvContent).toContain("INV-2026-001");
    });

    it("calls downloadCsv for selected items when bulk Export is clicked", async () => {
      const downloadSpy = vi.spyOn(csvExportModule, "downloadCsv").mockImplementation(() => {});
      renderInvoices("/app/invoices");

      const firstRowCheckbox = screen.getByLabelText("Select INV-2026-001");
      fireEvent.click(firstRowCheckbox);

      const exportButtons = screen.getAllByRole("button", { name: /^Export$/i });
      expect(exportButtons.length).toBe(2);
      fireEvent.click(exportButtons[1]);

      expect(downloadSpy).toHaveBeenCalledTimes(1);
      const [csvContent, filename] = downloadSpy.mock.calls[0];
      expect(filename).toMatch(/^selected-invoices-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(csvContent).toContain("INV-2026-001");
    });
  });

  describe("4. Supported print, edit, duplicate, pdf, and compliance actions", () => {
    it("triggers window.print when bulk print is clicked", async () => {
      renderInvoices("/app/invoices");

      const firstRowCheckbox = screen.getByLabelText("Select INV-2026-001");
      fireEvent.click(firstRowCheckbox);

      const printBtn = screen.getByRole("button", { name: /Print/i });
      fireEvent.click(printBtn);

      await waitFor(() => {
        expect(window.print).toHaveBeenCalledTimes(1);
      });
    });

    it("enables Mark as Draft only for pre-submission statuses and prompts for confirmation", async () => {
      mocks.updateStatusMutateAsync.mockResolvedValue({});
      renderInvoices("/app/invoices");

      // INV-2026-002 has status "In Review" -> eligible for Mark as Draft
      openRowActions("INV-2026-002");

      const markDraftItem = await screen.findByRole("menuitem", { name: /Mark as Draft/i });
      expect(markDraftItem).not.toHaveAttribute("aria-disabled", "true");

      fireEvent.click(markDraftItem);

      const confirmDialog = await screen.findByRole("alertdialog");
      expect(confirmDialog).toBeInTheDocument();
      expect(screen.getByText(/Mark INV-2026-002 as Draft\?/i)).toBeInTheDocument();

      const confirmBtn = within(confirmDialog).getByRole("button", { name: /Mark as Draft/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mocks.updateStatusMutateAsync).toHaveBeenCalledWith({
          id: "inv-2",
          status: "Draft",
        });
      });
    });

    it("disables Mark as Draft for invoices that are already Draft or post-submission", async () => {
      renderInvoices("/app/invoices");

      // INV-2026-001 has status "Draft" -> ineligible
      openRowActions("INV-2026-001");

      const markDraftItem = await screen.findByRole("menuitem", { name: /Mark as Draft/i });
      expect(markDraftItem).toHaveAttribute("aria-disabled", "true");
    });

    it("enables Edit for editable draft invoices and links to edit route", async () => {
      renderInvoices("/app/invoices");

      openRowActions("INV-2026-001");

      const editItem = await screen.findByRole("menuitem", { name: /^Edit$/i });
      expect(editItem).not.toHaveAttribute("aria-disabled", "true");
      expect(editItem.closest("a")).toHaveAttribute("href", "/app/invoices/inv-1/edit");
    });

    it("disables Edit for protected post-submission compliance invoices", async () => {
      renderInvoices("/app/invoices");

      // INV-2026-005 has status "Submitted" -> protected
      openRowActions("INV-2026-005");

      const editItem = await screen.findByRole("menuitem", { name: /^Edit$/i });
      expect(editItem).toHaveAttribute("aria-disabled", "true");
      expect(editItem).toHaveAttribute(
        "title",
        "Protected compliance stage. Invoices that have entered external verification cannot be edited.",
      );
    });

    it("enables Duplicate and links to new draft with duplicate query parameter", async () => {
      renderInvoices("/app/invoices");

      openRowActions("INV-2026-001");

      const duplicateItem = await screen.findByRole("menuitem", { name: /^Duplicate$/i });
      expect(duplicateItem).not.toHaveAttribute("aria-disabled", "true");
      expect(duplicateItem.closest("a")).toHaveAttribute("href", "/app/invoices/new?duplicate=inv-1");
    });

    it("triggers Download PDF for row action", async () => {
      const { downloadInvoicePdf } = await import("@/lib/pdfExport");
      renderInvoices("/app/invoices");

      openRowActions("INV-2026-001");

      const pdfItem = await screen.findByRole("menuitem", { name: /^Download PDF$/i });
      fireEvent.click(pdfItem);

      await waitFor(() => {
        expect(downloadInvoicePdf).toHaveBeenCalled();
      });
    });

    it("triggers window.print when single row print is clicked", async () => {
      renderInvoices("/app/invoices");

      openRowActions("INV-2026-001");

      const printItem = await screen.findByRole("menuitem", { name: /^Print$/i });
      fireEvent.click(printItem);

      await waitFor(() => {
        expect(window.print).toHaveBeenCalled();
      });
    });

    it("keeps Void invoice safely disabled with informative title explaining FIRS requirements", async () => {
      renderInvoices("/app/invoices");

      openRowActions("INV-2026-001");

      const voidItem = await screen.findByRole("menuitem", { name: /^Void invoice$/i });
      expect(voidItem).toHaveAttribute("aria-disabled", "true");
      expect(voidItem).toHaveAttribute(
        "title",
        "Voiding is unsupported by the current status model. FIRS compliance requires Credit Note (381) issuance or cancellation submission to NRS.",
      );
    });
  });
});
