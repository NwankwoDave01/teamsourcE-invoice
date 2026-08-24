/**
 * RSA encryption compatible with the documented NRS QR generation step:
 *
 *   openssl pkeyutl -encrypt -pubin -inkey public_key.pem -in payload.json -out out.bin
 *
 * `openssl pkeyutl -encrypt` defaults to RSAES-PKCS1-v1_5 padding (RFC 8017
 * section 7.2.1). Web Crypto does not expose PKCS#1 v1.5 *encryption* (only
 * signing), so the primitive is implemented here with BigInt arithmetic.
 *
 * This module is intentionally standalone and swappable: it has no Deno or
 * Node dependency (only `globalThis.crypto.getRandomValues`) and exposes a
 * single `encryptRsaPkcs1v15` entry point. Replace this file to switch to a
 * different padding/algorithm without touching the invoice flow.
 */

export interface RsaPublicKey {
  n: bigint;
  e: bigint;
  /** modulus size in bytes */
  k: number;
}

export class RsaError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "RsaError";
    this.code = code;
  }
}

// ---------------------------------------------------------------- base64 utils

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!clean) return new Uint8Array(0);
  const stripped = clean.replace(/=+$/, "");
  const out = new Uint8Array(Math.floor((stripped.length * 6) / 8));
  let buffer = 0;
  let bits = 0;
  let pos = 0;
  for (const ch of stripped) {
    const idx = B64_CHARS.indexOf(ch);
    if (idx < 0) throw new RsaError("BASE64_INVALID", "Invalid base64 input.");
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[pos++] = (buffer >> bits) & 0xff;
    }
  }
  return out.subarray(0, pos);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64_CHARS[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64_CHARS[b2 & 0x3f];
  }
  return out;
}

export function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

// ------------------------------------------------------------------ DER / PEM

function stripPem(pem: string): string | null {
  const match = /-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/.exec(pem);
  return match ? match[1].replace(/\s+/g, "") : null;
}

interface DerNode {
  tag: number;
  value: Uint8Array;
  end: number;
}

function readDer(bytes: Uint8Array, offset: number): DerNode {
  if (offset >= bytes.length) throw new RsaError("DER_TRUNCATED", "Malformed public key encoding.");
  const tag = bytes[offset];
  let cursor = offset + 1;
  let length = bytes[cursor++];
  if (length & 0x80) {
    const count = length & 0x7f;
    if (count === 0 || count > 4) throw new RsaError("DER_LENGTH", "Unsupported public key encoding.");
    length = 0;
    for (let i = 0; i < count; i++) length = (length << 8) | bytes[cursor++];
  }
  const end = cursor + length;
  if (end > bytes.length) throw new RsaError("DER_TRUNCATED", "Malformed public key encoding.");
  return { tag, value: bytes.subarray(cursor, end), end };
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return value;
}

function bigIntToBytes(value: bigint, size: number): Uint8Array {
  const out = new Uint8Array(size);
  let v = value;
  for (let i = size - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new RsaError("INT_OVERFLOW", "Encrypted value does not fit the modulus size.");
  return out;
}

function parseRsaPublicKeyDer(der: Uint8Array): RsaPublicKey {
  const outer = readDer(der, 0);
  if (outer.tag !== 0x30) throw new RsaError("KEY_INVALID", "Public key is not a DER sequence.");

  // Try PKCS#1 RSAPublicKey ::= SEQUENCE { modulus INTEGER, exponent INTEGER }
  const first = readDer(outer.value, 0);
  if (first.tag === 0x02) {
    const second = readDer(outer.value, first.end);
    if (second.tag !== 0x02) throw new RsaError("KEY_INVALID", "Public key exponent is missing.");
    const n = bytesToBigInt(first.value);
    return { n, e: bytesToBigInt(second.value), k: Math.ceil(n.toString(16).length / 2) };
  }

  // Otherwise SubjectPublicKeyInfo ::= SEQUENCE { AlgorithmIdentifier, BIT STRING }
  if (first.tag !== 0x30) throw new RsaError("KEY_INVALID", "Unsupported public key structure.");
  const bitString = readDer(outer.value, first.end);
  if (bitString.tag !== 0x03) throw new RsaError("KEY_INVALID", "Public key bit string is missing.");
  // first byte of a BIT STRING is the number of unused bits
  return parseRsaPublicKeyDer(bitString.value.subarray(1));
}

/**
 * Accepts, in order of preference:
 *  - a PEM public key
 *  - base64 of a PEM public key (how the NRS portal ships `public_key`)
 *  - base64 DER (SPKI or PKCS#1)
 */
export function parsePublicKey(input: string): RsaPublicKey {
  const raw = (input ?? "").trim();
  if (!raw) throw new RsaError("KEY_MISSING", "Taxpayer public key is not configured.");

  const direct = stripPem(raw);
  if (direct) return parseRsaPublicKeyDer(base64ToBytes(direct));

  let decodedText = "";
  try {
    decodedText = new TextDecoder().decode(base64ToBytes(raw));
  } catch {
    decodedText = "";
  }
  const nested = decodedText ? stripPem(decodedText) : null;
  if (nested) return parseRsaPublicKeyDer(base64ToBytes(nested));

  return parseRsaPublicKeyDer(base64ToBytes(raw));
}

// ----------------------------------------------------------------- primitives

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % modulus;
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

/** EME-PKCS1-v1_5 encoding: 0x00 || 0x02 || PS (non-zero) || 0x00 || M */
export function padPkcs1v15(message: Uint8Array, k: number): Uint8Array {
  if (k < 12) throw new RsaError("KEY_TOO_SMALL", "RSA modulus is too small.");
  if (message.length > k - 11) {
    throw new RsaError(
      "MESSAGE_TOO_LONG",
      `Payload is ${message.length} bytes; PKCS#1 v1.5 allows at most ${k - 11} bytes for this key.`,
    );
  }
  const psLength = k - message.length - 3;
  const ps = new Uint8Array(psLength);
  const random = new Uint8Array(psLength);
  globalThis.crypto.getRandomValues(random);
  for (let i = 0; i < psLength; i++) {
    let byte = random[i];
    while (byte === 0) {
      const single = new Uint8Array(1);
      globalThis.crypto.getRandomValues(single);
      byte = single[0];
    }
    ps[i] = byte;
  }
  const out = new Uint8Array(k);
  out[0] = 0x00;
  out[1] = 0x02;
  out.set(ps, 2);
  out[2 + psLength] = 0x00;
  out.set(message, 3 + psLength);
  return out;
}

/** Raw PKCS#1 v1.5 RSA encryption. Returns the ciphertext bytes (length = k). */
export function encryptRsaPkcs1v15Bytes(message: Uint8Array, key: RsaPublicKey): Uint8Array {
  const padded = padPkcs1v15(message, key.k);
  const cipher = modPow(bytesToBigInt(padded), key.e, key.n);
  return bigIntToBytes(cipher, key.k);
}

/**
 * Encrypt a UTF-8 string with a taxpayer public key and return base64 —
 * byte-for-byte equivalent to `openssl pkeyutl -encrypt | base64`.
 */
export function encryptRsaPkcs1v15(plaintext: string, publicKey: string): string {
  const key = parsePublicKey(publicKey);
  return bytesToBase64(encryptRsaPkcs1v15Bytes(utf8ToBytes(plaintext), key));
}
