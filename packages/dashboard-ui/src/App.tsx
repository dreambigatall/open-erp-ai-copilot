import React from 'react'
import { DashboardShell } from './components/DashboardShell.js'
import { DashboardProvider } from './DashboardContext.js'
import type { AiCore, LLMProvider, LLMResponse } from '@erp-copilot/ai-core'
import type { ConnectorInterface, QueryResult, SchemaContext } from '@erp-copilot/types'
import type { AiQueryResult } from '@erp-copilot/ai-core'

function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (t.length > 0) return t
  }
  return 'http://localhost:3005'
}

const API_BASE_URL = resolveApiBaseUrl()

type ApiErrorPayload = {
  code?: string
  message?: string
  hint?: string
}

function formatApiError(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as { error?: string | ApiErrorPayload }
    if (!parsed.error) return `Request failed (${String(status)})`
    if (typeof parsed.error === 'string')
      return `Request failed (${String(status)}): ${parsed.error}`
    const code = parsed.error.code ? `[${parsed.error.code}] ` : ''
    const message = parsed.error.message ?? 'Unknown API error'
    const hint = parsed.error.hint ? ` Hint: ${parsed.error.hint}` : ''
    return `Request failed (${String(status)}): ${code}${message}${hint}`
  } catch {
    return `Request failed (${String(status)}): ${bodyText}`
  }
}

async function parseJSON<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(formatApiError(res.status, errText))
  }
  return (await res.json()) as T
}

const httpConnector: ConnectorInterface = {
  connect: async () => {},
  disconnect: async () => {},
  ping: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`)
      return res.ok
    } catch {
      return false
    }
  },
  getSchemaContext: async () => {
    const schema = await parseJSON<SchemaContext>(await fetch(`${API_BASE_URL}/api/schema`))
    return { ...schema, generatedAt: new Date(schema.generatedAt) }
  },
  executeQuery: (_query: string): Promise<QueryResult> => {
    return Promise.reject(
      new Error(
        'Raw query execution is not exposed by the demo API. Use /api/query via aiCore.ask.',
      ),
    )
  },
}

const httpAiCore: {
  ask: (question: string, connector: ConnectorInterface) => Promise<AiQueryResult>
} = {
  ask: async (question: string) =>
    parseJSON<AiQueryResult>(
      await fetch(`${API_BASE_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      }),
    ),
}

async function readSSEChunks(response: Response): Promise<string> {
  if (!response.body) {
    throw new Error('Missing response stream')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let output = ''

  for (;;) {
    const { done: readDone, value } = await reader.read()
    if (readDone) {
      break
    }
    buffer += decoder.decode(value, { stream: true })

    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      const line = event.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      const payload = line.slice(6)
      if (payload === '[DONE]') return output
      const parsed = JSON.parse(payload) as { chunk?: string; error?: string | ApiErrorPayload }
      if (parsed.error) {
        const msg =
          typeof parsed.error === 'string'
            ? parsed.error
            : `${parsed.error.code ? `[${parsed.error.code}] ` : ''}${parsed.error.message ?? 'Stream error'}${parsed.error.hint ? ` Hint: ${parsed.error.hint}` : ''}`
        throw new Error(msg)
      }
      if (parsed.chunk) output += parsed.chunk
    }
  }

  return output
}

const httpProvider: LLMProvider = {
  name: 'demo-api',
  model: 'server-managed',
  complete: async (_systemPrompt: string, userMessage: string): Promise<LLMResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Chat request failed (${String(res.status)}): ${errText}`)
    }
    const text = await readSSEChunks(res)
    return { text, model: 'server-managed', provider: 'demo-api' }
  },
  async *completeStream(_systemPrompt: string, userMessage: string) {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Chat stream failed (${String(res.status)}): ${errText}`)
    }

    if (!res.body) {
      throw new Error('Missing chat stream body')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { done: readDone, value } = await reader.read()
      if (readDone) {
        break
      }
      buffer += decoder.decode(value, { stream: true })

      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        const line = event.split('\n').find((l) => l.startsWith('data: '))
        if (!line) continue
        const payload = line.slice(6)
        if (payload === '[DONE]') return
        const parsed = JSON.parse(payload) as { chunk?: string; error?: string | ApiErrorPayload }
        if (parsed.error) {
          const msg =
            typeof parsed.error === 'string'
              ? parsed.error
              : `${parsed.error.code ? `[${parsed.error.code}] ` : ''}${parsed.error.message ?? 'Stream error'}${parsed.error.hint ? ` Hint: ${parsed.error.hint}` : ''}`
          throw new Error(msg)
        }
        if (parsed.chunk) yield parsed.chunk
      }
    }
  },
}

export default function App() {
  return (
    <DashboardProvider connector={httpConnector} aiCore={httpAiCore as unknown as AiCore}>
      <DashboardShell
        title="ERP Copilot"
        provider={httpProvider}
        metricsUrl={`${API_BASE_URL}/api/metrics`}
      />
    </DashboardProvider>
  )
}
