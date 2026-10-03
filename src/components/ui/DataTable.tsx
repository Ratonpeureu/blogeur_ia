import React, { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, InboxIcon } from 'lucide-react';
import { EmptyState } from './primitives';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  emptyLabel?: string;
  maxHeight?: string;
  rowTone?: (row: T) => 'danger' | 'warning' | null;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectable = false,
  selected = [],
  onSelectedChange,
  emptyLabel = 'Aucun élément à afficher.',
  maxHeight,
  rowTone
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va === vb) return 0;
      const res = va > vb ? 1 : -1;
      return sortDir === 'asc' ? res : -res;
    });
    return copy;
  }, [rows, sortKey, sortDir, columns]);

  const allIds = rows.map(rowKey);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');else
    {
      setSortKey(col.key);
      setSortDir('asc');
    }
  }

  function toggleRow(id: string) {
    if (!onSelectedChange) return;
    onSelectedChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="border border-win-border bg-win-surface shadow-win rounded-win">
      <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-win-panel">
              {selectable &&
              <th scope="col" className="w-8 border-b border-win-border px-2 py-1.5">
                  <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  onChange={() => onSelectedChange?.(allSelected ? [] : allIds)}
                  className="h-3.5 w-3.5 accent-[#2B5797]" />
                
                </th>
              }
              {columns.map((col) =>
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={`border-b border-win-border px-2.5 py-1.5 text-2xs font-semibold uppercase tracking-wide text-win-muted ${
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`
                }>
                
                  {col.sortValue ?
                <button
                  type="button"
                  onClick={() => toggleSort(col)}
                  className={`inline-flex items-center gap-1 transition-colors duration-150 ease-out hover:text-win-accent ${
                  col.align === 'right' ? 'flex-row-reverse' : ''}`
                  }>
                  
                      {col.header}
                      {sortKey === col.key && (
                  sortDir === 'asc' ? <ChevronUpIcon size={11} /> : <ChevronDownIcon size={11} />)}
                    </button> :

                col.header
                }
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const id = rowKey(row);
              const tone = rowTone?.(row);
              const isSelected = selected.includes(id);
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${i % 2 ? 'bg-win-panel/60' : 'bg-win-surface'} ${
                  tone === 'danger' ? 'bg-state-dangerBg/60' : tone === 'warning' ? 'bg-state-warnBg/50' : ''} ${
                  isSelected ? 'bg-win-accentSoft' : ''} ${
                  onRowClick ? 'cursor-pointer transition-colors duration-150 ease-out hover:bg-win-accentSoft' : ''}`
                  }>
                  
                  {selectable &&
                  <td className="border-b border-win-border px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                      type="checkbox"
                      aria-label="Sélectionner la ligne"
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      className="h-3.5 w-3.5 accent-[#2B5797]" />
                    
                    </td>
                  }
                  {columns.map((col) =>
                  <td
                    key={col.key}
                    className={`border-b border-win-border px-2.5 py-1.5 text-win-text ${
                    col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left'}`
                    }>
                    
                      {col.render(row)}
                    </td>
                  )}
                </tr>);

            })}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState message={emptyLabel} icon={<InboxIcon size={22} />} />}
      </div>
    </div>);

}