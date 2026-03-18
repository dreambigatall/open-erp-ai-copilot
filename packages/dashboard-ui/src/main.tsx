import React from 'react'
import ReactDOM from 'react-dom/client'
import { DashboardProvider, DashboardShell } from './index.js'
import type { Widget } from './types.js'

import type { ConnectorInterface } from '@erp-copilot/types'
import type { AiCore } from '@erp-copilot/ai-core'

import './index.css'

const mockConnector = {} as unknown as ConnectorInterface

// Minimal mock so the UI can render (no real DB/LLM calls).
const mockAiCore = {
  ask: () =>
    Promise.resolve({
      rows: [{ orderId: 1, amount: 123.45 }],
      rowCount: 1,
      executionTimeMs: 12,
      provider: 'mock',
      model: 'mock',
    }),
} as unknown as AiCore

const mockResult: NonNullable<Widget['result']> = {
  rows: [{ orderId: 1, amount: 123.45 }],
  rowCount: 1,
  executionTimeMs: 12,
  provider: 'mock',
  model: 'mock',
}

const initialWidgets: Widget[] = [
  {
    id: 'w1',
    title: 'Orders',
    question: 'Show me orders',
    type: 'table',
    loading: false,
    result: mockResult,
    createdAt: new Date(),
  },
]

function App() {
  return (
    <DashboardProvider
      connector={mockConnector}
      aiCore={mockAiCore}
      initialWidgets={initialWidgets}
    >
      <DashboardShell title="Dashboard UI Demo" provider="mock" />
    </DashboardProvider>
  )
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Missing #root element')

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
