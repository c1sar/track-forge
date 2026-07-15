import { useQuery } from '@tanstack/react-query';

import type { ConnectionStatus } from '@/features/garmin-connect/schemas';

export interface StatusResponse {
  ok: boolean;
  connection: ConnectionStatus;
}

async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch('/api/garmin/status');
  return (await response.json()) as StatusResponse;
}

export function useGarminStatus() {
  return useQuery({
    queryKey: ['garmin-status'],
    queryFn: fetchStatus,
    staleTime: 30_000,
  });
}
