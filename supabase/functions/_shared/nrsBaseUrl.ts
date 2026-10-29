const approvedOrigins: Record<"sandbox" | "production", string> = {
  sandbox: "https://eivc-k6z6d.ondigitalocean.app",
  production: "https://einvoice.nrs.gov.ng",
};

export function resolveNrsBaseUrl(value: unknown, environment: string): string | null {
  if (typeof value !== "string") return null;
  const expectedOrigin = environment === "sandbox"
    ? approvedOrigins.sandbox
    : environment === "production"
    ? approvedOrigins.production
    : null;
  if (!expectedOrigin) return null;

  try {
    const url = new URL(value.trim());
    if (
      url.origin !== expectedOrigin ||
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.pathname !== "/" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return null;
    }

    return expectedOrigin;
  } catch {
    return null;
  }
}
