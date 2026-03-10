import { useRef, useEffect, useState, useCallback } from 'react'
import { SimulationEngine } from '../simulation/engine/SimulationEngine'
import { CityRenderer } from '../rendering/CityRenderer'
import type { CityTheme } from '../rendering/CityRenderer'
import { RenderLoop } from '../rendering/RenderLoop'
import { MetricsStore } from '../simulation/metrics/MetricsStore'
import type { TrafficController, SimulationMetrics, SimulationConfig, CityConfig } from '../simulation/core/types'
import { SIMULATION_CONFIG, CITY_CONFIG } from '../simulation/config/simulationConfig'

interface UseSimulationOptions {
  controller: TrafficController
  seed: number
  config?: SimulationConfig
  cityConfig?: CityConfig
  theme?: CityTheme
}

export function useSimulation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UseSimulationOptions
) {
  const engineRef = useRef<SimulationEngine | null>(null)
  const renderLoopRef = useRef<RenderLoop | null>(null)
  const metricsStoreRef = useRef(new MetricsStore())
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeedState] = useState(1)

  const config = options.config ?? SIMULATION_CONFIG
  const cityConfig = options.cityConfig ?? CITY_CONFIG

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = new SimulationEngine(options.controller, config, cityConfig, options.seed)
    engineRef.current = engine

    const cityRenderer = new CityRenderer(cityConfig, engine.intersections, engine.roads, options.theme)
    const store = metricsStoreRef.current
    store.reset()

    const renderLoop = new RenderLoop(engine, ctx, store, cityRenderer)
    renderLoopRef.current = renderLoop

    renderLoop.onMetricsUpdate = () => {
      setMetrics(store.getLatest())
    }

    // Set initial canvas size and draw static city
    const size = cityRenderer.getCanvasSize()
    canvas.width = size.width
    canvas.height = size.height
    cityRenderer.draw(ctx, size.width, size.height)

    return () => {
      renderLoop.destroy()
      renderLoopRef.current = null
      engineRef.current = null
    }
  }, [canvasRef, options.controller, options.seed, config, cityConfig])

  const start = useCallback(() => {
    renderLoopRef.current?.start()
    setIsRunning(true)
  }, [])

  const pause = useCallback(() => {
    renderLoopRef.current?.pause()
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    renderLoopRef.current?.pause()
    setIsRunning(false)
    engineRef.current?.reset(options.seed)
    metricsStoreRef.current.reset()
    setMetrics(null)
  }, [options.seed])

  const setSpeed = useCallback((s: number) => {
    if (renderLoopRef.current) {
      renderLoopRef.current.speed = s
    }
    setSpeedState(s)
  }, [])

  return {
    metrics,
    metricsHistory: metricsStoreRef.current.getHistory(),
    isRunning,
    speed,
    start,
    pause,
    reset,
    setSpeed,
    engine: engineRef,
  }
}
