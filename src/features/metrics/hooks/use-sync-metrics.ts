import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SYNC_TOAST_ID = 'garmin-sync';

/** Query-key compartida para observar el estado del sync desde otros componentes. */
export const SYNC_MUTATION_KEY = ['sync-metrics'] as const;

export interface SyncVariables {
  from?: string;
  to?: string;
  days?: number;
  tz: string;
}

interface SyncResultBody {
  ok: boolean;
  result?: {
    syncedDays: number;
    daysWithData: number;
    from: string;
    to: string;
  };
  message?: string;
}

/**
 * Sincroniza metricas desde Garmin con feedback global via toasts. Acepta un
 * rango explicito (`from`/`to`) o `days`, ademas de la TZ efectiva.
 */
export function useSyncMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: SYNC_MUTATION_KEY,
    mutationFn: async (vars: SyncVariables): Promise<SyncResultBody> => {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      });
      const body = (await response.json()) as SyncResultBody;
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? 'Sync failed.');
      }
      return body;
    },
    onMutate: (vars) => {
      const scope =
        vars.from && vars.to ? `${vars.from} → ${vars.to}` : `the last ${vars.days ?? 7} days`;
      toast.loading('Syncing Garmin data…', {
        id: SYNC_TOAST_ID,
        description: `Pulling ${scope} from Garmin Connect.`,
      });
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['garmin-status'] });
      const result = body.result;
      toast.success('Sync complete', {
        id: SYNC_TOAST_ID,
        description: result
          ? `Synced ${result.syncedDays} days · ${result.daysWithData} with data.`
          : 'Metrics are up to date.',
      });
    },
    onError: (error) => {
      toast.error('Sync failed', {
        id: SYNC_TOAST_ID,
        description: error instanceof Error ? error.message : 'Could not reach Garmin.',
      });
    },
  });
}
