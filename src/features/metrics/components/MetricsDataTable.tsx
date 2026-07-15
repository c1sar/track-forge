import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { useState } from 'react';

import type { DailyMetric } from '@/features/metrics/lib/types';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/shared/ui/empty';

const PAGE_SIZE = 15;

function fmt(input: number | null, suffix = ''): string {
  return input === null ? '—' : `${input.toLocaleString('en-US')}${suffix}`;
}

function fmtSleep(seconds: number | null): string {
  if (seconds === null) {
    return '—';
  }
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

const columns: ColumnDef<DailyMetric>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ getValue }) => getValue<string>(),
  },
  {
    accessorKey: 'steps',
    header: 'Steps',
    cell: ({ getValue }) => fmt(getValue<number | null>()),
  },
  {
    accessorKey: 'sleepSeconds',
    header: 'Sleep',
    cell: ({ getValue }) => fmtSleep(getValue<number | null>()),
  },
  {
    accessorKey: 'restingHr',
    header: 'Rest HR',
    cell: ({ getValue }) => fmt(getValue<number | null>(), ' bpm'),
  },
  {
    accessorKey: 'avgStress',
    header: 'Stress',
    cell: ({ getValue }) => fmt(getValue<number | null>()),
  },
  {
    id: 'bodyBattery',
    header: 'Body Batt.',
    accessorFn: (row) => row.bodyBatteryHigh,
    cell: ({ row }) =>
      row.original.bodyBatteryLow != null && row.original.bodyBatteryHigh != null
        ? `${row.original.bodyBatteryLow}–${row.original.bodyBatteryHigh}`
        : '—',
  },
  {
    accessorKey: 'hrvWeeklyAvg',
    header: 'HRV',
    cell: ({ getValue }) => fmt(getValue<number | null>(), ' ms'),
  },
  {
    accessorKey: 'spo2Avg',
    header: 'SpO2',
    cell: ({ getValue }) => fmt(getValue<number | null>(), '%'),
  },
  {
    accessorKey: 'activeCalories',
    header: 'Act. kcal',
    cell: ({ getValue }) => fmt(getValue<number | null>()),
  },
];

interface MetricsDataTableProps {
  metrics: DailyMetric[];
  className?: string;
}

export function MetricsDataTable({ metrics, className }: MetricsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);

  const table = useReactTable({
    data: metrics,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  if (metrics.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Database />
          </EmptyMedia>
          <EmptyTitle>No metrics in this range</EmptyTitle>
          <EmptyDescription>Hit Sync to pull data from Garmin Connect.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const rows = table.getRowModel().rows;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {/* Scroll interno: header sticky arriba, fecha sticky a la izquierda */}
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-20">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-card">
                {headerGroup.headers.map((header, index) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'h-10 whitespace-nowrap bg-card px-2 text-left align-middle',
                        index === 0 && 'sticky left-0 z-10',
                      )}
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ArrowUp className="size-3 text-primary" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="size-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border transition-colors last:border-0 hover:bg-muted/50"
              >
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'whitespace-nowrap p-2 align-middle font-mono text-sm tabular-nums',
                      index === 0 && 'sticky left-0 z-10 bg-background font-medium',
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-3">
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            Page {pageIndex + 1} / {pageCount} · {metrics.length} days
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
