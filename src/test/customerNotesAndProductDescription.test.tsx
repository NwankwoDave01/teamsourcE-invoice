import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CustomerForm from "@/pages/tenant/customers/CustomerForm";
import ProductForm from "@/pages/tenant/products/ProductForm";
import CreateInvoice from "@/pages/tenant/CreateInvoice";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

const customerMocks = vi.hoisted(() => ({
  createMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
  existingCustomer: null as Record<string, unknown> | null,
}));

const productMocks = vi.hoisted(() => ({
  createMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
  existingProduct: null as Record<string, unknown> | null,
}));

const invoiceMocks = vi.hoisted(() => ({
  createMutateAsync: vi.fn(),
  products: [] as Record<string, unknown>[],
  customers: [] as Record<string, unknown>[],
}));

vi.mock("@/hooks/useCompanyData", () => ({
  useCustomer: () => ({ data: customerMocks.existingCustomer, isLoading: false }),
  useCreateCustomer: () => ({ mutateAsync: customerMocks.createMutateAsync, isPending: false }),
  useUpdateCustomer: () => ({ mutateAsync: customerMocks.updateMutateAsync, isPending: false }),
  useProduct: () => ({ data: productMocks.existingProduct, isLoading: false }),
  useCreateProduct: () => ({ mutateAsync: productMocks.createMutateAsync, isPending: false }),
  useUpdateProduct: () => ({ mutateAsync: productMocks.updateMutateAsync, isPending: false }),
  useInvoices: () => ({ data: [] }),
  useInvoice: () => ({ data: null, isLoading: false }),
  useCustomers: () => ({ data: invoiceMocks.customers }),
  useProducts: () => ({ data: invoiceMocks.products }),
  useCreateInvoice: () => ({ mutateAsync: invoiceMocks.createMutateAsync, isPending: false }),
  useUpdateInvoice: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useNrsMasterData", () => ({
  useNrsMasterData: () => ({ data: [] }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: "record-123" }),
  };
});

let queryClient: QueryClient;

function renderWithProviders(ui: React.ReactElement) {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  customerMocks.createMutateAsync.mockReset();
  customerMocks.updateMutateAsync.mockReset();
  customerMocks.existingCustomer = null;

  productMocks.createMutateAsync.mockReset();
  productMocks.updateMutateAsync.mockReset();
  productMocks.existingProduct = null;

  invoiceMocks.createMutateAsync.mockReset();
  invoiceMocks.products = [];
  invoiceMocks.customers = [];
});

afterEach(() => {
  cleanup();
  queryClient?.clear();
  vi.restoreAllMocks();
});

describe("CustomerForm internal notes persistence", () => {
  it("includes internal notes in create mutation payload", async () => {
    customerMocks.existingCustomer = null;
    renderWithProviders(<CustomerForm mode="create" />);

    fireEvent.change(screen.getByPlaceholderText("e.g. Adeola Ventures Ltd"), {
      target: { value: "Test Corp" },
    });
    fireEvent.change(screen.getByPlaceholderText("NG-XXXXXXXX"), {
      target: { value: "12345678-0001" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Payment preferences, key contacts, special arrangements…"),
      { target: { value: "Special VIP client - invoice NET 15" } }
    );

    const submitButtons = screen.getAllByRole("button", { name: "Create customer" });
    fireEvent.click(submitButtons[0]);

    await waitFor(() => {
      expect(customerMocks.createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Corp",
          tin: "12345678-0001",
          notes: "Special VIP client - invoice NET 15",
        })
      );
    });
  });

  it("loads existing internal notes and includes them in edit mutation", async () => {
    customerMocks.existingCustomer = {
      id: "record-123",
      name: "Acme Industries",
      tin: "99887766-0001",
      status: "Active",
      city: "Lagos",
      email: "billing@acme.ng",
      phone: "+2348000000000",
      buyer_type: "business",
      rc_number: "",
      address_line1: "12 Marina Street",
      address_line2: "",
      state: "Lagos",
      lga: "Lagos Island",
      postcode: "100001",
      country_code: "NG",
      notes: "Existing notes for Acme",
    };

    renderWithProviders(<CustomerForm mode="edit" />);

    const notesTextarea = await screen.findByDisplayValue("Existing notes for Acme");
    expect(notesTextarea).toBeInTheDocument();

    fireEvent.change(notesTextarea, {
      target: { value: "Updated notes for Acme" },
    });

    const saveButtons = screen.getAllByRole("button", { name: "Save changes" });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(customerMocks.updateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "record-123",
          name: "Acme Industries",
          notes: "Updated notes for Acme",
        })
      );
    });
  });
});

describe("ProductForm description persistence", () => {
  it("includes description in product create mutation payload", async () => {
    productMocks.existingProduct = null;
    renderWithProviders(<ProductForm mode="create" />);

    fireEvent.change(screen.getByPlaceholderText("e.g. Premium Parboiled Rice 50kg"), {
      target: { value: "Premium Cement" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. SF-RICE-50"), {
      target: { value: "CEM-001" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("A short description that appears under the item name on invoices…"),
      { target: { value: "High grade portland cement for commercial construction" } }
    );

    const submitButtons = screen.getAllByRole("button", { name: "Create product" });
    fireEvent.click(submitButtons[0]);

    await waitFor(() => {
      expect(productMocks.createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Premium Cement",
          sku: "CEM-001",
          description: "High grade portland cement for commercial construction",
        })
      );
    });
  });

  it("loads existing product description and includes it in edit mutation", async () => {
    productMocks.existingProduct = {
      id: "record-123",
      name: "Consulting Service",
      sku: "SVC-CON-01",
      category: "Services",
      description: "Strategic financial advisory",
      unit: "Hour",
      price: 150000,
      tax_rate: 7.5,
      active: true,
      unit_code: "EA",
      tax_category: "S",
      item_classification_code: "",
      hsn_code: "",
      product_category: "",
    };

    renderWithProviders(<ProductForm mode="edit" />);

    const descTextarea = await screen.findByDisplayValue("Strategic financial advisory");
    expect(descTextarea).toBeInTheDocument();

    fireEvent.change(descTextarea, {
      target: { value: "Updated advisory description" },
    });

    const saveButtons = screen.getAllByRole("button", { name: "Save changes" });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(productMocks.updateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "record-123",
          name: "Consulting Service",
          description: "Updated advisory description",
        })
      );
    });
  });
});

describe("CreateInvoice catalog product description adoption", () => {
  it("defaults line description to product.description when present", async () => {
    invoiceMocks.customers = [{ id: "cust-1", name: "Client A", tin: "11223344-0001" }];
    invoiceMocks.products = [
      {
        id: "prod-1",
        name: "Enterprise ERP License",
        sku: "ERP-ENT-01",
        description: "12-month cloud ERP license with premium SLA support",
        price: 500000,
        tax_rate: 7.5,
        unit_code: "EA",
        tax_category: "S",
      },
    ];

    renderWithProviders(<CreateInvoice />);

    // Click "Pick from catalog"
    const pickButtons = screen.getAllByText(/Pick from catalog/i);
    fireEvent.click(pickButtons[0]);

    // Select the product
    const option = await screen.findByText("Enterprise ERP License");
    fireEvent.click(option);

    // Line description should be set to product.description
    await waitFor(() => {
      expect(
        screen.getAllByDisplayValue("12-month cloud ERP license with premium SLA support")[0]
      ).toBeInTheDocument();
    });
  });

  it("falls back to product.name when product has no description", async () => {
    invoiceMocks.customers = [{ id: "cust-1", name: "Client A", tin: "11223344-0001" }];
    invoiceMocks.products = [
      {
        id: "prod-2",
        name: "Standard Keyboard",
        sku: "KB-STD-01",
        description: "",
        price: 15000,
        tax_rate: 7.5,
        unit_code: "EA",
        tax_category: "S",
      },
    ];

    renderWithProviders(<CreateInvoice />);

    const pickButtons = screen.getAllByText(/Pick from catalog/i);
    fireEvent.click(pickButtons[0]);

    const option = await screen.findByText("Standard Keyboard");
    fireEvent.click(option);

    // Line description should fall back to product.name
    await waitFor(() => {
      expect(screen.getAllByDisplayValue("Standard Keyboard")[0]).toBeInTheDocument();
    });
  });
});
