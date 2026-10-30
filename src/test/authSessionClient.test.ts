import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser, signInWithPassword } from "../lib/authSession";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authentication API response handling", () => {
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
