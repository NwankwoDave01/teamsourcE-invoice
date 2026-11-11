import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, signInWithPassword, resendSignup } from "../lib/authSession";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authentication API response handling", () => {
  it("uses cookie-authenticated POST for resend and propagates unexpected failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Registration is temporarily unavailable." }), { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(resendSignup("user@example.com", "test-captcha")).rejects.toThrow("Registration is temporarily unavailable.");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/resend-signup", expect.objectContaining({ method: "POST", credentials: "same-origin", body: JSON.stringify({ email: "user@example.com", captchaToken: "test-captcha" }) }));
  });
  it("reports an empty API response with its HTTP status and endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
      status: 405,
      statusText: "Method Not Allowed",
    })));

    await expect(signInWithPassword("user@example.com", "password", "captcha-token"))
      .rejects.toThrow(
        "Authentication endpoint /api/auth/login returned an empty response (HTTP 405 Method Not Allowed). Check Vercel API routing.",
      );
  });

  it("reports non-JSON API responses with their status and content type", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Unavailable</html>", {
      status: 502,
      statusText: "Bad Gateway",
      headers: { "content-type": "text/html" },
    })));

    await expect(getCurrentUser())
      .rejects.toThrow(
        "Authentication endpoint /api/auth/session returned a non-JSON response (HTTP 502 Bad Gateway, text/html). Check Vercel API routing.",
      );
  });
});
