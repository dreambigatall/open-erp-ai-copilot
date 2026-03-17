import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AiCore } from './AiCore.js'
import { createProvider } from './providers/index.js'
import type { ConnectorInterface, SchemaContext, QueryResult } from '@erp-copilot/types'

const mockSchema: SchemaContext = {
  dbType: 'postgresql',
  dbName: 'erp_test',
  generatedAt: new Date(),
  collections: [
    {
      name: 'orders',
      estimatedCount: 120,
      fields: [
        { name: 'id', type: 'integer', nullable: false, sample: 1 },
        { name: 'total', type: 'numeric', nullable: true, sample: '99.99' },
        { name: 'status', type: 'varchar', nullable: true, sample: 'paid' },
      ],
    },
  ],
}

const mockQueryResult: QueryResult = {
  rows: [{ id: 1, total: '250.00', status: 'paid' }],
  rowCount: 1,
  executionTimeMs: 12,
  queryRan: 'SELECT id, total, status FROM orders LIMIT 100',
}

const mockConnector: ConnectorInterface = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue(true),
  getSchemaContext: vi.fn().mockResolvedValue(mockSchema),
  executeQuery: vi.fn().mockResolvedValue(mockQueryResult),
}

const mockLLMResponse = {
  text: JSON.stringify({
    query: 'SELECT id, total, status FROM orders LIMIT 100',
    explanation: 'Fetches orders with their totals and status.',
    module: 'finance',
  }),
  model: 'test-model',
  provider: 'test-provider',
}

// Mock provider — implements LLMProvider interface directly
const mockProvider = {
  name: 'mock',
  model: 'mock-model',
  complete: vi.fn().mockResolvedValue(mockLLMResponse),
}

describe('AiCore', () => {
  let aiCore: AiCore

  beforeEach(() => {
    vi.clearAllMocks()
    aiCore = new AiCore(mockProvider)
  })

  it('returns rows when provider returns a valid query', async () => {
    const result = await aiCore.ask('Show me paid orders', mockConnector, mockSchema)
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rowCount).toBe(1)
    expect(result.provider).toBe('mock')
    expect(result.model).toBe('mock-model')
  })

  it('calls connector.executeQuery with the AI-generated query', async () => {
    await aiCore.ask('Show me paid orders', mockConnector, mockSchema)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockConnector.executeQuery).toHaveBeenCalledWith(
      'SELECT id, total, status FROM orders LIMIT 100',
    )
  })

  it('includes provider and model in result', async () => {
    const result = await aiCore.ask('Show me orders', mockConnector, mockSchema)
    expect(result.provider).toBe('mock')
    expect(result.model).toBe('mock-model')
  })

  it('calls getSchemaContext when schema not provided', async () => {
    await aiCore.ask('Show me orders', mockConnector)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockConnector.getSchemaContext).toHaveBeenCalledOnce()
  })

  it('skips getSchemaContext when schema is provided', async () => {
    await aiCore.ask('Show me orders', mockConnector, mockSchema)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockConnector.getSchemaContext).not.toHaveBeenCalled()
  })

  it('handles null query gracefully', async () => {
    mockProvider.complete.mockResolvedValueOnce({
      ...mockLLMResponse,
      text: JSON.stringify({
        query: null,
        explanation: 'No payroll data in schema.',
        module: 'hr',
      }),
    })
    const result = await aiCore.ask('Show payroll', mockConnector, mockSchema)
    expect(result.rows).toHaveLength(0)
    expect(result.queryRan).toBe('')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockConnector.executeQuery).not.toHaveBeenCalled()
  })
})

describe('createProvider factory', () => {
  it('creates a ClaudeProvider', () => {
    const provider = createProvider({ provider: 'claude', apiKey: 'test' })
    expect(provider.name).toBe('claude')
  })

  it('creates an OpenAIProvider', () => {
    const provider = createProvider({ provider: 'openai', apiKey: 'test' })
    expect(provider.name).toBe('openai')
  })

  it('creates a GeminiProvider', () => {
    const provider = createProvider({ provider: 'gemini', apiKey: 'test' })
    expect(provider.name).toBe('gemini')
  })

  it('creates a GrokProvider', () => {
    const provider = createProvider({ provider: 'grok', apiKey: 'test' })
    expect(provider.name).toBe('grok')
  })

  it('throws on unknown provider', () => {
    expect(() =>
      // We intentionally pass an invalid provider to assert error handling.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      createProvider({ provider: 'unknown' as unknown as never, apiKey: 'test' }),
    ).toThrow('Unknown provider: unknown')
  })
})
