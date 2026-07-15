import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { browserTimeZone } from '@/features/metrics/hooks/use-effective-timezone';
import { todayInTz } from '@/shared/lib/timezone';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

interface SettingsResponse {
  ok: boolean;
  settings: { timezone: string | null };
}

const AUTO_VALUE = '__auto__';

function supportedTimeZones(): string[] {
  try {
    const values = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.('timeZone');
    if (values && values.length > 0) {
      return values;
    }
  } catch {
    // fallthrough
  }
  // Fallback curado si el runtime no soporta supportedValuesOf.
  return [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Bogota',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Manila',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Asia/Kolkata',
    'Australia/Sydney',
  ];
}

async function fetchSettings(): Promise<SettingsResponse> {
  const response = await fetch('/api/settings');
  return (await response.json()) as SettingsResponse;
}

export function SettingsApp() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  const detected = browserTimeZone();
  const zones = useMemo(() => supportedTimeZones(), []);

  // `null` (auto) representa "usar la del navegador".
  const [selection, setSelection] = useState<string>(AUTO_VALUE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setSelection(settingsQuery.data.settings.timezone ?? AUTO_VALUE);
    }
  }, [settingsQuery.data]);

  const effective = selection === AUTO_VALUE ? detected : selection;

  async function handleSave() {
    setSaving(true);
    try {
      const timezone = selection === AUTO_VALUE ? null : selection;
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Could not save settings.');
      }
      // Invalida status (que expone la tz) y las metricas dependientes de la tz.
      queryClient.invalidateQueries({ queryKey: ['garmin-status'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Settings saved', {
        description: `Timezone: ${timezone ?? `Auto (${detected})`}`,
      });
    } catch (error) {
      toast.error('Save failed', {
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
            <Clock className="size-4 text-primary" />
            Timezone
          </CardTitle>
          <CardDescription>
            TrackForge aligns your daily metrics to this timezone (Garmin stores data per local
            calendar day). "Auto" follows your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="timezone"
              className="text-xs tracking-wide text-muted-foreground uppercase"
            >
              Preferred timezone
            </Label>
            <NativeSelect
              className="w-full"
              id="timezone"
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
              disabled={settingsQuery.isLoading}
            >
              <NativeSelectOption value={AUTO_VALUE}>
                Auto — browser ({detected})
              </NativeSelectOption>
              {zones.map((zone) => (
                <NativeSelectOption key={zone} value={zone}>
                  {zone}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="rounded-md border border-border bg-card px-3 py-2">
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              Effective: {effective} · Today = {todayInTz(effective)}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || settingsQuery.isLoading}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
