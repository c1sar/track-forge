import type { ReactNode } from 'react';

import { PageTransition } from '@/shared/ui/page-transition';
import { QueryProvider } from '@/shared/ui/query-provider';
import { Toaster } from '@/shared/ui/sonner';

import { type AppPage, AppShell } from './AppShell';
import { SyncScopeProvider } from './sync-scope';

interface TrackForgeAppShellProps {
  userEmail: string;
  currentPage: AppPage;
  children: ReactNode;
}

/**
 * Isla raíz de las páginas autenticadas: providers (TanStack Query, toasts)
 * + shell con sidebar + transición de contenido.
 */
export function TrackForgeAppShell({ userEmail, currentPage, children }: TrackForgeAppShellProps) {
  return (
    <QueryProvider>
      <SyncScopeProvider>
        <AppShell userEmail={userEmail} currentPage={currentPage}>
          <PageTransition key={currentPage}>{children}</PageTransition>
        </AppShell>
      </SyncScopeProvider>
      <Toaster position="top-right" theme="dark" richColors closeButton />
    </QueryProvider>
  );
}
