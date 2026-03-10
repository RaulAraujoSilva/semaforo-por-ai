import type { TrafficController, IntersectionState, PhaseDecision } from '../core/types'

export class FixedTimingController implements TrafficController {
  name = 'Temporização Fixa'

  decide(state: IntersectionState): PhaseDecision {
    const { currentPhase, timeInPhase } = state
    if (timeInPhase >= currentPhase.duration) {
      return { action: 'next-phase' }
    }
    return { action: 'continue' }
  }

  reset(): void {
    // No state to reset
  }
}
