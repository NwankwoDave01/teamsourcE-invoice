/**
 * Parser for the taxpayer-specific `crypto_keys.txt` bundle downloaded from the
 * NRS portal. Expected content (JSON, may carry a BOM / stray whitespace):
 *
 *   { "public_key": "<base64 PEM>", "certificate": "<base64 string>" }
 *
 * Both values are required. Raw values are NEVER logged.
 */

export interface TaxpayerCryptoBundle {
  public_key: string;
  certificate: string;
}

export class CryptoKeysParseError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "CryptoKeysParseError";
    this.code = code;
  }
}

export function parseCryptoKeysFile(input: unknown): TaxpayerCryptoBundle {
  if (typeof input !== "string" || !input.trim()) {
    throw new CryptoKeysParseError("EMPTY", "The crypto keys file is empty.");
  }
  // Strip UTF-8 BOM and surrounding whitespace.
  const cleaned = input.replace(/^\uFEFF/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new CryptoKeysParseError(
      "INVALID_JSON",
      "The crypto keys file is not valid JSON. Paste the full contents of crypto_keys.txt.",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CryptoKeysParseError("INVALID_SHAPE", "The crypto keys file must contain a JSON object.");
  }

  const obj = parsed as Record<string, unknown>;
  const publicKey = typeof obj.public_key === "string" ? obj.public_key.trim() : "";
  const certificate = typeof obj.certificate === "string" ? obj.certificate.trim() : "";

  if (!publicKey) {
    throw new CryptoKeysParseError("PUBLIC_KEY_MISSING", "The crypto keys file is missing `public_key`.");
  }
  if (!certificate) {
    throw new CryptoKeysParseError("CERTIFICATE_MISSING", "The crypto keys file is missing `certificate`.");
  }
  return { public_key: publicKey, certificate };
}

/** Safe summary for UI / logs — never contains key material. */
export function describeCryptoBundle(bundle: TaxpayerCryptoBundle) {
  return {
    public_key_configured: bundle.public_key.length > 0,
    certificate_configured: bundle.certificate.length > 0,
  };
}
