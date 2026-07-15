/** Métrica diaria en formato de dominio (camelCase, nulls permitidos). */
export interface DailyMetric {
  date: string;
  steps: number | null;
  sleepSeconds: number | null;
  restingHr: number | null;
  avgStress: number | null;
  bodyBatteryLow: number | null;
  bodyBatteryHigh: number | null;
  hrvWeeklyAvg: number | null;
  spo2Avg: number | null;
  activeCalories: number | null;
}

/** Campos métricos de un día (excluye `date`). Fuente única para sync y merge. */
export const DAILY_METRIC_FIELDS: ReadonlyArray<Exclude<keyof DailyMetric, 'date'>> = [
  'steps',
  'sleepSeconds',
  'restingHr',
  'avgStress',
  'bodyBatteryLow',
  'bodyBatteryHigh',
  'hrvWeeklyAvg',
  'spo2Avg',
  'activeCalories',
];

/** Fila tal cual se almacena en D1 (snake_case). Una por usuario+día+fuente. */
export interface DailyMetricRow {
  user_id: string;
  date: string;
  /** Proveedor de origen del dato (id del registry, p.ej. 'garmin'). */
  source: string;
  steps: number | null;
  sleep_seconds: number | null;
  resting_hr: number | null;
  avg_stress: number | null;
  body_battery_low: number | null;
  body_battery_high: number | null;
  hrv_weekly_avg: number | null;
  spo2_avg: number | null;
  active_calories: number | null;
  synced_at: string;
}

export function rowToDailyMetric(row: DailyMetricRow): DailyMetric {
  return {
    date: row.date,
    steps: row.steps,
    sleepSeconds: row.sleep_seconds,
    restingHr: row.resting_hr,
    avgStress: row.avg_stress,
    bodyBatteryLow: row.body_battery_low,
    bodyBatteryHigh: row.body_battery_high,
    hrvWeeklyAvg: row.hrv_weekly_avg,
    spo2Avg: row.spo2_avg,
    activeCalories: row.active_calories,
  };
}
