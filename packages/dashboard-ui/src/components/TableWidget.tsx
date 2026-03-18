import type { Widget } from '../types.js'
import { WidgetCard } from './WidgetCard.js'

export function TableWidget({ widget }: { widget: Widget }) {
  const rows = widget.result?.rows ?? []
  const firstRow = rows[0]
  const cols = firstRow ? Object.keys(firstRow) : []

  return (
    <WidgetCard widget={widget}>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No results</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {cols.map((col) => (
                  <th
                    key={col}
                    className="text-left text-xs font-medium text-gray-500
                      pb-2 pr-4 uppercase tracking-wide"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  {cols.map((col) => (
                    <td key={col} className="py-2 pr-4 text-gray-700 font-mono text-xs">
                      {String(row[col] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && (
            <p className="text-xs text-gray-400 mt-2">Showing 10 of {rows.length} rows</p>
          )}
        </div>
      )}
    </WidgetCard>
  )
}
