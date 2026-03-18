import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Widget, WidgetType } from './types.js'
import type { ConnectorInterface } from '@erp-copilot/types'
import type { AiCore } from '@erp-copilot/ai-core'

interface DashboardContextValue {
  widgets: Widget[]
  addWidget: (question: string, type: WidgetType, title: string) => Promise<void>
  removeWidget: (id: string) => void
  refreshWidget: (id: string) => Promise<void>
  connector: ConnectorInterface | null
  aiCore: AiCore | null
}

export const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used inside DashboardProvider')
  return ctx
}

interface DashboardProviderProps {
  children: ReactNode
  connector: ConnectorInterface
  aiCore: AiCore
  initialWidgets?: Widget[]
}

export function DashboardProvider({
  children,
  connector,
  aiCore,
  initialWidgets = [],
}: DashboardProviderProps) {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets)

  const fetchWidget = useCallback(
    async (widget: Widget): Promise<Widget> => {
      try {
        const result = await aiCore.ask(widget.question, connector)
        // Clear any previous `error` on success (avoid `error: undefined` with exactOptionalPropertyTypes).
        const { error: _prevError, ...rest } = widget
        void _prevError
        return { ...rest, result, loading: false }
      } catch (err) {
        return {
          ...widget,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    },
    [aiCore, connector],
  )

  const addWidget = useCallback(
    async (question: string, type: WidgetType, title: string) => {
      const newWidget: Widget = {
        id: crypto.randomUUID(),
        title,
        question,
        type,
        loading: true,
        createdAt: new Date(),
      }
      setWidgets((prev) => [...prev, newWidget])
      const filled = await fetchWidget(newWidget)
      setWidgets((prev) => prev.map((w) => (w.id === filled.id ? filled : w)))
    },
    [fetchWidget],
  )

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const refreshWidget = useCallback(
    async (id: string) => {
      setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, loading: true } : w)))
      const widget = widgets.find((w) => w.id === id)
      if (!widget) return
      const filled = await fetchWidget({ ...widget, loading: true })
      setWidgets((prev) => prev.map((w) => (w.id === filled.id ? filled : w)))
    },
    [widgets, fetchWidget],
  )

  return (
    <DashboardContext.Provider
      value={{
        widgets,
        addWidget,
        removeWidget,
        refreshWidget,
        connector,
        aiCore,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}
