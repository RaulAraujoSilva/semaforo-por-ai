import type {
  Vehicle, Intersection, Road, CityConfig, SimulationConfig,
  TrafficController, Direction, SimulationMetrics, LightColor,
} from '../core/types'
import { SeededRandom } from '../core/SeededRandom'
import { createCity, getNeighborDirection } from '../config/defaultCity'
import { VehicleSpawner } from './VehicleSpawner'

const LANE_OFFSET = 5

export class SimulationEngine {
  intersections: Intersection[]
  roads: Road[]
  vehicles: Vehicle[] = []
  completedVehicles: Vehicle[] = []
  controller: TrafficController
  config: SimulationConfig
  cityConfig: CityConfig
  spawner: VehicleSpawner

  simTime = 0
  tickCount = 0
  private intersectionMap = new Map<string, Intersection>()

  constructor(
    controller: TrafficController,
    config: SimulationConfig,
    cityConfig: CityConfig,
    seed: number
  ) {
    this.controller = controller
    this.config = config
    this.cityConfig = cityConfig

    const rng = new SeededRandom(seed)
    const city = createCity(cityConfig)
    this.intersections = city.intersections
    this.roads = city.roads
    this.spawner = new VehicleSpawner(rng, cityConfig)

    for (const i of this.intersections) {
      this.intersectionMap.set(`${i.gridPos.row},${i.gridPos.col}`, i)
    }
  }

  reset(seed: number): void {
    this.simTime = 0
    this.tickCount = 0
    this.vehicles = []
    this.completedVehicles = []

    const rng = new SeededRandom(seed)
    const city = createCity(this.cityConfig)
    this.intersections = city.intersections
    this.roads = city.roads
    this.spawner = new VehicleSpawner(rng, this.cityConfig)
    this.controller.reset()

    this.intersectionMap.clear()
    for (const i of this.intersections) {
      this.intersectionMap.set(`${i.gridPos.row},${i.gridPos.col}`, i)
    }
  }

  getIntersectionAt(row: number, col: number): Intersection | undefined {
    return this.intersectionMap.get(`${row},${col}`)
  }

  tick(dt: number): void {
    this.simTime += dt
    this.tickCount++

    // 1. Spawn vehicles
    const newVehicles = this.spawner.maybeSpawn(
      dt, this.config.spawnRate, this.config.maxVehicles,
      this.vehicles.length, this.intersections, this.config.vehicleMaxSpeed
    )
    for (const v of newVehicles) {
      v.spawnTime = this.simTime
      this.vehicles.push(v)
    }

    // 2. Reset queues, update vehicles (populates queues)
    for (const intersection of this.intersections) {
      intersection.queues = { north: [], south: [], east: [], west: [] }
    }
    this.updateVehicles(dt)

    // 3. Count approaching vehicles for each intersection (better queue data)
    this.countApproachingVehicles()

    // 4. Update traffic lights (reads queue data from step 3)
    this.updateTrafficLights(dt)

    // 5. Remove completed vehicles
    const completed = this.vehicles.filter(v => v.completed)
    this.completedVehicles.push(...completed)
    this.vehicles = this.vehicles.filter(v => !v.completed)
  }

  private updateTrafficLights(dt: number): void {
    for (const intersection of this.intersections) {
      const tl = intersection.trafficLight
      tl.timeInPhase += dt
      const currentPhase = tl.phases[tl.currentPhaseIndex]

      const queueLengths = {
        north: intersection.queues.north.length,
        south: intersection.queues.south.length,
        east: intersection.queues.east.length,
        west: intersection.queues.west.length,
      }

      const decision = this.controller.decide({
        intersection,
        queueLengths,
        currentPhase,
        timeInPhase: tl.timeInPhase,
        recentThroughput: { north: 0, south: 0, east: 0, west: 0 },
        avgWaitTime: { north: 0, south: 0, east: 0, west: 0 },
      })

      switch (decision.action) {
        case 'next-phase':
          tl.currentPhaseIndex = (tl.currentPhaseIndex + 1) % tl.phases.length
          tl.timeInPhase = 0
          if (tl.currentPhaseIndex === 0) tl.cycleCount++
          break
        case 'extend':
        case 'continue':
          break
      }
    }
  }

  private countApproachingVehicles(): void {
    // Count all vehicles approaching each intersection (not just stopped ones)
    for (const intersection of this.intersections) {
      intersection.queues = { north: [], south: [], east: [], west: [] }
    }

    for (const vehicle of this.vehicles) {
      if (vehicle.currentRouteIndex >= vehicle.route.length - 1) continue

      const nextGridPos = vehicle.route[vehicle.currentRouteIndex + 1]
      const nextIntersection = this.getIntersectionAt(nextGridPos.row, nextGridPos.col)
      if (!nextIntersection) continue

      // Only count if vehicle is on the approaching road (progress > 0.3)
      if (vehicle.currentRoadProgress > 0.3 || vehicle.state === 'stopped' || vehicle.state === 'decelerating') {
        const queueDir = this.oppositeDirection(vehicle.direction)
        nextIntersection.queues[queueDir].push(vehicle.id)
      }
    }
  }

  private updateVehicles(dt: number): void {
    for (const vehicle of this.vehicles) {
      vehicle.prevWorldPos = { ...vehicle.worldPos }
      this.updateVehicle(vehicle, dt)
    }
  }

  private updateVehicle(vehicle: Vehicle, dt: number): void {
    if (vehicle.currentRouteIndex >= vehicle.route.length - 1) {
      vehicle.completed = true
      return
    }

    const currentGridPos = vehicle.route[vehicle.currentRouteIndex]
    const nextGridPos = vehicle.route[vehicle.currentRouteIndex + 1]
    const currentIntersection = this.getIntersectionAt(currentGridPos.row, currentGridPos.col)
    const nextIntersection = this.getIntersectionAt(nextGridPos.row, nextGridPos.col)

    if (!currentIntersection || !nextIntersection) {
      vehicle.completed = true
      return
    }

    const direction = getNeighborDirection(currentGridPos, nextGridPos)
    vehicle.direction = direction

    // Calculate the lane position (center of road + offset for direction)
    const lanePos = this.getLaneWorldPos(vehicle)

    // Determine stopping constraints
    const stopDistance = this.config.vehicleLength + this.config.minFollowDistance
    let targetSpeed = vehicle.maxSpeed

    // 1. Check traffic light at next intersection
    const lightIsRed = this.shouldStopAtLight(nextIntersection, direction)
    if (lightIsRed) {
      // Distance from vehicle to the next intersection
      const distToIntersection = (1 - vehicle.currentRoadProgress) * this.cityConfig.blockSize
      if (distToIntersection < this.cityConfig.blockSize * 0.4) {
        // Close enough - stop
        targetSpeed = 0
        // Register in queue
        const queueDir = this.oppositeDirection(direction)
        nextIntersection.queues[queueDir].push(vehicle.id)
      } else if (distToIntersection < this.cityConfig.blockSize * 0.6) {
        // Approaching - slow down
        targetSpeed = vehicle.maxSpeed * 0.3
      }
    }

    // 2. Check for car ahead (collision avoidance - the key part!)
    const carAhead = this.findCarAhead(vehicle, lanePos)
    if (carAhead) {
      const dist = this.directionalDistance(vehicle.worldPos, carAhead.worldPos, direction)
      if (dist < stopDistance) {
        // Too close - match speed of car ahead or stop
        targetSpeed = 0
      } else if (dist < stopDistance * 3) {
        // Getting close - slow down proportionally
        const ratio = (dist - stopDistance) / (stopDistance * 2)
        targetSpeed = Math.min(targetSpeed, carAhead.speed + ratio * vehicle.maxSpeed * 0.5)
      }
    }

    // 3. Apply acceleration/deceleration towards target speed
    if (vehicle.speed > targetSpeed + 1) {
      vehicle.speed = Math.max(targetSpeed, vehicle.speed - this.config.vehicleDeceleration * dt)
      vehicle.state = vehicle.speed < 1 ? 'stopped' : 'decelerating'
    } else if (vehicle.speed < targetSpeed - 1) {
      vehicle.speed = Math.min(targetSpeed, vehicle.speed + this.config.vehicleAcceleration * dt)
      vehicle.state = 'accelerating'
    } else {
      vehicle.speed = targetSpeed
      vehicle.state = vehicle.speed < 1 ? 'stopped' : 'moving'
    }

    // Track stopped time
    if (vehicle.speed < 1) {
      vehicle.speed = 0
      vehicle.totalStoppedTime += dt
    }

    // 4. Move along road
    if (vehicle.speed > 0) {
      const moveDistance = vehicle.speed * dt
      vehicle.totalDistance += moveDistance
      vehicle.currentRoadProgress += moveDistance / this.cityConfig.blockSize

      // Reached next intersection
      if (vehicle.currentRoadProgress >= 1) {
        vehicle.currentRoadProgress -= 1
        vehicle.currentRouteIndex++
        if (vehicle.currentRouteIndex >= vehicle.route.length - 1) {
          vehicle.completed = true
          return
        }
      }
    }

    // 5. Update world position
    this.updateWorldPosition(vehicle)
  }

  private updateWorldPosition(vehicle: Vehicle): void {
    if (vehicle.currentRouteIndex >= vehicle.route.length - 1) return

    const fromPos = vehicle.route[vehicle.currentRouteIndex]
    const toPos = vehicle.route[vehicle.currentRouteIndex + 1]
    const fromIntersection = this.getIntersectionAt(fromPos.row, fromPos.col)
    const toIntersection = this.getIntersectionAt(toPos.row, toPos.col)

    if (!fromIntersection || !toIntersection) return

    const t = vehicle.currentRoadProgress
    vehicle.worldPos = {
      x: fromIntersection.worldPos.x + (toIntersection.worldPos.x - fromIntersection.worldPos.x) * t,
      y: fromIntersection.worldPos.y + (toIntersection.worldPos.y - fromIntersection.worldPos.y) * t,
    }
  }

  // Get the actual lane position in world coords (offset from road center)
  private getLaneWorldPos(vehicle: Vehicle): { x: number; y: number } {
    const { x, y } = vehicle.worldPos
    switch (vehicle.direction) {
      case 'north': return { x: x - LANE_OFFSET, y }
      case 'south': return { x: x + LANE_OFFSET, y }
      case 'east': return { x, y: y + LANE_OFFSET }
      case 'west': return { x, y: y - LANE_OFFSET }
    }
  }

  // Find the nearest car ahead in the same lane
  private findCarAhead(vehicle: Vehicle, _lanePos: { x: number; y: number }): Vehicle | null {
    let closest: Vehicle | null = null
    let minDist = Infinity
    const dir = vehicle.direction
    const isHorizontal = dir === 'east' || dir === 'west'

    for (const other of this.vehicles) {
      if (other.id === vehicle.id) continue

      // Must be going in the same direction
      if (other.direction !== dir) continue

      // Must be in the same lane (close on the perpendicular axis)
      if (isHorizontal) {
        if (Math.abs(vehicle.worldPos.y - other.worldPos.y) > this.cityConfig.roadWidth * 0.6) continue
      } else {
        if (Math.abs(vehicle.worldPos.x - other.worldPos.x) > this.cityConfig.roadWidth * 0.6) continue
      }

      // Must be ahead
      const dist = this.directionalDistance(vehicle.worldPos, other.worldPos, dir)
      if (dist > 0 && dist < minDist) {
        minDist = dist
        closest = other
      }
    }
    return closest
  }

  // Signed distance in the direction of travel (positive = ahead)
  private directionalDistance(
    from: { x: number; y: number },
    to: { x: number; y: number },
    dir: Direction
  ): number {
    switch (dir) {
      case 'north': return from.y - to.y
      case 'south': return to.y - from.y
      case 'east': return to.x - from.x
      case 'west': return from.x - to.x
    }
  }

  private shouldStopAtLight(next: Intersection, approachDir: Direction): boolean {
    const tl = next.trafficLight
    const phase = tl.phases[tl.currentPhaseIndex]

    if (phase.pedestrianActive) return true

    const light = this.getLightForDirection(phase, approachDir)
    return light === 'red' || light === 'yellow'
  }

  private getLightForDirection(phase: { nsLight: LightColor; ewLight: LightColor }, dir: Direction): LightColor {
    if (dir === 'north' || dir === 'south') return phase.nsLight
    return phase.ewLight
  }

  private oppositeDirection(dir: Direction): Direction {
    const map: Record<Direction, Direction> = {
      north: 'south', south: 'north', east: 'west', west: 'east'
    }
    return map[dir]
  }

  getMetrics(): SimulationMetrics {
    const allCompleted = this.completedVehicles
    const avgSpeed = allCompleted.length > 0
      ? allCompleted.reduce((sum, v) => sum + (v.totalDistance / Math.max(0.01, this.simTime - v.spawnTime)), 0) / allCompleted.length
      : 0

    const allVehicles = [...this.vehicles, ...allCompleted]
    const avgStoppedTime = allVehicles.length > 0
      ? allVehicles.reduce((sum, v) => sum + v.totalStoppedTime, 0) / allVehicles.length
      : 0

    const throughput = this.simTime > 0
      ? (allCompleted.length / this.simTime) * 60
      : 0

    return {
      tick: this.tickCount,
      simTime: this.simTime,
      avgSpeed,
      avgStoppedTime,
      throughput,
      totalVehiclesActive: this.vehicles.length,
      totalVehiclesCompleted: allCompleted.length,
      totalVehiclesSpawned: this.vehicles.length + allCompleted.length,
    }
  }
}
