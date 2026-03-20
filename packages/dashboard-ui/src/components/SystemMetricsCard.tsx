import { useEffect, useState } from 'react'

interface MetricsResponse {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  parseFailureRate: number
  queryFailureRate: number
  avgLatencyMs: number
  avgExecutionTimeMs: number
  promptVersion?: string
}

interface SystemMetricsCardProps {
  metricsUrl: string
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function SystemMetricsCard({ metricsUrl }: SystemMetricsCardProps) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(metricsUrl)
        if (!res.ok) {
          const body = await res.text()
          throw new Error(`Metrics request failed (${String(res.status)}): ${body}`)
        }
        const data = (await res.json()) as MetricsResponse
        if (!cancelled) {
          setMetrics(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load metrics')
        }
      }
    }

    void load()
    const id = setInterval(() => {
      void load()
    }, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [metricsUrl])

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">System metrics</p>
        {metrics?.promptVersion && (
          <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500">
            {metrics.promptVersion}
          </span>
        )}
      </div>

      {error && <p className="rounded bg-red-50 p-2 text-xs text-red-600">{error}</p>}

      {!error && !metrics && <p className="text-xs text-gray-400">Loading metrics...</p>}

      {!error && metrics && (
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 md:grid-cols-4">
          <div>
            <p className="text-gray-400">Requests</p>
            <p className="font-medium text-gray-900">{metrics.totalRequests}</p>
          </div>
          <div>
            <p className="text-gray-400">Failures</p>
            <p className="font-medium text-gray-900">{pct(metrics.queryFailureRate)}</p>
          </div>
          <div>
            <p className="text-gray-400">Parse retry</p>
            <p className="font-medium text-gray-900">{pct(metrics.parseFailureRate)}</p>
          </div>
          <div>
            <p className="text-gray-400">Avg latency</p>
            <p className="font-medium text-gray-900">{Math.round(metrics.avgLatencyMs)}ms</p>
          </div>
        </div>
      )}
    </div>
  )
}
