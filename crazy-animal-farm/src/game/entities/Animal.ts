import Phaser from 'phaser'
import type { Player } from './Player'
import {
  ANIMAL_COLLISION_RADIUS,
  CAPTURE_ABSORB_DURATION_MS,
  CAPTURE_ESCAPE_DURATION_MS,
} from '../config/gameConstants'
import { ANIMAL_TARGET_STATUS_EFFECTS } from '../data/animalElements'
import type {
  AnimalAiState,
  AnimalDefinition,
  AnimalSpawnPoint,
  AnimalTargetStatusEffectId,
} from '../types/animal'
import type { WorldPoint } from '../types/map'

export type AnimalDamageResult = Readonly<{
  remainingHp: number
  defeated: boolean
}>

export type AnimalCaptureSnapshot = Readonly<{
  x: number
  y: number
  scaleX: number
  scaleY: number
  angle: number
}>

export class Animal extends Phaser.Physics.Arcade.Sprite {
  readonly definition: AnimalDefinition
  readonly spawnPointId: string

  currentHp: number
  aiState: AnimalAiState = 'WANDER'

  private readonly healthBar: Phaser.GameObjects.Graphics
  private nextDecisionAt = 0
  private nextWanderDirectionAt = 0
  private nextAttackAt = 0
  private retaliateUntil = 0
  private hurtUntil = 0
  private wanderDirectionX = 0
  private wanderDirectionY = 0
  private normalScaleX = 1
  private normalScaleY = 1
  private readonly targetStatusEffects = new Map<
    AnimalTargetStatusEffectId,
    number
  >()

  constructor(
    scene: Phaser.Scene,
    definition: AnimalDefinition,
    spawnPoint: AnimalSpawnPoint,
  ) {
    super(scene, spawnPoint.x, spawnPoint.y, definition.textureKey)

    this.definition = definition
    this.spawnPointId = spawnPoint.id
    this.currentHp = definition.maxHp
    this.nextDecisionAt = scene.time.now + Phaser.Math.Between(0, 300)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setName(spawnPoint.id)
    this.setDisplaySize(definition.width, definition.height)
    this.normalScaleX = this.scaleX
    this.normalScaleY = this.scaleY
    this.setCircle(ANIMAL_COLLISION_RADIUS, 14, 22)
    this.setCollideWorldBounds(true)
    this.setDepth(8)

    this.healthBar = scene.add.graphics().setDepth(24)
    this.redrawHealthBar()
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta)
    this.healthBar.setPosition(this.x - 28, this.y - 50)
  }

  updateAi(time: number, player: Player) {
    this.clampToWorldBounds()
    this.removeExpiredStatusEffects(time)

    if (
      !this.active ||
      this.aiState === 'DEAD' ||
      this.aiState === 'CAPTURED'
    ) {
      return 0
    }

    if (time < this.hurtUntil) {
      return 0
    }

    const offsetX = player.x - this.x
    const offsetY = player.y - this.y
    const distanceToPlayer = Math.hypot(offsetX, offsetY)

    if (this.aiState === 'HURT') {
      this.aiState =
        this.currentHp / this.definition.maxHp <=
        this.definition.fleeHealthRatio
          ? 'FLEE'
          : 'ATTACK'
    }

    if (time >= this.nextDecisionAt) {
      this.decideNextState(time, distanceToPlayer)
      this.nextDecisionAt =
        time +
        Phaser.Math.Between(
          this.definition.decisionInterval.minMs,
          this.definition.decisionInterval.maxMs,
        )
    }

    switch (this.aiState) {
      case 'WANDER':
        this.updateWander(time)
        return 0
      case 'FLEE':
        this.moveRelativeToPlayer(offsetX, offsetY, -1)
        return 0
      case 'ATTACK':
        return this.updateAttack(time, offsetX, offsetY, distanceToPlayer)
      default:
        this.setVelocity(0, 0)
        return 0
    }
  }

  applyTargetStatusEffect(
    statusEffectId: AnimalTargetStatusEffectId,
    durationMs: number,
    appliedAt: number,
  ) {
    if (!this.active || durationMs <= 0) {
      return false
    }

    const expiresAt = appliedAt + durationMs
    const previousExpiresAt =
      this.targetStatusEffects.get(statusEffectId) ?? 0

    this.targetStatusEffects.set(
      statusEffectId,
      Math.max(previousExpiresAt, expiresAt),
    )
    this.playStatusEffect(statusEffectId)
    return true
  }

  getActiveTargetStatusEffectIds(time: number) {
    this.removeExpiredStatusEffects(time)
    return [...this.targetStatusEffects.keys()]
  }

  getOutgoingAttackDamage(time: number) {
    return Math.max(
      1,
      Math.round(
        this.definition.attackDamage *
          this.getOutgoingDamageMultiplier(time),
      ),
    )
  }

  takeDamage(
    damage: number,
    time: number,
    attackerPosition: WorldPoint,
  ): AnimalDamageResult {
    if (!this.active || damage <= 0) {
      return { remainingHp: this.currentHp, defeated: false }
    }

    this.currentHp = Math.max(0, this.currentHp - damage)
    this.retaliateUntil = time + this.definition.retaliationDurationMs
    this.hurtUntil = time + 160
    this.aiState = this.currentHp === 0 ? 'DEAD' : 'HURT'
    this.applyKnockback(attackerPosition)
    this.playHitEffect()
    this.redrawHealthBar()

    if (this.currentHp === 0) {
      this.setVelocity(0, 0)
      this.disableBody(true, true)
      this.healthBar.setVisible(false)
    }

    return {
      remainingHp: this.currentHp,
      defeated: this.currentHp === 0,
    }
  }

  beginCapturePull(
    capsulePosition: WorldPoint,
    onComplete: () => void,
  ): AnimalCaptureSnapshot | null {
    if (!this.active || this.aiState === 'CAPTURED') {
      return null
    }

    this.scene.tweens.killTweensOf(this)
    this.setScale(this.normalScaleX, this.normalScaleY)
    this.setAngle(0)

    const snapshot: AnimalCaptureSnapshot = {
      x: this.x,
      y: this.y,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      angle: this.angle,
    }

    this.aiState = 'CAPTURED'
    this.setVelocity(0, 0)
    this.healthBar.setVisible(false)

    if (this.body) {
      this.body.enable = false
    }

    this.scene.tweens.add({
      targets: this,
      x: capsulePosition.x,
      y: capsulePosition.y,
      scaleX: 0.08,
      scaleY: 0.08,
      angle: snapshot.angle + 360,
      alpha: 0,
      duration: CAPTURE_ABSORB_DURATION_MS,
      ease: 'Back.easeIn',
      onComplete,
    })

    return snapshot
  }

  finalizeCapture() {
    if (!this.active || this.aiState !== 'CAPTURED') {
      return false
    }

    this.disableBody(true, true)
    this.healthBar.setVisible(false)
    return true
  }

  escapeCapture(
    snapshot: AnimalCaptureSnapshot,
    onComplete: () => void,
  ) {
    if (!this.active || this.aiState !== 'CAPTURED') {
      return
    }

    this.setVisible(true)
    this.scene.tweens.add({
      targets: this,
      x: snapshot.x,
      y: snapshot.y,
      scaleX: snapshot.scaleX,
      scaleY: snapshot.scaleY,
      angle: snapshot.angle,
      alpha: 1,
      duration: CAPTURE_ESCAPE_DURATION_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.enableBody(true, snapshot.x, snapshot.y, true, true)

        this.redrawHealthBar()
        this.reactToCaptureFailure(this.scene.time.now)
        this.clampToWorldBounds()
        onComplete()
      },
    })
  }

  reactToCaptureFailure(time: number) {
    if (!this.active) {
      return
    }

    this.retaliateUntil = time + this.definition.retaliationDurationMs
    this.nextDecisionAt = time
    this.aiState = 'ATTACK'
    this.setTintFill(0xff7c9d)
    this.scene.time.delayedCall(180, () => {
      if (this.active) {
        this.clearTint()
      }
    })
  }

  clampToWorldBounds() {
    if (!this.active) {
      return
    }

    const bounds = this.scene.physics.world.bounds
    const halfWidth = this.displayWidth / 2
    const halfHeight = this.displayHeight / 2
    const clampedX = Phaser.Math.Clamp(
      this.x,
      bounds.left + halfWidth,
      bounds.right - halfWidth,
    )
    const clampedY = Phaser.Math.Clamp(
      this.y,
      bounds.top + halfHeight,
      bounds.bottom - halfHeight,
    )

    if (clampedX !== this.x || clampedY !== this.y) {
      this.setPosition(clampedX, clampedY)
      this.setVelocity(0, 0)
    }
  }

  getCaptureCollisionCenter() {
    return this.body
      ? { x: this.body.center.x, y: this.body.center.y }
      : { x: this.x, y: this.y }
  }

  get captureCollisionRadius() {
    return this.body
      ? Math.min(this.body.halfWidth, this.body.halfHeight)
      : ANIMAL_COLLISION_RADIUS
  }

  private decideNextState(time: number, distanceToPlayer: number) {
    const hpRatio = this.currentHp / this.definition.maxHp

    if (hpRatio <= this.definition.fleeHealthRatio) {
      this.aiState = 'FLEE'
      return
    }

    if (time < this.retaliateUntil) {
      this.aiState = 'ATTACK'
      return
    }

    if (distanceToPlayer > this.definition.detectionRange) {
      this.aiState = 'WANDER'
      return
    }

    switch (this.definition.behaviorType) {
      case 'aggressive':
        this.aiState = 'ATTACK'
        return
      case 'coward':
        this.aiState = 'FLEE'
        return
      case 'passive':
        this.aiState = distanceToPlayer <= this.definition.detectionRange * 0.55
          ? 'FLEE'
          : 'WANDER'
    }
  }

  private updateWander(time: number) {
    if (time >= this.nextWanderDirectionAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)

      this.wanderDirectionX = Math.cos(angle)
      this.wanderDirectionY = Math.sin(angle)
      this.nextWanderDirectionAt = time + Phaser.Math.Between(800, 1_800)
    }

    const wanderSpeed =
      this.definition.moveSpeed *
      0.35 *
      this.getMoveSpeedMultiplier(time)
    this.setBoundedVelocity(
      this.wanderDirectionX * wanderSpeed,
      this.wanderDirectionY * wanderSpeed,
    )
  }

  private updateAttack(
    time: number,
    offsetX: number,
    offsetY: number,
    distanceToPlayer: number,
  ) {
    if (distanceToPlayer > this.definition.attackRange) {
      this.moveRelativeToPlayer(offsetX, offsetY, 1)
      return 0
    }

    this.setVelocity(0, 0)

    if (time < this.nextAttackAt) {
      return 0
    }

    this.nextAttackAt = time + this.definition.attackCooldownMs
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.18,
      scaleY: 0.84,
      duration: 90,
      yoyo: true,
    })

    return this.getOutgoingAttackDamage(time)
  }

  private moveRelativeToPlayer(
    offsetX: number,
    offsetY: number,
    direction: 1 | -1,
  ) {
    const distance = Math.hypot(offsetX, offsetY) || 1

    this.setBoundedVelocity(
      (offsetX / distance) *
        this.definition.moveSpeed *
        this.getMoveSpeedMultiplier(this.scene.time.now) *
        direction,
      (offsetY / distance) *
        this.definition.moveSpeed *
        this.getMoveSpeedMultiplier(this.scene.time.now) *
        direction,
    )
  }

  private applyKnockback(attackerPosition: WorldPoint) {
    const offsetX = this.x - attackerPosition.x
    const offsetY = this.y - attackerPosition.y
    const distance = Math.hypot(offsetX, offsetY) || 1

    this.setBoundedVelocity(
      (offsetX / distance) * 180,
      (offsetY / distance) * 180,
    )
  }

  private setBoundedVelocity(velocityX: number, velocityY: number) {
    const bounds = this.scene.physics.world.bounds
    const edgeMargin = 48
    let safeVelocityX = velocityX
    let safeVelocityY = velocityY

    if (this.x <= bounds.left + edgeMargin && safeVelocityX < 0) {
      safeVelocityX = Math.abs(safeVelocityX)
    } else if (this.x >= bounds.right - edgeMargin && safeVelocityX > 0) {
      safeVelocityX = -Math.abs(safeVelocityX)
    }

    if (this.y <= bounds.top + edgeMargin && safeVelocityY < 0) {
      safeVelocityY = Math.abs(safeVelocityY)
    } else if (this.y >= bounds.bottom - edgeMargin && safeVelocityY > 0) {
      safeVelocityY = -Math.abs(safeVelocityY)
    }

    this.setVelocity(safeVelocityX, safeVelocityY)
  }

  private playHitEffect() {
    this.setTintFill(0xffffff)
    this.scene.time.delayedCall(110, () => {
      if (this.active) {
        this.clearTint()
      }
    })
  }

  private getMoveSpeedMultiplier(time: number) {
    return this.getActiveTargetStatusEffectIds(time).reduce(
      (multiplier, statusEffectId) =>
        multiplier *
        ANIMAL_TARGET_STATUS_EFFECTS[statusEffectId].moveSpeedMultiplier,
      1,
    )
  }

  private getOutgoingDamageMultiplier(time: number) {
    return this.getActiveTargetStatusEffectIds(time).reduce(
      (multiplier, statusEffectId) =>
        multiplier *
        ANIMAL_TARGET_STATUS_EFFECTS[statusEffectId]
          .outgoingDamageMultiplier,
      1,
    )
  }

  private removeExpiredStatusEffects(time: number) {
    this.targetStatusEffects.forEach((expiresAt, statusEffectId) => {
      if (time >= expiresAt) {
        this.targetStatusEffects.delete(statusEffectId)
      }
    })
  }

  private playStatusEffect(statusEffectId: AnimalTargetStatusEffectId) {
    const colorByStatus: Readonly<
      Record<AnimalTargetStatusEffectId, number>
    > = {
      burning: 0xff704d,
      soaked: 0x68bfff,
      rooted: 0x78c96f,
      shocked: 0xffdf57,
      chilled: 0x9deeff,
      weakened: 0xc59ae8,
    }

    this.setTint(colorByStatus[statusEffectId])
    this.scene.time.delayedCall(180, () => {
      if (this.active) {
        this.clearTint()
      }
    })
  }

  private redrawHealthBar() {
    const ratio = this.currentHp / this.definition.maxHp

    this.healthBar.clear()
    this.healthBar.fillStyle(0x151515, 0.86)
    this.healthBar.fillRoundedRect(0, 0, 56, 8, 4)
    this.healthBar.fillStyle(0xe85b55, 1)
    this.healthBar.fillRoundedRect(2, 2, 52 * ratio, 4, 2)
    this.healthBar.setVisible(this.currentHp < this.definition.maxHp)
  }
}
