import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export interface SyncScope {
  from?: string;
  to?: string;
  days?: number;
  tz: string;
}

interface SyncScopeContextValue {
  scope: SyncScope;
  setScope: (scope: SyncScope) => void;
}

const FALLBACK_SCOPE: SyncScope = { days: 7, tz: 'UTC' };

const SyncScopeContext = createContext<SyncScopeContextValue | null>(null);

/**
 * Comparte el "alcance de sync activo" entre las vistas (que controlan el rango)
 * y el boton "Sync now" del sidebar, dentro de la misma isla persistente.
 */
export function SyncScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<SyncScope>(FALLBACK_SCOPE);
  const value = useMemo(() => ({ scope, setScope }), [scope]);
  return <SyncScopeContext.Provider value={value}>{children}</SyncScopeContext.Provider>;
}

/** Lee el alcance de sync activo (para el boton del sidebar). */
export function useSyncScope(): SyncScope {
  return useContext(SyncScopeContext)?.scope ?? FALLBACK_SCOPE;
}

/**
 * Publica el alcance de sync activo. Las vistas llaman a esto cuando cambia su
 * rango. No-op si no hay provider (p.ej. render aislado en tests).
 */
export function usePublishSyncScope(scope: SyncScope) {
  const ctx = useContext(SyncScopeContext);
  const setScope = ctx?.setScope;
  const { from, to, days, tz } = scope;

  useEffect(() => {
    setScope?.({ from, to, days, tz });
  }, [from, to, days, tz, setScope]);
}
