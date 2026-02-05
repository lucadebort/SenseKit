import type { ReactNode } from 'react';

interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Nessun dato disponibile',
  onRowClick,
}: TableProps<T>) {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-xs font-medium text-slate-500 ${alignStyles[col.align || 'left']}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className={onRowClick ? 'hover:bg-slate-50 cursor-pointer' : 'hover:bg-slate-50'}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm ${alignStyles[col.align || 'left']}`}
                >
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key]?.toString() || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Sort Icon helper
interface SortIconProps {
  active: boolean;
  direction: 'asc' | 'desc';
}

export function SortIcon({ active, direction }: SortIconProps) {
  return (
    <svg
      className={`w-4 h-4 inline-block ml-1 transition-colors ${active ? 'text-blue-600' : 'text-slate-300'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}
