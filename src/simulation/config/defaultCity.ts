import type { CityConfig, Intersection, Road, Direction, RoadType, TrafficLightPhase } from '../core/types'
import { SIMULATION_CONFIG } from './simulationConfig'

function createPhases(nsType: RoadType, ewType: RoadType, hasPedestrian: boolean): TrafficLightPhase[] {
  const cfg = SIMULATION_CONFIG
  const nsGreen = nsType === 'avenue' ? cfg.avenueGreenDuration : cfg.streetGreenDuration
  const ewGreen = ewType === 'avenue' ? cfg.avenueGreenDuration : cfg.streetGreenDuration

  const phases: TrafficLightPhase[] = [
    { nsLight: 'green', ewLight: 'red', duration: nsGreen, pedestrianActive: false },
    { nsLight: 'yellow', ewLight: 'red', duration: cfg.yellowDuration, pedestrianActive: false },
    { nsLight: 'red', ewLight: 'green', duration: ewGreen, pedestrianActive: false },
    { nsLight: 'red', ewLight: 'yellow', duration: cfg.yellowDuration, pedestrianActive: false },
  ]

  if (hasPedestrian) {
    phases.push({ nsLight: 'red', ewLight: 'red', duration: cfg.pedestrianDuration, pedestrianActive: true })
  }

  return phases
}

export function createCity(config: CityConfig): { intersections: Intersection[], roads: Road[] } {
  const intersections: Intersection[] = []
  const roads: Road[] = []
  const padding = config.roadWidth + 20

  for (let row = 0; row < config.gridRows; row++) {
    for (let col = 0; col < config.gridCols; col++) {
      const nsType: RoadType = config.avenueCols.includes(col) ? 'avenue' : 'street'
      const ewType: RoadType = config.avenueRows.includes(row) ? 'avenue' : 'street'
      const hasPedestrian = config.pedestrianIntersections.some(([r, c]) => r === row && c === col)

      const intersection: Intersection = {
        id: `i-${row}-${col}`,
        gridPos: { row, col },
        worldPos: {
          x: padding + col * config.blockSize,
          y: padding + row * config.blockSize,
        },
        trafficLight: {
          phases: createPhases(nsType, ewType, hasPedestrian),
          currentPhaseIndex: 0,
          timeInPhase: 0,
          cycleCount: 0,
        },
        queues: { north: [], south: [], east: [], west: [] },
        hasPedestrianCrossing: hasPedestrian,
        nsRoadType: nsType,
        ewRoadType: ewType,
      }

      intersections.push(intersection)

      // Create roads to neighbors (east and south to avoid duplicates)
      if (col < config.gridCols - 1) {
        const roadType: RoadType = config.avenueRows.includes(row) ? 'avenue' : 'street'
        roads.push({
          id: `r-${row}-${col}-east`,
          from: { row, col },
          to: { row, col: col + 1 },
          direction: 'east',
          roadType,
          length: config.blockSize,
        })
        roads.push({
          id: `r-${row}-${col + 1}-west`,
          from: { row, col: col + 1 },
          to: { row, col },
          direction: 'west',
          roadType,
          length: config.blockSize,
        })
      }
      if (row < config.gridRows - 1) {
        const roadType: RoadType = config.avenueCols.includes(col) ? 'avenue' : 'street'
        roads.push({
          id: `r-${row}-${col}-south`,
          from: { row, col },
          to: { row: row + 1, col },
          direction: 'south',
          roadType,
          length: config.blockSize,
        })
        roads.push({
          id: `r-${row + 1}-${col}-north`,
          from: { row: row + 1, col },
          to: { row, col },
          direction: 'north',
          roadType,
          length: config.blockSize,
        })
      }
    }
  }

  return { intersections, roads }
}

export function getIntersection(intersections: Intersection[], row: number, col: number): Intersection | undefined {
  return intersections.find(i => i.gridPos.row === row && i.gridPos.col === col)
}

export function getNeighborDirection(from: { row: number; col: number }, to: { row: number; col: number }): Direction {
  if (to.row < from.row) return 'north'
  if (to.row > from.row) return 'south'
  if (to.col > from.col) return 'east'
  return 'west'
}
