import type { TrafficController, IntersectionState, PhaseDecision, Intersection } from '../core/types'

// Lightweight inference — no TensorFlow.js needed, just matrix multiplication
interface DQNWeights {
  stateSize: number
  actionSize: number
  weights: Array<{ name: string; shape: number[]; data: number[] }>
}

interface Layer {
  weights: number[][]  // [inputSize][outputSize]
  biases: number[]     // [outputSize]
}

function relu(x: number): number {
  return x > 0 ? x : 0
}

function matmulForward(input: number[], layers: Layer[]): number[] {
  let current = input
  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l]
    const output: number[] = new Array(layer.biases.length).fill(0)
    for (let j = 0; j < layer.biases.length; j++) {
      let sum = layer.biases[j]
      for (let i = 0; i < current.length; i++) {
        sum += current[i] * layer.weights[i][j]
      }
      // ReLU for hidden layers, linear for output
      output[j] = l < layers.length - 1 ? relu(sum) : sum
    }
    current = output
  }
  return current
}

const MAX_QUEUE = 15

function encodeState(intersection: Intersection): number[] {
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

  const nsTotal = intersection.queues.north.length + intersection.queues.south.length
  const ewTotal = intersection.queues.east.length + intersection.queues.west.length
  const pressure = (nsTotal - ewTotal) / Math.max(nsTotal + ewTotal, 1)

  return [qN, qS, qE, qW, phaseNorm, timeNorm, isNSGreen, isEWGreen, isNSAvenue, isEWAvenue, pressure]
}

export class DQNController implements TrafficController {
  name = 'DQN (Deep RL)'
  private layers: Layer[] = []
  private loaded = false

  constructor(weightsJson?: DQNWeights) {
    if (weightsJson) {
      this.loadWeights(weightsJson)
    }
  }

  loadWeights(data: DQNWeights): void {
    this.layers = []
    // Weights come in pairs: [kernel, bias] for each layer
    for (let i = 0; i < data.weights.length; i += 2) {
      const kernel = data.weights[i]
      const bias = data.weights[i + 1]

      const [inputSize, outputSize] = kernel.shape
      const weights: number[][] = []
      for (let row = 0; row < inputSize; row++) {
        weights.push(kernel.data.slice(row * outputSize, (row + 1) * outputSize))
      }

      this.layers.push({ weights, biases: bias.data })
    }
    this.loaded = true
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

    // Minimum green time
    if (timeInPhase < 5) {
      return { action: 'continue' }
    }

    // If weights not loaded, fallback to fixed timing
    if (!this.loaded) {
      if (timeInPhase >= currentPhase.duration) {
        return { action: 'next-phase' }
      }
      return { action: 'continue' }
    }

    // Run DQN inference
    const encoded = encodeState(intersection)
    const qValues = matmulForward(encoded, this.layers)

    // Action 1 = switch to next phase
    if (qValues[1] > qValues[0]) {
      return { action: 'next-phase' }
    }
    return { action: 'continue' }
  }

  reset(): void {
    // Stateless inference
  }
}
