import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MongoConnector } from './MongoConnector.js'

const mockToArray = vi.fn().mockResolvedValue([
  { _id: 'id1', name: 'Acme Corp', revenue: 50000, createdAt: new Date() },
  { _id: 'id2', name: 'Beta Ltd', revenue: 30000, createdAt: new Date() },
])

const mockFind = vi.fn().mockReturnValue({
  limit: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  toArray: mockToArray,
})

const mockCollection = vi.fn().mockReturnValue({
  find: mockFind,
  estimatedDocumentCount: vi.fn().mockResolvedValue(2),
})

const mockDb = {
  collection: mockCollection,
  listCollections: vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue([{ name: 'customers' }]),
  }),
  command: vi.fn().mockResolvedValue({ ok: 1 }),
}

vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue(mockDb),
  })),
}))

describe('MongoConnector', () => {
  let connector: MongoConnector

  beforeEach(() => {
    vi.clearAllMocks()
    connector = new MongoConnector('mongodb://localhost:27017', 'erp_test')
  })

  it('connects without throwing', async () => {
    await expect(connector.connect()).resolves.not.toThrow()
  })

  it('getSchemaContext returns correct shape', async () => {
    await connector.connect()
    const ctx = await connector.getSchemaContext()

    expect(ctx.dbType).toBe('mongodb')
    expect(ctx.dbName).toBe('erp_test')
    expect(ctx.collections).toHaveLength(1)
    expect(ctx.collections[0]?.name).toBe('customers')
    expect(ctx.collections[0]?.fields.length).toBeGreaterThan(0)
  })

  it('infers field types from sample docs', async () => {
    await connector.connect()
    const ctx = await connector.getSchemaContext()
    const fields = ctx.collections[0]?.fields ?? []
    const nameField = fields.find((f) => f.name === 'name')
    expect(nameField?.type).toBe('string')
  })

  it('executeQuery returns rows', async () => {
    await connector.connect()
    const result = await connector.executeQuery(
      JSON.stringify({ collection: 'customers', filter: {}, limit: 10 }),
    )
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rowCount).toBeGreaterThan(0)
  })

  it('ping returns true when DB is reachable', async () => {
    await connector.connect()
    const result = await connector.ping()
    expect(result).toBe(true)
  })
})
