/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

// Secrets provided at runtime (via `.dev.vars` locally, `wrangler secret` in prod).
// Se añaden tanto al `Env` global (handler) como a `Cloudflare.Env`
// (el `env` importado desde 'cloudflare:workers').
interface Env {
  TOKEN_ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
}

declare namespace Cloudflare {
  interface Env {
    TOKEN_ENCRYPTION_KEY: string;
    SESSION_SECRET: string;
  }
}

declare namespace App {
  interface Locals {
    currentUser: import('./features/auth/lib/types').SessionUser | null;
  }
}
