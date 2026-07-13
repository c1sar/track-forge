# Política de seguridad

## Divulgación responsable

Si encuentras una vulnerabilidad, por favor **no abras un issue público**. En su lugar:

1. Abre un aviso de seguridad privado en GitHub (Security Advisories), o
2. Contacta al mantenedor por email.

Incluye pasos de reproducción, impacto y, si es posible, una prueba de concepto. Intentaremos responder en un plazo razonable y coordinar la divulgación.

## Alcance

Este proyecto maneja credenciales de terceros (Garmin) y datos personales de salud. Son especialmente relevantes:

- Fugas de tokens OAuth o de la clave de cifrado.
- Bypass de autenticación o de la separación entre usuarios.
- Exposición de credenciales o tokens en logs.
- Inyección SQL en las consultas a D1.

## Buenas prácticas al desplegar

- Genera un `TOKEN_ENCRYPTION_KEY` único por despliegue y guárdalo como secreto (`wrangler secret put`).
- Nunca comitees `.dev.vars` ni valores reales de secretos.
- Rota la clave de cifrado si sospechas de una fuga (invalida los tokens guardados).
- Mantén las dependencias actualizadas.

Consulta el modelo de amenazas detallado en [docs/security.md](docs/security.md).
