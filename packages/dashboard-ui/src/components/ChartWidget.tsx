import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Widget } from '../types.js'
import { WidgetCard } from './WidgetCard.js'

const COLORS = ['#1D9E75', '#378ADD', '#7F77DD', '#D85A30', '#D4537E', '#BA7517']

export function ChartWidget({ widget }: { widget: Widget }) {
  const rows = widget.result?.rows ?? []

  if (rows.length === 0) {
    return (
      <WidgetCard widget={widget}>
        <p className="text-sm text-gray-400">No data</p>
      </WidgetCard>
    )
  }

  const firstRow = rows[0]
  if (!firstRow) {
    return (
      <WidgetCard widget={widget}>
        <p className="text-sm text-gray-400">No data</p>
      </WidgetCard>
    )
  }
  const keys = Object.keys(firstRow)
  const xKey = keys[0]
  if (!xKey) {
    return (
      <WidgetCard widget={widget}>
        <p className="text-sm text-gray-400">No data</p>
      </WidgetCard>
    )
  }
  const valueKeys = keys.slice(1).filter((k) => {
    const v = firstRow[k]
    if (typeof v === 'number') return !isNaN(v)
    if (typeof v === 'string') {
      const n = Number(v)
      return v.trim() !== '' && !isNaN(n)
    }
    return false
  })
  if (valueKeys.length === 0) {
    return (
      <WidgetCard widget={widget}>
        <p className="text-sm text-gray-400">No data</p>
      </WidgetCard>
    )
  }

  const pieValueKey = valueKeys[0]
  if (!pieValueKey) {
    return (
      <WidgetCard widget={widget}>
        <p className="text-sm text-gray-400">No data</p>
      </WidgetCard>
    )
  }

  const getColor = (idx: number): string => COLORS[idx % COLORS.length] ?? '#000000'

  return (
    <WidgetCard widget={widget}>
      <ResponsiveContainer width="100%" height={180}>
        {widget.type === 'bar' ? (
          <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 8 }}
            />
            {valueKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={getColor(i)} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : widget.type === 'pie' ? (
          <PieChart>
            <Pie
              data={rows}
              dataKey={pieValueKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={70}
              label
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={getColor(i)} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        ) : (
          <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 8 }}
            />
            {valueKeys.map((k, i) => (
              <Line key={k} dataKey={k} stroke={getColor(i)} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </WidgetCard>
  )
}
