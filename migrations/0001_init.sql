-- Garmin Cloud initial schema
-- Multi-user: cada usuario de la app puede vincular una cuenta Garmin.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Metadatos de la cuenta Garmin vinculada. Los tokens OAuth NO se guardan aqui:
-- viven cifrados en KV bajo la clave referenciada por token_kv_key.
CREATE TABLE IF NOT EXISTS garmin_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  token_kv_key TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  last_sync_at TEXT
);

-- Una fila por usuario y dia. Columnas nullable: si Garmin no tiene un dato
-- para ese dia, se guarda NULL en vez de fallar toda la sincronizacion.
CREATE TABLE IF NOT EXISTS daily_metrics (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
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
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date
  ON daily_metrics (user_id, date DESC);
