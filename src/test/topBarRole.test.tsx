import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "@/components/shell/TopBar";
import { SidebarProvider } from "@/components/ui/sidebar";

const mocks = vi.hoisted(() => ({
  user: {
    id: "user-1",
    email: "test@company.ng",
    user_metadata: { display_name: "Test User" },
  },
  roles: ["company_admin"] as string[],
  isSuperAdmin: false,
  signOut: vi.fn(),
  company: { id: "company-1", name: "Acme Nigeria Ltd", plan: "Starter", tin: "12345678-0001" },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
    roles: mocks.roles,
    isSuperAdmin: mocks.isSuperAdmin,
    signOut: mocks.signOut,
    loading: false,
    companyId: "company-1",
  }),
}));

vi.mock("@/hooks/useCompanyData", () => ({
  useCurrentCompany: () => ({
    data: mocks.company,
    isLoading: false,
  }),
}));

let queryClient: QueryClient;

function renderTopBar(variant: "tenant" | "admin" = "tenant") {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SidebarProvider>
          <TopBar variant={variant} />
        </SidebarProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mocks.roles = ["company_admin"];
  mocks.isSuperAdmin = false;
  mocks.signOut.mockReset();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  queryClient?.clear();
});

describe("TopBar dynamic role label", () => {
  it("displays 'Company Admin' for company admin users", () => {
    mocks.roles = ["company_admin"];
    renderTopBar("tenant");
    expect(screen.getByText("Company Admin")).toBeInTheDocument();
  });

  it("displays 'Finance Officer' for finance officer users", () => {
    mocks.roles = ["finance_officer"];
    renderTopBar("tenant");
    expect(screen.getByText("Finance Officer")).toBeInTheDocument();
  });

  it("displays 'Staff User' for staff users", () => {
    mocks.roles = ["staff_user"];
    renderTopBar("tenant");
    expect(screen.getByText("Staff User")).toBeInTheDocument();
  });

  it("displays 'Super Admin' when user is super admin", () => {
    mocks.isSuperAdmin = true;
    mocks.roles = ["super_admin"];
    renderTopBar("tenant");
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("displays 'Super Admin' when TopBar is rendered in admin variant", () => {
    mocks.roles = ["staff_user"];
    renderTopBar("admin");
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("preserves permission check: Super Admin console menu item only rendered for super admins", async () => {
    // Non-super-admin
    mocks.isSuperAdmin = false;
    mocks.roles = ["company_admin"];
    const { unmount } = renderTopBar("tenant");
    const trigger1 = screen.getByRole("button", { name: /Acme Nigeria Ltd/i });
    fireEvent.pointerDown(trigger1, { button: 0 });
    fireEvent.keyDown(trigger1, { key: "ArrowDown" });
    expect(screen.queryByText("Super Admin console")).not.toBeInTheDocument();
    unmount();

    // Super-admin
    mocks.isSuperAdmin = true;
    mocks.roles = ["super_admin"];
    renderTopBar("tenant");
    const trigger2 = screen.getByRole("button", { name: /Acme Nigeria Ltd/i });
    fireEvent.pointerDown(trigger2, { button: 0 });
    fireEvent.keyDown(trigger2, { key: "ArrowDown" });
    expect(await screen.findByText("Super Admin console")).toBeInTheDocument();
  });
});
