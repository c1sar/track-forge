import { PROVIDER_PRIORITY } from '@/features/connections/lib/registry';
import { AppError } from '@/shared/lib/errors';
import {
  addDaysIso,
  daysBetweenIso,
  isoDaysAgoInTz,
  isValidIsoDate,
  todayInTz,
} from '@/shared/lib/timezone';

import { MetricsRepository } from './metrics-repository';
import {
  DAILY_METRIC_FIELDS,
  type DailyMetric,
  type DailyMetricRow,
  rowToDailyMetric,
} from './types';

export interface MetricsRange {
  from: string;
  to: string;
}

const DEFAULT_RANGE_DAYS = 30;
/** Tope de dias por peticion para evitar rangos abusivos / que rompan la UI. */
export const MAX_RANGE_DAYS = 366;

/**
 * Resuelve un rango de fechas valido a partir de query params opcionales,
 * anclado a la zona horaria del usuario. Aplica limites defensivos:
 * - formatos invalidos => default
 * - futuro => se recorta a hoy
 * - rango invertido => se corrige (swap)
 * - span mayor a MAX_RANGE_DAYS => 400 claro
 */
export function resolveRange(
  fromParam: string | null,
  toParam: string | null,
  tz: string,
): MetricsRange {
  const today = todayInTz(tz);

  let to = toParam && isValidIsoDate(toParam) ? toParam : today;
  let from =
    fromParam && isValidIsoDate(fromParam) ? fromParam : isoDaysAgoInTz(DEFAULT_RANGE_DAYS - 1, tz);

  // Corrige rango invertido.
  if (from > to) {
    [from, to] = [to, from];
  }

  // No permitir fechas futuras respecto al dia local del usuario.
  if (to > today) {
    to = today;
  }
  if (from > today) {
    from = today;
  }

  // Cap defensivo del span.
  if (daysBetweenIso(from, to) > MAX_RANGE_DAYS) {
    throw new AppError(`El rango no puede exceder ${MAX_RANGE_DAYS} dias.`, 400, 'range_too_large');
  }

  return { from, to };
}

/** Rango por defecto (ultimos N dias) para la zona `tz`. */
export function defaultRange(tz: string): MetricsRange {
  return { from: isoDaysAgoInTz(DEFAULT_RANGE_DAYS - 1, tz), to: todayInTz(tz) };
}

export { addDaysIso };

/** Posición de cada fuente en el orden de prioridad (desconocidas al final). */
function sourceRank(source: string): number {
  const index = PROVIDER_PRIORITY.indexOf(source as (typeof PROVIDER_PRIORITY)[number]);
  return index === -1 ? PROVIDER_PRIORITY.length : index;
}

/**
 * Fusiona las filas de varias fuentes en una métrica por día: campo a campo
 * gana el primer valor no-null según `PROVIDER_PRIORITY`. Con una sola fuente
 * es un mapeo directo. Esta vista unificada es la que consume el dashboard
 * combinado y, a futuro, la capa de AI.
 */
function mergeRowsByDate(rows: DailyMetricRow[]): DailyMetric[] {
  const byDate = new Map<string, DailyMetricRow[]>();
  for (const row of rows) {
    const group = byDate.get(row.date);
    if (group) {
      group.push(row);
    } else {
      byDate.set(row.date, [row]);
    }
  }

  const merged: DailyMetric[] = [];
  for (const [, group] of byDate) {
    group.sort((a, b) => sourceRank(a.source) - sourceRank(b.source));
    const metrics = group.map(rowToDailyMetric);
    const base = metrics[0];
    if (!base) {
      continue;
    }
    for (const field of DAILY_METRIC_FIELDS) {
      if (base[field] == null) {
        base[field] = metrics.find((metric) => metric[field] != null)?.[field] ?? null;
      }
    }
    merged.push(base);
  }

  // Mantiene el orden descendente por fecha del repositorio.
  merged.sort((a, b) => b.date.localeCompare(a.date));
  return merged;
}

/**
 * Métricas del rango. Con `source` devuelve solo esa integración (dashboard
 * por proveedor); sin `source`, la vista fusionada de todas las fuentes.
 */
export async function getMetrics(
  env: Env,
  userId: string,
  range: MetricsRange,
  source?: string,
): Promise<DailyMetric[]> {
  const rows = await new MetricsRepository(env.DB).listByRange(
    userId,
    range.from,
    range.to,
    source,
  );
  if (source) {
    return rows.map(rowToDailyMetric);
  }
  return mergeRowsByDate(rows);
}

export async function getLatestMetric(
  env: Env,
  userId: string,
  source?: string,
): Promise<DailyMetric | null> {
  const row = await new MetricsRepository(env.DB).latest(userId, source);
  return row ? rowToDailyMetric(row) : null;
}
