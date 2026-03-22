import { existsSync, mkdirSync } from 'node:fs'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { homedir } from 'node:os'

// --- Session Types ---

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system' | 'error' | 'table'
  content: string
  timestamp: number
  headers?: string[]
  rows?: Record<string, unknown>[]
  meta?: string
}

export interface Session {
  id: string
  createdAt: number
  updatedAt: number
  title: string
  messages: SessionMessage[]
}

// --- Paths ---

function getSessionsDir(): string {
  return resolve(homedir(), '.opendb', 'sessions')
}

// --- Session Management ---

export function generateSessionId(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${date}-${rand}`
}

export async function saveSession(session: Session): Promise<void> {
  const dir = getSessionsDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const path = resolve(dir, `${session.id}.json`)
  await writeFile(path, JSON.stringify(session, null, 2) + '\n', 'utf-8')
}

export async function loadSession(id: string): Promise<Session | null> {
  const path = resolve(getSessionsDir(), `${id}.json`)
  if (!existsSync(path)) return null
  const raw = await readFile(path, 'utf-8')
  return JSON.parse(raw) as Session
}

export async function listSessions(): Promise<Session[]> {
  const dir = getSessionsDir()
  if (!existsSync(dir)) return []

  const files = await readdir(dir)
  const sessions: Session[] = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await readFile(resolve(dir, file), 'utf-8')
      sessions.push(JSON.parse(raw) as Session)
    } catch {
      // skip corrupt files
    }
  }

  sessions.sort((a, b) => b.updatedAt - a.updatedAt)
  return sessions
}

// --- Export Formatters ---

export function exportAsJson(session: Session): string {
  return JSON.stringify(session.messages, null, 2)
}

export function exportAsMarkdown(session: Session): string {
  const lines: string[] = []
  lines.push(`# OpenDB Session: ${session.title}`)
  lines.push(`Date: ${new Date(session.createdAt).toLocaleString()}`)
  lines.push('')

  for (const msg of session.messages) {
    if (msg.role === 'user') {
      lines.push('## You')
      lines.push(msg.content)
      lines.push('')
    } else if (msg.role === 'assistant') {
      lines.push('## DB')
      lines.push(msg.content)
      if (msg.meta) lines.push(`\n_${msg.meta}_`)
      lines.push('')
    } else if (msg.role === 'table') {
      lines.push('## Query Result')
      if (msg.content) lines.push(msg.content)
      if (msg.headers && msg.rows) {
        lines.push('')
        lines.push('| ' + msg.headers.join(' | ') + ' |')
        lines.push('| ' + msg.headers.map(() => '---').join(' | ') + ' |')
        for (const row of msg.rows) {
          lines.push('| ' + msg.headers.map((h) => String(row[h] ?? '')).join(' | ') + ' |')
        }
      }
      if (msg.meta) lines.push(`\n_${msg.meta}_`)
      lines.push('')
    } else if (msg.role === 'system') {
      lines.push(`> ${msg.content}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function exportAsCsv(session: Session): string {
  const lines: string[] = []
  lines.push('timestamp,role,content')

  for (const msg of session.messages) {
    const ts = new Date(msg.timestamp).toISOString()
    const escaped = msg.content.replace(/"/g, '""').replace(/\n/g, ' ')
    lines.push(`${ts},${msg.role},"${escaped}"`)
  }

  return lines.join('\n')
}

export function exportTableAsCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = []
  lines.push(headers.join(','))
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const val = String(row[h] ?? '')
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val
        })
        .join(','),
    )
  }
  return lines.join('\n')
}

// --- Auto-title from first question ---

export function generateTitle(firstMessage: string): string {
  const words = firstMessage.split(/\s+/).slice(0, 6)
  let title = words.join(' ')
  if (title.length > 50) title = title.slice(0, 47) + '...'
  return title || 'Untitled session'
}
