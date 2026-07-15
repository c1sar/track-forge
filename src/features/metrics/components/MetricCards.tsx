import { Activity, Battery, Flame, Footprints, Heart, HeartPulse, Moon, Wind } from 'lucide-react';

import type { DailyMetric } from '@/features/metrics/lib/types';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

interface MetricCardsProps {
  metric: DailyMetric | null;
}

function formatNumber(value: number | null, suffix = ''): string {
  if (value === null) {
    return '—';
  }
  return `${value.toLocaleString('en-US')}${suffix}`;
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
    { label: 'Steps', value: formatNumber(metric?.steps ?? null), icon: Footprints },
    { label: 'Sleep', value: formatSleep(metric?.sleepSeconds ?? null), icon: Moon },
    { label: 'Resting HR', value: formatNumber(metric?.restingHr ?? null, ' bpm'), icon: Heart },
    { label: 'Avg Stress', value: formatNumber(metric?.avgStress ?? null), icon: Activity },
    {
      label: 'Body Battery',
      value:
        metric?.bodyBatteryLow != null && metric?.bodyBatteryHigh != null
          ? `${metric.bodyBatteryLow}–${metric.bodyBatteryHigh}`
          : '—',
      icon: Battery,
    },
    {
      label: 'HRV (7d avg)',
      value: formatNumber(metric?.hrvWeeklyAvg ?? null, ' ms'),
      icon: HeartPulse,
    },
    { label: 'SpO2 avg', value: formatNumber(metric?.spo2Avg ?? null, '%'), icon: Wind },
    {
      label: 'Active kcal',
      value: formatNumber(metric?.activeCalories ?? null, ' kcal'),
      icon: Flame,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card
          key={label}
          size="sm"
          className="gap-1.5 border-border shadow-none transition-colors hover:border-primary/30 [--card-spacing:--spacing(3)] sm:gap-2 sm:[--card-spacing:--spacing(4)]"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:gap-2 sm:text-xs">
              <Icon className="size-3 shrink-0 text-primary/70 sm:size-3.5" />
              <span className="truncate">{label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                'font-mono text-lg font-semibold tracking-tight tabular-nums sm:text-xl',
                value === '—' && 'text-muted-foreground',
              )}
            >
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
