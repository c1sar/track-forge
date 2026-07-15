# Track Forge

**Centro de datos y análisis** multiusuario, open source y self-hostable para **monitorear, visualizar y analizar tus métricas** de salud y rendimiento — y llevar tu rendimiento al siguiente nivel.

Conecta tus aplicaciones y dispositivos (hoy **Garmin Connect**; mañana Apple Health, Fitbit, Oura, nutrición y más), centraliza todo en un solo dashboard, detecta tendencias y exporta a CSV listo para un asistente de IA.

Construido sobre un **hub de conexiones extensible** (`HealthDataProvider` + registry) desplegado en **Cloudflare Workers**. La integración Garmin usa el flujo SSO móvil (estilo [garth](https://github.com/matin/garth)) con `fetch` nativo, sin dependencias no oficiales frágiles.

## Características

- **Cuentas propias** con email + contraseña (multiusuario).
- **Hub de conexiones extensible**: página `Connections` con estado de vinculación en vivo (cuenta, dispositivo, última sync), conectar/desconectar, y backend multi-proveedor listo para nuevas integraciones — ver [docs/integrations.md](docs/integrations.md).
- **Garmin Connect** (primera integración disponible) con soporte de MFA (email o app authenticator).
- **Sincronización unificada** de métricas wellness: pasos, sueño, FC en reposo, estrés, Body Battery, HRV, SpO2 y calorías activas — por fuente o vista fusionada entre proveedores.
- **Dashboard de análisis** con tarjetas del día, gráficos de tendencia y tabla de detalle diario.
- **Exportación CSV** optimizada para que un LLM interprete tus datos y te dé insights accionables.
- **Seguridad primero**: tokens cifrados (AES-GCM), contraseñas con PBKDF2, sesiones httpOnly, credenciales de terceros nunca persistidas.

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Astro 7 (SSR) |
| Runtime | Cloudflare Workers (`nodejs_compat`) |
| UI | React 19 + shadcn/ui + Tailwind CSS 4 + Recharts |
| Datos cliente | TanStack Query 5 |
| Formularios | react-hook-form + Zod |
| Base de datos | Cloudflare D1 (usuarios + métricas) |
| Almacén efímero | Cloudflare KV (sesiones, MFA, tokens cifrados) |
| Calidad | Biome (format + lint), astro check (tipos) |

## Arquitectura en un vistazo

```
Browser (React islands)
  │  /login  /register  /connect  /dashboard  /data
  ▼
Astro SSR (Cloudflare Worker)
  ├── features/auth            → registro, login, sesiones
  ├── features/connections     → hub multi-proveedor (UI + contrato HealthDataProvider)
  ├── features/garmin-connect  → integración Garmin (SSO + MFA + adapter)
  ├── features/sync            → sync provider-agnóstico de métricas wellness
  ├── features/metrics         → lectura por fuente o fusionada + dashboard
  └── features/export          → CSV AI-friendly
       │
       ├── D1  (users, linked_accounts, daily_metrics con source)
       └── KV  (sessions, mfa:pending, tokens cifrados por proveedor)
```

Detalle completo en [docs/architecture.md](docs/architecture.md).

## Requisitos

- Node.js >= 22.12
- pnpm >= 10
- Cuenta de Cloudflare (para desplegar)
- Al menos una cuenta en un proveedor soportado (hoy: Garmin Connect)

## Inicio rápido (local)

```bash
cd garmin-poc
pnpm install

# 1. Secretos locales
cp .dev.vars.example .dev.vars
# genera TOKEN_ENCRYPTION_KEY (32 bytes base64) y SESSION_SECRET, edítalos en .dev.vars

# 2. Base de datos local
pnpm run db:migrate:local

# 3. Arranca en el runtime real de Workers
pnpm run preview:worker
```

Abre [http://localhost:8787](http://localhost:8787), crea una cuenta, conecta tus aplicaciones en `Connections` y sincroniza.

> Usa siempre `preview:worker` (`wrangler dev`). `astro dev` corre en Node y no reproduce el runtime de Workers ni los bindings D1/KV.

## Scripts

| Script | Descripción |
|--------|-------------|
| `pnpm run preview:worker` | Build + `wrangler dev` (runtime workerd con D1/KV) |
| `pnpm run build` | Build SSR para Cloudflare |
| `pnpm run deploy` | Build + deploy a Cloudflare (manual) |
| `pnpm run check` | Biome (format + lint) |
| `pnpm run format` | Biome format --write |
| `pnpm run db:migrate:local` | Aplica migraciones D1 en local |
| `pnpm run db:migrate:remote` | Aplica migraciones D1 en producción |
| `pnpm exec astro check` | Type-check de todo el proyecto |

## Despliegue continuo (CI/CD)

El workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) despliega automáticamente en cada `push` a `main`: provisiona D1/KV si no existen, inyecta sus IDs en `wrangler.jsonc`, aplica migraciones, hace build + deploy y sube los secretos de runtime. Requiere estos GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TOKEN_ENCRYPTION_KEY` y `SESSION_SECRET`. Detalle y permisos del token en [docs/deployment.md](docs/deployment.md).

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/architecture.md](docs/architecture.md) | Feature folders, bindings, flujo de datos |
| [docs/integrations.md](docs/integrations.md) | Cómo añadir un proveedor + visión futura (AI/BYOK) |
| [docs/sync-flow.md](docs/sync-flow.md) | Login SSO Garmin, MFA, OAuth y sincronización |
| [docs/security.md](docs/security.md) | Modelo de amenazas y qué se guarda (y qué no) |
| [docs/deployment.md](docs/deployment.md) | Provisión de D1/KV, secretos y deploy |
| [docs/csv-export.md](docs/csv-export.md) | Formato CSV y prompt de ejemplo para IA |
| [SECURITY.md](SECURITY.md) | Divulgación responsable |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Cómo contribuir |

## Seguridad (resumen)

- Las **credenciales de terceros nunca se guardan**: solo se usan en memoria durante el login/MFA de cada proveedor.
- Los **tokens OAuth** se cifran con AES-256-GCM antes de guardarse en KV.
- Las **contraseñas de la app** se hashean con PBKDF2-SHA256.
- Las **sesiones** usan cookies httpOnly + Secure + SameSite=Strict.

Lee el modelo completo en [docs/security.md](docs/security.md).

## Aviso legal

La integración con Garmin Connect usa endpoints no oficiales. Track Forge no está afiliado ni respaldado por Garmin ni por ningún otro proveedor de datos. Úsalo bajo tu responsabilidad y respetando los términos de servicio de cada plataforma conectada.

## Licencia

MIT.
