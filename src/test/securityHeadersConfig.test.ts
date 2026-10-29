import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
) as {
  headers: Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;
  rewrites: Array<{ source: string; destination: string }>;
};

describe("Vercel browser security headers", () => {
  it("denies framing without imposing a broader content security policy", () => {
    const headers = config.headers.find(({ source }) => source === "/(.*)")?.headers ?? [];
    const csp = headers.find(({ key }) => key === "Content-Security-Policy")?.value;

    expect(headers.find(({ key }) => key === "X-Frame-Options")?.value).toBe("DENY");
    expect(csp).toBe("frame-ancestors 'none'");
    expect(headers.some(({ key }) => key === "Content-Security-Policy-Report-Only")).toBe(false);
  });

  it("applies baseline browser protections and preserves SPA routing", () => {
    const headers = config.headers.find(({ source }) => source === "/(.*)")?.headers ?? [];
    const header = (name: string) => headers.find(({ key }) => key === name)?.value;

    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(config.rewrites).toEqual([{ source: "/(.*)", destination: "/" }]);
  });
});
