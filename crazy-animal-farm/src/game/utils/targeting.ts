import type { WorldPoint } from '../types/map'

export function getAttackTargetDistance(
  origin: WorldPoint,
  aimPoint: WorldPoint,
  target: WorldPoint,
  targetWidth: number,
  targetHeight: number,
  attackRange: number,
): number | null {
  const aimX = aimPoint.x - origin.x
  const aimY = aimPoint.y - origin.y
  const aimLength = Math.hypot(aimX, aimY)
  const normalizedAimX = aimLength > 0 ? aimX / aimLength : 1
  const normalizedAimY = aimLength > 0 ? aimY / aimLength : 0
  const offsetX = target.x - origin.x
  const offsetY = target.y - origin.y
  const distance = Math.hypot(offsetX, offsetY)
  const targetReach = Math.max(targetWidth, targetHeight) * 0.35

  if (distance > attackRange + targetReach) {
    return null
  }

  if (distance === 0) {
    return 0
  }

  const directionDot =
    (offsetX / distance) * normalizedAimX +
    (offsetY / distance) * normalizedAimY

  return directionDot >= 0.35 ? distance : null
}

export function getPathCollisionDistance(
  origin: WorldPoint,
  direction: WorldPoint,
  target: WorldPoint,
  collisionRadius: number,
  maximumDistance: number,
): number | null {
  const directionLength = Math.hypot(direction.x, direction.y)

  if (directionLength === 0) {
    return null
  }

  const normalizedX = direction.x / directionLength
  const normalizedY = direction.y / directionLength
  const offsetX = target.x - origin.x
  const offsetY = target.y - origin.y
  const projectedDistance = offsetX * normalizedX + offsetY * normalizedY

  if (projectedDistance < 0 || projectedDistance > maximumDistance) {
    return null
  }

  const perpendicularDistanceSquared =
    offsetX ** 2 + offsetY ** 2 - projectedDistance ** 2
  const safeRadius = Math.max(0, collisionRadius)
  const radiusSquared = safeRadius ** 2

  if (perpendicularDistanceSquared > radiusSquared) {
    return null
  }

  const entryOffset = Math.sqrt(
    Math.max(0, radiusSquared - perpendicularDistanceSquared),
  )

  return Math.max(0, projectedDistance - entryOffset)
}
