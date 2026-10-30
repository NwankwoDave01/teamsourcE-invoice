import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("Vercel API Node ESM module resolution", () => {
  it("loads both API entrypoints with their shared helpers under Node ESM", () => {
    const projectRoot = process.cwd();
    const outputDirectory = mkdtempSync(join(projectRoot, ".vercel-api-esm-"));
    const tsc = resolve(projectRoot, "node_modules/typescript/bin/tsc");

    try {
      execFileSync(process.execPath, [
        tsc,
        "--target", "ES2022",
        "--module", "NodeNext",
        "--moduleResolution", "NodeNext",
        "--types", "node",
        "--skipLibCheck",
        "--outDir", outputDirectory,
        "api/auth/[action].ts",
        "api/supabase-proxy.ts",
      ], { cwd: projectRoot, stdio: "pipe" });

      expect(existsSync(join(outputDirectory, "_lib/session.js"))).toBe(true);

      const authEntrypoint = pathToFileURL(join(outputDirectory, "auth/[action].js")).href;
      const supabaseEntrypoint = pathToFileURL(join(outputDirectory, "supabase-proxy.js")).href;
      execFileSync(process.execPath, [
        "--input-type=module",
        "-e",
        `await import(${JSON.stringify(authEntrypoint)}); await import(${JSON.stringify(supabaseEntrypoint)});`,
      ], { cwd: projectRoot, stdio: "pipe" });
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  }, 30_000);
});
