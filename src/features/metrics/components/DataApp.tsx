import { Download, Loader2, RefreshCw } from 'lucide-react';

import { usePublishSyncScope } from '@/features/app-shell/components/sync-scope';
import { useDateRange } from '@/features/metrics/hooks/use-date-range';
import { useEffectiveTimeZone } from '@/features/metrics/hooks/use-effective-timezone';
import { useGarminStatus } from '@/features/metrics/hooks/use-garmin-status';
import { useMetrics } from '@/features/metrics/hooks/use-metrics-query';
import { useSyncMetrics } from '@/features/metrics/hooks/use-sync-metrics';
import { todayInTz } from '@/shared/lib/timezone';
import { cn } from '@/shared/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { PageHeaderSkeleton, TableSkeleton } from '@/shared/ui/loading-states';

import { DateRangeControl } from './DateRangeControl';
import { MetricsDataTable } from './MetricsDataTable';

export function DataApp() {
  const tz = useEffectiveTimeZone();
  const today = todayInTz(tz);

  const statusQuery = useGarminStatus();
  const connected = statusQuery.data?.connection.connected === true;

  const { mode, range, setPreset, setCustomRange } = useDateRange(tz);
  const metricsQuery = useMetrics(range, tz, connected);
  const syncMutation = useSyncMetrics();

  usePublishSyncScope({ from: range.from, to: range.to, tz });

  const exportHref = `/api/export/csv?from=${range.from}&to=${range.to}&tz=${encodeURIComponent(tz)}`;

  if (statusQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <TableSkeleton rows={12} />
      </div>
    );
  }

  if (!connected) {
    return (
      <Alert className="border-border">
        <AlertTitle>Garmin not linked</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Connect your Garmin account to browse and export your data.</p>
          <a className={buttonVariants()} href="/connect">
            Link Garmin
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  const metrics = metricsQuery.data?.metrics ?? [];
  const refreshing = metricsQuery.isFetching && !metricsQuery.isLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sticky toolbar — stays visible while the table scrolls */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 pb-3 backdrop-blur supports-backdrop-filter:bg-background/80 md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <DateRangeControl
              mode={mode}
              range={range}
              onPreset={setPreset}
              onCustomRange={setCustomRange}
              maxDateIso={today}
            />
            {refreshing ? (
              <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Updating…
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate({ from: range.from, to: range.to, tz })}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {syncMutation.isPending ? 'Syncing…' : 'Sync'}
            </Button>
            <a className={cn(buttonVariants(), 'hidden sm:inline-flex')} href={exportHref} download>
              <Download className="size-4" />
              Download CSV
            </a>
          </div>
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground tabular-nums">
          {range.from} → {range.to} · {metrics.length} days
        </p>
      </div>

      <div className="min-h-0 flex-1 pt-4 pb-20 sm:pb-4">
        {metricsQuery.isLoading ? (
          <TableSkeleton rows={12} />
        ) : (
          <MetricsDataTable
            metrics={metrics}
            className="max-h-[calc(100dvh-18rem)] sm:max-h-[calc(100dvh-14rem)]"
          />
        )}
      </div>

      {/* Barra inferior fija con el CTA de export en mobile */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <a
          className={buttonVariants({ size: 'lg', className: 'w-full' })}
          href={exportHref}
          download
        >
          <Download className="size-4" />
          Download CSV ({metrics.length}d)
        </a>
      </div>
    </div>
  );
}
