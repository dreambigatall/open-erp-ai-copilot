export interface FieldSchema {
  name: string
  type: string // 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'unknown'
  nullable: boolean
  sample?: unknown // a real value from the DB to help the AI understand the data
}

export interface CollectionSchema {
  name: string // collection or table name
  fields: FieldSchema[]
  estimatedCount: number
}

export interface SchemaContext {
  dbType: 'mongodb' | 'postgresql'
  dbName: string
  collections: CollectionSchema[]
  generatedAt: Date
}

export interface QueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
  executionTimeMs: number
  queryRan: string // the actual MQL or SQL that was executed
}

export interface ConnectorInterface {
  /** Connect to the database */
  connect(): Promise<void>

  /** Disconnect cleanly */
  disconnect(): Promise<void>

  /** Introspect the database and return a schema context */
  getSchemaContext(): Promise<SchemaContext>

  /** Execute a raw query string (MQL JSON string or SQL string) */
  executeQuery(query: string): Promise<QueryResult>

  /** Health check — returns true if the DB is reachable */
  ping(): Promise<boolean>
}
