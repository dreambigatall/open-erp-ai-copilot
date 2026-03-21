# Examples

These snippets complement the [main README](../README.md). They are reference code: copy into your app and adjust imports, env vars, and error handling.

## Minimal PostgreSQL ask

```ts
import { AiCore, createProvider } from '@erp-copilot/ai-core'
import { PgConnector } from '@erp-copilot/connector-pg'

const connector = new PgConnector(process.env.PG_CONNECTION_STRING!)
await connector.connect()

const ai = new AiCore(
  createProvider({
    provider: 'openai',
    model: 'gpt-4o',
  }),
)

const out = await ai.ask('How many rows are in the largest table?', connector)
console.log(out.explanation, out.rowCount)
```

## Minimal MongoDB ask

```ts
import { AiCore, createProvider } from '@erp-copilot/ai-core'
import { MongoConnector } from '@erp-copilot/connector-mongo'

const connector = new MongoConnector(
  process.env.MONGO_URI!,
  process.env.MONGO_DB_NAME ?? 'erp_demo',
)
await connector.connect()

const ai = new AiCore(createProvider({ provider: 'claude' }))
const out = await ai.ask('List collections you can query', connector)
console.log(out.explanation)
```

## Telemetry hook

```ts
import { AiCore, createProvider } from '@erp-copilot/ai-core'

const ai = new AiCore(createProvider({ provider: 'openai' }), {
  onTelemetry: (event) => {
    console.log('[copilot]', event.question, event.success, `${event.latencyMs}ms`)
  },
})
```
