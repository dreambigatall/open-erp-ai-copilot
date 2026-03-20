import type { SchemaContext } from '@erp-copilot/types'

export type QueryIntent = 'list' | 'metric' | 'trend' | 'compare' | 'breakdown' | 'general'

interface BuildPromptOptions {
  intent?: QueryIntent
  promptVersion?: string
}

export function buildSystemPrompt(schema: SchemaContext, options: BuildPromptOptions = {}): string {
  const dbType = schema.dbType === 'mongodb' ? 'MongoDB' : 'PostgreSQL'
  const intent = options.intent ?? 'general'
  const promptVersion = options.promptVersion ?? 'v1'
  const queryFormat =
    schema.dbType === 'mongodb'
      ? 'a JSON object with keys: collection, filter, projection, sort, limit'
      : 'a plain SQL SELECT statement'
  const dbSpecificRules =
    schema.dbType === 'postgresql'
      ? [
          'Only use SELECT or WITH statements. Never INSERT, UPDATE, DELETE, DROP.',
          'Prefer explicit column names and ORDER BY for deterministic output.',
          'For trends, include date truncation/grouping when needed.',
        ]
      : [
          'Only use find operations. Never insertOne, updateOne, deleteOne, drop.',
          'Always include a "limit" key of 100 or less.',
          'For trends and breakdowns, use filter + sort + projection focused on key dimensions.',
        ]

  const intentGuidance =
    intent === 'metric'
      ? 'Intent: single KPI/aggregate. Prefer concise aggregate query and minimal columns.'
      : intent === 'trend'
        ? 'Intent: time trend. Return time-ordered output suitable for charting.'
        : intent === 'compare'
          ? 'Intent: comparison between groups/periods. Return comparable grouped rows.'
          : intent === 'breakdown'
            ? 'Intent: categorical breakdown. Return grouped categories and values.'
            : intent === 'list'
              ? 'Intent: list/detail view. Return relevant rows with clear sorting.'
              : 'Intent: general data question. Choose the clearest read-only query.'

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
Prompt version: ${promptVersion}

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

INTENT GUIDANCE:
- ${intentGuidance}

RULES:
- ${dbSpecificRules.join('\n- ')}
- Use only the collections/tables and fields that exist in the schema above
- If the question cannot be answered from the available schema, set query to null and explain why
- Limit results to 100 rows maximum unless the user asks for an aggregate
- Output concise explanations focused on business meaning`
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

export function detectIntent(question: string): QueryIntent {
  const q = question.toLowerCase()
  if (/(how many|count|total|sum|avg|average|kpi|metric)/.test(q)) return 'metric'
  if (/(trend|over time|per month|per week|daily|monthly|yearly)/.test(q)) return 'trend'
  if (/(compare|vs|versus|difference|higher|lower)/.test(q)) return 'compare'
  if (/(by\s+\w+|breakdown|distribution|segment|grouped)/.test(q)) return 'breakdown'
  if (/(show|list|top|latest|recent|which|what are)/.test(q)) return 'list'
  return 'general'
}
