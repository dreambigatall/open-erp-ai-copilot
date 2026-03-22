import express from 'express'
import cors from 'cors'
import { createCopilotRuntime } from './copilotRuntime.js'

const { config, connector, provider, aiCore, getSchema, telemetry, toApiError } =
  createCopilotRuntime()

const app = express()

app.use(cors())
app.use(express.json())

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
