import { useDashboard } from '../DashboardContext.js'
import { TableWidget } from './TableWidget.js'
import { ChartWidget } from './ChartWidget.js'
import { MetricWidget } from './MetricWidget.js'
import type { Widget } from '../types.js'

function renderWidget(widget: Widget) {
  switch (widget.type) {
    case 'table':
      return <TableWidget key={widget.id} widget={widget} />
    case 'metric':
      return <MetricWidget key={widget.id} widget={widget} />
    case 'bar':
    case 'line':
    case 'pie':
      return <ChartWidget key={widget.id} widget={widget} />
    default:
      return null
  }
}

export function WidgetGrid() {
  const { widgets } = useDashboard()

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-12 h-12 rounded-xl bg-brand-50 flex items-center
          justify-center mb-4"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#1D9E75" opacity=".4" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#1D9E75" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#1D9E75" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#1D9E75" opacity=".4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No widgets yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Click "Add widget" and ask a question in plain English
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {widgets.map(renderWidget)}
    </div>
  )
}
