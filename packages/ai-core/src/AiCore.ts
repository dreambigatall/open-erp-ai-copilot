import type { ConnectorInterface, SchemaContext, QueryResult } from '@erp-copilot/types'
import type { LLMProvider } from './providers/types.js'
import type { QueryIntent } from './prompts.js'
import { buildSystemPrompt, detectIntent, detectModule, MODULE_HINTS } from './prompts.js'

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

export interface AiTelemetryEvent {
  question: string
  module: string
  intent: QueryIntent
  success: boolean
  latencyMs: number
  executionTimeMs: number
  rowCount: number
  schemaCollectionsUsed: number
  promptVersion: string
  parseRetryUsed: boolean
  queryRepairUsed: boolean
  inputTokens: number
  outputTokens: number
  errorType?: string
}

export interface AiCoreOptions {
  promptVersion?: string
  maxSchemaCollections?: number
  onTelemetry?: (event: AiTelemetryEvent) => void
}

export class AiCore {
  private provider: LLMProvider
  private options: Required<AiCoreOptions>

  constructor(provider: LLMProvider, options: AiCoreOptions = {}) {
    this.provider = provider
    this.options = {
      promptVersion: options.promptVersion ?? 'v1',
      maxSchemaCollections: options.maxSchemaCollections ?? 8,
      onTelemetry: options.onTelemetry ?? (() => {}),
    }
  }

  async ask(
    question: string,
    connector: ConnectorInterface,
    schemaContext?: SchemaContext,
  ): Promise<AiQueryResult> {
    const startedAt = Date.now()
    const schema = schemaContext ?? (await connector.getSchemaContext())
    const module = detectModule(question)
    const intent = detectIntent(question)
    const scopedSchema = this.pruneSchema(
      schema,
      question,
      module,
      this.options.maxSchemaCollections,
    )
    const system = buildSystemPrompt(scopedSchema, {
      intent,
      promptVersion: this.options.promptVersion,
    })
    const hint = MODULE_HINTS[module] ?? ''

    const userPrompt = `Module context: ${hint}
Intent: ${intent}

Question: ${question}`
    const generation = await this.generateStructuredResponse(system, userPrompt)
    const parsed = generation.parsed

    if (!parsed.query) {
      this.options.onTelemetry({
        question,
        module,
        intent,
        success: true,
        latencyMs: Date.now() - startedAt,
        executionTimeMs: 0,
        rowCount: 0,
        schemaCollectionsUsed: scopedSchema.collections.length,
        promptVersion: this.options.promptVersion,
        parseRetryUsed: generation.parseRetryUsed,
        queryRepairUsed: false,
        inputTokens: generation.inputTokens,
        outputTokens: generation.outputTokens,
      })
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

    const queryString = this.validateReadOnlyQuery(parsed.query, schema)
    try {
      const execution = await this.executeWithSelfRepair({
        connector,
        schema,
        question,
        moduleHint: hint,
        intent,
        originalQuery: queryString,
      })
      const result: AiQueryResult = {
        question,
        explanation: parsed.explanation ?? '',
        module: parsed.module ?? module,
        queryRan: execution.result.queryRan,
        rows: execution.result.rows,
        rowCount: execution.result.rowCount,
        executionTimeMs: execution.result.executionTimeMs,
        provider: this.provider.name,
        model: this.provider.model,
      }
      this.options.onTelemetry({
        question,
        module,
        intent,
        success: true,
        latencyMs: Date.now() - startedAt,
        executionTimeMs: execution.result.executionTimeMs,
        rowCount: execution.result.rowCount,
        schemaCollectionsUsed: scopedSchema.collections.length,
        promptVersion: this.options.promptVersion,
        parseRetryUsed: generation.parseRetryUsed,
        queryRepairUsed: execution.queryRepairUsed,
        inputTokens: generation.inputTokens + execution.inputTokens,
        outputTokens: generation.outputTokens + execution.outputTokens,
      })
      return result
    } catch (error) {
      this.options.onTelemetry({
        question,
        module,
        intent,
        success: false,
        latencyMs: Date.now() - startedAt,
        executionTimeMs: 0,
        rowCount: 0,
        schemaCollectionsUsed: scopedSchema.collections.length,
        promptVersion: this.options.promptVersion,
        parseRetryUsed: generation.parseRetryUsed,
        queryRepairUsed: false,
        inputTokens: generation.inputTokens,
        outputTokens: generation.outputTokens,
        errorType: this.classifyErrorType(error),
      })
      throw error
    }
  }

  private async executeWithSelfRepair(params: {
    connector: ConnectorInterface
    schema: SchemaContext
    question: string
    moduleHint: string
    intent: QueryIntent
    originalQuery: string
  }): Promise<{
    result: QueryResult
    queryRepairUsed: boolean
    inputTokens: number
    outputTokens: number
  }> {
    const { connector, schema, question, moduleHint, intent, originalQuery } = params

    try {
      const result = await connector.executeQuery(originalQuery)
      return { result, queryRepairUsed: false, inputTokens: 0, outputTokens: 0 }
    } catch (err) {
      const dbError = err instanceof Error ? err.message : String(err)
      const repairSystem = buildSystemPrompt(schema, {
        intent,
        promptVersion: this.options.promptVersion,
      })
      const dbLabel = schema.dbType === 'mongodb' ? 'MongoDB query JSON' : 'SQL query'
      const repairUser = `Module context: ${moduleHint}
Intent: ${intent}
Question: ${question}

The previous ${dbLabel} failed with database error:
${dbError}

Previous query:
${originalQuery}

Return ONLY valid JSON:
{
  "query": <corrected read-only query>,
  "explanation": <brief explanation of fix>,
  "module": <module>
}`

      const repaired = await this.generateStructuredResponse(repairSystem, repairUser)
      if (!repaired.parsed.query) {
        throw new Error(`Query execution failed and repair did not produce a query: ${dbError}`)
      }
      const repairedQuery = this.validateReadOnlyQuery(repaired.parsed.query, schema)
      const result = await connector.executeQuery(repairedQuery)
      return {
        result,
        queryRepairUsed: true,
        inputTokens: repaired.inputTokens,
        outputTokens: repaired.outputTokens,
      }
    }
  }

  private async generateStructuredResponse(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{
    parsed: { query: unknown; explanation?: string; module?: string }
    parseRetryUsed: boolean
    inputTokens: number
    outputTokens: number
  }> {
    const first = await this.provider.complete(systemPrompt, userPrompt)
    const firstParsed = this.parseResponse(first.text)
    const firstIn = first.inputTokens ?? 0
    const firstOut = first.outputTokens ?? 0
    if (firstParsed) {
      return {
        parsed: firstParsed,
        parseRetryUsed: false,
        inputTokens: firstIn,
        outputTokens: firstOut,
      }
    }

    const repairPrompt = `${userPrompt}

Your previous response was invalid.
Return ONLY valid JSON with exactly:
{
  "query": <string | object | null>,
  "explanation": <string>,
  "module": <string>
}`

    const retry = await this.provider.complete(systemPrompt, repairPrompt)
    const retryParsed = this.parseResponse(retry.text)
    const retryIn = retry.inputTokens ?? 0
    const retryOut = retry.outputTokens ?? 0
    if (retryParsed) {
      return {
        parsed: retryParsed,
        parseRetryUsed: true,
        inputTokens: firstIn + retryIn,
        outputTokens: firstOut + retryOut,
      }
    }

    return {
      parsed: {
        query: null,
        explanation: 'Model returned invalid JSON twice.',
      },
      parseRetryUsed: true,
      inputTokens: firstIn + retryIn,
      outputTokens: firstOut + retryOut,
    }
  }

  private pruneSchema(
    schema: SchemaContext,
    question: string,
    module: string,
    maxCollections: number,
  ): SchemaContext {
    if (schema.collections.length <= maxCollections) return schema

    const q = question.toLowerCase()
    const moduleTerms: Record<string, string[]> = {
      finance: ['invoice', 'payment', 'revenue', 'expense', 'account', 'billing', 'tax'],
      inventory: ['stock', 'inventory', 'product', 'warehouse', 'supplier', 'reorder'],
      crm: ['customer', 'contact', 'lead', 'deal', 'client'],
      hr: ['employee', 'staff', 'salary', 'payroll', 'department', 'leave'],
      general: [],
    }
    const terms = moduleTerms[module] ?? []

    const scored = schema.collections.map((col) => {
      const name = col.name.toLowerCase()
      let score = 0
      if (q.includes(name)) score += 8
      for (const t of terms) {
        if (name.includes(t)) score += 4
      }
      for (const field of col.fields) {
        const fn = field.name.toLowerCase()
        if (q.includes(fn)) score += 1
      }
      return { col, score }
    })

    scored.sort((a, b) => b.score - a.score || b.col.estimatedCount - a.col.estimatedCount)
    const selected = scored.slice(0, maxCollections).map((s) => s.col)
    return { ...schema, collections: selected }
  }

  private classifyErrorType(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err)
    const lower = message.toLowerCase()
    if (lower.includes('invalid json') || lower.includes('parse')) return 'parse_error'
    if (lower.includes('blocked') || lower.includes('read-only')) return 'safety_block'
    if (lower.includes('failed') || lower.includes('query')) return 'query_error'
    return 'unknown'
  }

  private parseResponse(
    text: string,
  ): { query: unknown; explanation?: string; module?: string } | null {
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as {
        query?: unknown
        explanation?: unknown
        module?: unknown
      }
      if (!Object.prototype.hasOwnProperty.call(parsed, 'query')) return null
      const response: { query: unknown; explanation?: string; module?: string } = {
        query: parsed.query ?? null,
      }
      if (typeof parsed.explanation === 'string') response.explanation = parsed.explanation
      if (typeof parsed.module === 'string') response.module = parsed.module
      return response
    } catch {
      return null
    }
  }

  private validateReadOnlyQuery(query: unknown, schema: SchemaContext): string {
    if (schema.dbType === 'postgresql') {
      if (typeof query !== 'string') {
        throw new Error('Generated PostgreSQL query must be a SQL string.')
      }
      const sql = query.trim()
      const normalized = sql.toLowerCase()
      if (!/^(select|with)\b/.test(normalized)) {
        throw new Error('Blocked non-read SQL query. Only SELECT/WITH are allowed.')
      }
      const dangerous =
        /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|comment)\b/i
      if (dangerous.test(normalized)) {
        throw new Error('Blocked SQL query containing non-read operation keywords.')
      }
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
      if (statements.length > 1) {
        throw new Error('Blocked multi-statement SQL query.')
      }
      return sql
    }

    if (!query || typeof query !== 'object' || Array.isArray(query)) {
      throw new Error('Generated MongoDB query must be an object.')
    }

    const mongo = query as Record<string, unknown>
    const allowedKeys = new Set(['collection', 'filter', 'projection', 'sort', 'limit'])
    for (const key of Object.keys(mongo)) {
      if (!allowedKeys.has(key)) {
        throw new Error(`Blocked MongoDB query key: ${key}`)
      }
    }

    if (typeof mongo.collection !== 'string' || !mongo.collection.trim()) {
      throw new Error('MongoDB query must include a non-empty collection name.')
    }

    if (mongo.limit !== undefined) {
      if (typeof mongo.limit !== 'number' || !Number.isFinite(mongo.limit)) {
        throw new Error('MongoDB query limit must be a number.')
      }
      mongo.limit = Math.max(1, Math.min(100, Math.floor(mongo.limit)))
    }

    return JSON.stringify(mongo)
  }
}
