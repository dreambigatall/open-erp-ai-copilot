import type { SchemaContext } from '@erp-copilot/types'

export function buildSystemPrompt(schema: SchemaContext): string {
  const dbType = schema.dbType === 'mongodb' ? 'MongoDB' : 'PostgreSQL'
  const queryFormat =
    schema.dbType === 'mongodb'
      ? 'a JSON object with keys: collection, filter, projection, sort, limit'
      : 'a plain SQL SELECT statement'

  const schemaDescription = schema.collections
    .map((col) => {
      const fields = col.fields
        .map((f) => {
          const sample = f.sample !== undefined ? `, e.g. ${JSON.stringify(String(f.sample))}` : ''
          return `    - ${f.name} (${f.type}${f.nullable ? ', nullable' : ''}${sample})`
        })
        .join('\n')
      return `  ${col.name} (~${String(col.estimatedCount)} records):\n${fields}`
    })
    .join('\n\n')

  return `You are an ERP data assistant. You help users query their ${dbType} ERP database
using natural language. You have read-only access.

DATABASE SCHEMA:
${schemaDescription}

YOUR JOB:
1. Understand the user's question about their ERP data
2. Generate ${queryFormat}
3. Return ONLY valid JSON in this exact shape — no explanation, no markdown:

{
  "query": ,
  "explanation": ,
  "module": 
}

RULES:
- ${
    schema.dbType === 'postgresql'
      ? 'Only use SELECT or WITH statements. Never INSERT, UPDATE, DELETE, DROP.'
      : 'Only use find operations. Never insertOne, updateOne, deleteOne, drop.'
  }
- Use only the collections/tables and fields that exist in the schema above
- If the question cannot be answered from the available schema, set query to null and explain why
- Limit results to 100 rows maximum unless the user asks for an aggregate
- For MongoDB: always include a "limit" key of 100 or less`
}

export const MODULE_HINTS: Record<string, string> = {
  finance: 'Focus: invoices, payments, revenue, expenses, accounts receivable/payable.',
  inventory: 'Focus: products, stock levels, warehouses, purchase orders, suppliers.',
  crm: 'Focus: customers, contacts, leads, deals, activities.',
  hr: 'Focus: employees, departments, salaries, leave, attendance.',
  general: 'Answer any question about the available data.',
}

export function detectModule(question: string): string {
  const q = question.toLowerCase()
  if (/invoice|payment|revenue|expense|account|billing|tax/.test(q)) return 'finance'
  if (/stock|inventory|product|warehouse|supplier|reorder/.test(q)) return 'inventory'
  if (/customer|contact|lead|deal|crm|client/.test(q)) return 'crm'
  if (/employee|staff|salary|payroll|department|leave|hr/.test(q)) return 'hr'
  return 'general'
}
