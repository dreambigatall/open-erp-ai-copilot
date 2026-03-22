import { existsSync, mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface OpenDBConfig {
  version: 1
  database: {
    type: 'postgresql' | 'mongodb'
    connectionString?: string
    uri?: string
    dbName?: string
  }
  ai: {
    provider: 'claude' | 'openai' | 'gemini' | 'grok'
    model: string
    apiKey?: string
    fallbackModel?: string
    maxSchemaCollections?: number
    promptVersion?: string
  }
  server: {
    port: number
  }
}

function getConfigDir(): string {
  return resolve(homedir(), '.opendb')
}

function getConfigPath(): string {
  return resolve(getConfigDir(), 'config.json')
}

function getLegacyEnvPath(): string {
  // Repo-root .env (for dev mode)
  return resolve(__dirname, '../../../.env')
}

function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

export function configExists(): boolean {
  return existsSync(getConfigPath()) || existsSync(getLegacyEnvPath())
}

export function getEnvVar(key: string): string | undefined {
  return process.env[key]
}

export function loadConfigFromEnv(): OpenDBConfig {
  const provider =
    (process.env['AI_PROVIDER'] as OpenDBConfig['ai']['provider'] | undefined) ?? 'claude'

  const resolvedApiKey =
    process.env['ANTHROPIC_API_KEY'] ??
    process.env['OPENAI_API_KEY'] ??
    process.env['GEMINI_API_KEY'] ??
    process.env['GROK_API_KEY']

  const dbConfig: OpenDBConfig['database'] = {
    type: process.env['DB_TYPE'] === 'mongodb' ? 'mongodb' : 'postgresql',
  }
  if (process.env['PG_CONNECTION_STRING'])
    dbConfig.connectionString = process.env['PG_CONNECTION_STRING']
  if (process.env['MONGO_URI']) dbConfig.uri = process.env['MONGO_URI']
  if (process.env['MONGO_DB_NAME']) dbConfig.dbName = process.env['MONGO_DB_NAME']

  const aiConfig: OpenDBConfig['ai'] = {
    provider,
    model: process.env['AI_MODEL'] ?? 'claude-sonnet-4-20250514',
    maxSchemaCollections: parseInt(process.env['AI_MAX_SCHEMA_COLLECTIONS'] ?? '8', 10),
    promptVersion: process.env['AI_PROMPT_VERSION'] ?? 'v1',
  }
  if (resolvedApiKey) aiConfig.apiKey = resolvedApiKey
  if (process.env['AI_FALLBACK_MODEL']) aiConfig.fallbackModel = process.env['AI_FALLBACK_MODEL']

  return {
    version: 1,
    database: dbConfig,
    ai: aiConfig,
    server: {
      port: parseInt(process.env['PORT'] ?? '3005', 10),
    },
  }
}

export async function loadConfig(): Promise<OpenDBConfig> {
  // Priority 1: ~/.opendb/config.json
  const jsonPath = getConfigPath()
  if (existsSync(jsonPath)) {
    const raw = await readFile(jsonPath, 'utf-8')
    const parsed = JSON.parse(raw) as OpenDBConfig
    // Set env vars from config so existing code works
    if (parsed.ai.apiKey) {
      const keyEnvNames: Record<string, string> = {
        claude: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        gemini: 'GEMINI_API_KEY',
        grok: 'GROK_API_KEY',
      }
      const envKey = keyEnvNames[parsed.ai.provider]
      if (envKey) process.env[envKey] = parsed.ai.apiKey
    }
    process.env['AI_PROVIDER'] = parsed.ai.provider
    process.env['AI_MODEL'] = parsed.ai.model
    process.env['DB_TYPE'] = parsed.database.type
    if (parsed.database.connectionString)
      process.env['PG_CONNECTION_STRING'] = parsed.database.connectionString
    if (parsed.database.uri) process.env['MONGO_URI'] = parsed.database.uri
    if (parsed.database.dbName) process.env['MONGO_DB_NAME'] = parsed.database.dbName
    if (parsed.server.port) process.env['PORT'] = String(parsed.server.port)
    return parsed
  }

  // Priority 2: repo-root .env (loaded by dotenv in config.ts)
  return loadConfigFromEnv()
}

export async function saveConfig(config: OpenDBConfig): Promise<string> {
  const dir = getConfigDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const path = getConfigPath()
  // Don't store apiKey in plaintext JSON — warn user
  const safe = { ...config }
  if (safe.ai.apiKey) {
    const keyEnvNames: Record<string, string> = {
      claude: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY',
      grok: 'GROK_API_KEY',
    }
    const envKey = keyEnvNames[safe.ai.provider]
    if (envKey) process.env[envKey] = safe.ai.apiKey
  }

  await writeFile(path, JSON.stringify(safe, null, 2) + '\n', 'utf-8')
  return path
}

export async function migrateFromEnv(): Promise<OpenDBConfig | null> {
  const envPath = getLegacyEnvPath()
  if (!existsSync(envPath)) return null

  const raw = await readFile(envPath, 'utf-8')
  const env = parseEnvFile(raw)

  const provider = (env['AI_PROVIDER'] as OpenDBConfig['ai']['provider'] | undefined) ?? 'claude'
  const apiKey =
    env['ANTHROPIC_API_KEY'] ??
    env['OPENAI_API_KEY'] ??
    env['GEMINI_API_KEY'] ??
    env['GROK_API_KEY']

  const dbConfig2: OpenDBConfig['database'] = {
    type: env['DB_TYPE'] === 'mongodb' ? 'mongodb' : 'postgresql',
  }
  if (env['PG_CONNECTION_STRING']) dbConfig2.connectionString = env['PG_CONNECTION_STRING']
  if (env['MONGO_URI']) dbConfig2.uri = env['MONGO_URI']
  if (env['MONGO_DB_NAME']) dbConfig2.dbName = env['MONGO_DB_NAME']

  const aiConfig2: OpenDBConfig['ai'] = {
    provider,
    model: env['AI_MODEL'] ?? 'claude-sonnet-4-20250514',
    maxSchemaCollections: parseInt(env['AI_MAX_SCHEMA_COLLECTIONS'] ?? '8', 10),
    promptVersion: env['AI_PROMPT_VERSION'] ?? 'v1',
  }
  if (apiKey) aiConfig2.apiKey = apiKey
  if (env['AI_FALLBACK_MODEL']) aiConfig2.fallbackModel = env['AI_FALLBACK_MODEL']

  const config: OpenDBConfig = {
    version: 1,
    database: dbConfig2,
    ai: aiConfig2,
    server: {
      port: parseInt(env['PORT'] ?? '3005', 10),
    },
  }

  const saved = await saveConfig(config)
  console.log(`  Migrated config to ${saved}`)
  return config
}

export function formatConfigForDisplay(config: OpenDBConfig): string {
  const lines: string[] = []
  lines.push(`  Database: ${config.database.type}`)
  if (config.database.type === 'postgresql') {
    lines.push(`  Connection: ***`)
  } else {
    lines.push(`  MongoDB URI: ***`)
    lines.push(`  MongoDB DB: ${config.database.dbName ?? '(default)'}`)
  }
  lines.push(`  AI Provider: ${config.ai.provider}`)
  lines.push(`  AI Model: ${config.ai.model}`)
  if (config.ai.fallbackModel) lines.push(`  Fallback: ${config.ai.fallbackModel}`)
  lines.push('  Schema limit: ' + String(config.ai.maxSchemaCollections ?? 8) + ' collections')
  lines.push('  Port: ' + String(config.server.port))
  return lines.join('\n')
}
