import { useState, useCallback, useMemo, useRef } from 'react'
import { SimulationCanvas } from './SimulationCanvas'
import { MetricsDashboard } from './MetricsDashboard'
import { ComparisonChart } from './ComparisonChart'
import { FixedTimingController } from '../simulation/controllers/FixedTimingController'
import { RuleBasedAIController } from '../simulation/controllers/RuleBasedAIController'
import type { SimulationMetrics } from '../simulation/core/types'

const SPEEDS = [1, 2, 5, 10]

export function DualSimulation() {
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000))
  const [fixedMetrics, setFixedMetrics] = useState<SimulationMetrics | null>(null)
  const [aiMetrics, setAiMetrics] = useState<SimulationMetrics | null>(null)
  const fixedHistoryRef = useRef<SimulationMetrics[]>([])
  const aiHistoryRef = useRef<SimulationMetrics[]>([])
  const [, forceUpdate] = useState(0)

  const fixedController = useMemo(() => new FixedTimingController(), [])
  const aiController = useMemo(() => new RuleBasedAIController(), [])

  const handleFixedMetrics = useCallback((m: SimulationMetrics) => {
    setFixedMetrics(m)
    fixedHistoryRef.current.push(m)
  }, [])

  const handleAiMetrics = useCallback((m: SimulationMetrics) => {
    setAiMetrics(m)
    aiHistoryRef.current.push(m)
    forceUpdate(n => n + 1)
  }, [])

  const handleReset = useCallback(() => {
    setIsRunning(false)
    setFixedMetrics(null)
    setAiMetrics(null)
    fixedHistoryRef.current = []
    aiHistoryRef.current = []
    setSeed(Math.floor(Math.random() * 100000))
  }, [])

  const simTime = fixedMetrics?.simTime ?? 0
  const minutes = Math.floor(simTime / 60)
  const seconds = Math.floor(simTime % 60)

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-6 py-2 rounded-lg font-semibold transition-colors
            bg-white/10 hover:bg-white/20 text-white border border-white/20"
        >
          {isRunning ? '⏸ Pausar' : '▶ Iniciar'}
        </button>

        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg font-semibold transition-colors
            bg-white/5 hover:bg-white/10 text-white/60 border border-white/10"
        >
          ↻ Reset
        </button>

        <div className="flex items-center gap-2">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${speed === s
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="text-white/50 font-mono text-sm">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div className="text-white/30 text-xs">
          seed: {seed}
        </div>
      </div>

      {/* Side by side simulations */}
      <div className="flex gap-6 justify-center flex-wrap">
        <SimulationCanvas
          controller={fixedController}
          seed={seed}
          label="🚦 Temporização Fixa (Baseline)"
          isRunning={isRunning}
          speed={speed}
          onMetrics={handleFixedMetrics}
        />
        <SimulationCanvas
          controller={aiController}
          seed={seed}
          label="🤖 IA Adaptativa"
          isRunning={isRunning}
          speed={speed}
          onMetrics={handleAiMetrics}
        />
      </div>

      {/* Metrics comparison */}
      <MetricsDashboard fixedMetrics={fixedMetrics} aiMetrics={aiMetrics} />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComparisonChart
          fixedHistory={fixedHistoryRef.current}
          aiHistory={aiHistoryRef.current}
          metric="avgSpeed"
          label="Velocidade Média"
          unit="px/s"
        />
        <ComparisonChart
          fixedHistory={fixedHistoryRef.current}
          aiHistory={aiHistoryRef.current}
          metric="avgStoppedTime"
          label="Tempo Parado"
          unit="s"
        />
        <ComparisonChart
          fixedHistory={fixedHistoryRef.current}
          aiHistory={aiHistoryRef.current}
          metric="throughput"
          label="Throughput"
          unit="/min"
        />
      </div>
    </div>
  )
}
