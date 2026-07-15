import { useCallback, useMemo, useState } from 'react';

import {
  addDaysIso,
  daysBetweenIso,
  isoDaysAgoInTz,
  isValidIsoDate,
  todayInTz,
} from '@/shared/lib/timezone';

export type RangeMode = 'week' | 'month' | 'custom';

export const PRESET_DAYS: Record<'week' | 'month', number> = {
  week: 7,
  month: 30,
};

export interface DateRange {
  from: string;
  to: string;
}

function readInitial(): { mode: RangeMode; custom: DateRange | null } {
  if (typeof window === 'undefined') {
    return { mode: 'week', custom: null };
  }
  const params = new URLSearchParams(window.location.search);
  const from = params.get('from');
  const to = params.get('to');
  if (from && to && isValidIsoDate(from) && isValidIsoDate(to)) {
    const range = from <= to ? { from, to } : { from: to, to: from };
    return { mode: 'custom', custom: range };
  }
  const period = params.get('period');
  return { mode: period === 'month' ? 'month' : 'week', custom: null };
}

function writeUrl(mode: RangeMode, range: DateRange) {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(window.location.href);
  if (mode === 'custom') {
    url.searchParams.set('from', range.from);
    url.searchParams.set('to', range.to);
    url.searchParams.delete('period');
  } else {
    url.searchParams.set('period', mode);
    url.searchParams.delete('from');
    url.searchParams.delete('to');
  }
  window.history.replaceState(null, '', url.toString());
}

/**
 * Modelo de rango de fechas (week | month | custom) anclado a la zona horaria
 * efectiva del usuario y sincronizado con la URL (`?period=` o `?from=&to=`).
 */
export function useDateRange(tz: string) {
  const initial = useMemo(readInitial, []);
  const [mode, setMode] = useState<RangeMode>(initial.mode);
  const [custom, setCustom] = useState<DateRange | null>(initial.custom);

  const range: DateRange = useMemo(() => {
    if (mode === 'custom' && custom) {
      return custom;
    }
    const presetDays = PRESET_DAYS[mode === 'custom' ? 'week' : mode];
    return { from: isoDaysAgoInTz(presetDays - 1, tz), to: todayInTz(tz) };
  }, [mode, custom, tz]);

  const setPreset = useCallback(
    (next: 'week' | 'month') => {
      setMode(next);
      setCustom(null);
      const presetRange = {
        from: isoDaysAgoInTz(PRESET_DAYS[next] - 1, tz),
        to: todayInTz(tz),
      };
      writeUrl(next, presetRange);
    },
    [tz],
  );

  const setCustomRange = useCallback((from: string, to: string) => {
    const normalized = from <= to ? { from, to } : { from: to, to: from };
    setMode('custom');
    setCustom(normalized);
    writeUrl('custom', normalized);
  }, []);

  const days = mode === 'custom' ? daysBetweenIso(range.from, range.to) : PRESET_DAYS[mode];

  return { mode, range, days, setPreset, setCustomRange };
}

export { addDaysIso };
