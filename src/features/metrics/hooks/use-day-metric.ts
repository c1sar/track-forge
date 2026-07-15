import { useQuery } from '@tanstack/react-query';

import { fetchMetrics } from './use-metrics-query';

/**
 * Metrica de un unico dia (`YYYY-MM-DD`). Reutiliza `/api/metrics?from=to=date`
 * y comparte cache con las queries de rango cuando coinciden las claves.
 */
export function useDayMetric(date: string, tz: string, enabled: boolean) {
  const query = useQuery({
    queryKey: ['metrics', date, date],
    queryFn: () => fetchMetrics(date, date, tz),
    enabled: enabled && Boolean(date),
    staleTime: 30_000,
  });

  const metric = query.data?.metrics[0] ?? null;
  return { ...query, metric };
}
