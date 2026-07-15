import { useQuery } from '@tanstack/react-query';

import type { ProviderDevice } from '@/features/connections/lib/provider';

export interface DeviceStatusResponse {
  ok: boolean;
  device: ProviderDevice;
}

async function fetchDeviceStatus(): Promise<DeviceStatusResponse> {
  const response = await fetch('/api/connections/garmin/device-status');
  return (await response.json()) as DeviceStatusResponse;
}

export function useGarminDevice(enabled: boolean) {
  return useQuery({
    queryKey: ['garmin-device'],
    queryFn: fetchDeviceStatus,
    staleTime: 60_000,
    enabled,
  });
}
