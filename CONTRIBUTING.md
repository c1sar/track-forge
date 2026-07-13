# Contribuir

Gracias por tu interés en mejorar Garmin Cloud.

## Puesta en marcha

```bash
pnpm install
cp .dev.vars.example .dev.vars   # y rellena los secretos
pnpm run db:migrate:local
pnpm run preview:worker
```

## Antes de abrir un PR

Ejecuta y asegúrate de que todo pasa:

```bash
pnpm run check          # Biome: formato + lint
pnpm exec astro check   # tipos
pnpm run build          # build de producción
```

## Convenciones

- **Organización feature-oriented**: el código nuevo va en `src/features/<feature>/` (`api/`, `components/`, `lib/`, `schemas.ts`). Lo transversal en `src/shared/`.
- **TypeScript estricto**: sin `any` innecesarios; valida entradas con Zod.
- **Seguridad**: nunca registres credenciales ni tokens; consulta [docs/security.md](docs/security.md).
- **Formato**: lo aplica Biome; no pelees con el formateador.
- **Commits**: mensajes claros e imperativos que expliquen el porqué.

## Estructura de una feature

```
features/<feature>/
├── api/          # opcional: helpers para endpoints
├── components/   # islas React
├── lib/          # dominio (servicios, repos, clientes)
└── schemas.ts    # Zod (request/response)
```

Los endpoints HTTP viven en `src/pages/api/**` y delegan en los servicios de `lib/`.
