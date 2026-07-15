import type { LucideIcon } from 'lucide-react';
import { Watch } from 'lucide-react';

/**
 * Registry declarativo de proveedores de datos (wearables / plataformas de salud).
 *
 * Es la ÚNICA fuente de verdad para la UI del hub `Connections`. Añadir un
 * proveedor nuevo se hace aquí; ver `.cursor/rules/connections.mdc` para la
 * receta completa (metadata + card + endpoints). Las integraciones futuras aún
 * no se anuncian por marca: el hub muestra una sola tarjeta genérica
 * "Coming soon" (ver `ComingSoonCard`).
 */

export type ProviderId = 'garmin';

/** `available`: se puede vincular hoy. `coming-soon`: placeholder sin backend aún. */
export type ProviderStatus = 'available' | 'coming-soon';

export type ProviderCategory = 'Wearable' | 'Health platform';

export interface ProviderCapabilities {
  /** Sincroniza métricas wellness diarias (pasos, sueño, FC…). */
  metrics: boolean;
  /** Expone info del dispositivo físico (nombre, última subida). */
  deviceInfo: boolean;
  /** El login puede requerir verificación MFA. */
  mfa: boolean;
  /** Dispara una sincronización inicial automática al vincular. */
  autoSync: boolean;
}

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  /** Frase corta de una línea que describe al proveedor. */
  tagline: string;
  category: ProviderCategory;
  status: ProviderStatus;
  Icon: LucideIcon;
  /**
   * Clases Tailwind ESTÁTICAS para el tile de marca (fondo + texto).
   * Deben ser literales para que el scanner de Tailwind las incluya: no
   * construir estas clases dinámicamente.
   */
  accentClass: string;
  capabilities: ProviderCapabilities;
}

export const PROVIDERS: readonly ProviderDefinition[] = [
  {
    id: 'garmin',
    name: 'Garmin Connect',
    tagline: 'Watches, cycling computers & wellness metrics',
    category: 'Wearable',
    status: 'available',
    Icon: Watch,
    accentClass: 'bg-primary/10 text-primary',
    capabilities: { metrics: true, deviceInfo: true, mfa: true, autoSync: true },
  },
] as const;
