import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { SimulationMetrics } from '../simulation/core/types'

interface ComparisonChartProps {
  fixedHistory: SimulationMetrics[]
  aiHistory: SimulationMetrics[]
  metric: 'avgSpeed' | 'avgStoppedTime' | 'throughput'
  label: string
  unit: string
}

export function ComparisonChart({ fixedHistory, aiHistory, metric, label, unit }: ComparisonChartProps) {
  const maxLen = Math.min(fixedHistory.length, aiHistory.length)
  const data = []

  for (let i = 0; i < maxLen; i++) {
    data.push({
      time: Math.floor(fixedHistory[i].simTime),
      fixo: Number(fixedHistory[i][metric].toFixed(1)),
      ia: Number(aiHistory[i][metric].toFixed(1)),
    })
  }

  // Sample to avoid too many points
  const sampled = data.length > 120
    ? data.filter((_, i) => i % Math.ceil(data.length / 120) === 0)
    : data

  if (sampled.length < 2) return null

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <p className="text-xs text-white/50 uppercase tracking-wider mb-3">{label} ({unit})</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={sampled}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`}
          />
          <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => { const n = Number(v); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="fixo" name="Fixo" stroke="#94a3b8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="ia" name="IA" stroke="#00d4ff" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
