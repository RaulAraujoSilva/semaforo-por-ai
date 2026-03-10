import type { TrafficController, IntersectionState, PhaseDecision } from '../src/simulation/core/types.js'
import type { DQNAgent } from './DQNAgent.js'
import { encodeIntersectionState } from './stateEncoder.js'

// Controller used DURING TRAINING that calls the DQN agent
export class TrainingController implements TrafficController {
  name = 'DQN (Training)'

  private agent: DQNAgent
  private actionMap = new Map<string, number>() // intersection id → last action

  constructor(agent: DQNAgent) {
    this.agent = agent
  }

  decide(state: IntersectionState): PhaseDecision {
    const { intersection, timeInPhase, currentPhase } = state

    // During yellow or pedestrian, always continue until done
    if (currentPhase.nsLight === 'yellow' || currentPhase.ewLight === 'yellow' || currentPhase.pedestrianActive) {
      if (timeInPhase >= currentPhase.duration) {
        return { action: 'next-phase' }
      }
      return { action: 'continue' }
    }

    // Minimum green time of 5 seconds before allowing AI to decide
    if (timeInPhase < 5) {
      return { action: 'continue' }
    }

    // AI decision every 3 seconds
    if (timeInPhase % 3 > 0.5) {
      const lastAction = this.actionMap.get(intersection.id) ?? 0
      return lastAction === 1 ? { action: 'next-phase' } : { action: 'continue' }
    }

    const encoded = encodeIntersectionState(intersection)
    const action = this.agent.act(encoded)
    this.actionMap.set(intersection.id, action)

    if (action === 1) {
      return { action: 'next-phase' }
    }
    return { action: 'continue' }
  }

  reset(): void {
    this.actionMap.clear()
  }
}
