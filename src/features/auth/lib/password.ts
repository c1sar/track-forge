import { base64ToBytes, bytesToBase64, timingSafeEqual } from '@/shared/lib/encoding';

// Hash de contraseñas con PBKDF2-SHA256 vía WebCrypto (soportado en Workers).
// Formato almacenado: pbkdf2$<iteraciones>$<salt_b64>$<hash_b64>

const ITERATIONS = 100_000;
const HASH_ALGO = 'SHA-256';
const KEY_LENGTH_BYTES = 32;
const SALT_BYTES = 16;

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: HASH_ALGO },
    keyMaterial,
    KEY_LENGTH_BYTES * 8,
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterations || !saltB64 || !hashB64) {
    return false;
  }

  const salt = base64ToBytes(saltB64);
  const expected = base64ToBytes(hashB64);
  const actual = await deriveBits(password, salt, Number(iterations));
  return timingSafeEqual(actual, expected);
}
