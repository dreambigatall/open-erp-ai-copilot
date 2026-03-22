#!/usr/bin/env node
import { Command } from 'commander'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import config from './config.js'
import type { ERPCopilotConfig } from './config.js'
import { createCopilotRuntime, toApiError } from './copilotRuntime.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function getRepoRoot(): string {
  return resolve(__dirname, '../../..')
}

function envPaths(): { envFile: string; exampleFile: string } {
  const root = getRepoRoot()
  return {
    envFile: resolve(root, '.env'),
    exampleFile: resolve(root, '.env.example'),
  }
}

async function readEnvRaw(): Promise<string> {
  const { envFile } = envPaths()
  if (!existsSync(envFile)) {
    throw new Error(`Missing ${envFile}. Run: opendb config init`)
  }
  return readFile(envFile, 'utf-8')
}

function parseEnvMap(content: string): Map<string, string> {
  const map = new Map<string, string>()
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
    map.set(key, value)
  }
  return map
}

async function envGet(key: string): Promise<string | undefined> {
  const raw = await readEnvRaw()
  return parseEnvMap(raw).get(key)
}

async function envSet(key: string, value: string): Promise<void> {
  const { envFile } = envPaths()
  if (!existsSync(envFile)) {
    throw new Error(`Missing ${envFile}. Run: opendb config init`)
  }
  let raw = await readFile(envFile, 'utf-8')
  const lines = raw.split(/\r?\n/)
  const prefix = `${key}=`
  let found = false
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const newLine = `${key}="${escaped}"`
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const t = line.trim()
    if (t.startsWith('#')) continue
    if (t.startsWith(prefix)) {
      lines[i] = newLine
      found = true
      break
    }
  }
  if (!found) {
    if (lines.length && lines[lines.length - 1] !== '') lines.push('')
    lines.push(newLine)
  }
  raw = lines.join('\n')
  if (!raw.endsWith('\n')) raw += '\n'
  await writeFile(envFile, raw, 'utf-8')
}

function redactTail(value: string, tailLen = 4): string {
  if (value.length <= tailLen) return '***'
  return `***${value.slice(-tailLen)}`
}

function formatConfigShow(cfg: ERPCopilotConfig): string {
  const lines: string[] = []
  lines.push(`appName: ${cfg.appName}`)
  lines.push(`modules: ${cfg.modules.join(', ')}`)
  lines.push(`port: ${String(cfg.port ?? 3000)}`)
  lines.push(`database.type: ${cfg.database.type}`)
  if (cfg.database.type === 'mongodb') {
    lines.push(`database.uri: ***`)
    lines.push(`database.dbName: ${cfg.database.dbName}`)
  } else {
    lines.push(`database.connectionString: ***`)
  }
  lines.push(`ai.provider: ${cfg.ai.provider}`)
  if (cfg.ai.model) lines.push(`ai.model: ${cfg.ai.model}`)
  if (cfg.ai.fallbackModel) lines.push(`ai.fallbackModel: ${cfg.ai.fallbackModel}`)
  if (cfg.ai.promptVersion) lines.push(`ai.promptVersion: ${cfg.ai.promptVersion}`)
  if (typeof cfg.ai.maxSchemaCollections === 'number') {
    lines.push(`ai.maxSchemaCollections: ${String(cfg.ai.maxSchemaCollections)}`)
  }
  const keys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GROK_API_KEY'] as const
  for (const k of keys) {
    const v = process.env[k]
    lines.push(`${k}: ${v ? redactTail(v) : '(not set)'}`)
  }
  return lines.join('\n')
}

async function cmdConfigInit(): Promise<void> {
  const { envFile, exampleFile } = envPaths()
  if (existsSync(envFile)) {
    console.error(`[opendb] ${envFile} already exists — not overwriting.`)
    process.exitCode = 1
    return
  }
  if (!existsSync(exampleFile)) {
    console.error(`[opendb] Missing ${exampleFile}`)
    process.exitCode = 1
    return
  }
  await copyFile(exampleFile, envFile)
  console.log(`[opendb] Created ${envFile} from .env.example`)
}

function cmdConfigShow(): void {
  console.log(formatConfigShow(config))
}

async function cmdConfigGet(key: string): Promise<void> {
  const v = await envGet(key)
  if (v === undefined) {
    console.error(`[opendb] ${key} is not set in .env`)
    process.exitCode = 1
    return
  }
  const lower = key.toLowerCase()
  if (
    lower.includes('key') ||
    lower.includes('secret') ||
    lower.includes('password') ||
    lower.includes('token') ||
    lower.includes('connection_string') ||
    lower.includes('uri')
  ) {
    console.log(redactTail(v))
  } else {
    console.log(v)
  }
}

async function cmdConfigSet(key: string, value: string): Promise<void> {
  await envSet(key, value)
  console.log(`[opendb] Updated ${key} in .env (restart to apply)`)
}

async function cmdAsk(question: string): Promise<void> {
  const chalk = (await import('chalk')).default
  const rt = createCopilotRuntime()
  try {
    await rt.connector.connect()
    const schema = await rt.getSchema()
    const result = await rt.aiCore.ask(question, rt.connector, schema)

    if (result.queryRan) {
      console.log(chalk.cyan.bold('\nQuery: ') + chalk.white(result.queryRan))
    }
    if (result.explanation) {
      console.log(chalk.yellow.bold('\nExplanation: ') + chalk.white(result.explanation))
    }
    if (result.rows.length > 0) {
      console.log(
        chalk.green.bold(
          '\nResults (' +
            String(result.rowCount) +
            ' rows, ' +
            String(result.executionTimeMs) +
            'ms):\n',
        ),
      )
      const Table = (await import('cli-table3')).default
      const headers = Object.keys(result.rows[0] ?? {})
      const table = new Table({ head: headers.map((h) => chalk.cyan(h)) })
      for (const row of result.rows) {
        table.push(headers.map((h) => String(row[h] ?? '')))
      }
      console.log(table.toString())
    } else if (!result.queryRan) {
      console.log(chalk.dim('\nNo results.'))
    }

    console.log(chalk.dim(`\n  provider: ${result.provider} · model: ${result.model}`))
  } catch (err) {
    console.error(chalk.red(JSON.stringify(toApiError(err), null, 2)))
    process.exitCode = 1
  }
}

async function cmdDoctor(): Promise<void> {
  const chalk = (await import('chalk')).default
  const rt = createCopilotRuntime()
  try {
    await rt.connector.connect()
    console.log(
      chalk.green('✓ ') +
        chalk.bold('Database connected') +
        chalk.dim(` (${rt.config.database.type})`),
    )
    console.log(
      chalk.green('✓ ') +
        chalk.bold('AI provider ready') +
        chalk.dim(` (${rt.provider.name} · ${rt.provider.model})`),
    )
    const schema = await rt.getSchema()
    console.log(
      chalk.green('✓ ') +
        chalk.bold('Schema loaded') +
        chalk.dim(' (' + String(schema.collections.length) + ' collections/tables)'),
    )
  } catch (err) {
    console.error(chalk.red('✗ ') + JSON.stringify(toApiError(err), null, 2))
    process.exitCode = 1
  }
}

async function launchTui(): Promise<void> {
  const { needsSetup, runSetupWizard } = await import('./setupWizard.js')
  if (needsSetup()) {
    const ok = await runSetupWizard()
    if (!ok) return
  }

  const rt = createCopilotRuntime()
  try {
    await rt.connector.connect()
  } catch (err) {
    const chalk = (await import('chalk')).default
    console.error(chalk.red('✗ Connection failed: ') + JSON.stringify(toApiError(err), null, 2))
    console.error(chalk.dim('  Run `opendb doctor` or `opendb config init` to fix.'))
    process.exitCode = 1
    return
  }
  const { runChatTui } = await import('./cliChatTui.js')
  await runChatTui(rt)
}

// --- CLI Program ---
const program = new Command()

program
  .name('opendb')
  .description('OpenDB — AI-powered database assistant. Ask questions in plain language.')
  .version('0.1.0')

program
  .command('ask')
  .description('Run a one-shot natural-language query')
  .argument('<question>', 'Question in plain language')
  .action(async (question: string) => {
    await cmdAsk(question)
  })

program
  .command('doctor')
  .description('Check DB connection and AI provider status')
  .action(async () => {
    await cmdDoctor()
  })

program
  .command('init')
  .description('Run interactive setup wizard')
  .action(async () => {
    const { runSetupWizard } = await import('./setupWizard.js')
    await runSetupWizard()
  })

program
  .command('completion')
  .description('Generate shell completions')
  .argument('<shell>', 'Shell type: bash, zsh, or fish')
  .action(async (shell: string) => {
    const { bashCompletion, zshCompletion, fishCompletion } = await import('./completions.js')
    const completions: Record<string, () => string> = {
      bash: bashCompletion,
      zsh: zshCompletion,
      fish: fishCompletion,
    }
    const fn = completions[shell.toLowerCase()]
    if (!fn) {
      console.error('[opendb] Supported shells: bash, zsh, fish')
      process.exitCode = 1
      return
    }
    console.log(fn())
  })

const configCmd = program.command('config').description('Manage configuration')

configCmd
  .command('init')
  .description('Initialize .env from .env.example')
  .action(async () => {
    await cmdConfigInit()
  })

configCmd
  .command('show')
  .description('Print current config (secrets hidden)')
  .action(() => {
    cmdConfigShow()
  })

configCmd
  .command('get')
  .description('Read one config variable')
  .argument('<key>', 'Variable name')
  .action(async (key: string) => {
    await cmdConfigGet(key)
  })

configCmd
  .command('set')
  .description('Set a config variable')
  .argument('<key>', 'Variable name')
  .argument('[values...]', 'Value')
  .action(async (key: string, values: string[]) => {
    const value = values.join(' ')
    if (!value) {
      console.error('[opendb] value is required')
      process.exitCode = 1
      return
    }
    await cmdConfigSet(key, value)
  })

// Default: launch interactive TUI when no command given
if (process.argv.length <= 2) {
  void launchTui()
} else {
  void program.parseAsync(process.argv)
}
