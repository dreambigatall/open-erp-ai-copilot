export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  streaming: boolean // true while tokens are still arriving
  createdAt: Date
  /** If the message contains query results, store them for "pin to dashboard" */
  queryResult?: {
    question: string
    explanation: string
    rows: Record<string, unknown>[]
    rowCount: number
    queryRan: string
    provider: string
    model: string
  }
}
