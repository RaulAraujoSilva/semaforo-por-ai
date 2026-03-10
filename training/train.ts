import * as tf from '@tensorflow/tfjs'
import { SimulationEngine } from '../src/simulation/engine/SimulationEngine.js'
import { FixedTimingController } from '../src/simulation/controllers/FixedTimingController.js'
import { SIMULATION_CONFIG, CITY_CONFIG } from '../src/simulation/config/simulationConfig.js'
import { DQNAgent } from './DQNAgent.js'
import { encodeIntersectionState, computeReward } from './stateEncoder.js'
import type { TrafficController, IntersectionState, PhaseDecision } from '../src/simulation/core/types.js'
import * as fs from 'fs'
import * as path from 'path'

const EPISODES = 300
const STEPS_PER_EPISODE = 2000
const DECISION_INTERVAL = 20   // decide every ~3.3 sim seconds
const DT = 1 / 6
const EVAL_EVERY = 25
const EVAL_STEPS = 1500

// A controller that passes all decisions to the external training loop
class ExternalController implements TrafficController {
  name = 'External'
  actions = new Map<string, number>() // intersection id → action from agent

  decide(state: IntersectionState): PhaseDecision {
    const { intersection, timeInPhase, currentPhase } = state

    // Yellow and pedestrian: always advance when done
    if (currentPhase.nsLight === 'yellow' || currentPhase.ewLight === 'yellow' || currentPhase.pedestrianActive) {
      if (timeInPhase >= currentPhase.duration) return { action: 'next-phase' }
      return { action: 'continue' }
    }

    // Minimum green time
    if (timeInPhase < 5) return { action: 'continue' }

    // Check if agent decided to switch
    const agentAction = this.actions.get(intersection.id)
    if (agentAction === 1) {
      this.actions.delete(intersection.id) // consume the action
      return { action: 'next-phase' }
    }

    // Default fixed timing fallback
    if (timeInPhase >= currentPhase.duration) return { action: 'next-phase' }
    return { action: 'continue' }
  }

  reset(): void { this.actions.clear() }
}

async function runEpisode(
  agent: DQNAgent,
  seed: number,
  greedy: boolean
): Promise<{ totalReward: number; engine: SimulationEngine; losses: number[] }> {
  const controller = new ExternalController()
  const engine = new SimulationEngine(controller, SIMULATION_CONFIG, CITY_CONFIG, seed)
  const losses: number[] = []

  let totalReward = 0
  const prevStates = new Map<string, number[]>()
  const prevActions = new Map<string, number>()

  for (let step = 0; step < (greedy ? EVAL_STEPS : STEPS_PER_EPISODE); step++) {
    engine.tick(DT)

    if (step > 0 && step % DECISION_INTERVAL === 0) {
      for (const intersection of engine.intersections) {
        const phase = intersection.trafficLight.phases[intersection.trafficLight.currentPhaseIndex]
        if (phase.nsLight === 'yellow' || phase.ewLight === 'yellow' || phase.pedestrianActive) continue
        if (intersection.trafficLight.timeInPhase < 5) continue

        const state = encodeIntersectionState(intersection)
        const reward = computeReward(intersection)
        totalReward += reward

        // Store experience
        const prev = prevStates.get(intersection.id)
        const prevAct = prevActions.get(intersection.id)
        if (!greedy && prev !== undefined && prevAct !== undefined) {
          agent.remember(prev, prevAct, reward, state, false)
        }

        // Choose action
        const action = greedy ? agent.actGreedy(state) : agent.act(state)
        prevStates.set(intersection.id, state)
        prevActions.set(intersection.id, action)

        // Set action for controller to execute
        controller.actions.set(intersection.id, action)
      }

      // Train
      if (!greedy) {
        const loss = await agent.replay()
        if (loss > 0) losses.push(loss)
      }
    }
  }

  return { totalReward, engine, losses }
}

async function train() {
  await tf.ready()
  console.log(`Backend: ${tf.getBackend()}`)
  console.log('=== DQN Traffic Light Training ===')
  console.log(`Episodes: ${EPISODES}, Steps/ep: ${STEPS_PER_EPISODE}, DecisionInterval: ${DECISION_INTERVAL}`)
  console.log('')

  // Baseline
  const baselineEngine = new SimulationEngine(new FixedTimingController(), SIMULATION_CONFIG, CITY_CONFIG, 42)
  for (let i = 0; i < EVAL_STEPS; i++) baselineEngine.tick(DT)
  const baseline = baselineEngine.getMetrics()
  console.log(`Baseline: stopped=${baseline.avgStoppedTime.toFixed(1)}s, throughput=${baseline.throughput.toFixed(1)}/min`)
  console.log('')

  const agent = new DQNAgent(1.0)
  let bestScore = -Infinity

  for (let ep = 0; ep < EPISODES; ep++) {
    const seed = 1000 + (ep % 30)
    const { totalReward, losses } = await runEpisode(agent, seed, false)

    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b) / losses.length : 0

    if ((ep + 1) % 5 === 0) {
      console.log(
        `Ep ${String(ep + 1).padStart(3)}: ` +
        `reward=${totalReward.toFixed(0).padStart(7)}, ` +
        `loss=${avgLoss.toFixed(4).padStart(8)}, ` +
        `eps=${agent.getEpsilon().toFixed(3)}`
      )
    }

    if ((ep + 1) % EVAL_EVERY === 0) {
      // Evaluate on 3 different seeds and average
      let totalStopped = 0, totalThroughput = 0
      for (const evalSeed of [42, 123, 777]) {
        const { engine } = await runEpisode(agent, evalSeed, true)
        const m = engine.getMetrics()
        totalStopped += m.avgStoppedTime
        totalThroughput += m.throughput
      }
      const avgStopped = totalStopped / 3
      const avgThroughput = totalThroughput / 3

      const improvement = ((baseline.avgStoppedTime - avgStopped) / baseline.avgStoppedTime * 100)
      console.log(
        `  EVAL: stopped=${avgStopped.toFixed(1)}s (${improvement > 0 ? '+' : ''}${improvement.toFixed(0)}%), ` +
        `throughput=${avgThroughput.toFixed(1)}/min`
      )

      const score = -avgStopped + avgThroughput * 0.1
      if (score > bestScore) {
        bestScore = score
        const weights = await agent.exportWeights()
        const outPath = path.join(import.meta.dirname, '..', 'public', 'dqn-weights.json')
        fs.writeFileSync(outPath, JSON.stringify(weights))
        console.log(`  NEW BEST! saved`)
      }
    }
  }

  // Final eval
  const { engine: finalEngine } = await runEpisode(agent, 42, true)
  const final = finalEngine.getMetrics()
  const improvement = ((baseline.avgStoppedTime - final.avgStoppedTime) / baseline.avgStoppedTime * 100)

  console.log(`\n=== RESULTS ===`)
  console.log(`Baseline: stopped=${baseline.avgStoppedTime.toFixed(1)}s, throughput=${baseline.throughput.toFixed(1)}/min`)
  console.log(`DQN:      stopped=${final.avgStoppedTime.toFixed(1)}s, throughput=${final.throughput.toFixed(1)}/min`)
  console.log(`Improvement: ${improvement.toFixed(1)}%`)

  // Save final
  const weights = await agent.exportWeights()
  const outPath = path.join(import.meta.dirname, '..', 'public', 'dqn-weights.json')
  fs.writeFileSync(outPath, JSON.stringify(weights))
  console.log(`Weights saved to ${outPath}`)

  agent.dispose()
}

train().catch(console.error)
