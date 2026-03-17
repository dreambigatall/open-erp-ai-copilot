import type { ConnectorInterface, SchemaContext, QueryResult } from '@erp-copilot/types'
import type { LLMProvider } from './providers/types.js'
import { buildSystemPrompt, detectModule, MODULE_HINTS } from './prompts.js'

export interface AiQueryResult {
  question: string
  explanation: string
  module: string
  queryRan: string
  rows: QueryResult['rows']
  rowCount: number
  executionTimeMs: number
  provider: string
  model: string
}

export class AiCore {
  private provider: LLMProvider

  constructor(provider: LLMProvider) {
    this.provider = provider
  }

  async ask(
    question: string,
    connector: ConnectorInterface,
    schemaContext?: SchemaContext,
  ): Promise<AiQueryResult> {
    const schema = schemaContext ?? (await connector.getSchemaContext())
    const module = detectModule(question)
    const system = buildSystemPrompt(schema)
    const hint = MODULE_HINTS[module] ?? ''

    const llmResponse = await this.provider.complete(
      system,
      `Module context: ${hint}\n\nQuestion: ${question}`,
    )

    const parsed = this.parseResponse(llmResponse.text)

    if (!parsed.query) {
      return {
        question,
        explanation: parsed.explanation ?? 'Could not generate a query for this question.',
        module,
        queryRan: '',
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        provider: this.provider.name,
        model: this.provider.model,
      }
    }

    const queryString =
      typeof parsed.query === 'string' ? parsed.query : JSON.stringify(parsed.query)

    const result = await connector.executeQuery(queryString)

    return {
      question,
      explanation: parsed.explanation ?? '',
      module: parsed.module ?? module,
      queryRan: result.queryRan,
      rows: result.rows,
      rowCount: result.rowCount,
      executionTimeMs: result.executionTimeMs,
      provider: this.provider.name,
      model: this.provider.model,
    }
  }

  private parseResponse(text: string): {
    query: unknown
    explanation?: string
    module?: string
  } {
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean) as { query: unknown; explanation?: string; module?: string }
    } catch {
      return { query: null, explanation: 'Failed to parse AI response as JSON.' }
    }
  }
}
