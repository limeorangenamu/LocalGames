import Phaser from 'phaser'
import { PLAYER_PROJECTILE_TEXTURE_KEY } from '../config/gameConstants'
import type { WorldPoint } from '../types/map'

export class PlayerProjectile extends Phaser.Physics.Arcade.Sprite {
  private readonly origin: WorldPoint

  readonly damage: number
  readonly maximumDistance: number

  constructor(
    scene: Phaser.Scene,
    origin: WorldPoint,
    direction: WorldPoint,
    speed: number,
    maximumDistance: number,
    damage: number,
  ) {
    super(scene, origin.x, origin.y, PLAYER_PROJECTILE_TEXTURE_KEY)

    this.origin = { ...origin }
    this.damage = damage
    this.maximumDistance = maximumDistance

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(18)
    this.setCircle(5, 7, 7)
    this.setRotation(Math.atan2(direction.y, direction.x))
    this.setVelocity(direction.x * speed, direction.y * speed)
  }

  hasExceededRange() {
    return (
      Phaser.Math.Distance.Between(
        this.origin.x,
        this.origin.y,
        this.x,
        this.y,
      ) >= this.maximumDistance
    )
  }
}
