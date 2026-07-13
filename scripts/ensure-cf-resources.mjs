#!/usr/bin/env node
/**
 * Asegura que los recursos de Cloudflare (D1 y KV) existen y parchea sus IDs
 * reales en wrangler.jsonc antes de un `wrangler deploy`.
 *
 * Pensado para correr en CI (GitHub Actions), donde wrangler.jsonc contiene
 * placeholders. Es idempotente: si el recurso ya existe, reutiliza su ID; si el
 * archivo ya tiene un ID real (sin placeholder), lo deja intacto.
 *
 * Requiere en el entorno:
 *   - CLOUDFLARE_API_TOKEN
 *   - CLOUDFLARE_ACCOUNT_ID
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WRANGLER_CONFIG = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url));

const D1_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';
const KV_PLACEHOLDER = '00000000000000000000000000000000';

const D1_DATABASE_NAME = 'garmin-cloud';
const KV_BINDING = 'APP_KV';
const WORKER_NAME = 'garmin-cloud';
// wrangler nombra el namespace como `<worker>-<binding>` al crearlo por binding.
const KV_TITLE = `${WORKER_NAME}-${KV_BINDING}`;

/** Ejecuta wrangler y devuelve stdout como string. */
function wrangler(args) {
  return execFileSync('pnpm', ['exec', 'wrangler', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

/** Ejecuta wrangler esperando JSON y lo parsea; devuelve null si no es JSON. */
function wranglerJson(args) {
  const out = wrangler(args);
  const start = out.indexOf('[');
  const objStart = out.indexOf('{');
  const from =
    start === -1 ? objStart : objStart === -1 ? start : Math.min(start, objStart);
  if (from === -1) return null;
  try {
    return JSON.parse(out.slice(from));
  } catch {
    return null;
  }
}

function assertEnv() {
  const missing = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'].filter(
    (key) => !process.env[key],
  );
  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(', ')}`);
    process.exit(1);
  }
}

/** Devuelve el database_id de la D1 `garmin-cloud`, creándola si no existe. */
function ensureD1() {
  const list = wranglerJson(['d1', 'list', '--json']) ?? [];
  const existing = Array.isArray(list)
    ? list.find((db) => db.name === D1_DATABASE_NAME)
    : null;
  if (existing?.uuid) {
    console.log(`D1 "${D1_DATABASE_NAME}" ya existe (${existing.uuid}).`);
    return existing.uuid;
  }

  console.log(`Creando D1 "${D1_DATABASE_NAME}"...`);
  const created = wranglerJson(['d1', 'create', D1_DATABASE_NAME]);
  const uuid = created?.uuid ?? created?.d1_databases?.[0]?.database_id;
  if (!uuid) {
    // Fallback: reconsultar la lista tras crear.
    const relist = wranglerJson(['d1', 'list', '--json']) ?? [];
    const found = Array.isArray(relist)
      ? relist.find((db) => db.name === D1_DATABASE_NAME)
      : null;
    if (found?.uuid) return found.uuid;
    console.error('No se pudo obtener el database_id de D1.');
    process.exit(1);
  }
  console.log(`D1 creada (${uuid}).`);
  return uuid;
}

/** Devuelve el id del namespace KV, creándolo si no existe. */
function ensureKv() {
  const list = wranglerJson(['kv', 'namespace', 'list']) ?? [];
  const existing = Array.isArray(list)
    ? list.find((ns) => ns.title === KV_TITLE)
    : null;
  if (existing?.id) {
    console.log(`KV "${KV_TITLE}" ya existe (${existing.id}).`);
    return existing.id;
  }

  console.log(`Creando KV "${KV_BINDING}"...`);
  const created = wranglerJson(['kv', 'namespace', 'create', KV_BINDING]);
  const id = created?.id;
  if (!id) {
    const relist = wranglerJson(['kv', 'namespace', 'list']) ?? [];
    const found = Array.isArray(relist)
      ? relist.find((ns) => ns.title === KV_TITLE)
      : null;
    if (found?.id) return found.id;
    console.error('No se pudo obtener el id del namespace KV.');
    process.exit(1);
  }
  console.log(`KV creado (${id}).`);
  return id;
}

/** Reemplaza el placeholder por el id real; deja el archivo intacto si ya es real. */
function patchConfig(d1Id, kvId) {
  let text = readFileSync(WRANGLER_CONFIG, 'utf8');

  if (text.includes(D1_PLACEHOLDER)) {
    text = text.replaceAll(D1_PLACEHOLDER, d1Id);
    console.log('wrangler.jsonc: database_id de D1 inyectado.');
  } else {
    console.log('wrangler.jsonc: sin placeholder de D1 (config ya real), se deja igual.');
  }

  if (text.includes(KV_PLACEHOLDER)) {
    text = text.replaceAll(KV_PLACEHOLDER, kvId);
    console.log('wrangler.jsonc: id de KV inyectado.');
  } else {
    console.log('wrangler.jsonc: sin placeholder de KV (config ya real), se deja igual.');
  }

  writeFileSync(WRANGLER_CONFIG, text);
}

function main() {
  assertEnv();
  const d1Id = ensureD1();
  const kvId = ensureKv();
  patchConfig(d1Id, kvId);
  console.log('Recursos de Cloudflare listos.');
}

main();
