import { useState } from 'react'
import type { WidgetType } from '../types.js'
import { useDashboard } from '../DashboardContext.js'

const WIDGET_TYPES: { type: WidgetType; label: string; desc: string }[] = [
  { type: 'table', label: 'Table', desc: 'Row-by-row data' },
  { type: 'bar', label: 'Bar', desc: 'Compare values' },
  { type: 'line', label: 'Line', desc: 'Trends over time' },
  { type: 'metric', label: 'Metric', desc: 'KPI numbers' },
  { type: 'pie', label: 'Pie', desc: 'Part-to-whole' },
]

interface AddWidgetModalProps {
  onClose: () => void
}

export function AddWidgetModal({ onClose }: AddWidgetModalProps) {
  const { addWidget } = useDashboard()
  const [question, setQuestion] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<WidgetType>('table')
  const [loading, setLoading] = useState(false)

  const handleAdd = () => {
    // `onClick` expects a void-returning handler; we wrap the async work.
    void (async () => {
      if (!question.trim()) return
      setLoading(true)
      try {
        await addWidget(question.trim(), type, title.trim() || question.trim())
        onClose()
      } finally {
        setLoading(false)
      }
    })()
  }

  return (
    <div
      style={{
        minHeight: '400px',
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        padding: '1rem',
      }}
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-base font-medium text-gray-900 mb-4">Add widget</h2>

        <div className="mb-4">
          <label
            className="block text-xs font-medium text-gray-500 uppercase
            tracking-wide mb-1.5"
          >
            Question
          </label>
          <textarea
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value)
            }}
            placeholder="e.g. Show me overdue invoices this month"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
              text-gray-900 placeholder-gray-400 resize-none focus:outline-none
              focus:ring-2 focus:ring-brand-500 h-20"
          />
        </div>

        <div className="mb-4">
          <label
            className="block text-xs font-medium text-gray-500 uppercase
            tracking-wide mb-1.5"
          >
            Widget title (optional)
          </label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
            }}
            placeholder="Overdue invoices"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
              text-gray-900 placeholder-gray-400 focus:outline-none
              focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="mb-5">
          <label
            className="block text-xs font-medium text-gray-500 uppercase
            tracking-wide mb-1.5"
          >
            Display type
          </label>
          <div className="grid grid-cols-5 gap-2">
            {WIDGET_TYPES.map((wt) => (
              <button
                key={wt.type}
                onClick={() => {
                  setType(wt.type)
                }}
                className={`p-2 rounded-lg border text-center transition-all ${
                  type === wt.type
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <p className="text-xs font-medium">{wt.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{wt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100
              rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!question.trim() || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500
              rounded-lg hover:bg-brand-700 disabled:opacity-50
              disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div
                  className="w-3.5 h-3.5 border-2 border-white border-t-transparent
                rounded-full animate-spin"
                />{' '}
                Asking AI...
              </>
            ) : (
              'Add widget'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
