import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Reports from "@/pages/tenant/Reports";
import * as csvExportModule from "@/lib/csvExport";

const mocks = vi.hoisted(() => ({
  invoices: [
    {
      customer_name: "=2+2, Acme",
      issue_date: "2026-10-15",
      status: "Confirmed",
      total: 120,
      subtotal: 100,
      tax: 7.5,
    },
    {
      customer_name: "Regular Customer",
      issue_date: "2026-10-16",
      status: "Draft",
      total: 80,
      subtotal: 80,
      tax: 6,
    },
  ],
}));

vi.mock("@/hooks/useCompanyData", () => ({
  useInvoices: () => ({ data: mocks.invoices, isLoading: false }),
}));

describe("Reports export", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("downloads the displayed report data with formula-like customer values neutralised", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));
    const downloadSpy = vi.spyOn(csvExportModule, "downloadCsv").mockImplementation(() => {});
    render(<Reports />);

    fireEvent.click(screen.getByRole("button", { name: /^Export$/i }));

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    const [csvContent, filename] = downloadSpy.mock.calls[0];
    expect(filename).toBe("reports-2026-10-29.csv");
    expect(csvContent).toContain('"\'=2+2, Acme"');
    expect(csvContent).toContain("Revenue trend,Confirmed/Signed revenue,Oct 2026,120,NGN");
    expect(csvContent).toContain("Status mix,Confirmed,All invoices,50,%");
    expect(csvContent).toContain("Tax summary,Taxable sales,Oct 2026,180,NGN");
  });
});
