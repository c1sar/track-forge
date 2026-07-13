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
const KV_NAMESPACE_NAME = 'APP_KV';
// Wrangler v4 usa el nombre del namespace como title (sin prefijo del worker).
const KV_LEGACY_TITLE = `garmin-cloud-${KV_NAMESPACE_NAME}`;

/** Ejecuta wrangler y devuelve stdout + stderr combinados. */
function wrangler(args, { allowFailure = false } = {}) {
  try {
    const stdout = execFileSync('pnpm', ['exec', 'wrangler', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output: stdout };
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    if (allowFailure) {
      return { ok: false, output, error };
    }
    if (output) process.stderr.write(output);
    throw error;
  }
}

/** Extrae JSON (array u objeto) del output de wrangler. */
function parseWranglerJson(output) {
  const start = output.indexOf('[');
  const objStart = output.indexOf('{');
  const from =
    start === -1 ? objStart : objStart === -1 ? start : Math.min(start, objStart);
  if (from === -1) return null;
  try {
    return JSON.parse(output.slice(from));
  } catch {
    return null;
  }
}

/** Extrae un id hex de 32 chars del snippet de config que imprime wrangler. */
function extractKvIdFromOutput(output) {
  const match =
    output.match(/id\s*=\s*"([a-f0-9]{32})"/i) ??
    output.match(/"id"\s*:\s*"([a-f0-9]{32})"/i);
  return match?.[1] ?? null;
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

function listKvNamespaces() {
  const { output } = wrangler(['kv', 'namespace', 'list']);
  return parseWranglerJson(output) ?? [];
}

/** Busca el namespace KV por title (soporta títulos legacy de wrangler antiguo). */
function findKvNamespace(list) {
  if (!Array.isArray(list)) return null;
  return (
    list.find((ns) => ns.title === KV_NAMESPACE_NAME) ??
    list.find((ns) => ns.title === KV_LEGACY_TITLE) ??
    list.find((ns) => ns.title?.endsWith(`-${KV_NAMESPACE_NAME}`))
  );
}

/** Devuelve el database_id de la D1 `garmin-cloud`, creándola si no existe. */
function ensureD1() {
  const listResult = wrangler(['d1', 'list', '--json']);
  const list = parseWranglerJson(listResult.output) ?? [];
  const existing = Array.isArray(list)
    ? list.find((db) => db.name === D1_DATABASE_NAME)
    : null;
  if (existing?.uuid) {
    console.log(`D1 "${D1_DATABASE_NAME}" ya existe (${existing.uuid}).`);
    return existing.uuid;
  }

  console.log(`Creando D1 "${D1_DATABASE_NAME}"...`);
  const createResult = wrangler(['d1', 'create', D1_DATABASE_NAME], { allowFailure: true });
  const created = parseWranglerJson(createResult.output);
  const uuid = created?.uuid ?? created?.d1_databases?.[0]?.database_id;
  if (uuid) {
    console.log(`D1 creada (${uuid}).`);
    return uuid;
  }

  const relist = parseWranglerJson(wrangler(['d1', 'list', '--json']).output) ?? [];
  const found = Array.isArray(relist)
    ? relist.find((db) => db.name === D1_DATABASE_NAME)
    : null;
  if (found?.uuid) {
    console.log(`D1 "${D1_DATABASE_NAME}" encontrada tras crear (${found.uuid}).`);
    return found.uuid;
  }

  console.error('No se pudo obtener el database_id de D1.');
  if (createResult.output) console.error(createResult.output);
  process.exit(1);
}

/** Devuelve el id del namespace KV, creándolo si no existe. */
function ensureKv() {
  const existing = findKvNamespace(listKvNamespaces());
  if (existing?.id) {
    console.log(`KV "${existing.title}" ya existe (${existing.id}).`);
    return existing.id;
  }

  console.log(`Creando KV "${KV_NAMESPACE_NAME}"...`);
  const createResult = wrangler(['kv', 'namespace', 'create', KV_NAMESPACE_NAME], {
    allowFailure: true,
  });

  const idFromOutput = extractKvIdFromOutput(createResult.output);
  if (idFromOutput) {
    console.log(`KV creado (${idFromOutput}).`);
    return idFromOutput;
  }

  const found = findKvNamespace(listKvNamespaces());
  if (found?.id) {
    console.log(`KV "${found.title}" encontrado tras crear (${found.id}).`);
    return found.id;
  }

  console.error('No se pudo obtener el id del namespace KV.');
  if (createResult.output) {
    console.error('Salida de wrangler kv namespace create:');
    console.error(createResult.output);
  }
  process.exit(1);
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
