import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { type CredentialsInput, credentialsSchema } from '@/features/auth/schemas';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const COPY = {
  login: {
    title: 'Iniciar sesión',
    description: 'Accede a tu panel de métricas de Garmin.',
    submit: 'Entrar',
    endpoint: '/api/auth/login',
    switchText: '¿No tienes cuenta?',
    switchHref: '/register',
    switchLabel: 'Regístrate',
  },
  register: {
    title: 'Crear cuenta',
    description: 'Crea una cuenta para vincular tu Garmin Connect.',
    submit: 'Registrarme',
    endpoint: '/api/auth/register',
    switchText: '¿Ya tienes cuenta?',
    switchHref: '/login',
    switchLabel: 'Inicia sesión',
  },
} as const;

export function AuthForm({ mode }: AuthFormProps) {
  const copy = COPY[mode];
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CredentialsInput>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const response = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        setServerError(payload.message ?? 'No se pudo completar la operación.');
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setServerError('Error de red. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {copy.submit}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {copy.switchText}{' '}
          <a className="font-medium text-foreground underline" href={copy.switchHref}>
            {copy.switchLabel}
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
