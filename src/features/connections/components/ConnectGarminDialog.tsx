import { Loader2, ShieldCheck, XCircle } from 'lucide-react';

import { type GarminLink, useGarminLink } from '@/features/connections/hooks/use-garmin-link';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Separator } from '@/shared/ui/separator';

const TITLE = 'Link Garmin Connect';
const DESCRIPTION =
  'Credentials are used only for authentication — never stored. Only encrypted access tokens are persisted.';

interface ConnectGarminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Diálogo responsive para vincular Garmin: `Dialog` en desktop y `Drawer`
 * (sheet inferior) en móvil. La lógica vive en `useGarminLink`; este
 * componente solo orquesta el contenedor y resetea el estado al cerrar.
 */
export function ConnectGarminDialog({ open, onOpenChange }: ConnectGarminDialogProps) {
  const isMobile = useIsMobile();
  const link = useGarminLink({ onConnected: () => onOpenChange(false) });

  function handleOpenChange(next: boolean): void {
    if (!next) {
      link.reset();
    }
    onOpenChange(next);
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{TITLE}</DrawerTitle>
            <DrawerDescription>{DESCRIPTION}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <GarminLinkFields link={link} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
        </DialogHeader>
        <GarminLinkFields link={link} />
      </DialogContent>
    </Dialog>
  );
}

/** Cuerpo compartido de formularios (credenciales + MFA) para ambos contenedores. */
function GarminLinkFields({ link }: { link: GarminLink }) {
  const {
    credentialsForm,
    mfaForm,
    error,
    pending,
    awaitingMfa,
    onCredentialsSubmit,
    onMfaSubmit,
    cancelMfa,
  } = link;

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={onCredentialsSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs tracking-wide text-muted-foreground uppercase">
            Garmin email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="athlete@email.com"
            className="h-10 border-border bg-card"
            disabled={awaitingMfa}
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
            disabled={awaitingMfa}
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
          disabled={pending || awaitingMfa}
        >
          {pending && !awaitingMfa ? <Loader2 className="size-4 animate-spin" /> : null}
          Connect
        </Button>
      </form>

      {awaitingMfa ? (
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
              <p className="text-xs text-destructive">{mfaForm.formState.errors.mfaCode.message}</p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={pending}
              onClick={cancelMfa}
            >
              Back
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
    </div>
  );
}
