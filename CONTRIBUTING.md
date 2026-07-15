# Contribuir

Gracias por tu interés en mejorar **Track Forge** — nuestro centro de datos y análisis para métricas de salud y rendimiento.

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

### Hook de pre-commit

Al ejecutar `pnpm install` se configura automáticamente un hook de git
(`core.hooksPath` apunta a `.githooks/`) que corre Biome **solo sobre los
archivos en stage** antes de cada commit, aplica los arreglos seguros y
los vuelve a añadir al stage. Si quedan errores que no se pueden arreglar
automáticamente, el commit se aborta.

No requiere dependencias extra. Si necesitas activarlo manualmente:

```bash
git config core.hooksPath .githooks
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
