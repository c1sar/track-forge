import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import type { DateRange as RdpDateRange } from 'react-day-picker';

import type { DateRange, RangeMode } from '@/features/metrics/hooks/use-date-range';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

interface DateRangeControlProps {
  mode: RangeMode;
  range: DateRange;
  onPreset: (mode: 'week' | 'month') => void;
  onCustomRange: (from: string, to: string) => void;
  /** Fecha maxima seleccionable (hoy en la TZ efectiva). */
  maxDateIso: string;
  className?: string;
}

/** ISO `YYYY-MM-DD` -> Date local (medianoche) para el calendario. */
function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** Date local -> ISO `YYYY-MM-DD` usando componentes locales (sin desfase UTC). */
function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const PRESETS: { value: 'week' | 'month'; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export function DateRangeControl({
  mode,
  range,
  onPreset,
  onCustomRange,
  maxDateIso,
  className,
}: DateRangeControlProps) {
  const [open, setOpen] = useState(false);

  const selected: RdpDateRange | undefined =
    mode === 'custom'
      ? { from: isoToLocalDate(range.from), to: isoToLocalDate(range.to) }
      : undefined;

  function handleSelect(next: RdpDateRange | undefined) {
    if (next?.from && next?.to) {
      onCustomRange(localDateToIso(next.from), localDateToIso(next.to));
      setOpen(false);
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex rounded-md border border-border p-0.5">
        {PRESETS.map(({ value, label }) => (
          <button
            type="button"
            key={value}
            onClick={() => onPreset(value)}
            aria-pressed={mode === value}
            className={cn(
              'rounded-sm px-3 py-1 font-mono text-xs font-medium transition-colors',
              mode === value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant={mode === 'custom' ? 'default' : 'outline'}
              size="sm"
              className="font-mono text-xs"
            />
          }
        >
          <CalendarDays className="size-3.5" />
          {mode === 'custom' ? `${range.from} → ${range.to}` : 'Custom'}
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="end">
          <Calendar
            mode="range"
            numberOfMonths={1}
            defaultMonth={isoToLocalDate(range.to)}
            selected={selected}
            onSelect={handleSelect}
            disabled={{ after: isoToLocalDate(maxDateIso) }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
