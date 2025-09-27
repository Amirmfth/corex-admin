'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

export type ColumnDef<TData> = {
  id: string;
  header: string;
  accessorKey?: keyof TData;
  cell?: (row: TData) => ReactNode;
  enableSorting?: boolean;
  sortingFn?: (a: TData, b: TData) => number;
  meta?: {
    align?: 'left' | 'right' | 'center';
  };
};

export type SortingState<TData> = {
  columnId: string;
  desc: boolean;
  comparator?: (a: TData, b: TData) => number;
};

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  emptyMessage?: ReactNode;
};

function getDefaultComparator<TData>(column: ColumnDef<TData>) {
  if (column.sortingFn) {
    return column.sortingFn;
  }
  if (column.accessorKey) {
    return (a: TData, b: TData) => {
      const aValue = a[column.accessorKey!];
      const bValue = b[column.accessorKey!];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }
      return String(aValue ?? '').localeCompare(String(bValue ?? ''));
    };
  }
  return () => 0;
}

export default function DataTable<TData>({
  data,
  columns,
  pageSize = 10,
  onRowClick,
  emptyMessage = '—',
}: DataTableProps<TData>) {
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState<TData> | null>(null);

  const sortedData = useMemo(() => {
    if (!sorting) {
      return data;
    }
    const column = columns.find((col) => col.id === sorting.columnId);
    if (!column) return data;
    const comparator = sorting.comparator ?? getDefaultComparator(column);
    const copy = [...data];
    copy.sort((a, b) => {
      const result = comparator(a, b);
      return sorting.desc ? -result : result;
    });
    return copy;
  }, [data, sorting, columns]);

  const totalPages = Math.max(Math.ceil(sortedData.length / pageSize), 1);
  const currentPage = Math.min(pageIndex, totalPages - 1);
  const paginatedRows = sortedData.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const handleSort = (column: ColumnDef<TData>) => {
    if (!column.enableSorting) return;
    setPageIndex(0);
    setSorting((current) => {
      if (!current || current.columnId !== column.id) {
        return { columnId: column.id, desc: false, comparator: column.sortingFn };
      }
      if (current.desc) {
        return null;
      }
      return { columnId: column.id, desc: true, comparator: column.sortingFn };
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted-strong)]">
            <tr>
              {columns.map((column) => {
                const isSorted = sorting?.columnId === column.id;
                const direction = isSorted ? (sorting?.desc ? 'desc' : 'asc') : null;
                return (
                  <th
                    key={column.id}
                    onClick={() => handleSort(column)}
                    className={`px-4 py-2 text-left font-medium tracking-wide ${
                      column.enableSorting ? 'cursor-pointer select-none' : ''
                    } ${
                      column.meta?.align === 'right'
                        ? 'text-right'
                        : column.meta?.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.header}
                      {column.enableSorting ? (
                        <span className="text-xs text-[var(--muted)]">
                          {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : ''}
                        </span>
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-[var(--muted)]"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  className={`transition ${
                    onRowClick ? 'cursor-pointer hover:bg-[var(--surface-muted)]' : ''
                  }`}
                >
                  {columns.map((column) => {
                    const content = column.cell
                      ? column.cell(row)
                      : column.accessorKey
                        ? (row[column.accessorKey] as ReactNode)
                        : null;
                    const align = column.meta?.align ?? 'left';
                    return (
                      <td
                        key={column.id}
                        className={`px-4 py-3 text-[var(--muted-strong)] ${
                          align === 'right'
                            ? 'text-right'
                            : align === 'center'
                              ? 'text-center'
                              : 'text-left'
                        }`}
                      >
                        {content ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
        <div>
          {sortedData.length > 0
            ? `Showing ${currentPage * pageSize + 1}–${Math.min(
                (currentPage + 1) * pageSize,
                sortedData.length,
              )} of ${sortedData.length}`
            : 'No records'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageIndex((index) => Math.max(index - 1, 0))}
            disabled={currentPage === 0}
            className="rounded-full border border-[var(--border)] px-3 py-1 transition disabled:opacity-50"
          >
            ‹
          </button>
          <span>
            Page {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPageIndex((index) => Math.min(index + 1, Math.max(totalPages - 1, 0)))
            }
            disabled={currentPage >= totalPages - 1}
            className="rounded-full border border-[var(--border)] px-3 py-1 transition disabled:opacity-50"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
