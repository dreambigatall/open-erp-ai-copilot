import { MongoConnector } from '@erp-copilot/connector-mongo'
import { PgConnector } from '@erp-copilot/connector-pg'
import type { ConnectorInterface } from '@erp-copilot/types'
import type { ERPCopilotConfig } from './config.js'

export function createConnector(config: ERPCopilotConfig): ConnectorInterface {
  if (config.database.type === 'mongodb') {
    return new MongoConnector(config.database.uri, config.database.dbName)
  }
  return new PgConnector(config.database.connectionString)
}
