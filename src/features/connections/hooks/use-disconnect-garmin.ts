import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DisconnectResponse {
  ok: boolean;
  message?: string;
}

/**
 * Desvincula la cuenta Garmin: borra los tokens cifrados y los metadatos.
 * Las métricas ya sincronizadas se conservan en D1.
 */
export function useDisconnectGarmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch('/api/connections/garmin/disconnect', { method: 'POST' });
      const body = (await response.json()) as DisconnectResponse;
      if (!response.ok || !body.ok) {
        throw new Error(body.message ?? 'Could not disconnect.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['garmin-status'] });
      queryClient.invalidateQueries({ queryKey: ['garmin-device'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Garmin disconnected', {
        description: 'Your encrypted tokens were deleted. Reconnect anytime.',
      });
    },
    onError: (error) => {
      toast.error('Disconnect failed', {
        description: error instanceof Error ? error.message : 'Try again.',
      });
    },
  });
}
