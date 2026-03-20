import pg from 'pg'
import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load workspace root .env regardless of where npm command is executed from.
loadEnv({ path: resolve(__dirname, '../../../../.env') })

const pool = new pg.Pool({
  connectionString:
    process.env['PG_CONNECTION_STRING'] ?? 'postgresql://postgres:password@localhost:5432/erp_demo',
})

async function seed() {
  console.log('Seeding PostgreSQL...')
  console.log(`AI model: ${process.env['PG_CONNECTION_STRING'] ?? 'not set'}`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(100) UNIQUE,
      country    VARCHAR(50),
      segment    VARCHAR(20) CHECK (segment IN ('enterprise','smb','startup')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      category   VARCHAR(50),
      price      NUMERIC(10,2),
      stock      INTEGER DEFAULT 0,
      sku        VARCHAR(50) UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id          SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id),
      status      VARCHAR(20) CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
      total       NUMERIC(10,2),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id         SERIAL PRIMARY KEY,
      order_id   INTEGER REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      quantity   INTEGER,
      unit_price NUMERIC(10,2)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id          SERIAL PRIMARY KEY,
      order_id    INTEGER REFERENCES orders(id),
      customer_id INTEGER REFERENCES customers(id),
      amount      NUMERIC(10,2),
      status      VARCHAR(20) CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
      due_date    DATE,
      paid_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS employees (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100),
      department VARCHAR(50),
      role       VARCHAR(100),
      salary     NUMERIC(10,2),
      hired_at   DATE,
      active     BOOLEAN DEFAULT TRUE
    );
  `)

  // Customers
  const customers = [
    ['Acme Corp', 'acme@acme.com', 'USA', 'enterprise'],
    ['Beta Ltd', 'hello@beta.io', 'UK', 'smb'],
    ['Gamma GmbH', 'info@gamma.de', 'Germany', 'enterprise'],
    ['Delta Inc', 'ops@delta.com', 'Canada', 'startup'],
    ['Epsilon SA', 'contact@eps.fr', 'France', 'smb'],
    ['Zeta Technologies', 'zt@zeta.tech', 'India', 'enterprise'],
    ['Eta Solutions', 'hi@eta.co', 'Brazil', 'startup'],
    ['Theta Corp', 'admin@theta.com', 'USA', 'smb'],
    ['Iota Systems', 'sales@iota.io', 'Japan', 'enterprise'],
    ['Kappa Labs', 'hello@kappa.dev', 'USA', 'startup'],
  ]
  for (const [name, email, country, segment] of customers) {
    await pool.query(
      'INSERT INTO customers (name,email,country,segment) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [name, email, country, segment],
    )
  }

  // Products
  const products = [
    ['ERP Starter', 'Software', 299.0, 999, 'SW-001'],
    ['ERP Pro', 'Software', 799.0, 999, 'SW-002'],
    ['ERP Enterprise', 'Software', 2499.0, 999, 'SW-003'],
    ['Support Basic', 'Service', 149.0, 999, 'SV-001'],
    ['Support Premium', 'Service', 499.0, 999, 'SV-002'],
    ['Server Unit', 'Hardware', 1299.0, 45, 'HW-001'],
    ['Workstation', 'Hardware', 899.0, 23, 'HW-002'],
    ['Network Switch', 'Hardware', 349.0, 12, 'HW-003'],
    ['Training Day', 'Service', 599.0, 999, 'SV-003'],
    ['Data Migration', 'Service', 1999.0, 999, 'SV-004'],
  ]
  for (const [name, category, price, stock, sku] of products) {
    await pool.query(
      'INSERT INTO products (name,category,price,stock,sku) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [name, category, price, stock, sku],
    )
  }

  // Orders + invoices (last 90 days)
  const statuses = [
    'delivered',
    'delivered',
    'delivered',
    'shipped',
    'processing',
    'cancelled',
  ] as const
  const invStatus = ['paid', 'paid', 'paid', 'sent', 'overdue'] as const

  for (let i = 0; i < 60; i++) {
    const custId = Math.ceil(Math.random() * 10)
    const status = statuses[Math.floor(Math.random() * statuses.length)] ?? 'processing'
    const daysAgo = Math.floor(Math.random() * 90)
    const createdAt = new Date(Date.now() - daysAgo * 864e5)
    const total = parseFloat((Math.random() * 5000 + 200).toFixed(2))

    const orderRes = await pool.query<{ id: number }>(
      'INSERT INTO orders (customer_id,status,total,created_at) VALUES ($1,$2,$3,$4) RETURNING id',
      [custId, status, total, createdAt],
    )
    const orderId = orderRes.rows[0]?.id
    if (typeof orderId !== 'number') {
      throw new Error('Failed to create order id during PostgreSQL seed.')
    }

    const ist = invStatus[Math.floor(Math.random() * invStatus.length)] ?? 'sent'
    const dueDate = new Date(createdAt.getTime() + 30 * 864e5)
    const paidAt = ist === 'paid' ? new Date(createdAt.getTime() + 15 * 864e5) : null

    await pool.query(
      `INSERT INTO invoices (order_id,customer_id,amount,status,due_date,paid_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [orderId, custId, total, ist, dueDate, paidAt, createdAt],
    )
  }

  // Employees
  const employees = [
    ['Sarah Chen', 'Engineering', 'CTO', 185000, '2019-03-01'],
    ['James Okafor', 'Engineering', 'Senior Engineer', 120000, '2020-06-15'],
    ['Maria Santos', 'Sales', 'VP Sales', 145000, '2018-11-01'],
    ['Ahmed Hassan', 'Sales', 'Account Executive', 75000, '2021-02-10'],
    ['Lisa Park', 'Finance', 'CFO', 175000, '2019-01-15'],
    ['Tom Bradley', 'Finance', 'Controller', 95000, '2020-09-01'],
    ['Priya Sharma', 'Engineering', 'Engineer', 98000, '2022-04-01'],
    ['Carlos Diaz', 'HR', 'HR Manager', 85000, '2020-07-01'],
    ['Emma Wilson', 'Marketing', 'CMO', 155000, '2019-05-01'],
    ['David Kim', 'Engineering', 'DevOps Engineer', 110000, '2021-08-15'],
  ]
  for (const [name, dept, role, salary, hired] of employees) {
    await pool.query(
      'INSERT INTO employees (name,department,role,salary,hired_at) VALUES ($1,$2,$3,$4,$5)',
      [name, dept, role, salary, hired],
    )
  }

  console.log('PostgreSQL seeded successfully!')
  await pool.end()
}

seed().catch((err: unknown) => {
  console.error(err)
})
