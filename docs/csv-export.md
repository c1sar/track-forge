# Exportación CSV para IA

El endpoint `GET /api/export/csv?from=YYYY-MM-DD&to=YYYY-MM-DD` (o el botón del dashboard) descarga tus métricas en un CSV diseñado para que un asistente de IA lo interprete sin ambigüedad.

## Formato

- Cabeceras en inglés `snake_case` (mejor tokenización para LLMs).
- Una fila por día, orden ascendente por fecha.
- Sin PII: no incluye email ni identificadores de usuario.
- Valores vacíos (`` `` ``) cuando Garmin no tenía dato ese día.

```csv
date,steps,sleep_hours,sleep_minutes,resting_hr_avg,avg_stress,body_battery_low,body_battery_high,hrv_weekly_avg,spo2_avg,active_calories
2026-07-13,4907,6,25,58,32,15,95,42.5,96.2,420
```

## Columnas

| Columna | Unidad | Descripción |
|---------|--------|-------------|
| `date` | ISO date | Día (YYYY-MM-DD) |
| `steps` | pasos | Total del día |
| `sleep_hours` / `sleep_minutes` | h / min | Duración de sueño |
| `resting_hr_avg` | ppm | FC en reposo |
| `avg_stress` | 0-100 | Estrés medio |
| `body_battery_low` / `body_battery_high` | 0-100 | Rango de Body Battery |
| `hrv_weekly_avg` | ms | HRV media semanal |
| `spo2_avg` | % | Saturación de oxígeno media |
| `active_calories` | kcal | Calorías activas |

## Prompt de ejemplo para tu asistente

> Adjunto un CSV con mis métricas diarias de Garmin (una fila por día). Analiza tendencias de las últimas semanas: correlaciona `avg_stress` y `hrv_weekly_avg` con `sleep_hours`, señala días atípicos en `resting_hr_avg`, y dame 3 recomendaciones accionables. Trata los valores vacíos como datos no disponibles, no como cero.

## Notas

- El rango por defecto es de 30 días si no se especifican `from`/`to`.
- Los valores vacíos deben interpretarse como "sin dato", nunca como `0`, para no sesgar medias.
