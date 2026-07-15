import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { addDaysIso } from '@/shared/lib/timezone';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

interface DayPickerProps {
  /** Dia seleccionado (`YYYY-MM-DD`). */
  value: string;
  onChange: (date: string) => void;
  /** Dia maximo seleccionable (hoy en la TZ efectiva). */
  maxDateIso: string;
  className?: string;
}

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatLabel(iso: string, today: string): string {
  if (iso === today) {
    return 'Today';
  }
  if (iso === addDaysIso(today, -1)) {
    return 'Yesterday';
  }
  return isoToLocalDate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function DayPicker({ value, onChange, maxDateIso, className }: DayPickerProps) {
  const [open, setOpen] = useState(false);
  const atMax = value >= maxDateIso;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Button
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        aria-label="Previous day"
        onClick={() => onChange(addDaysIso(value, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button variant="outline" size="sm" className="min-w-32 font-mono text-xs" />}
        >
          <CalendarDays className="size-3.5" />
          {formatLabel(value, maxDateIso)}
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="center">
          <Calendar
            mode="single"
            defaultMonth={isoToLocalDate(value)}
            selected={isoToLocalDate(value)}
            onSelect={(date) => {
              if (date) {
                onChange(localDateToIso(date));
                setOpen(false);
              }
            }}
            disabled={{ after: isoToLocalDate(maxDateIso) }}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        aria-label="Next day"
        disabled={atMax}
        onClick={() => onChange(addDaysIso(value, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
