import * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface SovereignDataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface SovereignDataTableProps<T> {
  columns: SovereignDataTableColumn<T>[];
  data: T[];
  rowHeight?: 44 | 48 | 52;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  className?: string;
}

const ROW_HEIGHT_MAP: Record<44 | 48 | 52, string> = {
  44: 'h-11',
  48: 'h-12',
  52: 'h-13',
};

function SovereignDataTableInner<T extends Record<string, unknown>>(
  {
    columns,
    data,
    rowHeight = 48,
    onRowClick,
    emptyMessage = 'No data available',
    className,
  }: SovereignDataTableProps<T>,
  ref: React.ForwardedRef<HTMLTableElement>,
) {
  const heightClass = ROW_HEIGHT_MAP[rowHeight];

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-400',
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className={cn('hidden overflow-auto rounded-xl border border-slate-200 md:block', className)}>
        <Table ref={ref}>
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50 hover:bg-slate-50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow
                key={idx}
                className={cn(
                  heightClass,
                  'border-b border-slate-100 transition-colors hover:bg-slate-50',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={() => onRowClick?.(row, idx)}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className="px-4 text-sm text-slate-700">
                    {col.render
                      ? col.render(row, idx)
                      : (row[col.key] as React.ReactNode) ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card fallback */}
      <div className={cn('flex flex-col gap-3 md:hidden', className)}>
        {data.map((row, idx) => (
          <div
            key={idx}
            className={cn(
              'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
              onRowClick && 'cursor-pointer active:bg-slate-50',
            )}
            onClick={() => onRowClick?.(row, idx)}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-baseline justify-between py-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {col.header}
                </span>
                <span className="text-sm text-slate-700">
                  {col.render
                    ? col.render(row, idx)
                    : (row[col.key] as React.ReactNode) ?? '—'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export const SovereignDataTable = React.forwardRef(SovereignDataTableInner) as <
  T extends Record<string, unknown>,
>(
  props: SovereignDataTableProps<T> & { ref?: React.Ref<HTMLTableElement> },
) => React.ReactElement | null;
