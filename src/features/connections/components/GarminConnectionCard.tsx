import { Link2, Loader2, RefreshCw, ShieldCheck, Unlink, Watch } from 'lucide-react';
import { useState } from 'react';

import { useDisconnectGarmin } from '@/features/connections/hooks/use-disconnect-garmin';
import { useGarminDevice } from '@/features/connections/hooks/use-garmin-device';
import { useGarminStatus } from '@/features/connections/hooks/use-garmin-status';
import type { ProviderDefinition } from '@/features/connections/providers';
import { useEffectiveTimeZone } from '@/features/metrics/hooks/use-effective-timezone';
import { useSyncMetrics } from '@/features/metrics/hooks/use-sync-metrics';
import { formatRelativeTime, isWatchUploadStale } from '@/shared/lib/dates';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

import { ConnectGarminDialog } from './ConnectGarminDialog';
import { ProviderBrand } from './ProviderBrand';

/** Días que se sincronizan al pulsar "Sync now" desde el hub de conexiones. */
const SYNC_DAYS = 14;

interface GarminConnectionCardProps {
  provider: ProviderDefinition;
}

/** Fila etiqueta → valor con la estética mono/tabular del dashboard. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="min-w-0 truncate text-right font-mono text-xs tabular-nums">{children}</span>
    </div>
  );
}

/**
 * Card de Garmin con dos estados guiados por `/api/connections/garmin/status`:
 * desconectado (abre el diálogo de login) y conectado (cuenta, dispositivo,
 * última sync y acciones de sync/desconexión).
 */
export function GarminConnectionCard({ provider }: GarminConnectionCardProps) {
  const statusQuery = useGarminStatus();
  const connected = statusQuery.data?.connection.connected === true;

  const tz = useEffectiveTimeZone();
  const deviceQuery = useGarminDevice(connected);
  const syncMutation = useSyncMetrics();
  const disconnectMutation = useDisconnectGarmin();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (statusQuery.isLoading) {
    return (
      <Card className="group/card border-border shadow-none">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!connected) {
    return (
      <>
        <Card className="group/card border-border shadow-none transition-colors hover:border-primary/40">
          <CardHeader>
            <ProviderBrand provider={provider} />
            <CardAction>
              <Badge variant="outline" className="text-muted-foreground">
                Not linked
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-success" />
              Credentials are never stored — only encrypted tokens.
            </p>
            <p>Auto-syncs your last 2 weeks of metrics on connect.</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full font-semibold" onClick={() => setDialogOpen(true)}>
              <Link2 className="size-4" />
              Connect
            </Button>
          </CardFooter>
        </Card>
        <ConnectGarminDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  const connection = statusQuery.data?.connection;
  const device = deviceQuery.data?.device;
  const watchStale = isWatchUploadStale(device?.lastUploadAt ?? null, tz);

  return (
    <Card className="group/card border-border shadow-none">
      <CardHeader>
        <ProviderBrand provider={provider} />
        <CardAction>
          <Badge className="border-success/30 bg-success/10 text-success">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Connected
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-2.5">
        <DetailRow label="Account">{connection?.displayName ?? 'Garmin athlete'}</DetailRow>
        <DetailRow label="Device">
          <span className="inline-flex items-center gap-1.5">
            <Watch className="size-3.5 text-muted-foreground" />
            {device?.deviceName ?? (deviceQuery.isLoading ? 'checking…' : 'unknown')}
          </span>
        </DetailRow>
        <DetailRow label="Watch → Connect">
          <span className={watchStale ? 'text-amber-500' : undefined}>
            {deviceQuery.isLoading
              ? 'checking…'
              : device?.lastUploadAt
                ? formatRelativeTime(device.lastUploadAt)
                : 'unknown'}
          </span>
        </DetailRow>
        <DetailRow label="Last sync">
          {connection?.lastSyncAt
            ? new Date(connection.lastSyncAt).toLocaleString('en-US')
            : 'never'}
        </DetailRow>
        {watchStale ? (
          <p className="text-xs text-amber-500/90">
            Sync your watch in Garmin Connect Mobile first, then sync here.
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          className="flex-1"
          onClick={() => syncMutation.mutate({ days: SYNC_DAYS, tz })}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive" disabled={disconnectMutation.isPending} />}
          >
            <Unlink className="size-4" />
            Disconnect
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Garmin?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes your encrypted tokens. Metrics already synced stay available. You can
                reconnect anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => disconnectMutation.mutate()}>
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
