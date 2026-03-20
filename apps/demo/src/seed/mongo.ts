import { MongoClient } from 'mongodb'
import { config as loadEnv } from 'dotenv'

loadEnv()

const uri = process.env['MONGO_URI'] ?? 'mongodb://localhost:27017'
const dbName = process.env['MONGO_DB_NAME'] ?? 'erp_demo'
const client = new MongoClient(uri)

async function seed() {
  console.log('Seeding MongoDB...')
  await client.connect()
  const db = client.db(dbName)

  // Drop existing collections for clean seed
  await Promise.all([
    db
      .collection('customers')
      .drop()
      .catch(() => {}),
    db
      .collection('products')
      .drop()
      .catch(() => {}),
    db
      .collection('orders')
      .drop()
      .catch(() => {}),
    db
      .collection('invoices')
      .drop()
      .catch(() => {}),
    db
      .collection('employees')
      .drop()
      .catch(() => {}),
  ])

  // Customers
  await db.collection('customers').insertMany([
    {
      name: 'Acme Corp',
      email: 'acme@acme.com',
      country: 'USA',
      segment: 'enterprise',
      createdAt: new Date(),
    },
    {
      name: 'Beta Ltd',
      email: 'hello@beta.io',
      country: 'UK',
      segment: 'smb',
      createdAt: new Date(),
    },
    {
      name: 'Gamma GmbH',
      email: 'info@gamma.de',
      country: 'Germany',
      segment: 'enterprise',
      createdAt: new Date(),
    },
    {
      name: 'Delta Inc',
      email: 'ops@delta.com',
      country: 'Canada',
      segment: 'startup',
      createdAt: new Date(),
    },
    {
      name: 'Epsilon SA',
      email: 'contact@eps.fr',
      country: 'France',
      segment: 'smb',
      createdAt: new Date(),
    },
    {
      name: 'Zeta Technologies',
      email: 'zt@zeta.tech',
      country: 'India',
      segment: 'enterprise',
      createdAt: new Date(),
    },
    {
      name: 'Eta Solutions',
      email: 'hi@eta.co',
      country: 'Brazil',
      segment: 'startup',
      createdAt: new Date(),
    },
    {
      name: 'Theta Corp',
      email: 'admin@theta.com',
      country: 'USA',
      segment: 'smb',
      createdAt: new Date(),
    },
    {
      name: 'Iota Systems',
      email: 'sales@iota.io',
      country: 'Japan',
      segment: 'enterprise',
      createdAt: new Date(),
    },
    {
      name: 'Kappa Labs',
      email: 'hello@kappa.dev',
      country: 'USA',
      segment: 'startup',
      createdAt: new Date(),
    },
  ])

  // Products
  await db.collection('products').insertMany([
    { name: 'ERP Starter', category: 'Software', price: 299.0, stock: 999, sku: 'SW-001' },
    { name: 'ERP Pro', category: 'Software', price: 799.0, stock: 999, sku: 'SW-002' },
    { name: 'ERP Enterprise', category: 'Software', price: 2499.0, stock: 999, sku: 'SW-003' },
    { name: 'Support Basic', category: 'Service', price: 149.0, stock: 999, sku: 'SV-001' },
    { name: 'Support Premium', category: 'Service', price: 499.0, stock: 999, sku: 'SV-002' },
    { name: 'Server Unit', category: 'Hardware', price: 1299.0, stock: 45, sku: 'HW-001' },
    { name: 'Workstation', category: 'Hardware', price: 899.0, stock: 23, sku: 'HW-002' },
    { name: 'Network Switch', category: 'Hardware', price: 349.0, stock: 12, sku: 'HW-003' },
    { name: 'Training Day', category: 'Service', price: 599.0, stock: 999, sku: 'SV-003' },
    { name: 'Data Migration', category: 'Service', price: 1999.0, stock: 999, sku: 'SV-004' },
  ])

  // Orders + invoices
  const rawCustomers = await db.collection('customers').find().toArray()
  const customers = rawCustomers.map((doc) => ({
    id: doc['_id'] as unknown,
    name: typeof doc['name'] === 'string' ? doc['name'] : 'Unknown customer',
  }))
  const orderStatusList = ['delivered', 'delivered', 'shipped', 'processing', 'cancelled'] as const
  const invoiceStatusList = ['paid', 'paid', 'sent', 'overdue'] as const

  const orders = []
  const invoices = []

  for (let i = 0; i < 60; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)]
    if (!customer) continue
    const daysAgo = Math.floor(Math.random() * 90)
    const createdAt = new Date(Date.now() - daysAgo * 864e5)
    const total = parseFloat((Math.random() * 5000 + 200).toFixed(2))
    const status =
      orderStatusList[Math.floor(Math.random() * orderStatusList.length)] ?? 'processing'
    const orderId = `ORD-${String(i + 1).padStart(4, '0')}`

    orders.push({
      orderId,
      customerId: customer.id,
      customerName: customer.name,
      status,
      total,
      createdAt,
    })

    const ist = invoiceStatusList[Math.floor(Math.random() * invoiceStatusList.length)] ?? 'sent'
    const dueDate = new Date(createdAt.getTime() + 30 * 864e5)
    const paidAt = ist === 'paid' ? new Date(createdAt.getTime() + 15 * 864e5) : null

    invoices.push({
      orderId,
      customerId: customer.id,
      customerName: customer.name,
      amount: total,
      status: ist,
      dueDate,
      paidAt,
      createdAt,
    })
  }

  await db.collection('orders').insertMany(orders)
  await db.collection('invoices').insertMany(invoices)

  // Employees
  await db.collection('employees').insertMany([
    {
      name: 'Sarah Chen',
      department: 'Engineering',
      role: 'CTO',
      salary: 185000,
      hiredAt: new Date('2019-03-01'),
      active: true,
    },
    {
      name: 'James Okafor',
      department: 'Engineering',
      role: 'Senior Engineer',
      salary: 120000,
      hiredAt: new Date('2020-06-15'),
      active: true,
    },
    {
      name: 'Maria Santos',
      department: 'Sales',
      role: 'VP Sales',
      salary: 145000,
      hiredAt: new Date('2018-11-01'),
      active: true,
    },
    {
      name: 'Ahmed Hassan',
      department: 'Sales',
      role: 'Account Executive',
      salary: 75000,
      hiredAt: new Date('2021-02-10'),
      active: true,
    },
    {
      name: 'Lisa Park',
      department: 'Finance',
      role: 'CFO',
      salary: 175000,
      hiredAt: new Date('2019-01-15'),
      active: true,
    },
    {
      name: 'Tom Bradley',
      department: 'Finance',
      role: 'Controller',
      salary: 95000,
      hiredAt: new Date('2020-09-01'),
      active: true,
    },
    {
      name: 'Priya Sharma',
      department: 'Engineering',
      role: 'Engineer',
      salary: 98000,
      hiredAt: new Date('2022-04-01'),
      active: true,
    },
    {
      name: 'Carlos Diaz',
      department: 'HR',
      role: 'HR Manager',
      salary: 85000,
      hiredAt: new Date('2020-07-01'),
      active: true,
    },
    {
      name: 'Emma Wilson',
      department: 'Marketing',
      role: 'CMO',
      salary: 155000,
      hiredAt: new Date('2019-05-01'),
      active: true,
    },
    {
      name: 'David Kim',
      department: 'Engineering',
      role: 'DevOps Engineer',
      salary: 110000,
      hiredAt: new Date('2021-08-15'),
      active: true,
    },
  ])

  console.log('MongoDB seeded successfully!')
  await client.close()
}

seed().catch((err: unknown) => {
  console.error(err)
})
