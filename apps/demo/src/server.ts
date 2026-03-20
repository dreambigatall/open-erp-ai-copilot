import express from 'express'
import cors from 'cors'
import { config as loadEnv } from 'dotenv'
import config from './config.js'
import { createConnector } from './createConnector.js'
import { createProvider } from '@erp-copilot/ai-core'
import { AiCore } from '@erp-copilot/ai-core'
import type { LLMProvider, LLMResponse } from '@erp-copilot/ai-core'
import type { SchemaContext } from '@erp-copilot/types'

loadEnv()

type ApiErrorPayload = {
  code: string
  message: string
  hint?: string
}

function toApiError(err: unknown): ApiErrorPayload {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  if (lower.includes('invalid json') || lower.includes('parse')) {
    return {
      code: 'INVALID_MODEL_OUTPUT',
      message,
      hint: 'Try again or simplify the question. The model returned malformed JSON.',
    }
  }

  if (
    lower.includes('blocked') ||
    lower.includes('only select') ||
    lower.includes('only use find')
  ) {
    return {
      code: 'UNSAFE_QUERY_BLOCKED',
      message,
      hint: 'Rephrase as a read-only analytics question.',
    }
  }

  if (lower.includes('api key') || lower.includes('forbidden') || lower.includes('permission')) {
    return {
      code: 'PROVIDER_AUTH_ERROR',
      message,
      hint: 'Check AI provider key, model, and account permissions in .env.',
    }
  }

  if (lower.includes('not found') || lower.includes('model')) {
    return {
      code: 'PROVIDER_MODEL_ERROR',
      message,
      hint: 'Use a supported model name for your selected provider.',
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    message,
  }
}

function shouldFallbackForError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()
  return (
    lower.includes('not found') ||
    lower.includes('model') ||
    lower.includes('unsupported') ||
    lower.includes('overloaded') ||
    lower.includes('rate limit') ||
    lower.includes('429')
  )
}

class ResilientProvider implements LLMProvider {
  readonly name: string
  readonly model: string

  constructor(
    private primary: LLMProvider,
    private fallback?: LLMProvider,
  ) {
    this.name = this.fallback ? `${this.primary.name}->${this.fallback.name}` : this.primary.name
    this.model = this.fallback
      ? `${this.primary.model}->${this.fallback.model}`
      : this.primary.model
  }

  async complete(systemPrompt: string, userMessage: string): Promise<LLMResponse> {
    try {
      return await this.primary.complete(systemPrompt, userMessage)
    } catch (err) {
      if (!this.fallback || !shouldFallbackForError(err)) throw err
      return this.fallback.complete(systemPrompt, userMessage)
    }
  }

  async *completeStream(
    systemPrompt: string,
    userMessage: string,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.primary.completeStream) {
      const response = await this.complete(systemPrompt, userMessage)
      if (response.text) yield response.text
      return
    }

    try {
      for await (const chunk of this.primary.completeStream(systemPrompt, userMessage)) {
        yield chunk
      }
    } catch (err) {
      if (!this.fallback || !shouldFallbackForError(err)) throw err

      if (this.fallback.completeStream) {
        for await (const chunk of this.fallback.completeStream(systemPrompt, userMessage)) {
          yield chunk
        }
        return
      }

      const response = await this.fallback.complete(systemPrompt, userMessage)
      if (response.text) yield response.text
    }
  }
}

const app = express()
const connector = createConnector(config)
const primaryProvider = createProvider(config.ai)
const fallbackProvider = config.ai.fallbackModel
  ? createProvider({ ...config.ai, model: config.ai.fallbackModel })
  : undefined
const provider = new ResilientProvider(primaryProvider, fallbackProvider)

const telemetry = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  parseRetryRequests: 0,
  queryRepairRequests: 0,
  totalLatencyMs: 0,
  totalExecutionTimeMs: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
}

function onAiTelemetry(event: {
  success: boolean
  parseRetryUsed: boolean
  queryRepairUsed: boolean
  latencyMs: number
  executionTimeMs: number
  inputTokens: number
  outputTokens: number
}): void {
  telemetry.totalRequests += 1
  if (event.success) telemetry.successfulRequests += 1
  else telemetry.failedRequests += 1
  if (event.parseRetryUsed) telemetry.parseRetryRequests += 1
  if (event.queryRepairUsed) telemetry.queryRepairRequests += 1
  telemetry.totalLatencyMs += event.latencyMs
  telemetry.totalExecutionTimeMs += event.executionTimeMs
  telemetry.totalInputTokens += event.inputTokens
  telemetry.totalOutputTokens += event.outputTokens
}

const aiCoreOptions = {
  ...(config.ai.promptVersion ? { promptVersion: config.ai.promptVersion } : {}),
  ...(typeof config.ai.maxSchemaCollections === 'number'
    ? { maxSchemaCollections: config.ai.maxSchemaCollections }
    : {}),
  onTelemetry: onAiTelemetry,
}
const aiCore = new AiCore(provider, aiCoreOptions)

app.use(cors())
app.use(express.json())

// Cache schema — introspect once at startup
let schemaCache: SchemaContext | null = null

async function getSchema(): Promise<SchemaContext> {
  if (!schemaCache) {
    schemaCache = await connector.getSchemaContext()
  }
  return schemaCache
}

// ── Routes ────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', provider: provider.name, model: provider.model })
})

app.get('/api/metrics', (_req, res) => {
  const total = telemetry.totalRequests || 1
  res.json({
    ...telemetry,
    parseFailureRate: telemetry.parseRetryRequests / total,
    queryFailureRate: telemetry.failedRequests / total,
    avgLatencyMs: telemetry.totalLatencyMs / total,
    avgExecutionTimeMs: telemetry.totalExecutionTimeMs / total,
    avgInputTokens: telemetry.totalInputTokens / total,
    avgOutputTokens: telemetry.totalOutputTokens / total,
    promptVersion: config.ai.promptVersion,
    schemaCollectionCap: config.ai.maxSchemaCollections,
  })
})

app.get('/api/schema', (_req, res) => {
  void getSchema()
    .then((schema) => {
      res.json(schema)
    })
    .catch((err: unknown) => {
      res.status(500).json({ error: toApiError(err) })
    })
})

app.post('/api/query', (req, res) => {
  const { question } = req.body as { question?: string }
  if (!question?.trim()) {
    res.status(400).json({ error: 'question is required' })
    return
  }

  void getSchema()
    .then((schema) => aiCore.ask(question, connector, schema))
    .then((result) => {
      res.json(result)
    })
    .catch((err: unknown) => {
      res.status(500).json({ error: toApiError(err) })
    })
})

// ── Streaming endpoint (SSE) ──────────────────────────────
app.post('/api/chat', (req, res) => {
  const { message } = req.body as { message?: string }
  if (!message?.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  void (async () => {
    try {
      const schema = await getSchema()
      const { buildSystemPrompt } = await import('@erp-copilot/ai-core')
      const systemPrompt = buildSystemPrompt(schema)

      for await (const chunk of provider.completeStream(systemPrompt, message)) {
        res.write(`data: ${JSON.stringify({ chunk })}

`)
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: toApiError(err) })}

`)
    } finally {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  })()
})

// ── Start ─────────────────────────────────────────────────
const PORT = config.port ?? 3000

connector
  .connect()
  .then(() => {
    console.log(`[erp-copilot] DB connected (${config.database.type})`)
    app.listen(PORT, () => {
      console.log(`[erp-copilot] Server running at http://localhost:${String(PORT)}`)
      console.log(`[erp-copilot] AI provider: ${provider.name} / ${provider.model}`)
    })
  })
  .catch((err: unknown) => {
    console.error('[erp-copilot] Failed to connect to DB:', err)
    process.exit(1)
  })
