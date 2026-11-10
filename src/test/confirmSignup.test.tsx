import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmSignup from "@/pages/auth/ConfirmSignup";

const mocks = vi.hoisted(() => ({ confirmSignup: vi.fn(), refreshSession: vi.fn(), loadActiveMembership: vi.fn() }));
vi.mock("@/lib/authSession", () => ({ confirmSignup: mocks.confirmSignup }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ refreshSession: mocks.refreshSession }) }));
vi.mock("@/lib/tenantAdmin", () => ({ loadActiveMembership: mocks.loadActiveMembership }));

beforeEach(() => {
  mocks.confirmSignup.mockReset().mockResolvedValue({ id: "user-a" });
  mocks.refreshSession.mockReset().mockResolvedValue({ id: "user-a" });
  mocks.loadActiveMembership.mockReset().mockResolvedValue({ companyId: "company-a" });
});
afterEach(cleanup);

function open(path = "/auth/confirm?token_hash=test-token&type=email") {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/auth/confirm" element={<ConfirmSignup />} />
    <Route path="/app/dashboard" element={<div>Verified workspace</div>} />
  </Routes></MemoryRouter>);
}

describe("manual signup confirmation", () => {
  it("never consumes tokens on page load; confirms once after a person clicks", async () => {
    open();
    expect(mocks.confirmSignup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));
    await screen.findByText("Verified workspace");
    expect(mocks.confirmSignup).toHaveBeenCalledExactlyOnceWith("test-token");
    expect(mocks.refreshSession).toHaveBeenCalledWith(true);
    expect(mocks.loadActiveMembership).toHaveBeenCalledWith("user-a");
  });
  it("does not enter a workspace without confirmed active membership", async () => {
    mocks.loadActiveMembership.mockResolvedValueOnce({ companyId: null });
    open();
    fireEvent.click(screen.getByRole("button", { name: "Confirm email" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Active workspace access could not be confirmed"));
    expect(screen.queryByText("Verified workspace")).not.toBeInTheDocument();
  });
  it("does not verify invitation tokens through the signup page", () => {
    open("/auth/confirm?token_hash=test-token&type=invite");
    expect(screen.queryByRole("button", { name: "Confirm email" })).not.toBeInTheDocument();
    expect(mocks.confirmSignup).not.toHaveBeenCalled();
  });
});