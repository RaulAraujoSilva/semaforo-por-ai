import type { SimulationMetrics } from '../core/types'

export class MetricsStore {
  private history: SimulationMetrics[] = []
  private maxHistory = 600  // ~10 minutes at 1 sample/second

  push(metrics: SimulationMetrics): void {
    this.history.push(metrics)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
  }

  getHistory(): SimulationMetrics[] {
    return this.history
  }

  getLatest(): SimulationMetrics | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null
  }

  reset(): void {
    this.history = []
  }
}
