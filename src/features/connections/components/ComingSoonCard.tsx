import { Sparkles } from 'lucide-react';

import { Badge } from '@/shared/ui/badge';
import { Card, CardAction, CardHeader } from '@/shared/ui/card';

/**
 * Tarjeta genérica y deshabilitada que anuncia futuras integraciones sin
 * revelar marcas concretas todavía. Reemplaza a los placeholders por proveedor.
 */
export function ComingSoonCard() {
  return (
    <Card
      aria-disabled="true"
      className="border-dashed border-border opacity-60 shadow-none select-none"
    >
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold leading-tight">
              More integrations
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Additional devices & platforms are on the way
            </p>
          </div>
        </div>
        <CardAction>
          <Badge variant="outline" className="text-muted-foreground">
            Coming soon
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
