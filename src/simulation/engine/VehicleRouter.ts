import type { GridPosition, CityConfig } from '../core/types'
import { SeededRandom } from '../core/SeededRandom'

// Simple BFS pathfinding on the grid (all edges weight 1)
export function findRoute(
  from: GridPosition,
  to: GridPosition,
  config: CityConfig
): GridPosition[] {
  if (from.row === to.row && from.col === to.col) return [from]

  const key = (p: GridPosition) => `${p.row},${p.col}`
  const queue: GridPosition[] = [from]
  const cameFrom = new Map<string, GridPosition>()
  cameFrom.set(key(from), from)

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.row === to.row && current.col === to.col) break

    const neighbors = getNeighbors(current, config)
    for (const n of neighbors) {
      const k = key(n)
      if (!cameFrom.has(k)) {
        cameFrom.set(k, current)
        queue.push(n)
      }
    }
  }

  // Reconstruct path
  const path: GridPosition[] = []
  let current = to
  const toKey = key(to)
  if (!cameFrom.has(toKey)) return [from] // unreachable

  while (!(current.row === from.row && current.col === from.col)) {
    path.unshift(current)
    current = cameFrom.get(key(current))!
  }
  path.unshift(from)
  return path
}

function getNeighbors(pos: GridPosition, config: CityConfig): GridPosition[] {
  const neighbors: GridPosition[] = []
  if (pos.row > 0) neighbors.push({ row: pos.row - 1, col: pos.col })
  if (pos.row < config.gridRows - 1) neighbors.push({ row: pos.row + 1, col: pos.col })
  if (pos.col > 0) neighbors.push({ row: pos.row, col: pos.col - 1 })
  if (pos.col < config.gridCols - 1) neighbors.push({ row: pos.row, col: pos.col + 1 })
  return neighbors
}

export function generateRandomRoute(
  rng: SeededRandom,
  config: CityConfig
): { from: GridPosition; to: GridPosition; route: GridPosition[] } {
  // Spawn on edges
  const edges: GridPosition[] = []
  for (let col = 0; col < config.gridCols; col++) {
    edges.push({ row: 0, col })
    edges.push({ row: config.gridRows - 1, col })
  }
  for (let row = 1; row < config.gridRows - 1; row++) {
    edges.push({ row, col: 0 })
    edges.push({ row, col: config.gridCols - 1 })
  }

  const from = rng.pick(edges)
  // Pick destination on a different edge
  let to: GridPosition
  do {
    to = rng.pick(edges)
  } while (to.row === from.row && to.col === from.col)

  const route = findRoute(from, to, config)
  return { from, to, route }
}
