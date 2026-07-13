import { Download } from 'lucide-react';

import { isoDaysAgo, todayIso } from '@/shared/lib/dates';
import { buttonVariants } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

interface ExportCsvCardProps {
  rangeDays: number;
}

export function ExportCsvCard({ rangeDays }: ExportCsvCardProps) {
  const from = isoDaysAgo(rangeDays - 1);
  const to = todayIso();
  const href = `/api/export/csv?from=${from}&to=${to}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exportar a CSV</CardTitle>
        <CardDescription>
          Descarga tus métricas de los últimos {rangeDays} días en un CSV listo para tu asistente de
          IA (una fila por día, cabeceras en inglés).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <a className={buttonVariants({ size: 'lg' })} href={href} download>
          <Download className="size-4" />
          Descargar CSV ({from} → {to})
        </a>
      </CardContent>
    </Card>
  );
}
