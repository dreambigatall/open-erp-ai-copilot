import { MongoClient, type Db, type Document, type Sort } from 'mongodb'
import type {
  ConnectorInterface,
  SchemaContext,
  CollectionSchema,
  FieldSchema,
  QueryResult,
} from '@erp-copilot/types'

export class MongoConnector implements ConnectorInterface {
  private client: MongoClient
  private db: Db | null = null
  private readonly uri: string
  private readonly dbName: string

  constructor(uri: string, dbName: string) {
    this.uri = uri
    this.dbName = dbName
    this.client = new MongoClient(uri)
  }

  async connect(): Promise<void> {
    await this.client.connect()
    this.db = this.client.db(this.dbName)
  }

  async disconnect(): Promise<void> {
    await this.client.close()
    this.db = null
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.db('admin').command({ ping: 1 })
      return true
    } catch {
      return false
    }
  }

  async getSchemaContext(): Promise<SchemaContext> {
    if (!this.db) throw new Error('Not connected. Call connect() first.')

    const collectionInfos = await this.db.listCollections().toArray()
    const collections: CollectionSchema[] = []

    for (const info of collectionInfos) {
      const col = this.db.collection(info.name)
      const estimatedCount = await col.estimatedDocumentCount()

      // Sample up to 20 docs to infer field types
      const samples = await col.find({}).limit(20).toArray()
      const fields = this.inferFields(samples)

      collections.push({ name: info.name, fields, estimatedCount })
    }

    return {
      dbType: 'mongodb',
      dbName: this.dbName,
      collections,
      generatedAt: new Date(),
    }
  }

  async executeQuery(queryJson: string): Promise<QueryResult> {
    if (!this.db) throw new Error('Not connected. Call connect() first.')

    const start = Date.now()

    // Query format: { "collection": "orders", "filter": {...}, "limit": 50 }
    const parsed = JSON.parse(queryJson) as {
      collection: string
      filter?: Record<string, unknown>
      projection?: Record<string, unknown>
      sort?: Record<string, unknown>
      limit?: number
    }

    const col = this.db.collection(parsed.collection)
    const findOptions = parsed.projection
      ? { projection: parsed.projection as Document }
      : undefined
    const sortSpec = (parsed.sort ?? {}) as unknown as Sort

    const rows = await col
      .find(parsed.filter ?? {}, findOptions)
      .sort(sortSpec)
      .limit(parsed.limit ?? 100)
      .toArray()

    return {
      rows: rows.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
      rowCount: rows.length,
      executionTimeMs: Date.now() - start,
      queryRan: queryJson,
    }
  }

  private inferFields(docs: Record<string, unknown>[]): FieldSchema[] {
    const fieldMap = new Map<string, { types: Set<string>; samples: unknown[] }>()

    for (const doc of docs) {
      for (const [key, value] of Object.entries(doc)) {
        if (key === '_id') continue
        if (!fieldMap.has(key)) fieldMap.set(key, { types: new Set(), samples: [] })
        const entry = fieldMap.get(key)
        if (!entry) continue
        entry.types.add(this.inferType(value))
        if (entry.samples.length < 3) entry.samples.push(value)
      }
    }

    return Array.from(fieldMap.entries()).map(([name, { types, samples }]) => ({
      name,
      type: types.size === 1 ? ([...types][0] ?? 'mixed') : 'mixed',
      nullable: types.has('null'),
      sample: samples[0],
    }))
  }

  private inferType(value: unknown): string {
    if (value === null || value === undefined) return 'null'
    if (value instanceof Date) return 'date'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'object'
    return typeof value
  }
}
