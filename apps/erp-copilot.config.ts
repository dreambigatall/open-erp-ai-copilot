import type { ProviderConfig } from '@erp-copilot/ai-core'

export interface ERPCopilotConfig {
  /** App display name shown in the dashboard header */
  appName: string

  /** Database — pick one */
  database:
    | { type: 'mongodb'; uri: string; dbName: string }
    | { type: 'postgresql'; connectionString: string }

  /** AI provider config */
  ai: ProviderConfig & {
    /** System prompt prefix appended before the schema context */
    systemPromptPrefix?: string
  }

  /** Which ERP modules to show in the sidebar */
  modules: Array<'finance' | 'inventory' | 'crm' | 'hr' | 'general'>

  /** Server port (default 3000) */
  port?: number
}

const config: ERPCopilotConfig = {
  appName: 'Acme ERP Copilot',

  database: {
    type: process.env['DB_TYPE'] === 'mongodb' ? 'mongodb' : 'postgresql',
    // MongoDB
    uri: process.env['MONGO_URI'] ?? 'mongodb://localhost:27017',
    dbName: process.env['MONGO_DB_NAME'] ?? 'erp_demo',
    // PostgreSQL
    connectionString:
      process.env['PG_CONNECTION_STRING'] ??
      'postgresql://postgres:password@localhost:5432/erp_demo',
  } as unknown as ERPCopilotConfig['database'],

  ai: {
    provider: (process.env['AI_PROVIDER'] as ProviderConfig['provider'] | undefined) ?? 'claude',
    ...(() => {
      const key =
        process.env['ANTHROPIC_API_KEY'] ??
        process.env['OPENAI_API_KEY'] ??
        process.env['GEMINI_API_KEY'] ??
        process.env['GROK_API_KEY']
      return key ? { apiKey: key } : {}
    })(),
    ...(process.env['AI_MODEL'] ? { model: process.env['AI_MODEL'] } : {}),
    systemPromptPrefix: 'You are a helpful ERP assistant for Acme Corp.',
  },

  modules: ['finance', 'inventory', 'crm', 'hr'],
  port: parseInt(process.env['PORT'] ?? '3000'),
}

export default config
