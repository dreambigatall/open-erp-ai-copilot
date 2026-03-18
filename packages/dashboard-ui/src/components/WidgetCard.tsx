import type { ReactNode } from 'react'
import type { Widget } from '../types.js'
import { useDashboard } from '../DashboardContext.js'

interface WidgetCardProps {
  widget: Widget
  children: ReactNode
}

export function WidgetCard({ widget, children }: WidgetCardProps) {
  const { removeWidget, refreshWidget } = useDashboard()

  return (
    <div className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-[220px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-900">{widget.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-mono truncate max-w-[260px]">
            {widget.question}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              void refreshWidget(widget.id)
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.05-3.4L10 6h5V1l-1.35 1.35Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            onClick={() => {
              removeWidget(widget.id)
            }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 p-4">
        {widget.loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm h-full justify-center">
            <div
              className="w-4 h-4 border-2 border-brand-500 border-t-transparent
              rounded-full animate-spin"
            />
            Thinking...
          </div>
        )}
        {widget.error && !widget.loading && (
          <div className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{widget.error}</div>
        )}
        {!widget.loading && !widget.error && children}
      </div>
      {widget.result && (
        <div
          className="px-4 py-2 border-t border-gray-100 flex items-center
          justify-between text-xs text-gray-400"
        >
          <span>
            {widget.result.rowCount} rows · {widget.result.executionTimeMs}ms
          </span>
          <span className="font-mono">
            {widget.result.provider}/{widget.result.model}
          </span>
        </div>
      )}
    </div>
  )
}
