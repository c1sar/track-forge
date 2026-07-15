import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  type ConnectRequest,
  connectRequestSchema,
  type MfaRequest,
  mfaRequestSchema,
} from '@/features/garmin-connect/schemas';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';

interface ConnectResponse {
  ok: boolean;
  status?: string;
  displayName?: string | null;
  mfaRequired?: boolean;
  mfaSessionId?: string;
  message?: string;
}

async function postJson(url: string, body: unknown): Promise<ConnectResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await response.json()) as ConnectResponse;
}

export function ConnectGarminForm() {
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const credentialsForm = useForm<ConnectRequest>({
    resolver: zodResolver(connectRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const mfaForm = useForm<Pick<MfaRequest, 'mfaCode'>>({
    resolver: zodResolver(mfaRequestSchema.pick({ mfaCode: true })),
    defaultValues: { mfaCode: '' },
  });

  function handleResponse(response: ConnectResponse): void {
    if (response.mfaRequired && response.mfaSessionId) {
      setMfaSessionId(response.mfaSessionId);
      mfaForm.reset({ mfaCode: '' });
      return;
    }
    if (response.ok && response.status === 'connected') {
      window.location.href = '/dashboard';
      return;
    }
    setError(response.message ?? 'Could not connect to Garmin.');
  }

  const onCredentialsSubmit = credentialsForm.handleSubmit(async (values) => {
    setError(null);
    setPending(true);
    try {
      handleResponse(await postJson('/api/garmin/connect', values));
    } catch {
      setError('Network error. Check your connection and retry.');
    } finally {
      setPending(false);
    }
  });

  const onMfaSubmit = mfaForm.handleSubmit(async (values) => {
    if (!mfaSessionId) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      handleResponse(await postJson('/api/garmin/mfa', { mfaSessionId, mfaCode: values.mfaCode }));
    } catch {
      setError('Network error verifying code.');
    } finally {
      setPending(false);
    }
  });

  return (
    <Card className="w-full border-border shadow-none">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Link Garmin Connect</CardTitle>
        <CardDescription>
          Credentials are used only for authentication — never stored. Only encrypted access tokens
          are persisted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={onCredentialsSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs tracking-wide text-muted-foreground uppercase"
            >
              Garmin email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="athlete@email.com"
              className="h-10 border-border bg-card"
              disabled={Boolean(mfaSessionId)}
              {...credentialsForm.register('email')}
            />
            {credentialsForm.formState.errors.email ? (
              <p className="text-xs text-destructive">
                {credentialsForm.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs tracking-wide text-muted-foreground uppercase"
            >
              Garmin password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-10 border-border bg-card"
              disabled={Boolean(mfaSessionId)}
              {...credentialsForm.register('password')}
            />
            {credentialsForm.formState.errors.password ? (
              <p className="text-xs text-destructive">
                {credentialsForm.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="h-10 w-full font-semibold tracking-wide uppercase"
            disabled={pending || Boolean(mfaSessionId)}
          >
            {pending && !mfaSessionId ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect
          </Button>
        </form>

        {mfaSessionId ? (
          <form className="space-y-4" onSubmit={onMfaSubmit}>
            <Separator />
            <Alert className="border-primary/30 bg-primary/5">
              <ShieldCheck className="size-4 text-primary" />
              <AlertTitle>MFA verification</AlertTitle>
              <AlertDescription>
                Garmin sent a code to your email or authenticator app. Enter it below.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label
                htmlFor="mfaCode"
                className="text-xs tracking-wide text-muted-foreground uppercase"
              >
                MFA code (6 digits)
              </Label>
              <Input
                id="mfaCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                className="h-10 border-border bg-card font-mono tracking-widest"
                {...mfaForm.register('mfaCode')}
              />
              {mfaForm.formState.errors.mfaCode ? (
                <p className="text-xs text-destructive">
                  {mfaForm.formState.errors.mfaCode.message}
                </p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={pending}
                onClick={() => {
                  setMfaSessionId(null);
                  setError(null);
                  mfaForm.reset({ mfaCode: '' });
                }}
              >
                Reset
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify
              </Button>
            </div>
          </form>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertTitle>Connection failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!error && !mfaSessionId ? (
          <Alert className="border-success/30 bg-success/5">
            <CheckCircle2 className="size-4 text-success" />
            <AlertTitle>Ready to link</AlertTitle>
            <AlertDescription>
              On connect, we automatically sync your last 2 weeks of metrics.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
