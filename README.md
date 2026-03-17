# ERP Copilot

> Open-source AI copilot framework for ERP systems.  
> Plug in your MongoDB or PostgreSQL database and get natural
> language queries, auto-generated dashboards, and an AI assistant
> — in minutes, not months.

## Architecture

```
Your DB (MongoDB / PostgreSQL)
  → Connector layer  (schema discovery + query execution)
  → AI core          (LLM: NL → SQL/MQL → results)
  → Apps             (API, demo, web dashboard)
```

## Packages

| Package                        | Description                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `@erp-copilot/ai-core`         | Core NL-to-query engine with pluggable LLM providers (Claude, OpenAI, Gemini, Grok) |
| `@erp-copilot/connector-mongo` | MongoDB adapter (schema discovery + query execution)                                |
| `@erp-copilot/connector-pg`    | PostgreSQL adapter (schema discovery + query execution)                             |
| `@erp-copilot/types`           | Shared TypeScript types for connectors and AI core                                  |

## Apps

| App  | Path        | Description                                          |
| ---- | ----------- | ---------------------------------------------------- |
| API  | `apps/api`  | Fastify API exposing the copilot as HTTP endpoints   |
| Demo | `apps/demo` | Example ERP demo wiring together API + UI (optional) |
| Web  | `apps/web`  | Web dashboard / UI (optional)                        |

## Quickstart

```bash
git clone https://github.com/YOUR_ORG/erp-copilot.git
cd erp-copilot
npm install

# 1) Set up environment (copy and edit)
cp .env.example .env
# Fill in DB connection + provider API keys
# e.g. OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROK_API_KEY

# 2) Run database + API + web (if you use the provided stack)
docker compose up -d
npm run dev
```

### Using @erp-copilot/ai-core directly

Install the packages:

```bash
npm install @erp-copilot/ai-core @erp-copilot/connector-pg @erp-copilot/connector-mongo
```

Then in your own app:

```ts
import { AiCore } from '@erp-copilot/ai-core'
import { createPgConnector } from '@erp-copilot/connector-pg'

const connector = await createPgConnector({
  connectionString: process.env.POSTGRES_URL!,
})

const ai = new AiCore(/* LLM provider instance, see docs */)
const result = await ai.ask('Show me invoices from last month', connector)
```

See `examples/` for more end-to-end samples.

### Choosing an LLM provider

`@erp-copilot/ai-core` ships provider classes and a small factory:

- `ClaudeProvider` (Anthropic)
- `OpenAIProvider`
- `GeminiProvider`
- `GrokProvider` (xAI, via OpenAI-compatible API)
- `createProvider(config: { provider: 'claude' | 'openai' | 'gemini' | 'grok'; apiKey?: string; model?: string })`

Each provider reads a sensible default API key from environment variables if you omit `apiKey`:

- `ClaudeProvider` → `ANTHROPIC_API_KEY`
- `OpenAIProvider` → `OPENAI_API_KEY`
- `GeminiProvider` → `GEMINI_API_KEY`
- `GrokProvider` → `GROK_API_KEY`

Example:

```ts
import { AiCore, createProvider } from '@erp-copilot/ai-core'

const provider = createProvider({
  provider: 'openai',
  // apiKey: process.env.OPENAI_API_KEY, // optional; falls back to env
  model: 'gpt-4o',
})

const ai = new AiCore(provider)
```

## Windows + WSL note

If you switch between **Windows** and **WSL**, don’t reuse the same `node_modules` folder across both. Native dependencies (like `esbuild`) install a platform-specific binary.

- If tests/build fail with an `esbuild` platform/version error, run:

```bash
npm run clean:modules
npm install
```

## Contributing

See `CONTRIBUTING.md` — PRs welcome.

## License

MIT © 2026
