import type { WorldPoint } from '../types/map'

export function toDisplayCoordinates(
  point: WorldPoint,
  worldWidth: number,
  worldHeight: number,
): WorldPoint {
  const clampedX = Math.min(Math.max(point.x, 0), worldWidth)
  const bottomOriginY = worldHeight - point.y
  const clampedY = Math.min(Math.max(bottomOriginY, 0), worldHeight)

  return {
    x: Math.round(clampedX),
    y: Math.round(clampedY),
  }
}

