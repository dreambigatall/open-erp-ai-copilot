import type { Widget } from '../types.js'
import { WidgetCard } from './WidgetCard.js'

export function MetricWidget({ widget }: { widget: Widget }) {
  const rows = widget.result?.rows ?? []
  const keys = rows[0] ? Object.keys(rows[0]) : []

  return (
    <WidgetCard widget={widget}>
      <div className="grid grid-cols-2 gap-3">
        {keys.slice(0, 4).map((key) => {
          const raw = rows[0]?.[key]
          const num = Number(raw)
          const display = !isNaN(num)
            ? num.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : String(raw ?? '—')

          return (
            <div key={key} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{key}</p>
              <p className="text-xl font-medium text-gray-900">{display}</p>
            </div>
          )
        })}
      </div>
    </WidgetCard>
  )
}
