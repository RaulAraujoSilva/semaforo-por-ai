import type { SimulationConfig, CityConfig } from '../core/types'

export const SIMULATION_CONFIG: SimulationConfig = {
  tickRate: 60,
  spawnRate: 0.8,
  maxVehicles: 120,
  vehicleMaxSpeed: 80,
  vehicleAcceleration: 120,
  vehicleDeceleration: 200,
  vehicleLength: 12,
  minFollowDistance: 8,
  yellowDuration: 3,
  pedestrianDuration: 12,
  avenueGreenDuration: 30,
  streetGreenDuration: 20,
}

export const CITY_CONFIG: CityConfig = {
  gridRows: 4,
  gridCols: 5,
  blockSize: 120,
  roadWidth: 24,
  avenueRows: [1, 3],
  avenueCols: [1, 3],
  pedestrianIntersections: [[1, 1], [1, 3], [3, 1], [3, 3]],
}
