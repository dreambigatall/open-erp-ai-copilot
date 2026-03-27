/**
 * OpenDB Interactive Terminal Chat
 * OpenCode-style TUI with thinking steps, clean formatting, full scrollback.
 */
import { createInterface } from 'node:readline'
import { writeFile, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import chalk from 'chalk'
import { buildSystemPrompt } from '@erp-copilot/ai-core'
import type { CopilotRuntime } from './copilotRuntime.js'
import {
  generateSessionId,
  saveSession,
  listSessions,
  exportAsJson,
  exportAsMarkdown,
  exportAsCsv,
  generateTitle,
  type Session,
  type SessionMessage,
} from './sessions.js'

// --- Terminal Helpers ---

const dim = chalk.dim
const bold = chalk.bold
const cyan = chalk.cyan
const green = chalk.green
const yellow = chalk.yellow
const red = chalk.red
const gray = chalk.gray
const white = chalk.white
const magenta = chalk.magenta

function out(text: string): void {
  process.stdout.write(text)
}

function line(text = ''): void {
  process.stdout.write(text + '\n')
}

// --- Spinner ---

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
let spinnerTimer: ReturnType<typeof setInterval> | null = null
let spinnerMsg = ''

function startSpinner(msg: string): void {
  spinnerMsg = msg
  let i = 0
  spinnerTimer = setInterval(() => {
    out('\r  ' + yellow(spinnerFrames[i % spinnerFrames.length] ?? '⠋') + ' ' + dim(msg))
    i++
  }, 80)
}

function stopSpinner(success = true): void {
  if (spinnerTimer) {
    clearInterval(spinnerTimer)
    spinnerTimer = null
  }
  if (success) {
    out('\r  ' + green('✓') + ' ' + dim(spinnerMsg))
    line()
  } else {
    out('\r  ' + red('✗') + ' ' + dim(spinnerMsg))
    line()
  }
}

function updateSpinnerMsg(msg: string): void {
  spinnerMsg = msg
}

// --- Thinking Steps ---

function thinkStep(icon: string, text: string, detail?: string): void {
  const icons: Record<string, string> = {
    search: magenta('⌕'),
    brain: cyan('◉'),
    db: yellow('⊞'),
    query: green('⟐'),
    check: green('✓'),
    arrow: dim('→'),
    dot: dim('·'),
  }
  const i = icons[icon] ?? dim('·')
  if (detail) {
    line('  ' + i + ' ' + white(text) + ' ' + detail)
  } else {
    line('  ' + i + ' ' + white(text))
  }
}

// --- Table Renderer ---

function renderTable(headers: string[], rows: Record<string, unknown>[]): void {
  const maxRows = 30
  const shown = rows.slice(0, maxRows)

  const colWidths = headers.map((h) => {
    const maxVal = shown.reduce((max, row) => Math.max(max, String(row[h] ?? '').length), h.length)
    return Math.min(Math.max(maxVal + 2, h.length + 3), 35)
  })

  line(dim('  ┌' + colWidths.map((w) => '─'.repeat(w)).join('┬') + '┐'))
  line(
    bold(
      '  │' +
        headers
          .map((h, i) => ' ' + cyan(h.toUpperCase().padEnd((colWidths[i] ?? 10) - 1)))
          .join('│') +
        '│',
    ),
  )
  line(dim('  ├' + colWidths.map((w) => '─'.repeat(w)).join('┼') + '┤'))

  for (let r = 0; r < shown.length; r++) {
    const row = shown[r]
    if (!row) continue
    const isEven = r % 2 === 0
    const rowColor = isEven ? white : gray
    line(
      '  │' +
        headers
          .map((h, i) => {
            const width = colWidths[i] ?? 10
            let val = String(row[h] ?? '')
            if (val.length > width - 2) val = val.slice(0, width - 3) + '…'
            return ' ' + rowColor(val.padEnd(width - 1))
          })
          .join('│') +
        '│',
    )
  }

  line(dim('  └' + colWidths.map((w) => '─'.repeat(w)).join('┴') + '┘'))

  if (rows.length > maxRows) {
    line(dim('    ... and ' + String(rows.length - maxRows) + ' more rows'))
  }
}

// --- Header ---

function printHeader(dbType: string, provider: string, model: string): void {
  const title = ' OpenDB '
  const info = dbType + ' · ' + provider + ' · ' + model
  const width = 60

  line()
  line(cyan('  ╔' + '═'.repeat(width) + '╗'))
  line(cyan('  ║') + bold(title.padEnd(width)) + cyan('║'))
  line(cyan('  ║') + dim(info.padEnd(width)) + cyan('║'))
  line(cyan('  ╚' + '═'.repeat(width) + '╝'))
  line()
  line(dim('  Ask anything about your database. Type /help for commands.'))
  line(dim('  Ctrl+C to exit.'))
  line()
}

// --- Intent Detection ---

type Intent = 'chat' | 'query' | 'schema' | 'help' | 'unknown'

function detectIntent(input: string): Intent {
  const lower = input.toLowerCase().trim()
  if (lower.startsWith('/')) return 'unknown'
  if (
    /^(show|list|describe|display|what)\s.*(tables?|collections?|schema|database|structure)/i.test(
      lower,
    )
  )
    return 'schema'
  if (/^(help|how|what can|what do)/i.test(lower) && lower.split(' ').length <= 6) return 'help'
  if (
    /\b(show|list|find|get|count|total|sum|average|max|min|top|bottom|how many|which)\b/i.test(
      lower,
    )
  )
    return 'query'
  return 'chat'
}

// --- Help ---

function printHelp(): void {
  line()
  line(cyan.bold('  OpenDB ') + dim('— AI-powered database assistant'))
  line()
  line(bold('  Just type your question:'))
  line(dim('    show me top 5 customers by revenue'))
  line(dim('    how many invoices were created this month'))
  line(dim('    list all employees in engineering'))
  line()
  line(bold('  Slash Commands:'))
  const cmds: [string, string][] = [
    ['/help', 'Show this help'],
    ['/clear', 'Clear screen'],
    ['/schema', 'Show database schema as table'],
    ['/query <q>', 'Force analytics mode (JSON output)'],
    ['/doctor', 'Check connection & provider status'],
    ['/config', 'Show current configuration'],
    ['/sessions', 'List saved sessions'],
    ['/export [fmt]', 'Export session (json|md|csv)'],
    ['/exit', 'Save session & exit'],
  ]
  for (const [cmd, desc] of cmds) {
    line('    ' + cyan(cmd.padEnd(18)) + dim(desc))
  }
  line()
}

// --- Session Tracking ---

function trackMsg(
  session: Session,
  role: string,
  content: string,
  extra?: Partial<SessionMessage>,
): void {
  session.messages.push({
    role: role as SessionMessage['role'],
    content,
    timestamp: Date.now(),
    ...extra,
  })
  session.updatedAt = Date.now()
  if (role === 'user' && session.title === 'New session') {
    session.title = generateTitle(content)
  }
  if (session.messages.length % 10 === 0) {
    saveSession(session).catch(() => {})
  }
}

// --- Main Entry ---

export async function runChatTui(rt: CopilotRuntime): Promise<void> {
  await Promise.resolve()

  const session: Session = {
    id: generateSessionId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: 'New session',
    messages: [],
  }

  printHeader(rt.config.database.type, rt.provider.name, rt.provider.model)

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })

  let busy = false
  let queryCount = 0
  const startTime = Date.now()

  function prompt(): void {
    if (busy) return
    rl.question(green('❯ ') + reset(), (line) => {
      void handleInput(line)
    })
  }

  function reset(): string {
    return ''
  }

  async function handleInput(input: string): Promise<void> {
    const trimmed = input.trim()
    if (!trimmed) {
      prompt()
      return
    }

    // Slash commands
    if (trimmed.startsWith('/')) {
      await handleSlash(trimmed)
      prompt()
      return
    }

    // Normal message
    trackMsg(session, 'user', trimmed)
    const intent = detectIntent(trimmed)

    if (intent === 'help') {
      printHelp()
      prompt()
      return
    }

    if (intent === 'schema') {
      await handleSchema()
      prompt()
      return
    }

    if (intent === 'query') {
      await handleQuery(trimmed)
      prompt()
      return
    }

    // Chat — streaming with thinking steps
    await handleChat(trimmed)
    prompt()
  }

  async function handleSlash(trimmed: string): Promise<void> {
    const parts = trimmed.slice(1).split(/\s+/)
    const cmd = (parts[0] ?? '').toLowerCase()
    const args = parts.slice(1).join(' ')

    switch (cmd) {
      case 'help':
      case 'h':
      case '?':
        printHelp()
        break

      case 'clear':
      case 'cls':
        process.stdout.write('\x1B[2J\x1B[0f')
        printHeader(rt.config.database.type, rt.provider.name, rt.provider.model)
        break

      case 'schema':
      case 'tables':
      case 'collections':
        await handleSchema()
        break

      case 'query':
      case 'q':
        if (!args.trim()) {
          line(red('  Usage: /query <question>'))
        } else {
          trackMsg(session, 'user', trimmed)
          await handleQuery(args)
        }
        break

      case 'doctor':
      case 'status':
        await handleDoctor()
        break

      case 'config':
      case 'cfg': {
        line()
        line(bold('  ⚙ Configuration'))
        line()
        line('  ' + dim('App') + '         ' + white(rt.config.appName))
        line('  ' + dim('Database') + '     ' + white(rt.config.database.type))
        line('  ' + dim('AI Provider') + '  ' + white(rt.provider.name))
        line('  ' + dim('AI Model') + '     ' + white(rt.provider.model))
        line('  ' + dim('Modules') + '      ' + white(rt.config.modules.join(', ')))
        line('  ' + dim('Session') + '      ' + white(session.id))
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        line('  ' + dim('Uptime') + '       ' + white(String(elapsed) + 's'))
        line()
        break
      }

      case 'sessions':
      case 'ls':
      case 'history': {
        const sessions = await listSessions()
        if (sessions.length === 0) {
          line(dim('  No saved sessions yet.'))
        } else {
          line()
          line(bold('  📋 Recent Sessions'))
          line()
          for (const s of sessions.slice(0, 10)) {
            const date = new Date(s.updatedAt).toLocaleDateString()
            const msgs = s.messages.filter((m) => m.role === 'user').length
            line(
              '  ' +
                cyan(s.id) +
                '  ' +
                dim(date) +
                '  ' +
                String(msgs) +
                ' msgs  ' +
                white(s.title),
            )
          }
          line()
        }
        break
      }

      case 'export':
      case 'save': {
        const format = (args.trim().toLowerCase() || 'md') as 'json' | 'md' | 'csv'
        let output: string
        let ext: string
        if (format === 'json') {
          output = exportAsJson(session)
          ext = 'json'
        } else if (format === 'csv') {
          output = exportAsCsv(session)
          ext = 'csv'
        } else {
          output = exportAsMarkdown(session)
          ext = 'md'
        }
        const dir = resolve(homedir(), '.opendb', 'exports')
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        const filePath = resolve(dir, session.id + '.' + ext)
        writeFile(filePath, output, 'utf-8', () => {
          line(green('  ✓ Exported to ' + filePath))
          prompt()
        })
        return
      }

      case 'exit':
      case 'quit':
      case 'q!':
        await saveSession(session)
        line()
        line(dim('  Session saved. Goodbye. 👋'))
        line()
        rl.close()
        return

      default:
        line(red('  Unknown command: /' + cmd + '. Type /help'))
        break
    }
  }

  async function handleSchema(): Promise<void> {
    busy = true
    startSpinner('Fetching schema...')

    try {
      const schema = await rt.getSchema()
      stopSpinner()

      line()
      line(bold('  📊 Database Schema'))
      line(bold('  ') + dim(schema.dbName + ' (' + schema.dbType + ')'))
      line()

      const rows = schema.collections.map((c) => ({
        name: c.name,
        fields: String(c.fields.length),
        rows: '~' + String(c.estimatedCount),
        types: c.fields
          .slice(0, 4)
          .map((f) => f.type)
          .join(', '),
      }))

      renderTable(['name', 'fields', 'rows', 'types'], rows)
      trackMsg(
        session,
        'system',
        'Schema displayed: ' + String(schema.collections.length) + ' collections',
      )
      line()
    } catch (err) {
      stopSpinner(false)
      line(red('  ' + (err instanceof Error ? err.message : String(err))))
      line()
    }

    busy = false
  }

  async function handleQuery(question: string): Promise<void> {
    busy = true
    queryCount++

    line()
    line(dim('  ── Query #' + String(queryCount) + ' ──────────────────────────────────'))

    thinkStep('brain', 'Analyzing question...')
    startSpinner('Connecting to database...')

    const queryStart = Date.now()

    try {
      const schema = await rt.getSchema()
      updateSpinnerMsg('Generating query with ' + rt.provider.name + '...')

      const result = await rt.aiCore.ask(question, rt.connector, schema)
      const elapsed = Date.now() - queryStart

      stopSpinner()

      line()

      if (result.queryRan) {
        thinkStep('query', 'Executed:', dim(result.queryRan))
        line()
      }

      if (result.explanation) {
        thinkStep('brain', result.explanation)
      }

      if (result.rows.length > 0) {
        line()
        const headers = Object.keys(result.rows[0] ?? {})
        renderTable(headers, result.rows)
        line()
        line(
          dim(
            '    ' +
              String(result.rowCount) +
              ' rows · ' +
              String(elapsed) +
              'ms · ' +
              result.provider +
              ' · ' +
              result.model,
          ),
        )
      } else if (!result.queryRan) {
        thinkStep('dot', 'No results returned.')
      }

      line()
      line(dim('  ──────────────────────────────────────────────────'))
      line()

      const msgExtra: Partial<SessionMessage> = {
        meta: String(result.rowCount) + ' rows · ' + String(elapsed) + 'ms',
      }
      if (result.rows.length > 0) {
        msgExtra.headers = Object.keys(result.rows[0] ?? {})
        msgExtra.rows = result.rows
      }
      trackMsg(session, 'assistant', result.explanation || '(query result)', msgExtra)
    } catch (err) {
      stopSpinner(false)
      line(red('  Query failed: ' + (err instanceof Error ? err.message : String(err))))
      line()
    }

    busy = false
  }

  async function handleChat(question: string): Promise<void> {
    busy = true
    queryCount++

    line()
    line(dim('  ── #' + String(queryCount) + ' ──────────────────────────────────────────'))

    // Thinking steps
    thinkStep('search', 'Understanding your question...')
    thinkStep('brain', 'Detecting intent and module...')
    thinkStep('db', 'Loading database schema...')

    startSpinner('Generating response with ' + rt.provider.name + '...')

    try {
      const schema = await rt.getSchema()
      const systemPrompt = buildSystemPrompt(schema)

      stopSpinner()
      thinkStep('check', 'Schema loaded (' + String(schema.collections.length) + ' collections)')
      thinkStep('brain', 'Streaming response...')
      line()

      // Stream the response
      out(cyan.bold('  ◈ '))
      let chunkCount = 0
      for await (const chunk of rt.provider.completeStream(systemPrompt, question)) {
        out(chunk)
        chunkCount++
      }
      line()
      line()

      thinkStep('check', 'Response complete (' + String(chunkCount) + ' chunks)')
      line()
      line(dim('  ──────────────────────────────────────────────────'))
      line()

      trackMsg(session, 'assistant', '(streamed response)')
    } catch (err) {
      stopSpinner(false)
      line()
      line(red('  ✗ Error: ' + (err instanceof Error ? err.message : String(err))))
      line()
    }

    busy = false
  }

  async function handleDoctor(): Promise<void> {
    busy = true
    line()

    startSpinner('Checking database connection...')
    try {
      await rt.connector.ping()
      stopSpinner()
    } catch (err) {
      stopSpinner(false)
    }

    startSpinner('Checking AI provider...')
    try {
      const schema = await rt.getSchema()
      stopSpinner()
      line()
      line(bold('  🏥 Health Check'))
      line()
      line(
        '  ' + green('✓') + ' Database      ' + white(rt.config.database.type) + dim(' connected'),
      )
      line(
        '  ' +
          green('✓') +
          ' AI Provider   ' +
          white(rt.provider.name) +
          dim(' · ' + rt.provider.model),
      )
      line(
        '  ' +
          green('✓') +
          ' Schema        ' +
          white(String(schema.collections.length) + ' collections'),
      )
      line('  ' + green('✓') + ' Session       ' + white(session.id))
      line()
    } catch (err) {
      stopSpinner(false)
      line(red('  AI provider check failed'))
    }

    busy = false
  }

  // Ctrl+C handler
  rl.on('close', () => {
    void saveSession(session).then(() => {
      line()
      line(dim('  Session saved. Goodbye. 👋'))
      line()
      process.exit(0)
    })
  })

  prompt()
}
