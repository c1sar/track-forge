import { useQuery } from '@tanstack/react-query';

import type { DeviceLastSync } from '@/features/garmin-connect/schemas';

export interface DeviceStatusResponse {
  ok: boolean;
  device: DeviceLastSync;
}

async function fetchDeviceStatus(): Promise<DeviceStatusResponse> {
  const response = await fetch('/api/garmin/device-status');
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
