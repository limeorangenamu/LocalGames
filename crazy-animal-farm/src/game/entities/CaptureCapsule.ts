import Phaser from 'phaser'
import {
  CAPTURE_CAPSULE_TEXTURE_KEY,
  CAPTURE_PROJECTILE_RADIUS,
  CAPTURE_PROJECTILE_SPEED,
  CAPTURE_THROW_RANGE,
} from '../config/gameConstants'
import type { CaptureToolItemId } from '../types/capture'
import type { WorldPoint } from '../types/map'

export class CaptureCapsule extends Phaser.Physics.Arcade.Image {
  readonly toolItemId: CaptureToolItemId
  private readonly launchPosition: WorldPoint
  private resolved = false

  constructor(
    scene: Phaser.Scene,
    origin: WorldPoint,
    direction: WorldPoint,
    toolItemId: CaptureToolItemId,
    projectileTint: number,
  ) {
    super(scene, origin.x, origin.y, CAPTURE_CAPSULE_TEXTURE_KEY)

    this.launchPosition = { ...origin }
    this.toolItemId = toolItemId

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(26)
    this.setTint(projectileTint)
    this.setCircle(CAPTURE_PROJECTILE_RADIUS, 8, 8)
    this.setVelocity(
      direction.x * CAPTURE_PROJECTILE_SPEED,
      direction.y * CAPTURE_PROJECTILE_SPEED,
    )
    this.setAngularVelocity(720)
  }

  hasReachedMaximumRange() {
    return (
      Phaser.Math.Distance.Between(
        this.launchPosition.x,
        this.launchPosition.y,
        this.x,
        this.y,
      ) >= CAPTURE_THROW_RANGE
    )
  }

  getLaunchPosition() {
    return { ...this.launchPosition }
  }

  stopAtImpact() {
    if (this.resolved || !this.active) {
      return false
    }

    this.resolved = true
    this.setVelocity(0, 0)
    this.setAngularVelocity(0)

    if (this.body) {
      this.body.enable = false
    }

    return true
  }

  isResolved() {
    return this.resolved
  }
}
