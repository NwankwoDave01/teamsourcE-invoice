// Resolves a displayable QR image source from persisted invoice fields.
// qr_code is the authoritative saved image (a data:image/... URL).
// qr_code_data is only used when it is itself an image (data:image URL or
// base64 with a PNG/JPEG magic prefix); otherwise it is payload text and must
// not be rendered as an image.

const BASE64_IMAGE_PREFIXES = ["iVBOR", "/9j/", "R0lGOD"]; // PNG, JPEG, GIF

function asImageSource(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.startsWith("data:image/")) return v;
  if (BASE64_IMAGE_PREFIXES.some((p) => v.startsWith(p))) {
    return `data:image/png;base64,${v}`;
  }
  return null;
}

export function resolveQrImageSource(
  qrCode: string | null | undefined,
  qrCodeData: string | null | undefined,
): string | null {
  return asImageSource(qrCode) ?? asImageSource(qrCodeData);
}
