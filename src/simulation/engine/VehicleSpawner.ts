import type { Vehicle, CityConfig, Intersection, Direction } from '../core/types'
import { SeededRandom } from '../core/SeededRandom'
import { generateRandomRoute } from './VehicleRouter'
import { getNeighborDirection } from '../config/defaultCity'

const VEHICLE_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
  '#E11D48', '#7C3AED', '#0EA5E9', '#D97706', '#059669',
]

let vehicleCounter = 0

export class VehicleSpawner {
  private rng: SeededRandom
  private config: CityConfig
  private accumulator = 0

  constructor(rng: SeededRandom, config: CityConfig) {
    this.rng = rng
    this.config = config
  }

  reset(): void {
    this.accumulator = 0
    vehicleCounter = 0
  }

  maybeSpawn(
    dt: number,
    spawnRate: number,
    maxVehicles: number,
    activeCount: number,
    intersections: Intersection[],
    vehicleMaxSpeed: number
  ): Vehicle[] {
    const spawned: Vehicle[] = []
    this.accumulator += dt * spawnRate

    while (this.accumulator >= 1 && activeCount + spawned.length < maxVehicles) {
      this.accumulator -= 1
      const { from, route } = generateRandomRoute(this.rng, this.config)

      if (route.length < 2) continue

      const startIntersection = intersections.find(
        i => i.gridPos.row === from.row && i.gridPos.col === from.col
      )
      if (!startIntersection) continue

      const nextPos = route[1]
      const direction: Direction = getNeighborDirection(from, nextPos)

      const vehicle: Vehicle = {
        id: `v-${vehicleCounter++}`,
        worldPos: { ...startIntersection.worldPos },
        prevWorldPos: { ...startIntersection.worldPos },
        direction,
        speed: vehicleMaxSpeed * 0.5,
        maxSpeed: vehicleMaxSpeed * (0.8 + this.rng.next() * 0.4),
        state: 'moving',
        route,
        currentRouteIndex: 0,
        currentRoadProgress: 0,
        color: this.rng.pick(VEHICLE_COLORS),
        spawnTime: 0,
        totalStoppedTime: 0,
        totalDistance: 0,
        completed: false,
      }
      spawned.push(vehicle)
    }

    return spawned
  }
}
