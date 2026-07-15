import { useMemo } from 'react';

import { resolveTimeZone } from '@/shared/lib/timezone';

import { useGarminStatus } from './use-garmin-status';

/** Zona horaria del navegador (detectada por el runtime). */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Zona horaria efectiva para el cliente: el setting guardado por el usuario
 * (expuesto en `/api/garmin/status`) tiene prioridad; si no hay, se usa la del
 * navegador. Sirve para calcular "hoy" y los rangos alineados con Garmin.
 */
export function useEffectiveTimeZone(): string {
  const statusQuery = useGarminStatus();
  const stored = statusQuery.data?.connection.timezone ?? null;

  return useMemo(() => resolveTimeZone(stored), [stored]);
}
