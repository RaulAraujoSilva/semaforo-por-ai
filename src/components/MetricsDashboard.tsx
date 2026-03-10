import type { SimulationMetrics } from '../simulation/core/types'
import { MetricCard } from './MetricCard'

interface MetricsDashboardProps {
  fixedMetrics: SimulationMetrics | null
  aiMetrics: SimulationMetrics | null
}

export function MetricsDashboard({ fixedMetrics, aiMetrics }: MetricsDashboardProps) {
  const fmt = (n: number | undefined, decimals = 1) =>
    n !== undefined ? n.toFixed(decimals) : '—'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        label="Velocidade Média"
        fixedValue={fmt(fixedMetrics?.avgSpeed)}
        aiValue={fmt(aiMetrics?.avgSpeed)}
        unit="px/s"
        better="higher"
      />
      <MetricCard
        label="Tempo Parado"
        fixedValue={fmt(fixedMetrics?.avgStoppedTime)}
        aiValue={fmt(aiMetrics?.avgStoppedTime)}
        unit="s"
        better="lower"
      />
      <MetricCard
        label="Throughput"
        fixedValue={fmt(fixedMetrics?.throughput)}
        aiValue={fmt(aiMetrics?.throughput)}
        unit="/min"
        better="higher"
      />
      <MetricCard
        label="Veículos Ativos"
        fixedValue={fmt(fixedMetrics?.totalVehiclesActive, 0)}
        aiValue={fmt(aiMetrics?.totalVehiclesActive, 0)}
        unit=""
        better="lower"
      />
    </div>
  )
}
