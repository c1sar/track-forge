import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePublishSyncScope } from '@/features/app-shell/components/sync-scope';
import { useGarminDevice } from '@/features/connections/hooks/use-garmin-device';
import { useGarminStatus } from '@/features/connections/hooks/use-garmin-status';
import { useDateRange } from '@/features/metrics/hooks/use-date-range';
import { useDayMetric } from '@/features/metrics/hooks/use-day-metric';
import { useEffectiveTimeZone } from '@/features/metrics/hooks/use-effective-timezone';
import { useMetrics } from '@/features/metrics/hooks/use-metrics-query';
import { useSyncMetrics } from '@/features/metrics/hooks/use-sync-metrics';
import type { DailyMetric } from '@/features/metrics/lib/types';
import { formatRelativeTime, isWatchUploadStale } from '@/shared/lib/dates';
import { todayInTz } from '@/shared/lib/timezone';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import {
  ChartGridSkeleton,
  MetricCardsSkeleton,
  PageHeaderSkeleton,
} from '@/shared/ui/loading-states';

import { DateRangeControl } from './DateRangeControl';
import { DayPicker } from './DayPicker';
import { MetricCards } from './MetricCards';
import { TrendChart, type TrendPoint } from './TrendChart';

function trend(
  metrics: DailyMetric[],
  selector: (metric: DailyMetric) => number | null,
): TrendPoint[] {
  return [...metrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((metric) => ({ date: metric.date, value: selector(metric) }));
}

export function DashboardApp() {
  const tz = useEffectiveTimeZone();
  const today = todayInTz(tz);

  const statusQuery = useGarminStatus();
  const connected = statusQuery.data?.connection.connected === true;
  const deviceQuery = useGarminDevice(connected);

  const [selectedDay, setSelectedDay] = useState(today);
  // Si "hoy" cambia (nueva TZ o cruce de medianoche) y seguiamos en el dia
  // por defecto, avanzar la seleccion.
  useEffect(() => {
    setSelectedDay((current) => (current > today ? today : current));
  }, [today]);

  const dayQuery = useDayMetric(selectedDay, tz, connected);
  const { mode, range, setPreset, setCustomRange } = useDateRange(tz);
  const metricsQuery = useMetrics(range, tz, connected);
  const syncMutation = useSyncMetrics();

  usePublishSyncScope({ from: range.from, to: range.to, tz });

  if (statusQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <MetricCardsSkeleton />
        <ChartGridSkeleton />
      </div>
    );
  }

  if (!connected) {
    return (
      <Alert className="border-border">
        <AlertTitle>Garmin not linked</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Connect your Garmin account to start pulling high-fidelity performance data.</p>
          <a className={buttonVariants()} href="/connect">
            Link Garmin
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  const dayMetric = dayQuery.metric;
  const dayHasData = dayMetric != null;
  const metrics = metricsQuery.data?.metrics ?? [];
  const connection = statusQuery.data?.connection;
  const device = deviceQuery.data?.device;
  const watchUploadStale = isWatchUploadStale(device?.lastUploadAt ?? null, tz);
  const refreshing = metricsQuery.isFetching && !metricsQuery.isLoading;

  return (
    <div className="space-y-8">
      {/* ── Today (single day) ────────────────────────────────── */}
      <section className="space-y-4">
        <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 md:-mx-6 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate font-heading text-base font-semibold">Today</h2>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                Last sync:{' '}
                {connection?.lastSyncAt
                  ? new Date(connection.lastSyncAt).toLocaleString('en-US')
                  : 'never'}
              </p>
              <p
                className={`font-mono text-xs tabular-nums ${
                  watchUploadStale ? 'text-amber-500' : 'text-muted-foreground'
                }`}
              >
                Watch → Connect:{' '}
                {deviceQuery.isLoading
                  ? 'checking…'
                  : device?.lastUploadAt
                    ? formatRelativeTime(device.lastUploadAt)
                    : 'unknown'}
                {device?.deviceName ? ` (${device.deviceName})` : ''}
              </p>
              {watchUploadStale ? (
                <p className="text-xs text-amber-500/90">
                  Sync your watch in Garmin Connect Mobile first, then sync here.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <DayPicker value={selectedDay} onChange={setSelectedDay} maxDateIso={today} />
              <Button
                onClick={() => syncMutation.mutate({ from: selectedDay, to: selectedDay, tz })}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                <span className="hidden sm:inline">
                  {syncMutation.isPending ? 'Syncing…' : 'Sync day'}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {dayQuery.isLoading ? (
          <MetricCardsSkeleton />
        ) : (
          <>
            <MetricCards metric={dayMetric} />
            {!dayHasData ? (
              <Alert className="border-border">
                <AlertTitle>No data for this day</AlertTitle>
                <AlertDescription>
                  Nothing stored for {selectedDay}. Hit “Sync day” to pull it from Garmin.
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        )}
      </section>

      {/* ── Trends (range) ────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-semibold">Trends</h2>
            {refreshing ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          <DateRangeControl
            mode={mode}
            range={range}
            onPreset={setPreset}
            onCustomRange={setCustomRange}
            maxDateIso={today}
          />
        </div>

        {metricsQuery.isLoading ? (
          <ChartGridSkeleton />
        ) : metrics.length === 0 ? (
          <Alert className="border-border">
            <AlertTitle>No data in range</AlertTitle>
            <AlertDescription>
              No metrics stored between {range.from} and {range.to}. Try syncing this range.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <TrendChart title="Steps" data={trend(metrics, (m) => m.steps)} color="chart-1" />
              <TrendChart
                title="Sleep (hours)"
                data={trend(metrics, (m) =>
                  m.sleepSeconds === null ? null : Math.round((m.sleepSeconds / 3600) * 10) / 10,
                )}
                color="chart-2"
              />
              <TrendChart
                title="Avg Stress"
                data={trend(metrics, (m) => m.avgStress)}
                color="chart-3"
              />
              <TrendChart
                title="Resting HR"
                data={trend(metrics, (m) => m.restingHr)}
                color="chart-1"
              />
            </div>

            <a
              href={
                mode === 'custom'
                  ? `/data?from=${range.from}&to=${range.to}`
                  : `/data?period=${mode}`
              }
              className="group flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
            >
              <div>
                <p className="text-sm font-medium">View data & export</p>
                <p className="text-xs text-muted-foreground">
                  Browse the full daily table and download your CSV.
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </a>
          </>
        )}
      </section>
    </div>
  );
}
