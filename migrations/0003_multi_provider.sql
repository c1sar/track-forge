-- Multi-provider: cuentas vinculadas genéricas + dimensión `source` en métricas.
-- Migración aditiva: conserva todos los datos existentes (backfill 'garmin').

-- 1. Cuentas vinculadas genéricas: una fila por usuario+proveedor.
--    Reemplaza a `garmin_accounts` (que era 1 fila por usuario, solo Garmin).
CREATE TABLE IF NOT EXISTS linked_accounts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  display_name TEXT,
  token_kv_key TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  last_sync_at TEXT,
  PRIMARY KEY (user_id, provider)
);

INSERT INTO linked_accounts (user_id, provider, display_name, token_kv_key, connected_at, last_sync_at)
SELECT user_id, 'garmin', display_name, token_kv_key, connected_at, last_sync_at
FROM garmin_accounts;

DROP TABLE garmin_accounts;

-- 2. `daily_metrics` con dimensión de origen. SQLite no permite alterar la PK,
--    así que se reconstruye la tabla con PK (user_id, date, source).
--    Una fila por proveedor y día; el merge entre fuentes se hace al leer.
CREATE TABLE daily_metrics_new (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'garmin',
  steps INTEGER,
  sleep_seconds INTEGER,
  resting_hr INTEGER,
  avg_stress INTEGER,
  body_battery_low INTEGER,
  body_battery_high INTEGER,
  hrv_weekly_avg REAL,
  spo2_avg REAL,
  active_calories INTEGER,
  synced_at TEXT NOT NULL,
  PRIMARY KEY (user_id, date, source)
);

INSERT INTO daily_metrics_new (
  user_id, date, source, steps, sleep_seconds, resting_hr, avg_stress,
  body_battery_low, body_battery_high, hrv_weekly_avg, spo2_avg,
  active_calories, synced_at
)
SELECT
  user_id, date, 'garmin', steps, sleep_seconds, resting_hr, avg_stress,
  body_battery_low, body_battery_high, hrv_weekly_avg, spo2_avg,
  active_calories, synced_at
FROM daily_metrics;

DROP TABLE daily_metrics;
ALTER TABLE daily_metrics_new RENAME TO daily_metrics;

DROP INDEX IF EXISTS idx_daily_metrics_user_date;
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_source_date
  ON daily_metrics (user_id, source, date DESC);
