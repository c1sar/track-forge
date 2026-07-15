# Modelo de seguridad

Track Forge maneja credenciales de terceros (Garmin hoy; más proveedores mañana) y datos de salud personales. El diseño prioriza minimizar qué se guarda y cifrar lo sensible, con el mismo patrón para cada integración.

## Qué se guarda y qué no

| Dato | Dónde | Cómo |
|------|-------|------|
| Credenciales de proveedores (p. ej. Garmin) | En ningún sitio | Solo en memoria durante el request de login/MFA |
| Tokens OAuth por proveedor | KV (`<provider>_tokens:{userId}`) | Cifrados con AES-256-GCM |
| Estado MFA pendiente | KV (`mfa:pending:{id}`) | JSON con TTL 5 min, atado al `userId` |
| Contraseña de la app | D1 (`users.password_hash`) | Hash PBKDF2-SHA256 (100k iteraciones) |
| Sesión | KV (`session:{id}`) | Id aleatorio de 32 bytes, TTL 7 días |
| Métricas | D1 (`daily_metrics`) | En claro (no son secretos) |

## Controles

### Contraseñas de la app
PBKDF2-SHA256, 100 000 iteraciones, salt de 16 bytes aleatorio por usuario. Formato `pbkdf2$iter$salt$hash`. Verificación en tiempo constante ([`shared/lib/encoding.ts`](../src/shared/lib/encoding.ts) `timingSafeEqual`). Implementación en [`features/auth/lib/password.ts`](../src/features/auth/lib/password.ts).

### Tokens de proveedores
Cifrado simétrico AES-256-GCM con IV aleatorio de 12 bytes antepuesto al ciphertext ([`shared/lib/crypto.ts`](../src/shared/lib/crypto.ts)). La clave (`TOKEN_ENCRYPTION_KEY`, 32 bytes base64) es un secreto del Worker, nunca en el repo. Rotarla invalida todos los tokens guardados de todas las integraciones.

### Sesiones
Cookie `gc_session`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, `Max-Age=7d`. El valor es un id opaco; los datos de sesión viven en KV. Logout borra la entrada de KV y la cookie.

### Aislamiento entre usuarios
Todas las consultas a D1 y las claves de KV están namespaced por `userId`. El estado MFA valida que el `userId` que reanuda coincide con el que inició el flujo. Los endpoints protegidos exigen sesión vía `requireUser` y el `middleware.ts` protege las páginas `/dashboard` y `/connect`.

### Superficie HTTP
- Validación de entrada con Zod en todos los endpoints.
- Consultas D1 parametrizadas (sin concatenación de SQL).
- Errores serializados sin filtrar internals (`shared/lib/errors.ts`).

## No filtrar secretos en logs
No se registran contraseñas ni tokens. `observability` de Cloudflare está activado para trazas de request; evita añadir logs que impriman `env`, cabeceras `Authorization` o cuerpos de login.

## Amenazas conocidas y mitigaciones

| Amenaza | Mitigación |
|---------|------------|
| Fuga de la clave de cifrado | Secreto del Worker, rotación invalida tokens |
| Robo de cookie de sesión | HttpOnly + Secure + SameSite=Strict, TTL corto |
| Fuerza bruta de login | Hash costoso (PBKDF2); se recomienda añadir rate limiting por IP |
| Reutilización de sesión MFA ajena | Estado atado a `userId` + TTL 5 min |
| Bloqueo/lock de la cuenta Garmin | Evitar reintentos; mensajes claros de rate limit |

## Recomendaciones para producción

- Añadir rate limiting (KV counters o Cloudflare Rate Limiting) en `/api/auth/*` y `/api/garmin/connect`.
- Servir siempre sobre HTTPS (Cloudflare lo hace por defecto).
- Revisar los términos de servicio de cada proveedor conectado antes de desplegar públicamente.
