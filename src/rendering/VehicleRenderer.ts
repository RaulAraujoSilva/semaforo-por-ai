import type { Vehicle, Direction } from '../simulation/core/types'

const VEHICLE_WIDTH = 8
const VEHICLE_LENGTH = 12

export class VehicleRenderer {
  draw(ctx: CanvasRenderingContext2D, vehicles: Vehicle[]): void {
    for (const vehicle of vehicles) {
      this.drawVehicle(ctx, vehicle)
    }
  }

  private drawVehicle(ctx: CanvasRenderingContext2D, vehicle: Vehicle): void {
    const { x, y } = vehicle.worldPos
    const isVertical = vehicle.direction === 'north' || vehicle.direction === 'south'

    const w = isVertical ? VEHICLE_WIDTH : VEHICLE_LENGTH
    const h = isVertical ? VEHICLE_LENGTH : VEHICLE_WIDTH

    // Lane offset to avoid overlap with opposing traffic
    const laneOffset = this.getLaneOffset(vehicle.direction)

    const drawX = x - w / 2 + laneOffset.x
    const drawY = y - h / 2 + laneOffset.y

    // Vehicle body
    ctx.fillStyle = vehicle.color
    ctx.globalAlpha = vehicle.state === 'stopped' ? 0.9 : 1
    ctx.beginPath()
    ctx.roundRect(drawX, drawY, w, h, 2)
    ctx.fill()

    // Headlights
    ctx.fillStyle = 'rgba(255, 255, 200, 0.8)'
    const headlightSize = 2
    switch (vehicle.direction) {
      case 'north':
        ctx.fillRect(drawX + 1, drawY, headlightSize, headlightSize)
        ctx.fillRect(drawX + w - 3, drawY, headlightSize, headlightSize)
        break
      case 'south':
        ctx.fillRect(drawX + 1, drawY + h - 2, headlightSize, headlightSize)
        ctx.fillRect(drawX + w - 3, drawY + h - 2, headlightSize, headlightSize)
        break
      case 'east':
        ctx.fillRect(drawX + w - 2, drawY + 1, headlightSize, headlightSize)
        ctx.fillRect(drawX + w - 2, drawY + h - 3, headlightSize, headlightSize)
        break
      case 'west':
        ctx.fillRect(drawX, drawY + 1, headlightSize, headlightSize)
        ctx.fillRect(drawX, drawY + h - 3, headlightSize, headlightSize)
        break
    }

    // Brake lights when stopped
    if (vehicle.state === 'stopped' || vehicle.state === 'decelerating') {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'
      switch (vehicle.direction) {
        case 'north':
          ctx.fillRect(drawX + 1, drawY + h - 2, headlightSize, headlightSize)
          ctx.fillRect(drawX + w - 3, drawY + h - 2, headlightSize, headlightSize)
          break
        case 'south':
          ctx.fillRect(drawX + 1, drawY, headlightSize, headlightSize)
          ctx.fillRect(drawX + w - 3, drawY, headlightSize, headlightSize)
          break
        case 'east':
          ctx.fillRect(drawX, drawY + 1, headlightSize, headlightSize)
          ctx.fillRect(drawX, drawY + h - 3, headlightSize, headlightSize)
          break
        case 'west':
          ctx.fillRect(drawX + w - 2, drawY + 1, headlightSize, headlightSize)
          ctx.fillRect(drawX + w - 2, drawY + h - 3, headlightSize, headlightSize)
          break
      }
    }

    ctx.globalAlpha = 1
  }

  private getLaneOffset(direction: Direction): { x: number; y: number } {
    const offset = 5
    switch (direction) {
      case 'north': return { x: -offset, y: 0 }
      case 'south': return { x: offset, y: 0 }
      case 'east': return { x: 0, y: offset }
      case 'west': return { x: 0, y: -offset }
    }
  }
}
