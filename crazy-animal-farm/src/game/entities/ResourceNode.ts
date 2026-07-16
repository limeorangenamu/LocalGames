import Phaser from 'phaser'
import type {
  ResourceDefinition,
  ResourceSpawnPoint,
} from '../types/resource'

export type ResourceDamageResult = Readonly<{
  remainingHp: number
  depleted: boolean
}>

export class ResourceNode extends Phaser.Physics.Arcade.Sprite {
  readonly definition: ResourceDefinition
  readonly spawnPointId: string

  currentHp: number

  constructor(
    scene: Phaser.Scene,
    definition: ResourceDefinition,
    spawnPoint: ResourceSpawnPoint,
  ) {
    super(scene, spawnPoint.x, spawnPoint.y, definition.textureKey)

    this.definition = definition
    this.spawnPointId = spawnPoint.id
    this.currentHp = definition.maxHp

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setName(spawnPoint.id)
    this.setDisplaySize(definition.width, definition.height)
    this.setSize(definition.collision.width, definition.collision.height)
    this.setOffset(definition.collision.offsetX, definition.collision.offsetY)
    this.setImmovable(true)
    this.setDepth(5)
  }

  takeDamage(damage: number): ResourceDamageResult {
    if (!this.active || damage <= 0) {
      return { remainingHp: this.currentHp, depleted: false }
    }

    this.currentHp = Math.max(0, this.currentHp - damage)
    this.playHitEffect()

    return {
      remainingHp: this.currentHp,
      depleted: this.currentHp === 0,
    }
  }

  deplete() {
    this.disableBody(true, true)
  }

  respawn(x: number, y: number) {
    this.currentHp = this.definition.maxHp
    this.setAlpha(1)
    this.clearTint()
    this.enableBody(true, x, y, true, true)
  }

  private playHitEffect() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0.35,
      duration: 70,
      yoyo: true,
    })
  }
}

