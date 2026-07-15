import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { DailyMetric } from '@/features/metrics/lib/types';

import type { DateRange } from './use-date-range';

export interface MetricsResponse {
  ok: boolean;
  range: { from: string; to: string };
  metrics: DailyMetric[];
}

export async function fetchMetrics(from: string, to: string, tz: string): Promise<MetricsResponse> {
  const params = new URLSearchParams({ from, to, tz });
  const response = await fetch(`/api/metrics?${params.toString()}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Could not load metrics.');
  }
  return (await response.json()) as MetricsResponse;
}

/**
 * Metricas del rango seleccionado, calculado en la TZ efectiva. Usa
 * `keepPreviousData` para que cambiar de rango no desmonte la UI.
 */
export function useMetrics(range: DateRange, tz: string, enabled: boolean) {
  const { from, to } = range;

  const query = useQuery({
    queryKey: ['metrics', from, to],
    queryFn: () => fetchMetrics(from, to, tz),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return { ...query, from, to };
}
