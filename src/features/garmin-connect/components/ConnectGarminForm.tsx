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
    setError(response.message ?? 'No se pudo conectar con Garmin.');
  }

  const onCredentialsSubmit = credentialsForm.handleSubmit(async (values) => {
    setError(null);
    setPending(true);
    try {
      handleResponse(await postJson('/api/garmin/connect', values));
    } catch {
      setError('Error de red al contactar el servidor.');
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
      setError('Error de red al verificar el código.');
    } finally {
      setPending(false);
    }
  });

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Vincular Garmin Connect</CardTitle>
        <CardDescription>
          Tus credenciales solo se usan para el login y no se guardan. Únicamente se almacenan de
          forma cifrada los tokens de acceso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={onCredentialsSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email de Garmin</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="tu-email@ejemplo.com"
              disabled={Boolean(mfaSessionId)}
              {...credentialsForm.register('email')}
            />
            {credentialsForm.formState.errors.email ? (
              <p className="text-sm text-destructive">
                {credentialsForm.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña de Garmin</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={Boolean(mfaSessionId)}
              {...credentialsForm.register('password')}
            />
            {credentialsForm.formState.errors.password ? (
              <p className="text-sm text-destructive">
                {credentialsForm.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={pending || Boolean(mfaSessionId)}>
            {pending && !mfaSessionId ? <Loader2 className="size-4 animate-spin" /> : null}
            Conectar
          </Button>
        </form>

        {mfaSessionId ? (
          <form className="space-y-4 border-t pt-4" onSubmit={onMfaSubmit}>
            <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50">
              <ShieldCheck className="size-4" />
              <AlertTitle>Verificación MFA</AlertTitle>
              <AlertDescription>
                Garmin envió un código a tu email o app authenticator. Introdúcelo abajo.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="mfaCode">Código MFA (6 dígitos)</Label>
              <Input
                id="mfaCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                {...mfaForm.register('mfaCode')}
              />
              {mfaForm.formState.errors.mfaCode ? (
                <p className="text-sm text-destructive">
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
                Reiniciar
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Verificar código
              </Button>
            </div>
          </form>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <XCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!error && !mfaSessionId ? (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertTitle>Listo para conectar</AlertTitle>
            <AlertDescription>
              Al conectar, sincronizaremos automáticamente tus últimas 2 semanas.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
