import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { type CredentialsInput, credentialsSchema } from '@/features/auth/schemas';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const COPY = {
  login: {
    title: 'Enter the Forge',
    description: 'Access your performance command center.',
    submit: 'Enter Forge',
    endpoint: '/api/auth/login',
    switchText: 'No account yet?',
    switchHref: '/register',
    switchLabel: 'Join the Forge',
  },
  register: {
    title: 'Join the Forge',
    description: 'Create your account. Link Garmin. Engineer your performance.',
    submit: 'Join the Forge',
    endpoint: '/api/auth/register',
    switchText: 'Already forged?',
    switchHref: '/login',
    switchLabel: 'Sign in',
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
        setServerError(payload.message ?? 'Operation failed. Try again.');
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setServerError('Network error. Check your connection and retry.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto w-full max-w-sm space-y-8">
      <BrandLogo size="lg" showTagline />

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs tracking-wide text-muted-foreground uppercase">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="athlete@email.com"
            className="h-10 border-border bg-card"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-xs tracking-wide text-muted-foreground uppercase"
          >
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            className="h-10 border-border bg-card"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        {serverError ? (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          className="h-10 w-full font-semibold tracking-wide uppercase"
          disabled={submitting}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {copy.submit}
        </Button>
      </form>

      <Separator />

      <p className="text-center text-sm text-muted-foreground">
        {copy.switchText}{' '}
        <a
          className="font-medium text-primary underline-offset-4 transition-colors hover:underline"
          href={copy.switchHref}
        >
          {copy.switchLabel}
        </a>
      </p>
    </div>
  );
}
