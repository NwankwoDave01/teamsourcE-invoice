import { describe, expect, it } from "vitest";
import { resolveQrImageSource } from "@/lib/nrs/qrDisplay";
import { submissionLabel } from "@/components/shared/SubmissionBadge";

describe("resolveQrImageSource", () => {
  it("returns a saved data:image URL unchanged (no double-prefixing)", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANS";
    expect(resolveQrImageSource(dataUrl, null)).toBe(dataUrl);
  });

  it("prefixes raw base64 PNG content", () => {
    expect(resolveQrImageSource("iVBORw0KGgoAAAANS", null)).toBe(
      "data:image/png;base64,iVBORw0KGgoAAAANS",
    );
  });

  it("falls back to qr_code_data only when it is itself an image", () => {
    expect(resolveQrImageSource(null, "data:image/png;base64,iVBORw0KGgo")).toBe(
      "data:image/png;base64,iVBORw0KGgo",
    );
    expect(resolveQrImageSource(null, "iVBORw0KGgo")).toBe("data:image/png;base64,iVBORw0KGgo");
  });

  it("does not render non-image qr_code_data payload text as an image", () => {
    expect(resolveQrImageSource(null, "https://nrs.example/verify/INV-1")).toBeNull();
    expect(resolveQrImageSource(null, "{\"irn\":\"x\"}")).toBeNull();
  });

  it("returns null when nothing usable is saved", () => {
    expect(resolveQrImageSource(null, null)).toBeNull();
    expect(resolveQrImageSource(undefined, "")).toBeNull();
  });
});

describe("submissionLabel", () => {
  it("maps signed to NRS signed", () => {
    expect(submissionLabel("signed")).toBe("NRS signed");
  });

  it("maps validated and rejected", () => {
    expect(submissionLabel("validated")).toBe("NRS validated");
    expect(submissionLabel("rejected")).toBe("NRS rejected");
  });

  it("reports unknown or missing status honestly", () => {
    expect(submissionLabel(null)).toBe("Status not recorded");
    expect(submissionLabel("mystery")).toBe("Status not recorded");
  });
});
