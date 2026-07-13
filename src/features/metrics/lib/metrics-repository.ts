import type { DailyMetric, DailyMetricRow } from './types';

/** Acceso a la tabla `daily_metrics` en D1. */
export class MetricsRepository {
  constructor(private readonly db: D1Database) {}

  async upsertMany(userId: string, metrics: DailyMetric[]): Promise<void> {
    if (metrics.length === 0) {
      return;
    }

    const syncedAt = new Date().toISOString();
    const statement = this.db.prepare(
      `INSERT INTO daily_metrics (
         user_id, date, steps, sleep_seconds, resting_hr, avg_stress,
         body_battery_low, body_battery_high, hrv_weekly_avg, spo2_avg,
         active_calories, synced_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, date) DO UPDATE SET
         steps = excluded.steps,
         sleep_seconds = excluded.sleep_seconds,
         resting_hr = excluded.resting_hr,
         avg_stress = excluded.avg_stress,
         body_battery_low = excluded.body_battery_low,
         body_battery_high = excluded.body_battery_high,
         hrv_weekly_avg = excluded.hrv_weekly_avg,
         spo2_avg = excluded.spo2_avg,
         active_calories = excluded.active_calories,
         synced_at = excluded.synced_at`,
    );

    const batch = metrics.map((metric) =>
      statement.bind(
        userId,
        metric.date,
        metric.steps,
        metric.sleepSeconds,
        metric.restingHr,
        metric.avgStress,
        metric.bodyBatteryLow,
        metric.bodyBatteryHigh,
        metric.hrvWeeklyAvg,
        metric.spo2Avg,
        metric.activeCalories,
        syncedAt,
      ),
    );

    await this.db.batch(batch);
  }

  async listByRange(userId: string, from: string, to: string): Promise<DailyMetricRow[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM daily_metrics
         WHERE user_id = ? AND date >= ? AND date <= ?
         ORDER BY date DESC`,
      )
      .bind(userId, from, to)
      .all<DailyMetricRow>();

    return result.results ?? [];
  }

  async latest(userId: string): Promise<DailyMetricRow | null> {
    return this.db
      .prepare('SELECT * FROM daily_metrics WHERE user_id = ? ORDER BY date DESC LIMIT 1')
      .bind(userId)
      .first<DailyMetricRow>();
  }
}
