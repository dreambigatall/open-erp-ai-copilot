import type { ProviderConfig } from '@erp-copilot/ai-core'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

loadEnv({ path: resolve(__dirname, '../../../.env') })

const resolvedApiKey =
  process.env['ANTHROPIC_API_KEY'] ??
  process.env['OPENAI_API_KEY'] ??
  process.env['GEMINI_API_KEY'] ??
  process.env['GROK_API_KEY']

export interface ERPCopilotConfig {
  appName: string
  database:
    | { type: 'mongodb'; uri: string; dbName: string }
    | { type: 'postgresql'; connectionString: string }
  ai: ProviderConfig & {
    systemPromptPrefix?: string
    fallbackModel?: string
    promptVersion?: string
    maxSchemaCollections?: number
  }
  modules: Array<'finance' | 'inventory' | 'crm' | 'hr' | 'general'>
  port?: number
}

const config: ERPCopilotConfig = {
  appName: 'Acme ERP Copilot',
  database: {
    type: process.env['DB_TYPE'] === 'mongodb' ? 'mongodb' : 'postgresql',
    uri: process.env['MONGO_URI'] ?? 'mongodb://localhost:27017',
    dbName: process.env['MONGO_DB_NAME'] ?? 'erp_demo',
    connectionString:
      process.env['PG_CONNECTION_STRING'] ??
      'postgresql://postgres:password@localhost:5433/erp_demo',
  } as unknown as ERPCopilotConfig['database'],
  ai: {
    provider: (process.env['AI_PROVIDER'] as ProviderConfig['provider'] | undefined) ?? 'claude',
    ...(resolvedApiKey ? { apiKey: resolvedApiKey } : {}),
    ...(process.env['AI_MODEL'] ? { model: process.env['AI_MODEL'] } : {}),
    ...(process.env['AI_FALLBACK_MODEL']
      ? { fallbackModel: process.env['AI_FALLBACK_MODEL'] }
      : {}),
    promptVersion: process.env['AI_PROMPT_VERSION'] ?? 'v1',
    maxSchemaCollections: parseInt(process.env['AI_MAX_SCHEMA_COLLECTIONS'] ?? '8', 10),
    systemPromptPrefix: 'You are a helpful ERP assistant for Acme Corp.',
  },
  modules: ['finance', 'inventory', 'crm', 'hr'],
  port: parseInt(process.env['PORT'] ?? '3000', 10),
}

export default config
