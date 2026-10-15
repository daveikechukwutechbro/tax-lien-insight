import bcrypt from "bcryptjs";

// Password hashing uses the runtime's native Web Crypto PBKDF2 rather than a
// pure-JS bcrypt. bcryptjs burned hundreds of ms of JS CPU per login, which
// intermittently tripped the Workers CPU limit (Cloudflare error 1102). Native
// PBKDF2 is effectively free CPU-wise. Legacy bcrypt hashes still verify and
// are transparently upgraded to PBKDF2 on the next successful login.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_BITS = 256;
const PBKDF2_PREFIX = "pbkdf2-sha256";

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(plain: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    PBKDF2_KEY_BITS,
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derive(plain, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

async function verifyPbkdf2(plain: string, hash: string): Promise<boolean> {
  const [, iterStr, saltB64, hashB64] = hash.split("$");
  const iterations = Number(iterStr);
  if (!iterations || !saltB64 || !hashB64) return false;
  const derived = await derive(plain, fromBase64(saltB64), iterations);
  return timingSafeEqual(derived, fromBase64(hashB64));
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (hash.startsWith(`${PBKDF2_PREFIX}$`)) return verifyPbkdf2(plain, hash);
  // Legacy bcrypt hash.
  return bcrypt.compare(plain, hash);
}

/**
 * Verify a password and, when the stored hash is not the current PBKDF2 format
 * (legacy bcrypt) or uses a different iteration count, return a replacement
 * hash to persist — so accounts migrate transparently on next login.
 */
export async function verifyPasswordWithUpgrade(
  plain: string,
  hash: string,
): Promise<{ valid: boolean; upgradedHash?: string }> {
  if (hash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const valid = await verifyPbkdf2(plain, hash);
    if (!valid) return { valid: false };
    const iterations = Number(hash.split("$")[1]);
    if (iterations === PBKDF2_ITERATIONS) return { valid: true };
    return { valid: true, upgradedHash: await hashPassword(plain) };
  }
  const valid = await bcrypt.compare(plain, hash);
  if (!valid) return { valid: false };
  return { valid: true, upgradedHash: await hashPassword(plain) };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}
