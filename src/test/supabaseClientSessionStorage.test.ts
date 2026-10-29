import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));

afterEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("browser Supabase client session storage", () => {
  it("disables browser session persistence and removes the legacy localStorage session", async () => {
    const legacyKey = "sb-nsfkeojunstyzueguzxx-auth-token";
    localStorage.setItem(legacyKey, "legacy-access-and-refresh-tokens");
    localStorage.setItem(`${legacyKey}-code-verifier`, "legacy-pkce-verifier");
    mocks.createClient.mockReset().mockReturnValue({});

    await import("@/integrations/supabase/client");

    expect(mocks.createClient).toHaveBeenCalledOnce();
    const [, , options] = mocks.createClient.mock.calls[0];
    expect(options.auth).toEqual({
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    });
    expect(options.auth.storage).toBeUndefined();
    expect(localStorage.getItem(legacyKey)).toBeNull();
    expect(localStorage.getItem(`${legacyKey}-code-verifier`)).toBeNull();
  });
});
