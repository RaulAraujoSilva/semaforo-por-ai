import { useRef, useEffect } from 'react'
import { useSimulation } from '../hooks/useSimulation'
import type { CityTheme } from '../rendering/CityRenderer'
import type { TrafficController, SimulationMetrics } from '../simulation/core/types'

interface SimulationCanvasProps {
  controller: TrafficController
  seed: number
  label: string
  isRunning: boolean
  speed: number
  onMetrics?: (metrics: SimulationMetrics) => void
  theme?: CityTheme
}

export function SimulationCanvas({ controller, seed, label, isRunning, speed, onMetrics, theme }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sim = useSimulation(canvasRef, { controller, seed, theme })

  // Sync play/pause
  useEffect(() => {
    if (isRunning && !sim.isRunning) sim.start()
    if (!isRunning && sim.isRunning) sim.pause()
  }, [isRunning, sim.isRunning, sim.start, sim.pause])

  // Sync speed
  useEffect(() => {
    if (speed !== sim.speed) sim.setSpeed(speed)
  }, [speed, sim.speed, sim.setSpeed])

  // Report metrics
  useEffect(() => {
    if (onMetrics && sim.metrics) {
      onMetrics(sim.metrics)
    }
  }, [sim.metrics, onMetrics])

  return (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-lg font-bold text-white/90">{label}</h3>
      <div className="border border-white/10 rounded-lg overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  )
}
