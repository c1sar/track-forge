import type { DailyMetric } from '@/features/metrics/lib/types';

import type { ProviderId } from '../providers';

/**
 * Contrato de dominio que toda integración de datos de salud debe implementar.
 *
 * Los servicios genéricos (`connections-service`, `sync-service`) solo hablan
 * este contrato: añadir un proveedor nuevo = implementarlo + registrarlo en
 * `registry.ts`. Ver docs/integrations.md para la guía completa.
 */

/** Estado de vinculación de la cuenta del proveedor para un usuario. */
export interface ProviderConnection {
  connected: boolean;
  displayName: string | null;
  lastSyncAt: string | null;
}

/** Última subida del dispositivo físico a la nube del proveedor. */
export interface ProviderDevice {
  deviceName: string | null;
  lastUploadAt: string | null;
}

export interface HealthDataProvider {
  readonly id: ProviderId;

  /** Estado de vinculación (sin concerns de app como timezone). */
  getConnection(env: Env, userId: string): Promise<ProviderConnection>;

  /** Borra tokens/secretos y metadatos de la cuenta vinculada. */
  disconnect(env: Env, userId: string): Promise<void>;

  /**
   * Info del dispositivo físico (opcional: solo proveedores con capability
   * `deviceInfo`). Tolerante a fallos: devuelve nulls, no lanza.
   */
  getDevice?(env: Env, userId: string): Promise<ProviderDevice>;

  /**
   * Obtiene las métricas diarias para las fechas dadas (ISO YYYY-MM-DD).
   * Lanza AppError si el usuario no tiene la cuenta vinculada.
   */
  fetchDailyMetrics(env: Env, userId: string, dates: string[]): Promise<DailyMetric[]>;
}
