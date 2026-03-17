import { Pool } from 'pg'
import type {
  ConnectorInterface,
  SchemaContext,
  CollectionSchema,
  FieldSchema,
  QueryResult,
} from '@erp-copilot/types'

export class PgConnector implements ConnectorInterface {
  private pool: Pool
  private readonly dbName: string

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString })
    // Extract DB name from connection string
    this.dbName = new URL(connectionString).pathname.replace('/', '')
  }

  async connect(): Promise<void> {
    // Pool connects lazily — just verify with a ping
    await this.ping()
  }

  async disconnect(): Promise<void> {
    await this.pool.end()
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }

  async getSchemaContext(): Promise<SchemaContext> {
    // Get all user tables (exclude pg system schemas)
    const tablesResult = await this.pool.query<{ table_name: string; row_estimate: string }>(`
      SELECT
        t.table_name,
        COALESCE(s.n_live_tup, 0)::text AS row_estimate
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `)

    const collections: CollectionSchema[] = []

    for (const row of tablesResult.rows) {
      const fields = await this.getTableFields(row.table_name)
      collections.push({
        name: row.table_name,
        fields,
        estimatedCount: parseInt(row.row_estimate, 10),
      })
    }

    return {
      dbType: 'postgresql',
      dbName: this.dbName,
      collections,
      generatedAt: new Date(),
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    // Safety: only allow SELECT statements
    const trimmed = sql.trim().toLowerCase()
    if (!trimmed.startsWith('select') && !trimmed.startsWith('with')) {
      throw new Error('Only SELECT queries are permitted.')
    }

    const start = Date.now()
    const result = await this.pool.query<Record<string, unknown>>(sql)

    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
      executionTimeMs: Date.now() - start,
      queryRan: sql,
    }
  }

  private async getTableFields(tableName: string): Promise<FieldSchema[]> {
    const result = await this.pool.query<{
      column_name: string
      data_type: string
      is_nullable: string
    }>(
      `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
      [tableName],
    )

    // Get one sample row for context
    const sampleResult = await this.pool.query<Record<string, unknown>>(
      `SELECT * FROM "${tableName}" LIMIT 1`,
    )
    const sampleRow = sampleResult.rows[0] ?? {}

    return result.rows.map((col) => {
      // Access a value from the sample row in a controlled way.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const sample: unknown = sampleRow[col.column_name]

      return {
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        sample,
      }
    })
  }
}
