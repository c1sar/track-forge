import type { ProviderDefinition } from '@/features/connections/providers';
import { cn } from '@/shared/lib/utils';

interface ProviderBrandProps {
  provider: ProviderDefinition;
  className?: string;
}

/**
 * Identidad visual compartida de un proveedor: tile con icono de marca +
 * nombre + tagline. Reutilizado por todas las cards del hub de conexiones.
 */
export function ProviderBrand({ provider, className }: ProviderBrandProps) {
  const { Icon } = provider;
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/card:scale-105',
          provider.accentClass,
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-sm font-semibold leading-tight">{provider.name}</p>
        <p className="truncate text-xs text-muted-foreground">{provider.tagline}</p>
      </div>
    </div>
  );
}
