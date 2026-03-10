import type { Intersection, Direction } from '../src/simulation/core/types.js'

const MAX_QUEUE = 15

export function encodeIntersectionState(intersection: Intersection): number[] {
  const tl = intersection.trafficLight
  const phase = tl.phases[tl.currentPhaseIndex]
  const maxDuration = Math.max(...tl.phases.map(p => p.duration))

  const qN = Math.min(intersection.queues.north.length / MAX_QUEUE, 1)
  const qS = Math.min(intersection.queues.south.length / MAX_QUEUE, 1)
  const qE = Math.min(intersection.queues.east.length / MAX_QUEUE, 1)
  const qW = Math.min(intersection.queues.west.length / MAX_QUEUE, 1)

  const phaseNorm = tl.currentPhaseIndex / Math.max(1, tl.phases.length - 1)
  const timeNorm = Math.min(tl.timeInPhase / maxDuration, 1)

  const isNSGreen = phase.nsLight === 'green' ? 1 : 0
  const isEWGreen = phase.ewLight === 'green' ? 1 : 0

  const isNSAvenue = intersection.nsRoadType === 'avenue' ? 1 : 0
  const isEWAvenue = intersection.ewRoadType === 'avenue' ? 1 : 0

  // Pressure: difference between NS and EW queues
  const nsTotal = intersection.queues.north.length + intersection.queues.south.length
  const ewTotal = intersection.queues.east.length + intersection.queues.west.length
  const pressure = (nsTotal - ewTotal) / (Math.max(nsTotal + ewTotal, 1))

  return [qN, qS, qE, qW, phaseNorm, timeNorm, isNSGreen, isEWGreen, isNSAvenue, isEWAvenue, pressure]
}

export function computeReward(intersection: Intersection): number {
  const totalStopped =
    intersection.queues.north.length +
    intersection.queues.south.length +
    intersection.queues.east.length +
    intersection.queues.west.length

  // Penalize queues quadratically (long queues are much worse)
  return -totalStopped * 0.1 - (totalStopped > 8 ? (totalStopped - 8) * 0.2 : 0)
}
