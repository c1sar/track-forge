import type { DailyMetric } from '@/features/metrics/lib/types';

// CSV optimizado para que un asistente de IA lo interprete:
// headers en inglés snake_case, una fila por día, orden ascendente, sin PII.

const HEADERS = [
  'date',
  'steps',
  'sleep_hours',
  'sleep_minutes',
  'resting_hr_avg',
  'avg_stress',
  'body_battery_low',
  'body_battery_high',
  'hrv_weekly_avg',
  'spo2_avg',
  'active_calories',
] as const;

function cell(value: number | null): string {
  return value === null || value === undefined ? '' : String(value);
}

export function buildMetricsCsv(metrics: DailyMetric[]): string {
  const ordered = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
  const lines = [HEADERS.join(',')];

  for (const metric of ordered) {
    const sleepHours = metric.sleepSeconds !== null ? Math.floor(metric.sleepSeconds / 3600) : null;
    const sleepMinutes =
      metric.sleepSeconds !== null ? Math.floor((metric.sleepSeconds % 3600) / 60) : null;

    lines.push(
      [
        metric.date,
        cell(metric.steps),
        cell(sleepHours),
        cell(sleepMinutes),
        cell(metric.restingHr),
        cell(metric.avgStress),
        cell(metric.bodyBatteryLow),
        cell(metric.bodyBatteryHigh),
        cell(metric.hrvWeeklyAvg),
        cell(metric.spo2Avg),
        cell(metric.activeCalories),
      ].join(','),
    );
  }

  return lines.join('\n');
}

export function csvFileName(from: string, to: string): string {
  return `garmin-metrics-${from}_${to}.csv`;
}
