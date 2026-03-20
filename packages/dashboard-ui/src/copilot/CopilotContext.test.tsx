import React from 'react'
import { render, act, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CopilotProvider, useCopilot } from './CopilotContext.js'
import type { LLMProvider } from '@erp-copilot/ai-core'
import type { ConnectorInterface, QueryResult, SchemaContext } from '@erp-copilot/types'

vi.mock('@erp-copilot/ai-core/src/prompts', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('mock system prompt'),
}))

const mockSchema: SchemaContext = {
  dbType: 'postgresql',
  dbName: 'test',
  collections: [],
  generatedAt: new Date(),
}

const mockQueryResult: QueryResult = {
  rows: [],
  rowCount: 0,
  executionTimeMs: 0,
  queryRan: '',
}

const mockConnector: ConnectorInterface = {
  connect: () => Promise.resolve(),
  disconnect: () => Promise.resolve(),
  ping: () => Promise.resolve(true),
  executeQuery: () => Promise.resolve(mockQueryResult),
  getSchemaContext: vi.fn().mockResolvedValue(mockSchema),
}

function TestConsumer() {
  const { messages, sendMessage, isStreaming } = useCopilot()
  return (
    <div>
      <div data-testid="count">{messages.length}</div>
      <div data-testid="streaming">{String(isStreaming)}</div>
      {messages.map((m) => (
        <div key={m.id} data-testid={`msg-${m.role}`}>
          {m.content}
        </div>
      ))}
      <button
        onClick={() => {
          void sendMessage('Hello')
        }}
      >
        Send
      </button>
    </div>
  )
}

describe('CopilotContext', () => {
  it('adds user message immediately on send', () => {
    const mockProvider: LLMProvider = {
      name: 'test',
      model: 'test-model',
      complete: vi.fn().mockResolvedValue({
        text: 'Hello back',
        model: 'test-model',
        provider: 'test',
      }),
    }

    render(
      <CopilotProvider provider={mockProvider} connector={mockConnector}>
        <TestConsumer />
      </CopilotProvider>,
    )

    act(() => {
      const sendButton = screen.getByText('Send')
      sendButton.click()
    })

    expect(screen.getByTestId('msg-user').textContent).toBe('Hello')
  })

  it('adds assistant message after complete()', () => {
    const mockProvider: LLMProvider = {
      name: 'test',
      model: 'test-model',
      complete: vi.fn().mockResolvedValue({
        text: 'Response text',
        model: 'test-model',
        provider: 'test',
      }),
    }

    render(
      <CopilotProvider provider={mockProvider} connector={mockConnector}>
        <TestConsumer />
      </CopilotProvider>,
    )

    act(() => {
      const sendButton = screen.getByText('Send')
      sendButton.click()
    })

    expect(screen.getByTestId('msg-assistant').textContent).toBe('Response text')
  })

  it('uses completeStream when available', () => {
    async function* fakeStream() {
      await Promise.resolve()
      yield 'Hello '
      yield 'world'
    }

    const completeMock = vi.fn().mockResolvedValue({
      text: '',
      model: 'test-model',
      provider: 'test',
    })
    const mockProvider: LLMProvider = {
      name: 'test',
      model: 'test-model',
      complete: completeMock,
      completeStream: vi.fn().mockReturnValue(fakeStream()),
    }

    render(
      <CopilotProvider provider={mockProvider} connector={mockConnector}>
        <TestConsumer />
      </CopilotProvider>,
    )

    act(() => {
      const sendButton = screen.getByText('Send')
      sendButton.click()
    })

    expect(screen.getByTestId('msg-assistant').textContent).toBe('Hello world')
    expect(completeMock).not.toHaveBeenCalled()
  })
})
