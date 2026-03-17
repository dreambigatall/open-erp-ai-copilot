import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PgConnector } from './PgConnector.js'

/* eslint-disable @typescript-eslint/restrict-template-expressions */

const mockQueryResponses: Record<string, { rows: unknown[]; rowCount: number }> = {
  'SELECT 1': { rows: [{ '?column?': 1 }], rowCount: 1 },

  tables: {
    rows: [
      { table_name: 'orders', row_estimate: '120' },
      { table_name: 'customers', row_estimate: '45' },
    ],
    rowCount: 2,
  },

  columns_orders: {
    rows: [
      { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
      { column_name: 'customer_id', data_type: 'integer', is_nullable: 'YES' },
      { column_name: 'total', data_type: 'numeric', is_nullable: 'YES' },
      { column_name: 'created_at', data_type: 'timestamp', is_nullable: 'YES' },
    ],
    rowCount: 4,
  },

  columns_customers: {
    rows: [
      { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
      { column_name: 'name', data_type: 'character varying', is_nullable: 'YES' },
      { column_name: 'email', data_type: 'character varying', is_nullable: 'YES' },
    ],
    rowCount: 3,
  },

  sample_orders: {
    rows: [{ id: 1, customer_id: 2, total: '99.99', created_at: new Date() }],
    rowCount: 1,
  },

  sample_customers: {
    rows: [{ id: 1, name: 'Acme Corp', email: 'acme@example.com' }],
    rowCount: 1,
  },
}

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => {
    const end = vi.fn().mockResolvedValue(undefined)
    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      // ping
      if (sql === 'SELECT 1') return Promise.resolve(mockQueryResponses['SELECT 1'])

      // table list introspection
      if (sql.includes('information_schema.tables'))
        return Promise.resolve(mockQueryResponses['tables'])

      // column introspection — keyed by table name param
      if (sql.includes('information_schema.columns')) {
        const table = (params as string[])[0] ?? ''
        const key = `columns_${table}`
        return Promise.resolve(mockQueryResponses[key] ?? { rows: [], rowCount: 0 })
      }

      // internal sample-row fetch — connector uses double-quoted table names
      // e.g.  SELECT * FROM "orders" LIMIT 1
      // user queries use unquoted names — FROM customers LIMIT 10 — so no collision
      if (/FROM "\w+"/.test(sql) && sql.includes('LIMIT 1')) {
        const match = /FROM "(\w+)"/.exec(sql)
        const table = match?.[1] ?? ''
        const key = `sample_${table}`
        return Promise.resolve(mockQueryResponses[key] ?? { rows: [], rowCount: 0 })
      }

      // fallback: any other SELECT (user-issued queries)
      return Promise.resolve({
        rows: [{ id: 1, name: 'Acme Corp', email: 'acme@example.com' }],
        rowCount: 1,
      })
    })

    return { end, query }
  }),
}))

describe('PgConnector', () => {
  let connector: PgConnector

  beforeEach(() => {
    vi.clearAllMocks()
    connector = new PgConnector('postgresql://postgres:test@localhost:5432/erp_test')
  })

  it('connects without throwing', async () => {
    await expect(connector.connect()).resolves.not.toThrow()
  })

  it('ping returns true when DB is reachable', async () => {
    const result = await connector.ping()
    expect(result).toBe(true)
  })

  it('getSchemaContext returns correct shape', async () => {
    const ctx = await connector.getSchemaContext()

    expect(ctx.dbType).toBe('postgresql')
    expect(ctx.dbName).toBe('erp_test')
    expect(ctx.collections).toHaveLength(2)
    expect(ctx.collections.map((c) => c.name)).toEqual(['orders', 'customers'])
  })

  it('infers table fields with correct types', async () => {
    const ctx = await connector.getSchemaContext()
    const orders = ctx.collections.find((c) => c.name === 'orders')

    expect(orders?.fields.length).toBe(4)

    const totalField = orders?.fields.find((f) => f.name === 'total')
    expect(totalField?.type).toBe('numeric')
    expect(totalField?.nullable).toBe(true)

    const idField = orders?.fields.find((f) => f.name === 'id')
    expect(idField?.nullable).toBe(false)
  })

  it('includes sample values in field schema', async () => {
    const ctx = await connector.getSchemaContext()
    const customers = ctx.collections.find((c) => c.name === 'customers')
    const nameField = customers?.fields.find((f) => f.name === 'name')
    expect(nameField?.sample).toBe('Acme Corp')
  })

  it('executes a SELECT query and returns rows', async () => {
    const result = await connector.executeQuery('SELECT id, name FROM customers LIMIT 10')
    expect(result.rows.length).toBeGreaterThan(0)
    expect(result.rowCount).toBeGreaterThan(0)
    expect(result.queryRan).toContain('SELECT')
  })

  it('rejects DELETE queries', async () => {
    await expect(connector.executeQuery('DELETE FROM customers WHERE id = 1')).rejects.toThrow(
      'Only SELECT queries are permitted.',
    )
  })

  it('rejects DROP queries', async () => {
    await expect(connector.executeQuery('DROP TABLE orders')).rejects.toThrow(
      'Only SELECT queries are permitted.',
    )
  })

  it('rejects INSERT queries', async () => {
    await expect(
      connector.executeQuery('INSERT INTO customers VALUES (1, "hack")'),
    ).rejects.toThrow('Only SELECT queries are permitted.')
  })

  it('disconnects cleanly', async () => {
    await expect(connector.disconnect()).resolves.not.toThrow()
  })
})
