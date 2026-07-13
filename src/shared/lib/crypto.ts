import { base64ToBytes, bytesToBase64 } from './encoding';
import { AppError } from './errors';

// Cifrado simétrico AES-256-GCM usando WebCrypto (disponible nativamente en
// Cloudflare Workers). Se usa para proteger los tokens OAuth de Garmin antes
// de guardarlos en KV. El IV (12 bytes) se antepone al ciphertext.

const IV_BYTES = 12;
const KEY_BYTES = 32;

async function importAesKey(keyBase64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(keyBase64);
  if (raw.byteLength !== KEY_BYTES) {
    throw new AppError(
      'TOKEN_ENCRYPTION_KEY debe decodificar a exactamente 32 bytes (base64).',
      500,
      'crypto_misconfigured',
    );
  }
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptString(plaintext: string, keyBase64: string): Promise<string> {
  const key = await importAesKey(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  );

  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return bytesToBase64(combined);
}

export async function decryptString(payload: string, keyBase64: string): Promise<string> {
  const key = await importAesKey(keyBase64);
  const combined = base64ToBytes(payload);
  const iv = combined.slice(0, IV_BYTES);
  const ciphertext = combined.slice(IV_BYTES);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

export async function encryptJson<T>(value: T, keyBase64: string): Promise<string> {
  return encryptString(JSON.stringify(value), keyBase64);
}

export async function decryptJson<T>(payload: string, keyBase64: string): Promise<T> {
  return JSON.parse(await decryptString(payload, keyBase64)) as T;
}
