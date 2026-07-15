import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

export interface TrendPoint {
  date: string;
  value: number | null;
}

interface TrendChartProps {
  title: string;
  data: TrendPoint[];
  color?: 'chart-1' | 'chart-2' | 'chart-3';
}

const CHART_COLORS = {
  'chart-1': 'var(--chart-1)',
  'chart-2': 'var(--chart-2)',
  'chart-3': 'var(--chart-3)',
} as const;

export function TrendChart({ title, data, color = 'chart-1' }: TrendChartProps) {
  const hasData = data.some((point) => point.value !== null);
  const stroke = CHART_COLORS[color];

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-medium tracking-wide uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                strokeOpacity={0.6}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => value.slice(5)}
                tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                stroke="var(--muted-foreground)"
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                stroke="var(--muted-foreground)"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 'var(--radius)',
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-mono)',
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={stroke}
                strokeWidth={2}
                dot={false}
                connectNulls
                activeDot={{ r: 3, fill: stroke, stroke: 'var(--background)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center font-mono text-sm text-muted-foreground">
            No data in range.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
