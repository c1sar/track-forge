import { Activity, Battery, Flame, Footprints, Heart, HeartPulse, Moon, Wind } from 'lucide-react';

import type { DailyMetric } from '@/features/metrics/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

interface MetricCardsProps {
  metric: DailyMetric | null;
}

function formatNumber(value: number | null, suffix = ''): string {
  if (value === null) {
    return '—';
  }
  return `${value.toLocaleString('es-ES')}${suffix}`;
}

function formatSleep(seconds: number | null): string {
  if (seconds === null) {
    return '—';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function MetricCards({ metric }: MetricCardsProps) {
  const cards = [
    { label: 'Pasos', value: formatNumber(metric?.steps ?? null), icon: Footprints },
    { label: 'Sueño', value: formatSleep(metric?.sleepSeconds ?? null), icon: Moon },
    { label: 'FC reposo', value: formatNumber(metric?.restingHr ?? null, ' ppm'), icon: Heart },
    { label: 'Estrés medio', value: formatNumber(metric?.avgStress ?? null), icon: Activity },
    {
      label: 'Body Battery',
      value:
        metric?.bodyBatteryLow != null && metric?.bodyBatteryHigh != null
          ? `${metric.bodyBatteryLow}–${metric.bodyBatteryHigh}`
          : '—',
      icon: Battery,
    },
    {
      label: 'HRV (media sem.)',
      value: formatNumber(metric?.hrvWeeklyAvg ?? null, ' ms'),
      icon: HeartPulse,
    },
    { label: 'SpO2 medio', value: formatNumber(metric?.spo2Avg ?? null, '%'), icon: Wind },
    {
      label: 'Calorías activas',
      value: formatNumber(metric?.activeCalories ?? null, ' kcal'),
      icon: Flame,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label} size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Icon className="size-4" />
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
