import type { AiQueryResult } from '@erp-copilot/ai-core'

export type WidgetType = 'table' | 'bar' | 'line' | 'metric' | 'pie'

export interface Widget {
  id: string
  title: string
  question: string // the natural language question
  type: WidgetType
  result?: AiQueryResult // last fetched result
  loading: boolean
  error?: string
  createdAt: Date
}

export interface DashboardConfig {
  title: string
  widgets: Widget[]
}
