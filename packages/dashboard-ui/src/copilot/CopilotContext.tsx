import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { ChatMessage } from './types.js'
import type { ConnectorInterface, SchemaContext } from '@erp-copilot/types'
import { buildSystemPrompt } from '@erp-copilot/ai-core/prompts'
import type { LLMProvider } from '@erp-copilot/ai-core'

interface CopilotContextValue {
  messages: ChatMessage[]
  isStreaming: boolean
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
}

const CopilotContext = createContext<CopilotContextValue | null>(null)

export function useCopilot(): CopilotContextValue {
  const ctx = useContext(CopilotContext)
  if (!ctx) throw new Error('useCopilot must be used inside CopilotProvider')
  return ctx
}

interface CopilotProviderProps {
  children: ReactNode
  provider: LLMProvider
  connector: ConnectorInterface
  pageContext?: string // e.g. "finance dashboard" — injected into system prompt
}

export function CopilotProvider({
  children,
  provider,
  connector,
  pageContext = 'ERP dashboard',
}: CopilotProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const schemaRef = useRef<SchemaContext | null>(null)

  const getSchema = useCallback(async (): Promise<SchemaContext> => {
    if (!schemaRef.current) {
      schemaRef.current = await connector.getSchemaContext()
    }
    return schemaRef.current
  }, [connector])

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming) return

      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        streaming: false,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setIsStreaming(true)

      // Create empty assistant message — we'll stream into it
      const assistantId = crypto.randomUUID()
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        streaming: true,
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      try {
        const schema = await getSchema()
        const systemPrompt =
          buildSystemPrompt(schema) +
          `
  
  You are also an ERP assistant chat copilot.
  Current page context: ${pageContext}
  When you generate a query, explain the results in plain English too.
  Keep answers concise — 2-3 sentences max unless asked for detail.`

        if (provider.completeStream) {
          // Stream tokens into the assistant message one by one
          const stream = provider.completeStream(systemPrompt, text)
          for await (const chunk of stream) {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
            )
          }
        } else {
          // Fallback: non-streaming
          const response = await provider.complete(systemPrompt, text)
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: response.text } : m)),
          )
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
              : m,
          ),
        )
      } finally {
        // Mark streaming as done
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        )
        setIsStreaming(false)
      }
    },
    [isStreaming, provider, getSchema, pageContext],
  )

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  return (
    <CopilotContext.Provider value={{ messages, isStreaming, sendMessage, clearChat }}>
      {children}
    </CopilotContext.Provider>
  )
}
