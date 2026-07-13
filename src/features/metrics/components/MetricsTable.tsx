import type { DailyMetric } from '@/features/metrics/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

function value(input: number | null, suffix = ''): string {
  return input === null ? '—' : `${input.toLocaleString('es-ES')}${suffix}`;
}

function sleep(seconds: number | null): string {
  if (seconds === null) {
    return '—';
  }
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function MetricsTable({ metrics }: { metrics: DailyMetric[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Pasos</TableHead>
          <TableHead>Sueño</TableHead>
          <TableHead>FC rep.</TableHead>
          <TableHead>Estrés</TableHead>
          <TableHead>Body Batt.</TableHead>
          <TableHead>HRV</TableHead>
          <TableHead>SpO2</TableHead>
          <TableHead>Kcal act.</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((metric) => (
          <TableRow key={metric.date}>
            <TableCell className="font-medium">{metric.date}</TableCell>
            <TableCell>{value(metric.steps)}</TableCell>
            <TableCell>{sleep(metric.sleepSeconds)}</TableCell>
            <TableCell>{value(metric.restingHr)}</TableCell>
            <TableCell>{value(metric.avgStress)}</TableCell>
            <TableCell>
              {metric.bodyBatteryLow != null && metric.bodyBatteryHigh != null
                ? `${metric.bodyBatteryLow}–${metric.bodyBatteryHigh}`
                : '—'}
            </TableCell>
            <TableCell>{value(metric.hrvWeeklyAvg)}</TableCell>
            <TableCell>{value(metric.spo2Avg, '%')}</TableCell>
            <TableCell>{value(metric.activeCalories)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
