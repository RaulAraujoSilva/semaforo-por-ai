// === Geometry ===
export type Direction = 'north' | 'south' | 'east' | 'west'
export type RoadType = 'avenue' | 'street'
export type LightColor = 'green' | 'yellow' | 'red'
export type VehicleState = 'moving' | 'stopped' | 'accelerating' | 'decelerating'

export interface GridPosition {
  row: number
  col: number
}

export interface WorldPosition {
  x: number
  y: number
}

// === Traffic Light ===
export interface TrafficLightPhase {
  nsLight: LightColor
  ewLight: LightColor
  duration: number
  pedestrianActive: boolean
}

export interface TrafficLightState {
  phases: TrafficLightPhase[]
  currentPhaseIndex: number
  timeInPhase: number
  cycleCount: number
}

// === Intersection ===
export interface Intersection {
  id: string
  gridPos: GridPosition
  worldPos: WorldPosition
  trafficLight: TrafficLightState
  queues: Record<Direction, string[]>  // vehicle IDs per direction
  hasPedestrianCrossing: boolean
  nsRoadType: RoadType
  ewRoadType: RoadType
}

// === Road ===
export interface Road {
  id: string
  from: GridPosition
  to: GridPosition
  direction: Direction
  roadType: RoadType
  length: number
}

// === Vehicle ===
export interface Vehicle {
  id: string
  worldPos: WorldPosition
  prevWorldPos: WorldPosition
  direction: Direction
  speed: number
  maxSpeed: number
  state: VehicleState
  route: GridPosition[]
  currentRouteIndex: number
  currentRoadProgress: number  // 0 to 1 along current road segment
  color: string
  spawnTime: number
  totalStoppedTime: number
  totalDistance: number
  completed: boolean
}

// === Controller Interface (Strategy Pattern) ===
export interface IntersectionState {
  intersection: Intersection
  queueLengths: Record<Direction, number>
  currentPhase: TrafficLightPhase
  timeInPhase: number
  recentThroughput: Record<Direction, number>
  avgWaitTime: Record<Direction, number>
  neighborStates?: Map<Direction, IntersectionState>
}

export interface PhaseDecision {
  action: 'continue' | 'next-phase' | 'extend'
  extendBy?: number
  newPhaseDurations?: number[]
}

export interface TrafficController {
  name: string
  decide(state: IntersectionState): PhaseDecision
  reset(): void
}

// === Metrics ===
export interface SimulationMetrics {
  tick: number
  simTime: number
  avgSpeed: number
  avgStoppedTime: number
  throughput: number
  totalVehiclesActive: number
  totalVehiclesCompleted: number
  totalVehiclesSpawned: number
}

// === City Config ===
export interface CityConfig {
  gridRows: number
  gridCols: number
  blockSize: number
  roadWidth: number
  avenueRows: number[]
  avenueCols: number[]
  pedestrianIntersections: Array<[number, number]>
}

// === Simulation Config ===
export interface SimulationConfig {
  tickRate: number           // ticks per second
  spawnRate: number          // vehicles per second
  maxVehicles: number
  vehicleMaxSpeed: number    // pixels per second
  vehicleAcceleration: number
  vehicleDeceleration: number
  vehicleLength: number      // pixels
  minFollowDistance: number   // pixels
  yellowDuration: number     // seconds
  pedestrianDuration: number // seconds
  avenueGreenDuration: number
  streetGreenDuration: number
}
