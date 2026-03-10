import * as tf from '@tensorflow/tfjs'

// State: 11 features per intersection
// [qN, qS, qE, qW, phaseNorm, timeNorm, isNSGreen, isEWGreen, isNSAvenue, isEWAvenue, pressure]
const STATE_SIZE = 11
const ACTION_SIZE = 2 // 0=continue, 1=switch

interface Experience {
  state: number[]
  action: number
  reward: number
  nextState: number[]
  done: boolean
}

export class DQNAgent {
  private model: tf.Sequential
  private targetModel: tf.Sequential
  private replayBuffer: Experience[] = []
  private maxBufferSize = 50000
  private batchSize = 64
  private gamma = 0.95
  private epsilon: number
  private epsilonMin = 0.05
  private epsilonDecay = 0.9995
  private learningRate = 0.001
  private targetUpdateFreq = 500
  private stepCount = 0

  constructor(epsilon = 1.0) {
    this.epsilon = epsilon
    this.model = this.buildModel()
    this.targetModel = this.buildModel()
    this.syncTargetModel()
  }

  private buildModel(): tf.Sequential {
    const model = tf.sequential()
    model.add(tf.layers.dense({
      inputShape: [STATE_SIZE],
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal',
    }))
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelInitializer: 'heNormal',
    }))
    model.add(tf.layers.dense({
      units: ACTION_SIZE,
      activation: 'linear',
    }))
    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError',
    })
    return model
  }

  private syncTargetModel(): void {
    const weights = this.model.getWeights()
    this.targetModel.setWeights(weights.map(w => w.clone()))
  }

  act(state: number[]): number {
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * ACTION_SIZE)
    }
    const stateTensor = tf.tensor2d([state])
    const qValues = this.model.predict(stateTensor) as tf.Tensor
    const action = (qValues.argMax(1).dataSync()[0])
    stateTensor.dispose()
    qValues.dispose()
    return action
  }

  actGreedy(state: number[]): number {
    const stateTensor = tf.tensor2d([state])
    const qValues = this.model.predict(stateTensor) as tf.Tensor
    const action = qValues.argMax(1).dataSync()[0]
    stateTensor.dispose()
    qValues.dispose()
    return action
  }

  remember(state: number[], action: number, reward: number, nextState: number[], done: boolean): void {
    this.replayBuffer.push({ state, action, reward, nextState, done })
    if (this.replayBuffer.length > this.maxBufferSize) {
      this.replayBuffer.shift()
    }
  }

  async replay(): Promise<number> {
    if (this.replayBuffer.length < this.batchSize) return 0

    // Sample mini-batch
    const batch: Experience[] = []
    for (let i = 0; i < this.batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length)
      batch.push(this.replayBuffer[idx])
    }

    const states = tf.tensor2d(batch.map(e => e.state))
    const nextStates = tf.tensor2d(batch.map(e => e.nextState))

    // Current Q values
    const currentQ = this.model.predict(states) as tf.Tensor
    const currentQData = await currentQ.array() as number[][]

    // Target Q values (from target network)
    const nextQ = this.targetModel.predict(nextStates) as tf.Tensor
    const nextQData = await nextQ.array() as number[][]

    // Build targets
    const targets: number[][] = []
    for (let i = 0; i < this.batchSize; i++) {
      const target = [...currentQData[i]]
      if (batch[i].done) {
        target[batch[i].action] = batch[i].reward
      } else {
        const maxNextQ = Math.max(...nextQData[i])
        target[batch[i].action] = batch[i].reward + this.gamma * maxNextQ
      }
      targets.push(target)
    }

    const targetTensor = tf.tensor2d(targets)
    const result = await this.model.fit(states, targetTensor, {
      epochs: 1,
      verbose: 0,
    })
    const loss = result.history.loss[0] as number

    // Cleanup
    states.dispose()
    nextStates.dispose()
    currentQ.dispose()
    nextQ.dispose()
    targetTensor.dispose()

    // Update target network periodically
    this.stepCount++
    if (this.stepCount % this.targetUpdateFreq === 0) {
      this.syncTargetModel()
    }

    // Decay epsilon
    if (this.epsilon > this.epsilonMin) {
      this.epsilon *= this.epsilonDecay
    }

    return loss
  }

  getEpsilon(): number {
    return this.epsilon
  }

  async exportWeights(): Promise<object> {
    const weights: { name: string; shape: number[]; data: number[] }[] = []
    for (const w of this.model.getWeights()) {
      weights.push({
        name: w.name,
        shape: w.shape,
        data: Array.from(await w.data()),
      })
    }
    return { stateSize: STATE_SIZE, actionSize: ACTION_SIZE, weights }
  }

  dispose(): void {
    this.model.dispose()
    this.targetModel.dispose()
  }
}

export { STATE_SIZE, ACTION_SIZE }
