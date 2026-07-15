import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  type ConnectRequest,
  connectRequestSchema,
  type MfaRequest,
  mfaRequestSchema,
} from '@/features/garmin-connect/schemas';

interface ConnectResponse {
  ok: boolean;
  status?: string;
  displayName?: string | null;
  mfaRequired?: boolean;
  mfaSessionId?: string;
  message?: string;
}

type MfaCodeForm = Pick<MfaRequest, 'mfaCode'>;

async function postJson(url: string, body: unknown): Promise<ConnectResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await response.json()) as ConnectResponse;
}

interface UseGarminLinkOptions {
  /** Se ejecuta cuando la vinculación se completa (p.ej. cerrar el diálogo). */
  onConnected?: () => void;
}

/**
 * Máquina de estados del login de Garmin: credenciales → (MFA) → conectado.
 * Encapsula formularios, estado de red y efectos secundarios de éxito
 * (invalidar queries + toast) para que la UI sea puramente presentacional.
 */
export function useGarminLink({ onConnected }: UseGarminLinkOptions = {}) {
  const queryClient = useQueryClient();
  const [mfaSessionId, setMfaSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const credentialsForm = useForm<ConnectRequest>({
    resolver: zodResolver(connectRequestSchema),
    defaultValues: { email: '', password: '' },
  });

  const mfaForm = useForm<MfaCodeForm>({
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
      queryClient.invalidateQueries({ queryKey: ['garmin-status'] });
      queryClient.invalidateQueries({ queryKey: ['garmin-device'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Garmin connected', {
        description: response.displayName
          ? `Linked as ${response.displayName}. Syncing your last 2 weeks…`
          : 'Syncing your last 2 weeks of metrics…',
      });
      onConnected?.();
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

  /** Vuelve del paso MFA al de credenciales sin descartar el email/password. */
  function cancelMfa(): void {
    setMfaSessionId(null);
    setError(null);
    mfaForm.reset({ mfaCode: '' });
  }

  /** Restablece toda la máquina (al cerrar el diálogo). */
  function reset(): void {
    setMfaSessionId(null);
    setError(null);
    setPending(false);
    credentialsForm.reset({ email: '', password: '' });
    mfaForm.reset({ mfaCode: '' });
  }

  return {
    credentialsForm,
    mfaForm,
    error,
    pending,
    mfaSessionId,
    awaitingMfa: mfaSessionId !== null,
    onCredentialsSubmit,
    onMfaSubmit,
    cancelMfa,
    reset,
  };
}

export type GarminLink = ReturnType<typeof useGarminLink>;
