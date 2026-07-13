# Despliegue en Cloudflare

## Requisitos previos

- Cuenta de Cloudflare y `wrangler` autenticado (`pnpm exec wrangler login`).
- Node.js >= 22.12 y pnpm >= 10.

## 1. Crear los recursos

```bash
# Base de datos D1
pnpm exec wrangler d1 create garmin-cloud

# Namespace KV
pnpm exec wrangler kv namespace create APP_KV
```

Copia el `database_id` y el `id` de KV que devuelven los comandos a [wrangler.jsonc](../wrangler.jsonc), reemplazando los placeholders:

```jsonc
"d1_databases": [
  { "binding": "DB", "database_name": "garmin-cloud", "database_id": "<ID_REAL>", "migrations_dir": "migrations" }
],
"kv_namespaces": [
  { "binding": "APP_KV", "id": "<ID_REAL>" }
]
```

## 2. Aplicar migraciones

```bash
# Local (desarrollo)
pnpm run db:migrate:local

# Producción
pnpm run db:migrate:remote
```

## 3. Configurar secretos

```bash
# Clave de cifrado de tokens (32 bytes base64)
node -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))" \
  | pnpm exec wrangler secret put TOKEN_ENCRYPTION_KEY

# Secreto de sesión
pnpm exec wrangler secret put SESSION_SECRET
```

En local, en su lugar copia `.dev.vars.example` a `.dev.vars` y rellena los valores.

## 4. Desarrollo local

```bash
pnpm run preview:worker
```

`wrangler dev` levanta el runtime real de Workers con D1 y KV locales (en `.wrangler/state`).

## 5. Desplegar

```bash
pnpm run deploy
```

Esto ejecuta `astro build` y `wrangler deploy`. El adaptador genera la configuración del Worker fusionando los bindings de `wrangler.jsonc`.

## Verificación post-deploy

1. Regístrate en `/register`.
2. Vincula Garmin en `/connect` (introduce el código MFA si se solicita).
3. Comprueba el dashboard y descarga un CSV.

## Despliegue con GitHub Actions (CI/CD)

El workflow [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) despliega automáticamente en cada `push` a `main` (y bajo demanda con "Run workflow"). El pipeline:

1. Instala dependencias (`pnpm install --frozen-lockfile`).
2. Valida calidad: `pnpm run check` (Biome) y `pnpm exec astro check` (tipos).
3. Provisiona recursos: [scripts/ensure-cf-resources.mjs](../scripts/ensure-cf-resources.mjs) crea la D1 y el namespace KV si no existen e inyecta sus IDs reales en `wrangler.jsonc` (reemplazando los placeholders solo dentro del runner).
4. Aplica migraciones D1 remotas.
5. `build` + `wrangler deploy`.
6. Sube los secretos de runtime a Cloudflare desde GitHub Secrets.

> El deploy va antes de subir los secretos porque `wrangler secret put` requiere que el Worker ya exista. En el primerísimo deploy hay una ventana breve sin secretos en runtime.

### Secretos y variables en GitHub

Configúralos en el repo: **Settings -> Secrets and variables -> Actions -> New repository secret**.

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `CLOUDFLARE_API_TOKEN` | Secret | Token de API de Cloudflare (permisos abajo) |
| `CLOUDFLARE_ACCOUNT_ID` | Secret o Variable | Account ID (dashboard de Cloudflare, panel derecho) |
| `TOKEN_ENCRYPTION_KEY` | Secret | Clave AES-256 en base64 (32 bytes); la misma de `.dev.vars` |
| `SESSION_SECRET` | Secret | Cadena aleatoria larga para sesiones |

No se necesitan GitHub Variables adicionales: el nombre del Worker y los bindings viven en [wrangler.jsonc](../wrangler.jsonc).

### Permisos del API token

Crea el token en **My Profile -> API Tokens -> Create Token**. Puedes partir de la plantilla "Edit Cloudflare Workers" y añadir D1. Permisos mínimos (nivel Account):

- Workers Scripts: `Edit`
- Workers KV Storage: `Edit`
- D1: `Edit`
- Account Settings: `Read`

### Notas

- Genera `TOKEN_ENCRYPTION_KEY` con:
  ```bash
  node -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))"
  ```
- El script de provisión es idempotente: reutiliza los recursos existentes y solo reemplaza placeholders; si `wrangler.jsonc` ya tuviera IDs reales, los respeta.
- Localmente `wrangler.jsonc` conserva los placeholders para no romper el CI; para desarrollo usa `.dev.vars` + `pnpm run db:migrate:local`.

## Sincronización automática (opcional)

Ver la sección de escalado en [sync-flow.md](sync-flow.md) para habilitar Cron + Queue con un entrypoint de Worker personalizado.
