import { describe, expect, it } from "vitest";
import { resolveNrsBaseUrl } from "../../supabase/functions/_shared/nrsBaseUrl";

describe("NRS outbound base URL validation", () => {
  it.each([
    ["sandbox", "https://eivc-k6z6d.ondigitalocean.app", "https://eivc-k6z6d.ondigitalocean.app"],
    ["sandbox", "https://eivc-k6z6d.ondigitalocean.app/", "https://eivc-k6z6d.ondigitalocean.app"],
    ["production", "https://einvoice.nrs.gov.ng", "https://einvoice.nrs.gov.ng"],
  ])("accepts the approved %s origin", (environment, value, expected) => {
    expect(resolveNrsBaseUrl(value, environment)).toBe(expected);
  });

  it.each([
    ["http://einvoice.nrs.gov.ng", "production"],
    ["https://einvoice.nrs.gov.ng.attacker.example", "production"],
    ["https://attacker.example", "production"],
    ["https://user:password@einvoice.nrs.gov.ng", "production"],
    ["https://einvoice.nrs.gov.ng:8443", "production"],
    ["https://einvoice.nrs.gov.ng/path", "production"],
    ["https://einvoice.nrs.gov.ng/?target=internal", "production"],
    ["https://127.0.0.1", "production"],
    ["http://[::1]", "sandbox"],
    ["", "sandbox"],
    [null, "sandbox"],
    ["https://eivc-k6z6d.ondigitalocean.app", "production"],
    ["https://einvoice.nrs.gov.ng", "unknown"],
  ])("rejects an unapproved destination %s", (value, environment) => {
    expect(resolveNrsBaseUrl(value, environment)).toBeNull();
  });
});
