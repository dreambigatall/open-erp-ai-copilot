# ERP Copilot

[![CI](https://github.com/erp-copilot/erp-ai-copilot/actions/workflows/ci.yml/badge.svg)](https://github.com/erp-copilot/erp-ai-copilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

> Open-source AI copilot framework for ERP systems.
> Plug in your MongoDB or PostgreSQL database and get natural
> language queries, auto-generated dashboards, and an AI assistant
> — in minutes, not months.

## Architecture

```
Your DB (MongoDB / PostgreSQL)
  → Connector layer  (schema discovery + query execution)
  → AI core          (LLM: NL → SQL/MQL → results)
  → Demo + UI        (Express API in apps/demo, React in packages/dashboard-ui)
```

## Packages

| Package                        | Description                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `@erp-copilot/ai-core`         | Core NL-to-query engine with pluggable LLM providers (Claude, OpenAI, Gemini, Grok) |
| `@erp-copilot/connector-mongo` | MongoDB adapter (schema discovery + query execution)                                |
| `@erp-copilot/connector-pg`    | PostgreSQL adapter (schema discovery + query execution)                             |
| `@erp-copilot/types`           | Shared TypeScript types for connectors and AI core                                  |
| `@erp-copilot/dashboard-ui`    | React dashboard and copilot UI (Vite)                                               |

## Apps

| App       | Path                    | Description                                                                  |
| --------- | ----------------------- | ---------------------------------------------------------------------------- |
| Demo API  | `apps/demo`             | Example Express server: `/api/query`, `/api/chat`, schema + telemetry routes |
| Dashboard | `packages/dashboard-ui` | Vite + React UI; point it at the demo API base URL in dev                    |

There is no separate `apps/api` in this repo; HTTP integration is demonstrated in **`apps/demo`**.

## Quickstart

```bash
git clone https://github.com/erp-copilot/erp-ai-copilot.git
cd erp-ai-copilot
npm install

# 1) Environment (copy and edit)
cp .env.example .env
# Set DB + at least one AI key: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or GROK_API_KEY

# 2) Databases (optional; matches .env.example defaults)
docker compose up -d

# 3) Seed sample data (optional)
npm run seed:pg -w @erp-copilot/demo
# or: npm run seed:mongo -w @erp-copilot/demo

# 4) Run demo API (from repo root)
npm run dev -w @erp-copilot/demo
# API: http://localhost:3000 (override with PORT in .env)

# 5) Run dashboard UI (second terminal)
npm run dev -w @erp-copilot/dashboard-ui
```

If you use a **fork**, replace the clone URL with your repository and update `repository` / `homepage` fields in `package.json` files before publishing packages.

### Using @erp-copilot/ai-core directly

Install the packages:

```bash
npm install @erp-copilot/ai-core @erp-copilot/connector-pg @erp-copilot/connector-mongo
```

Then in your own app:

```ts
import { AiCore, createProvider } from '@erp-copilot/ai-core'
import { PgConnector } from '@erp-copilot/connector-pg'

const connector = new PgConnector(process.env.PG_CONNECTION_STRING!)
await connector.connect()

const provider = createProvider({ provider: 'openai', model: 'gpt-4o' })
const ai = new AiCore(provider)
const result = await ai.ask('Show me invoices from last month', connector)
```

More samples live under [`examples/`](examples/).

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

See [`CONTRIBUTING.md`](CONTRIBUTING.md) — PRs welcome.

## Security

See [`SECURITY.md`](SECURITY.md) for how to report vulnerabilities and deployment safety notes.

## License

MIT © 2026
