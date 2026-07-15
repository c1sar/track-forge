import { garminProvider } from '@/features/garmin-connect/lib/garmin-provider';
import { AppError } from '@/shared/lib/errors';

import type { ProviderId } from '../providers';
import type { HealthDataProvider } from './provider';

/**
 * Registry backend de proveedores: mapea cada `ProviderId` a su implementación
 * del contrato `HealthDataProvider`. Es el punto único de registro de dominio;
 * los servicios genéricos resuelven proveedores solo a través de este módulo.
 */
const HEALTH_PROVIDERS: Record<ProviderId, HealthDataProvider> = {
  garmin: garminProvider,
};

/**
 * Orden de prioridad al fusionar métricas de varias fuentes para un mismo día
 * (el primero gana campo a campo). Con un solo proveedor es trivial.
 */
export const PROVIDER_PRIORITY: readonly ProviderId[] = ['garmin'];

export function isProviderId(value: string): value is ProviderId {
  return Object.hasOwn(HEALTH_PROVIDERS, value);
}

/** Resuelve un proveedor por id (validado contra el registry) o lanza 404. */
export function getProviderOrThrow(id: string): HealthDataProvider {
  if (!isProviderId(id)) {
    throw new AppError(`Proveedor no soportado: ${id}.`, 404, 'unknown_provider');
  }
  return HEALTH_PROVIDERS[id];
}
