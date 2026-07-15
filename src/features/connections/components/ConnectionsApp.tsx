import type { ReactNode } from 'react';

import {
  PROVIDERS,
  type ProviderDefinition,
  type ProviderId,
} from '@/features/connections/providers';

import { ComingSoonCard } from './ComingSoonCard';
import { GarminConnectionCard } from './GarminConnectionCard';

/**
 * Mapea cada proveedor `available` a su "connection card" (dueña de sus hooks
 * y endpoints). Para añadir un proveedor funcional: registra su card aquí y
 * marca su entrada como `available` en `providers.ts`.
 */
const AVAILABLE_CARDS: Partial<
  Record<ProviderId, (props: { provider: ProviderDefinition }) => ReactNode>
> = {
  garmin: GarminConnectionCard,
};

/**
 * Hub de conexiones: renderiza los proveedores `available` del registry con su
 * card específica, seguidos de una única tarjeta genérica "Coming soon" (aún no
 * se anuncian marcas concretas).
 */
export function ConnectionsApp() {
  const available = PROVIDERS.filter((provider) => provider.status === 'available');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-heading text-lg font-semibold">Connections</h1>
        <p className="text-sm text-muted-foreground">
          Link your wearables and health platforms. TrackForge pulls every metric into one
          dashboard.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {available.map((provider) => {
          const Card = AVAILABLE_CARDS[provider.id];
          return Card ? <Card key={provider.id} provider={provider} /> : null;
        })}
        <ComingSoonCard />
      </div>
    </div>
  );
}
