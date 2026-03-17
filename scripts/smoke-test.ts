import { MongoConnector } from '@erp-copilot/connector-mongo'
import { PgConnector } from '@erp-copilot/connector-pg'

async function run() {
  console.log('\n--- MongoDB ---')
  const mongo = new MongoConnector('mongodb://localhost:27017', 'erp_test')
  await mongo.connect()
  console.log('ping:', await mongo.ping())
  const mongoCtx = await mongo.getSchemaContext()
  console.log(
    'collections:',
    mongoCtx.collections.map((c) => c.name),
  )
  await mongo.disconnect()

  console.log('\n--- PostgreSQL ---')
  const pg = new PgConnector('postgresql://postgres:test@localhost:5432/postgres')
  await pg.connect()
  console.log('ping:', await pg.ping())
  const pgCtx = await pg.getSchemaContext()
  console.log(
    'tables:',
    pgCtx.collections.map((c) => c.name),
  )
  await pg.disconnect()

  console.log('\nAll good!')
}

run().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err)
})
