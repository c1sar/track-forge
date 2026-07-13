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
}

export function TrendChart({ title, data }: TrendChartProps) {
  const hasData = data.some((point) => point.value !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => value.slice(5)}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelFormatter={(label: string) => `Fecha: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Sin datos en este rango.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
