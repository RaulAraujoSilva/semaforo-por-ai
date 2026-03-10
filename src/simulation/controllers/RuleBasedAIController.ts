import type { TrafficController, IntersectionState, PhaseDecision } from '../core/types'

export class RuleBasedAIController implements TrafficController {
  name = 'IA Adaptativa'

  private minGreen = 8
  private maxGreen = 50
  private extendAmount = 5

  decide(state: IntersectionState): PhaseDecision {
    const { currentPhase, timeInPhase, queueLengths } = state

    // During yellow or pedestrian phases, use fixed timing
    if (currentPhase.nsLight === 'yellow' || currentPhase.ewLight === 'yellow' || currentPhase.pedestrianActive) {
      if (timeInPhase >= currentPhase.duration) {
        return { action: 'next-phase' }
      }
      return { action: 'continue' }
    }

    // Determine which direction is green and which is red
    const isNSGreen = currentPhase.nsLight === 'green'
    const greenQueueLength = isNSGreen
      ? queueLengths.north + queueLengths.south
      : queueLengths.east + queueLengths.west
    const redQueueLength = isNSGreen
      ? queueLengths.east + queueLengths.west
      : queueLengths.north + queueLengths.south

    // Rule 1: Minimum green time
    if (timeInPhase < this.minGreen) {
      return { action: 'continue' }
    }

    // Rule 2: If green direction is empty and red direction has cars, switch early
    if (greenQueueLength === 0 && redQueueLength > 2) {
      return { action: 'next-phase' }
    }

    // Rule 3: If red direction is much busier, switch
    if (redQueueLength > greenQueueLength * 2.5 && redQueueLength > 4) {
      return { action: 'next-phase' }
    }

    // Rule 4: If green still has cars and under max, extend
    if (greenQueueLength > 3 && timeInPhase < this.maxGreen) {
      if (timeInPhase >= currentPhase.duration) {
        return { action: 'extend', extendBy: this.extendAmount }
      }
      return { action: 'continue' }
    }

    // Default: follow normal timing
    if (timeInPhase >= currentPhase.duration) {
      return { action: 'next-phase' }
    }
    return { action: 'continue' }
  }

  reset(): void {
    // Stateless controller
  }
}
