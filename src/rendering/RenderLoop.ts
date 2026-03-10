import { SimulationEngine } from '../simulation/engine/SimulationEngine'
import { CityRenderer } from './CityRenderer'
import { TrafficLightRenderer } from './TrafficLightRenderer'
import { VehicleRenderer } from './VehicleRenderer'
import { MetricsStore } from '../simulation/metrics/MetricsStore'

export class RenderLoop {
  private engine: SimulationEngine
  private cityRenderer: CityRenderer
  private trafficLightRenderer = new TrafficLightRenderer()
  private vehicleRenderer = new VehicleRenderer()
  private metricsStore: MetricsStore
  private ctx: CanvasRenderingContext2D
  private animationId: number | null = null
  private lastTime = 0
  private metricsAccumulator = 0
  private _speed = 1
  private _running = false

  onMetricsUpdate?: () => void

  constructor(
    engine: SimulationEngine,
    ctx: CanvasRenderingContext2D,
    metricsStore: MetricsStore,
    cityRenderer: CityRenderer
  ) {
    this.engine = engine
    this.ctx = ctx
    this.metricsStore = metricsStore
    this.cityRenderer = cityRenderer
  }

  get speed(): number { return this._speed }
  set speed(s: number) { this._speed = s }
  get running(): boolean { return this._running }

  start(): void {
    if (this._running) return
    this._running = true
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  pause(): void {
    this._running = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private loop = (time: number): void => {
    if (!this._running) return

    const rawDt = Math.min((time - this.lastTime) / 1000, 0.1) // cap at 100ms
    this.lastTime = time
    const dt = rawDt * this._speed

    // Simulation ticks
    const tickDt = 1 / this.engine.config.tickRate
    let remaining = dt
    while (remaining > 0) {
      const step = Math.min(remaining, tickDt)
      this.engine.tick(step)
      remaining -= step
    }

    // Collect metrics every ~1 sim second
    this.metricsAccumulator += dt
    if (this.metricsAccumulator >= 1) {
      this.metricsAccumulator -= 1
      this.metricsStore.push(this.engine.getMetrics())
      this.onMetricsUpdate?.()
    }

    // Render
    this.render()

    this.animationId = requestAnimationFrame(this.loop)
  }

  private render(): void {
    const canvas = this.ctx.canvas
    const size = this.cityRenderer.getCanvasSize()
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width
      canvas.height = size.height
    }

    this.ctx.clearRect(0, 0, canvas.width, canvas.height)
    this.cityRenderer.draw(this.ctx, canvas.width, canvas.height)
    this.trafficLightRenderer.draw(this.ctx, this.engine.intersections)
    this.vehicleRenderer.draw(this.ctx, this.engine.vehicles)
  }

  destroy(): void {
    this.pause()
  }
}
