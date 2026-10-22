import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateInvoice from "@/pages/tenant/CreateInvoice";

window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.setPointerCapture = () => {};
window.HTMLElement.prototype.releasePointerCapture = () => {};
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const invoiceMocks = vi.hoisted(() => ({
  sourceInvoice: null as Record<string, unknown> | null,
  createMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
}));

vi.mock("@/hooks/useCompanyData", () => ({
  useCustomers: () => ({ data: [{ id: "customer-1", name: "Customer One" }] }),
  useProducts: () => ({ data: [] }),
  useInvoices: () => ({ data: [] }),
  useInvoice: () => ({ data: invoiceMocks.sourceInvoice, isLoading: false }),
  useCreateInvoice: () => ({ mutateAsync: invoiceMocks.createMutateAsync, isPending: false }),
  useUpdateInvoice: () => ({ mutateAsync: invoiceMocks.updateMutateAsync, isPending: false }),
}));

vi.mock("@/hooks/useNrsMasterData", () => ({
  useNrsMasterData: (resourceType: string) => ({
    data: resourceType === "invoice-types"
      ? [
          { code: "380", label: "Commercial Invoice", metadata: null },
          { code: "381", label: "Credit Note", metadata: null },
          { code: "384", label: "Debit Note", metadata: null },
          { code: "393", label: "Self-billed Credit Note", metadata: null },
          { code: "390", label: "Proforma Invoice", metadata: null },
          { code: "325", label: "Proforma Invoice", metadata: null },
        ]
      : resourceType === "currencies"
        ? [{ code: "NGN", label: "NGN — Nigerian Naira" }]
        : [],
  }),
}));

let queryClient: QueryClient;

function renderInvoice(path: string) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/invoices/new" element={<CreateInvoice />} />
          <Route path="/app/invoices/:id/edit" element={<CreateInvoice mode="edit" />} />
          <Route path="*" element={<div />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function saveDraft(editing = false) {
  const description = screen.getByPlaceholderText("Description of goods or services *");
  fireEvent.change(description, { target: { value: "Test line item" } });
  fireEvent.click(screen.getAllByRole("button", { name: editing ? "Save changes" : "Save draft" })[0]);
  await waitFor(() => {
    expect(editing ? invoiceMocks.updateMutateAsync : invoiceMocks.createMutateAsync).toHaveBeenCalled();
  });
}

const sourceInvoice = (invoiceType: string) => ({
  id: "source-invoice",
  number: "INV-2026-00001",
  customer_id: "customer-1",
  customer_name: "Customer One",
  issue_date: "2026-10-01",
  due_date: "2026-10-31",
  invoice_type: invoiceType,
  transaction_type: "B2B",
  supply_date: null,
  payment_means_code: null,
  currency: "NGN",
  lines: [{
    id: "line-1",
    product_id: null,
    description: "Existing line item",
    qty: 1,
    unit_price: 100,
    tax_rate: 0,
    unit_code: "EA",
    tax_category: "S",
    discount_amount: 0,
  }],
});

beforeEach(() => {
  invoiceMocks.sourceInvoice = null;
  invoiceMocks.createMutateAsync.mockReset().mockResolvedValue({ id: "new-invoice" });
  invoiceMocks.updateMutateAsync.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  queryClient?.clear();
});

describe("invoice type selection and persistence", () => {
  it("defaults new invoices to the displayed Commercial Invoice code 381", async () => {
    renderInvoice("/app/invoices/new");

    await waitFor(() => expect(screen.getByText("Commercial Invoice")).toBeInTheDocument());
    expect(screen.getByText("Invoice type").parentElement?.querySelector("[role=combobox]"))
      .toHaveTextContent("Commercial Invoice");

    await saveDraft();

    expect(invoiceMocks.createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_type: "381" }),
    );
  });

  it("saves the displayed Credit Note as NRS code 380", async () => {
    renderInvoice("/app/invoices/new");

    const trigger = screen.getByText("Invoice type").parentElement?.querySelector("[role=combobox]");
    expect(trigger).not.toBeNull();
    fireEvent.keyDown(trigger!, { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "Credit Note" }));

    await saveDraft();

    expect(invoiceMocks.createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_type: "380" }),
    );
  });

  it("does not offer unsupported legacy catalogue code 325", async () => {
    renderInvoice("/app/invoices/new");

    const trigger = screen.getByText("Invoice type").parentElement?.querySelector("[role=combobox]");
    expect(trigger).not.toBeNull();
    fireEvent.keyDown(trigger!, { key: "Enter" });

    const proformaOption = await screen.findByRole("option", { name: "Proforma Invoice" });
    expect(screen.getAllByRole("option", { name: "Proforma Invoice" })).toHaveLength(1);
    fireEvent.click(proformaOption);
    await saveDraft();

    expect(invoiceMocks.createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_type: "390" }),
    );
  });

  it.each(["380", "393"])("preserves existing numeric invoice type %s when editing and duplicating", async (invoiceType) => {
    invoiceMocks.sourceInvoice = sourceInvoice(invoiceType);
    renderInvoice("/app/invoices/source-invoice/edit");

    await saveDraft(true);

    expect(invoiceMocks.updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: "source-invoice", invoice_type: invoiceType }),
    );

    cleanup();
    invoiceMocks.createMutateAsync.mockClear();
    renderInvoice("/app/invoices/new?duplicate=source-invoice");

    await saveDraft();

    expect(invoiceMocks.createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ invoice_type: invoiceType }),
    );
  });
});
