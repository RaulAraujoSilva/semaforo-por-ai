import type { Intersection, LightColor } from '../simulation/core/types'

const LIGHT_COLORS: Record<LightColor, string> = {
  green: '#00C853',
  yellow: '#FFD600',
  red: '#FF1744',
}


export class TrafficLightRenderer {
  draw(ctx: CanvasRenderingContext2D, intersections: Intersection[]): void {
    for (const intersection of intersections) {
      this.drawTrafficLight(ctx, intersection)
    }
  }

  private drawTrafficLight(ctx: CanvasRenderingContext2D, intersection: Intersection): void {
    const { x, y } = intersection.worldPos
    const phase = intersection.trafficLight.phases[intersection.trafficLight.currentPhaseIndex]
    const offset = 18

    // NS lights (top and bottom of intersection)
    this.drawLightCircle(ctx, x, y - offset, phase.nsLight)
    this.drawLightCircle(ctx, x, y + offset, phase.nsLight)

    // EW lights (left and right)
    this.drawLightCircle(ctx, x - offset, y, phase.ewLight)
    this.drawLightCircle(ctx, x + offset, y, phase.ewLight)

    // Pedestrian indicator
    if (phase.pedestrianActive) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🚶', x, y)
    }
  }

  private drawLightCircle(ctx: CanvasRenderingContext2D, x: number, y: number, color: LightColor): void {
    const radius = 4

    // Glow effect
    ctx.shadowColor = LIGHT_COLORS[color]
    ctx.shadowBlur = 8

    // Background (housing)
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2)
    ctx.fill()

    // Light
    ctx.fillStyle = LIGHT_COLORS[color]
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
  }
}
