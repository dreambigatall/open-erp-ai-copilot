/**
 * OpenDB Rich Terminal UI
 * Ink-based interactive chat with streaming, tables, spinners, slash commands.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — Ink and @types/react have known type conflicts under strict TS
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text, render, useApp, useStdout } from 'ink'
import TextInput from 'ink-text-input'
import Spinner from 'ink-spinner'
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

// --- Types ---

type Role = 'user' | 'assistant' | 'system' | 'table' | 'error'

type ChatMsg = {
  id: string
  role: Role
  content: string
  headers?: string[]
  rows?: Record<string, unknown>[]
  meta?: string
}

type Intent = 'chat' | 'query' | 'schema' | 'help' | 'unknown'

// --- Slash Commands ---

type SlashCmd = {
  name: string
  aliases: string[]
  description: string
  usage: string
  handler: (args: string, ctx: SlashContext) => Promise<void>
}

type SlashContext = {
  addMsg: (msg: Omit<ChatMsg, 'id'>) => void
  rt: CopilotRuntime
  exit: () => void
}

function newId(): string {
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9)
}

// --- Intent Detection ---

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

// --- Output Formatters ---

function formatTableResult(result: {
  queryRan: string
  explanation: string
  rows: Record<string, unknown>[]
  rowCount: number
  executionTimeMs: number
}): { text: string; headers?: string[]; tableRows?: Record<string, unknown>[]; meta: string } {
  const parts: string[] = []
  if (result.explanation) parts.push(result.explanation)
  const meta = String(result.rowCount) + ' rows · ' + String(result.executionTimeMs) + 'ms'
  const first = result.rows[0]
  if (first) {
    return {
      text: parts.join('\n'),
      headers: Object.keys(first),
      tableRows: result.rows,
      meta,
    }
  }
  return { text: parts.join('\n') || 'No results.', meta }
}

function formatHelp(): string {
  return [
    '',
    '  OpenDB — Ask questions about your database in plain language.',
    '',
    '  Just type your question and press Enter:',
    '    show me top 5 customers by revenue',
    '    how many invoices were created this month',
    '    list all employees in engineering',
    '',
    '  Slash Commands:',
    '    /help              Show this help',
    '    /clear             Clear the transcript',
    '    /schema            Show database schema',
    '    /query <question>  Force analytics mode',
    '    /doctor            Check connection status',
    '    /config            Show current config',
    '    /model <name>      Switch AI model',
    '    /provider <name>   Switch AI provider',
    '    /exit, /quit       Exit OpenDB',
    '',
    '  Keyboard:',
    '    Enter              Send message',
    '    Ctrl+C             Exit',
    '',
  ].join('\n')
}

// --- Components ---

function Header({
  provider,
  model,
  dbType,
  latency,
}: {
  provider: string
  model: string
  dbType: string
  latency?: number | undefined
}) {
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">
        {' OpenDB '}
      </Text>
      <Text dimColor>
        {dbType} · {provider} · {model}
        {latency !== undefined ? ' · ' + String(latency) + 'ms' : ''}
      </Text>
    </Box>
  )
}

function StatusFooter({ busy, intent }: { busy: boolean; intent: Intent }) {
  const intentLabel: Record<Intent, string> = {
    chat: 'Chat',
    query: 'Analytics',
    schema: 'Schema',
    help: 'Help',
    unknown: '',
  }
  return (
    <Box marginTop={0} justifyContent="space-between">
      <Box>
        {busy ? (
          <Box>
            <Spinner type="dots" />
            <Text color="yellow"> Thinking...</Text>
          </Box>
        ) : (
          <Text dimColor>Ready</Text>
        )}
      </Box>
      <Box>
        {intent !== 'unknown' && <Text dimColor> [{intentLabel[intent]}] </Text>}
        <Text dimColor> Ctrl+C to exit</Text>
      </Box>
    </Box>
  )
}

function MessageBubble({ msg, _cols }: { msg: ChatMsg; _cols: number }) {
  if (msg.role === 'system') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor wrap="wrap">
          {msg.content}
        </Text>
      </Box>
    )
  }

  if (msg.role === 'error') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="red" wrap="wrap">
          {msg.content}
        </Text>
      </Box>
    )
  }

  if (msg.role === 'user') {
    return (
      <Box flexDirection="column" paddingX={1} marginTop={1}>
        <Text>
          <Text bold color="green">
            {'You '}
          </Text>
          <Text wrap="wrap">{msg.content}</Text>
        </Text>
      </Box>
    )
  }

  if (msg.role === 'table' && msg.headers && msg.rows) {
    return (
      <Box flexDirection="column" paddingX={1} marginTop={1}>
        {msg.content && (
          <Box marginBottom={1}>
            <Text wrap="wrap">{msg.content}</Text>
          </Box>
        )}
        <TableDisplay headers={msg.headers} rows={msg.rows} />
        {msg.meta && (
          <Box marginTop={1}>
            <Text dimColor> {msg.meta}</Text>
          </Box>
        )}
      </Box>
    )
  }

  // assistant text
  return (
    <Box flexDirection="column" paddingX={1} marginTop={1}>
      <Text>
        <Text bold color="cyan">
          {'DB '}
        </Text>
        <Text wrap="wrap">{msg.content}</Text>
      </Text>
      {msg.meta && (
        <Box marginTop={0}>
          <Text dimColor> {msg.meta}</Text>
        </Box>
      )}
    </Box>
  )
}

function TableDisplay({ headers, rows }: { headers: string[]; rows: Record<string, unknown>[] }) {
  const maxRows = 25
  const shown = rows.slice(0, maxRows)
  const colWidths = headers.map((h) => {
    const maxVal = shown.reduce((max, row) => Math.max(max, String(row[h] ?? '').length), h.length)
    return Math.min(maxVal + 2, 30)
  })

  const sep = '┼' + colWidths.map((w) => '─'.repeat(w)).join('┼') + '┼'
  const headerLine = '│' + headers.map((h, i) => ` ${h.padEnd(colWidths[i] - 1)}`).join('│') + '│'

  const dataLines = shown.map(
    (row) =>
      '│' +
      headers.map((h, i) => ` ${String(row[h] ?? '').padEnd(colWidths[i] - 1)}`).join('│') +
      '│',
  )

  return (
    <Box flexDirection="column">
      <Text dimColor>{sep}</Text>
      <Text bold>{headerLine}</Text>
      <Text dimColor>{sep}</Text>
      {dataLines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
      <Text dimColor>{sep}</Text>
      {rows.length > maxRows && <Text dimColor> ... and {rows.length - maxRows} more rows</Text>}
    </Box>
  )
}

// --- Main App ---

function ChatApp({ rt }: { rt: CopilotRuntime }) {
  const { exit } = useApp()
  const { stdout } = useStdout()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [intent, setIntent] = useState<Intent>('unknown')
  const [lastLatency, setLastLatency] = useState<number | undefined>()
  const bottomRef = useRef<boolean>(false)
  const sessionRef = useRef<Session>({
    id: generateSessionId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: 'New session',
    messages: [],
  })

  const cols = Math.max(40, stdout.columns || 80)
  const maxVisible = 30

  const visible = useMemo(() => messages.slice(-maxVisible), [messages])

  const addMsg = useCallback((msg: Omit<ChatMsg, 'id'>) => {
    setMessages((m) => [...m, { ...msg, id: newId() }])
    // Track in session
    const sessionMsg: SessionMessage = {
      role: msg.role === 'error' ? 'error' : msg.role,
      content: msg.content,
      timestamp: Date.now(),
      headers: msg.headers,
      rows: msg.rows,
      meta: msg.meta,
    }
    sessionRef.current.messages.push(sessionMsg)
    sessionRef.current.updatedAt = Date.now()
    if (msg.role === 'user' && sessionRef.current.title === 'New session') {
      sessionRef.current.title = generateTitle(msg.content)
    }
    // Auto-save periodically
    if (sessionRef.current.messages.length % 5 === 0) {
      saveSession(sessionRef.current).catch(() => {})
    }
  }, [])

  // Register slash commands
  const slashCommands: SlashCmd[] = useMemo(
    () => [
      {
        name: 'help',
        aliases: ['h', '?'],
        description: 'Show help',
        usage: '/help',
        handler: async (_args, ctx) => {
          await Promise.resolve()
          ctx.addMsg({ role: 'system', content: formatHelp() })
        },
      },
      {
        name: 'clear',
        aliases: ['cls'],
        description: 'Clear transcript',
        usage: '/clear',
        handler: async (_args, _ctx) => {
          await Promise.resolve()
          setMessages([{ id: newId(), role: 'system', content: '  Session cleared.' }])
        },
      },
      {
        name: 'schema',
        aliases: ['tables', 'collections'],
        description: 'Show database schema',
        usage: '/schema',
        handler: async (_args, ctx) => {
          const schema = await rt.getSchema()
          const lines = schema.collections.map(
            (c) =>
              '  ' +
              c.name +
              ' (' +
              String(c.fields.length) +
              ' fields, ~' +
              String(c.estimatedCount) +
              ' rows)',
          )
          ctx.addMsg({
            role: 'system',
            content: `Database: ${schema.dbName} (${schema.dbType})\n${lines.join('\n')}`,
          })
        },
      },
      {
        name: 'query',
        aliases: ['q', 'sql'],
        description: 'Run analytics query',
        usage: '/query <question>',
        handler: async (args, ctx) => {
          if (!args.trim()) {
            ctx.addMsg({ role: 'error', content: 'Usage: /query <question>' })
            return
          }
          await runQuery(args, ctx, rt, setLastLatency)
        },
      },
      {
        name: 'doctor',
        aliases: ['status', 'ping'],
        description: 'Check connection status',
        usage: '/doctor',
        handler: async (_args, ctx) => {
          try {
            await rt.connector.ping()
            ctx.addMsg({
              role: 'system',
              content: `  Database: ${rt.config.database.type} — Connected\n  Provider: ${rt.provider.name}\n  Model: ${rt.provider.model}`,
            })
          } catch (err) {
            ctx.addMsg({
              role: 'error',
              content: `  Connection failed: ${err instanceof Error ? err.message : String(err)}`,
            })
          }
        },
      },
      {
        name: 'config',
        aliases: ['cfg'],
        description: 'Show current config',
        usage: '/config',
        handler: async (_args, ctx) => {
          await Promise.resolve()
          const lines = [
            '  App: ' + rt.config.appName,
            '  Database: ' + rt.config.database.type,
            '  AI Provider: ' + rt.provider.name,
            '  AI Model: ' + rt.provider.model,
            '  Modules: ' + rt.config.modules.join(', '),
          ]
          ctx.addMsg({ role: 'system', content: lines.join('\n') })
        },
      },
      {
        name: 'sessions',
        aliases: ['ls', 'history'],
        description: 'List saved sessions',
        usage: '/sessions',
        handler: async (_args, ctx) => {
          const sessions = await listSessions()
          if (sessions.length === 0) {
            ctx.addMsg({ role: 'system', content: '  No saved sessions yet.' })
            return
          }
          const lines = sessions.slice(0, 10).map((s) => {
            const date = new Date(s.updatedAt).toLocaleDateString()
            const msgs = s.messages.filter((m) => m.role === 'user').length
            return '  ' + s.id + '  ' + date + '  ' + String(msgs) + ' messages  ' + s.title
          })
          ctx.addMsg({
            role: 'system',
            content:
              '  Sessions (' +
              String(Math.min(sessions.length, 10)) +
              ' of ' +
              String(sessions.length) +
              '):\n\n' +
              lines.join('\n'),
          })
        },
      },
      {
        name: 'export',
        aliases: ['save'],
        description: 'Export current session',
        usage: '/export [format]  (json|md|csv)',
        handler: async (args, ctx) => {
          const format = (args.trim().toLowerCase() || 'md') as 'json' | 'md' | 'csv'
          const session = { ...sessionRef.current, messages: sessionRef.current.messages }
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
          const fs = await import('node:fs')
          const path = await import('node:path')
          const os = await import('node:os')
          const dir = path.resolve(os.homedir(), '.opendb', 'exports')
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          const filePath = path.resolve(dir, session.id + '.' + ext)
          fs.writeFileSync(filePath, output, 'utf-8')
          ctx.addMsg({ role: 'system', content: '  Exported to ' + filePath })
        },
      },
      {
        name: 'exit',
        aliases: ['quit', 'q!'],
        description: 'Exit OpenDB',
        usage: '/exit',
        handler: async (_args, ctx) => {
          // Save session before exit
          await saveSession(sessionRef.current)
          ctx.exit()
        },
      },
    ],
    [rt],
  )

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current = true
  }, [messages])

  // Detect intent on input change
  useEffect(() => {
    if (input.startsWith('/')) {
      setIntent('unknown')
    } else if (input.trim()) {
      setIntent(detectIntent(input))
    } else {
      setIntent('unknown')
    }
  }, [input])

  // Welcome message
  useEffect(() => {
    setMessages([
      {
        id: newId(),
        role: 'system',
        content: [
          '',
          '  Welcome to OpenDB ',
          '  Ask questions about your database in plain language.',
          '',
          '  Type your question and press Enter, or use /help for commands.',
          '',
        ].join('\n'),
      },
    ])
  }, [])

  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      setInput('')
      setIntent('unknown')

      // Slash command
      if (trimmed.startsWith('/')) {
        const parts = trimmed.slice(1).split(/\s+/)
        const cmdName = parts[0]?.toLowerCase() ?? ''
        const args = parts.slice(1).join(' ')

        const cmd = slashCommands.find((c) => c.name === cmdName || c.aliases.includes(cmdName))
        if (cmd) {
          addMsg({ role: 'user', content: trimmed })
          setBusy(true)
          try {
            await cmd.handler(args, { addMsg, rt, exit })
          } catch (err) {
            addMsg({
              role: 'error',
              content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            })
          } finally {
            setBusy(false)
          }
          return
        }
        addMsg({
          role: 'error',
          content: `Unknown command: /${cmdName}. Try /help`,
        })
        return
      }

      // Normal message — auto-detect intent
      addMsg({ role: 'user', content: trimmed })
      setBusy(true)
      const startTime = Date.now()

      const detected = detectIntent(trimmed)

      if (detected === 'help') {
        addMsg({ role: 'system', content: formatHelp() })
        setBusy(false)
        return
      }

      if (detected === 'schema') {
        try {
          const schema = await rt.getSchema()
          const rows = schema.collections.map((c) => ({
            name: c.name,
            fields: c.fields.length,
            rows: '~' + String(c.estimatedCount),
            types: c.fields
              .slice(0, 3)
              .map((f) => f.name)
              .join(', '),
          }))
          addMsg({
            role: 'table',
            content: 'Database: ' + schema.dbName + ' (' + schema.dbType + ')',
            headers: ['name', 'fields', 'rows', 'types'],
            rows,
            meta: String(schema.collections.length) + ' tables/collections',
          })
        } catch (err) {
          addMsg({
            role: 'error',
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          })
        }
        setBusy(false)
        return
      }

      if (detected === 'query') {
        await runQuery(trimmed, { addMsg, rt, exit }, rt, setLastLatency)
        setBusy(false)
        return
      }

      // Chat mode — streaming
      const assistantId = newId()
      setMessages((m) => [...m, { id: assistantId, role: 'assistant', content: '' }])

      try {
        const schema = await rt.getSchema()
        const systemPrompt = buildSystemPrompt(schema)
        let acc = ''
        for await (const chunk of rt.provider.completeStream(systemPrompt, trimmed)) {
          acc += chunk
          setMessages((m) => {
            const copy = [...m]
            const idx = copy.findIndex((x) => x.id === assistantId)
            if (idx >= 0) {
              const prev = copy[idx]
              if (prev) copy[idx] = { ...prev, content: acc }
            }
            return copy
          })
        }
        setLastLatency(Date.now() - startTime)
        setMessages((m) => {
          const copy = [...m]
          const idx = copy.findIndex((x) => x.id === assistantId)
          if (idx >= 0) {
            const prev = copy[idx]
            if (prev) copy[idx] = { ...prev, meta: String(Date.now() - startTime) + 'ms' }
          }
          return copy
        })
      } catch (err) {
        setMessages((m) => {
          const copy = [...m]
          const idx = copy.findIndex((x) => x.id === assistantId)
          const errText = `Error: ${err instanceof Error ? err.message : String(err)}`
          if (idx >= 0) {
            const prev = copy[idx]
            if (prev) copy[idx] = { ...prev, role: 'error', content: errText }
            return copy
          }
          return [...m, { id: newId(), role: 'error', content: errText }]
        })
      } finally {
        setBusy(false)
      }
    },
    [rt, exit, slashCommands, addMsg],
  )

  return (
    <Box flexDirection="column" width={cols} height={process.stdout.rows || 30}>
      <Header
        provider={rt.provider.name}
        model={rt.provider.model}
        dbType={rt.config.database.type}
        latency={lastLatency}
      />

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visible.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} cols={cols} />
        ))}
      </Box>

      <Box borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
        {busy ? (
          <Box>
            <Spinner type="dots" />
            <Text color="yellow"> Working...</Text>
          </Box>
        ) : (
          <Box flexDirection="row">
            <Text color="green">{'>'} </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={(v) => {
                void handleSubmit(v)
              }}
              placeholder="Ask anything... (/help)"
            />
          </Box>
        )}
      </Box>

      <StatusFooter busy={busy} intent={intent} />
    </Box>
  )
}

// --- Query Runner Helper ---

async function runQuery(
  question: string,
  ctx: SlashContext,
  rt: CopilotRuntime,
  setLatency: (ms: number) => void,
): Promise<void> {
  const startTime = Date.now()
  try {
    const schema = await rt.getSchema()
    const result = await rt.aiCore.ask(question, rt.connector, schema)
    const elapsed = Date.now() - startTime
    setLatency(elapsed)

    const formatted = formatTableResult(result)

    if (formatted.tableRows && formatted.headers) {
      ctx.addMsg({
        role: 'table',
        content: formatted.text,
        headers: formatted.headers,
        rows: formatted.tableRows,
        meta: formatted.meta,
      })
    } else {
      ctx.addMsg({
        role: 'assistant',
        content: formatted.text || result.explanation || 'No results.',
        meta: formatted.meta,
      })
    }
  } catch (err) {
    ctx.addMsg({
      role: 'error',
      content: `Query failed: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
}

// --- Entry Point ---

export async function runChatTui(rt: CopilotRuntime): Promise<void> {
  const { waitUntilExit } = render(<ChatApp rt={rt} />, { exitOnCtrlC: true })
  await waitUntilExit()
}
