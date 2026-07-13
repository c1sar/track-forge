import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ExportCsvCard } from '@/features/export/components/ExportCsvCard';
import type { ConnectionStatus } from '@/features/garmin-connect/schemas';
import type { DailyMetric } from '@/features/metrics/lib/types';
import { isoDaysAgo, todayIso } from '@/shared/lib/dates';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { QueryProvider } from '@/shared/ui/query-provider';
import { Skeleton } from '@/shared/ui/skeleton';

import { MetricCards } from './MetricCards';
import { MetricsTable } from './MetricsTable';
import { TrendChart, type TrendPoint } from './TrendChart';

const RANGE_OPTIONS = [7, 30, 90] as const;

interface StatusResponse {
  ok: boolean;
  connection: ConnectionStatus;
}

interface MetricsResponse {
  ok: boolean;
  range: { from: string; to: string };
  metrics: DailyMetric[];
}

async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch('/api/garmin/status');
  return (await response.json()) as StatusResponse;
}

async function fetchMetrics(from: string, to: string): Promise<MetricsResponse> {
  const response = await fetch(`/api/metrics?from=${from}&to=${to}`);
  return (await response.json()) as MetricsResponse;
}

function trend(
  metrics: DailyMetric[],
  selector: (metric: DailyMetric) => number | null,
): TrendPoint[] {
  return [...metrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((metric) => ({ date: metric.date, value: selector(metric) }));
}

function DashboardContent() {
  const [rangeDays, setRangeDays] = useState<number>(30);
  const queryClient = useQueryClient();

  const from = isoDaysAgo(rangeDays - 1);
  const to = todayIso();

  const statusQuery = useQuery({ queryKey: ['garmin-status'], queryFn: fetchStatus });
  const metricsQuery = useQuery({
    queryKey: ['metrics', from, to],
    queryFn: () => fetchMetrics(from, to),
    enabled: statusQuery.data?.connection.connected === true,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sync?days=${rangeDays}`, { method: 'POST' });
      if (!response.ok) {
        throw new Error('La sincronización falló.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['garmin-status'] });
    },
  });

  if (statusQuery.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!statusQuery.data?.connection.connected) {
    return (
      <Alert>
        <AlertTitle>Conecta tu Garmin</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Todavía no has vinculado una cuenta de Garmin Connect.</p>
          <a className={buttonVariants()} href="/connect">
            Vincular ahora
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  const metrics = metricsQuery.data?.metrics ?? [];
  const latest = metrics[0] ?? null;
  const connection = statusQuery.data.connection;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-lg font-semibold">
            {connection.displayName ?? 'Tu panel'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Última sincronización:{' '}
            {connection.lastSyncAt
              ? new Date(connection.lastSyncAt).toLocaleString('es-ES')
              : 'nunca'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            {RANGE_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setRangeDays(option)}
                className={
                  option === rangeDays
                    ? 'rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground'
                    : 'rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground'
                }
              >
                {option}d
              </button>
            ))}
          </div>
          <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sincronizar
          </Button>
        </div>
      </div>

      <MetricCards metric={latest} />

      <div className="grid gap-4 md:grid-cols-2">
        <TrendChart title="Pasos" data={trend(metrics, (m) => m.steps)} />
        <TrendChart
          title="Sueño (horas)"
          data={trend(metrics, (m) =>
            m.sleepSeconds === null ? null : Math.round((m.sleepSeconds / 3600) * 10) / 10,
          )}
        />
        <TrendChart title="Estrés medio" data={trend(metrics, (m) => m.avgStress)} />
        <TrendChart title="FC en reposo" data={trend(metrics, (m) => m.restingHr)} />
      </div>

      <ExportCsvCard rangeDays={rangeDays} />

      <Card>
        <CardHeader>
          <CardTitle>Detalle diario</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : metrics.length > 0 ? (
            <MetricsTable metrics={metrics} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay métricas todavía. Pulsa «Sincronizar».
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardApp() {
  return (
    <QueryProvider>
      <DashboardContent />
    </QueryProvider>
  );
}
