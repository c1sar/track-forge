import type { ConnectApiClient } from '@/features/garmin-connect/lib/connect-api-client';
import type { DailyMetric } from '@/features/metrics/lib/types';

// Extracción de métricas wellness desde connectapi.garmin.com. Cada métrica se
// aísla: si un endpoint falla o no tiene datos, se devuelve null en vez de
// romper toda la sincronización del día.

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

interface StepsEntry {
  calendarDate?: string;
  totalSteps?: number | null;
}

async function fetchSteps(client: ConnectApiClient, date: string): Promise<number | null> {
  const entries = await client.get<StepsEntry[]>(
    `/usersummary-service/stats/steps/daily/${date}/${date}`,
  );
  const match = entries.find((entry) => entry.calendarDate === date);
  return typeof match?.totalSteps === 'number' ? match.totalSteps : null;
}

interface SleepResponse {
  dailySleepDTO?: {
    sleepTimeSeconds?: number | null;
    sleepStartTimestampGMT?: number | null;
    sleepEndTimestampGMT?: number | null;
  };
}

async function fetchSleepSeconds(client: ConnectApiClient, date: string): Promise<number | null> {
  const sleep = await client.get<SleepResponse>('/sleep-service/sleep/dailySleepData', { date });
  const dto = sleep.dailySleepDTO;
  if (!dto) {
    return null;
  }
  if (typeof dto.sleepTimeSeconds === 'number' && dto.sleepTimeSeconds > 0) {
    return dto.sleepTimeSeconds;
  }
  if (
    typeof dto.sleepStartTimestampGMT === 'number' &&
    typeof dto.sleepEndTimestampGMT === 'number'
  ) {
    return Math.max(0, Math.floor((dto.sleepEndTimestampGMT - dto.sleepStartTimestampGMT) / 1000));
  }
  return null;
}

interface HeartRateResponse {
  restingHeartRate?: number | null;
}

async function fetchRestingHr(client: ConnectApiClient, date: string): Promise<number | null> {
  const hr = await client.get<HeartRateResponse>('/wellness-service/wellness/dailyHeartRate', {
    date,
  });
  return typeof hr.restingHeartRate === 'number' ? hr.restingHeartRate : null;
}

interface StressResponse {
  avgStressLevel?: number | null;
}

async function fetchStress(client: ConnectApiClient, date: string): Promise<number | null> {
  const stress = await client.get<StressResponse>(`/wellness-service/wellness/dailyStress/${date}`);
  return typeof stress.avgStressLevel === 'number' && stress.avgStressLevel >= 0
    ? stress.avgStressLevel
    : null;
}

interface BodyBatteryEntry {
  bodyBatteryValuesArray?: Array<[number, number | null]>;
}

async function fetchBodyBattery(
  client: ConnectApiClient,
  date: string,
): Promise<{ low: number | null; high: number | null }> {
  const report = await client.get<BodyBatteryEntry[]>(
    '/wellness-service/wellness/bodyBattery/reports/daily',
    { startDate: date, endDate: date },
  );

  const values = report
    .flatMap((entry) => entry.bodyBatteryValuesArray ?? [])
    .map(([, level]) => level)
    .filter((level): level is number => typeof level === 'number');

  if (values.length === 0) {
    return { low: null, high: null };
  }
  return { low: Math.min(...values), high: Math.max(...values) };
}

interface HrvResponse {
  hrvSummary?: { weeklyAvg?: number | null };
}

async function fetchHrv(client: ConnectApiClient, date: string): Promise<number | null> {
  const hrv = await client.get<HrvResponse>(`/hrv-service/hrv/${date}`);
  return typeof hrv.hrvSummary?.weeklyAvg === 'number' ? hrv.hrvSummary.weeklyAvg : null;
}

interface Spo2Response {
  averageSpO2?: number | null;
  averageSpo2?: number | null;
}

async function fetchSpo2(client: ConnectApiClient, date: string): Promise<number | null> {
  const spo2 = await client.get<Spo2Response>(`/wellness-service/wellness/daily/spo2/${date}`);
  const value = spo2.averageSpO2 ?? spo2.averageSpo2;
  return typeof value === 'number' ? value : null;
}

interface UserSummaryResponse {
  activeKilocalories?: number | null;
}

async function fetchActiveCalories(
  client: ConnectApiClient,
  displayName: string,
  date: string,
): Promise<number | null> {
  const summary = await client.get<UserSummaryResponse>(
    `/usersummary-service/usersummary/daily/${displayName}`,
    { calendarDate: date },
  );
  return typeof summary.activeKilocalories === 'number' ? summary.activeKilocalories : null;
}

/** Obtiene todas las métricas wellness de un día. Ninguna es obligatoria. */
export async function fetchDayMetrics(
  client: ConnectApiClient,
  displayName: string,
  date: string,
): Promise<DailyMetric> {
  const [
    steps,
    sleepSeconds,
    restingHr,
    avgStress,
    bodyBattery,
    hrvWeeklyAvg,
    spo2Avg,
    activeCalories,
  ] = await Promise.all([
    safe(() => fetchSteps(client, date)),
    safe(() => fetchSleepSeconds(client, date)),
    safe(() => fetchRestingHr(client, date)),
    safe(() => fetchStress(client, date)),
    safe(() => fetchBodyBattery(client, date)),
    safe(() => fetchHrv(client, date)),
    safe(() => fetchSpo2(client, date)),
    safe(() => fetchActiveCalories(client, displayName, date)),
  ]);

  return {
    date,
    steps,
    sleepSeconds,
    restingHr,
    avgStress,
    bodyBatteryLow: bodyBattery?.low ?? null,
    bodyBatteryHigh: bodyBattery?.high ?? null,
    hrvWeeklyAvg,
    spo2Avg,
    activeCalories,
  };
}
