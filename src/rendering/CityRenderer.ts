import type { CityConfig, Intersection, Road } from '../simulation/core/types'

export type CityTheme = 'default' | 'ai'

interface CityColors {
  background: string
  road: string
  roadLine: string
  avenue: string
  sidewalk: string
  building: string
  buildingLight: string
  intersection: string
  windowColor: string
}

const THEMES: Record<CityTheme, CityColors> = {
  default: {
    background: '#0f0f23',
    road: '#363652',
    roadLine: '#4a4a6a',
    avenue: '#3d3d5a',
    sidewalk: '#252540',
    building: '#16213e',
    buildingLight: '#1a1a3e',
    intersection: '#363652',
    windowColor: 'rgba(255, 220, 100,',
  },
  ai: {
    background: '#0a1628',
    road: '#2a3f52',
    roadLine: '#3a5a6a',
    avenue: '#304858',
    sidewalk: '#1a2d3d',
    building: '#0e2a3e',
    buildingLight: '#12303e',
    intersection: '#2a3f52',
    windowColor: 'rgba(100, 220, 255,',
  },
}

export class CityRenderer {
  private offscreenCanvas: OffscreenCanvas | null = null
  private cached = false
  private colors: CityColors

  constructor(
    private config: CityConfig,
    private intersections: Intersection[],
    private roads: Road[],
    theme: CityTheme = 'default'
  ) {
    this.colors = THEMES[theme]
  }

  invalidateCache(): void {
    this.cached = false
  }

  update(intersections: Intersection[], roads: Road[]): void {
    this.intersections = intersections
    this.roads = roads
    this.cached = false
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Use offscreen cache for static city
    if (!this.cached || !this.offscreenCanvas) {
      this.offscreenCanvas = new OffscreenCanvas(width, height)
      const offCtx = this.offscreenCanvas.getContext('2d')!
      this.drawCity(offCtx, width, height)
      this.cached = true
    }
    ctx.drawImage(this.offscreenCanvas, 0, 0)
  }

  private drawCity(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
    // Background
    ctx.fillStyle = this.colors.background
    ctx.fillRect(0, 0, width, height)

    // Draw buildings (blocks between roads)
    this.drawBuildings(ctx)

    // Draw edge roads (extending to canvas borders)
    this.drawEdgeRoads(ctx, width, height)

    // Draw roads
    for (const road of this.roads) {
      this.drawRoad(ctx, road)
    }

    // Draw intersections
    for (const intersection of this.intersections) {
      this.drawIntersectionBox(ctx, intersection)
    }
  }

  private drawBuildings(ctx: OffscreenCanvasRenderingContext2D): void {
    const { blockSize, roadWidth, gridRows, gridCols } = this.config
    const padding = roadWidth + 20
    const halfRoad = roadWidth / 2
    const buildingPadding = 4

    for (let row = 0; row < gridRows - 1; row++) {
      for (let col = 0; col < gridCols - 1; col++) {
        const x = padding + col * blockSize + halfRoad + buildingPadding
        const y = padding + row * blockSize + halfRoad + buildingPadding
        const w = blockSize - roadWidth - buildingPadding * 2
        const h = blockSize - roadWidth - buildingPadding * 2

        ctx.fillStyle = this.colors.building
        ctx.fillRect(x, y, w, h)

        // Some lit windows
        ctx.fillStyle = this.colors.buildingLight
        const windowSize = 3
        const windowGap = 8
        for (let wx = x + 6; wx < x + w - 6; wx += windowGap) {
          for (let wy = y + 6; wy < y + h - 6; wy += windowGap) {
            if (Math.random() > 0.6) {
              ctx.fillStyle = `${this.colors.windowColor} ${0.2 + Math.random() * 0.3})`
              ctx.fillRect(wx, wy, windowSize, windowSize)
            }
          }
        }
      }
    }
  }

  private drawRoad(ctx: OffscreenCanvasRenderingContext2D, road: Road): void {
    const { blockSize, roadWidth } = this.config
    const padding = roadWidth + 20
    const halfRoad = roadWidth / 2
    const isAvenue = road.roadType === 'avenue'
    const width = isAvenue ? roadWidth + 4 : roadWidth

    const fromX = padding + road.from.col * blockSize
    const fromY = padding + road.from.row * blockSize
    const toX = padding + road.to.col * blockSize
    const toY = padding + road.to.row * blockSize

    ctx.fillStyle = isAvenue ? this.colors.avenue : this.colors.road

    if (road.direction === 'east' || road.direction === 'west') {
      const y = fromY - halfRoad
      const x = Math.min(fromX, toX)
      ctx.fillRect(x, y, blockSize, width)
      // Center line
      ctx.strokeStyle = this.colors.roadLine
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(x, fromY)
      ctx.lineTo(x + blockSize, fromY)
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      const x = fromX - halfRoad
      const y = Math.min(fromY, toY)
      ctx.fillRect(x, y, width, blockSize)
      // Center line
      ctx.strokeStyle = this.colors.roadLine
      ctx.lineWidth = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(fromX, y)
      ctx.lineTo(fromX, y + blockSize)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  private drawIntersectionBox(ctx: OffscreenCanvasRenderingContext2D, intersection: Intersection): void {
    const { roadWidth } = this.config
    const halfRoad = roadWidth / 2 + 2
    const { x, y } = intersection.worldPos

    ctx.fillStyle = this.colors.intersection
    ctx.fillRect(x - halfRoad, y - halfRoad, halfRoad * 2, halfRoad * 2)

    // Pedestrian crossing marks
    if (intersection.hasPedestrianCrossing) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      for (let i = -halfRoad + 2; i < halfRoad - 2; i += 4) {
        ctx.fillRect(x + i, y - halfRoad - 3, 2, 3)
        ctx.fillRect(x + i, y + halfRoad, 2, 3)
        ctx.fillRect(x - halfRoad - 3, y + i, 3, 2)
        ctx.fillRect(x + halfRoad, y + i, 3, 2)
      }
    }
  }

  private drawEdgeRoads(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number): void {
    const { blockSize, roadWidth, gridRows, gridCols, avenueRows, avenueCols } = this.config
    const padding = roadWidth + 20
    const halfRoad = roadWidth / 2

    // Horizontal edge roads
    for (let row = 0; row < gridRows; row++) {
      const y = padding + row * blockSize
      const isAvenue = avenueRows.includes(row)
      ctx.fillStyle = isAvenue ? this.colors.avenue : this.colors.road
      const w = isAvenue ? roadWidth + 4 : roadWidth
      // Left edge
      ctx.fillRect(0, y - halfRoad, padding, w)
      // Right edge
      const rightX = padding + (gridCols - 1) * blockSize
      ctx.fillRect(rightX, y - halfRoad, width - rightX, w)
    }

    // Vertical edge roads
    for (let col = 0; col < gridCols; col++) {
      const x = padding + col * blockSize
      const isAvenue = avenueCols.includes(col)
      ctx.fillStyle = isAvenue ? this.colors.avenue : this.colors.road
      const w = isAvenue ? roadWidth + 4 : roadWidth
      // Top edge
      ctx.fillRect(x - halfRoad, 0, w, padding)
      // Bottom edge
      const bottomY = padding + (gridRows - 1) * blockSize
      ctx.fillRect(x - halfRoad, bottomY, w, height - bottomY)
    }
  }

  getCanvasSize(): { width: number; height: number } {
    const { gridRows, gridCols, blockSize, roadWidth } = this.config
    const padding = roadWidth + 20
    return {
      width: padding * 2 + (gridCols - 1) * blockSize,
      height: padding * 2 + (gridRows - 1) * blockSize,
    }
  }
}
