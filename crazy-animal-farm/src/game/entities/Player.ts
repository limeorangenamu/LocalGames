import Phaser from 'phaser'
import {
  PLAYER_BASE_ACTION_INTERVAL_MS,
  PLAYER_HURT_INVULNERABILITY_MS,
  PLAYER_MAX_HP,
  PLAYER_MOVE_SPEED,
  PLAYER_SPRINT_SPEED_MULTIPLIER,
  PLAYER_TEXTURE_KEY,
  SHIELD_REGEN_DELAY_MS,
  SHIELD_REGEN_PER_SECOND,
} from '../config/gameConstants'
import { BARE_HANDS_TOOL } from '../data/equipment'
import type {
  PrimaryActionKind,
  ToolDefinition,
} from '../types/equipment'
import type { WorldPoint } from '../types/map'

type MovementKeys = Readonly<{
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  sprint: Phaser.Input.Keyboard.Key
}>

export type PlayerMovementState = 'idle' | 'move'

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys
  private readonly movementKeys?: MovementKeys
  private nextPrimaryActionAt = 0
  private movementLockedUntil = 0
  private invulnerableUntil = 0
  private facingX = 0
  private facingY = 1
  private equippedTool: ToolDefinition = BARE_HANDS_TOOL
  private shieldRegenerationStartsAt = 0
  private lastShieldUpdateAt = 0

  movementState: PlayerMovementState = 'idle'
  readonly maxHp = PLAYER_MAX_HP
  currentHp = PLAYER_MAX_HP
  maxShield = 0
  currentShield = 0

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_TEXTURE_KEY)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(10)
    this.setCollideWorldBounds(true)
    this.setCircle(24, 8, 8)

    const keyboard = scene.input.keyboard

    if (keyboard) {
      this.cursorKeys = keyboard.createCursorKeys()
      this.movementKeys = {
        up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        sprint: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      }
    }
  }

  updateMovement() {
    if (this.scene.time.now < this.movementLockedUntil) {
      return
    }

    const moveLeft = this.cursorKeys?.left.isDown === true || this.movementKeys?.left.isDown === true
    const moveRight = this.cursorKeys?.right.isDown === true || this.movementKeys?.right.isDown === true
    const moveUp = this.cursorKeys?.up.isDown === true || this.movementKeys?.up.isDown === true
    const moveDown = this.cursorKeys?.down.isDown === true || this.movementKeys?.down.isDown === true

    let velocityX = Number(moveRight) - Number(moveLeft)
    let velocityY = Number(moveDown) - Number(moveUp)

    if (velocityX === 0 && velocityY === 0) {
      this.setVelocity(0, 0)
      this.movementState = 'idle'
      return
    }

    // 대각선 이동 속도가 직선 이동보다 빨라지지 않도록 정규화한다.
    if (velocityX !== 0 && velocityY !== 0) {
      const diagonalScale = Math.SQRT1_2
      velocityX *= diagonalScale
      velocityY *= diagonalScale
    }

    const movementSpeed =
      PLAYER_MOVE_SPEED *
      (this.movementKeys?.sprint.isDown === true
        ? PLAYER_SPRINT_SPEED_MULTIPLIER
        : 1)

    this.setVelocity(velocityX * movementSpeed, velocityY * movementSpeed)
    this.facingX = velocityX
    this.facingY = velocityY
    this.movementState = 'move'
  }

  tryPrimaryAction(time: number, actionKind: PrimaryActionKind) {
    if (time < this.nextPrimaryActionAt) {
      return false
    }

    const speedMultiplier =
      actionKind === 'gathering'
        ? this.equippedTool.gatheringSpeedMultiplier
        : this.equippedTool.combatSpeedMultiplier
    const safeSpeedMultiplier = Math.max(0.1, speedMultiplier)

    this.nextPrimaryActionAt =
      time + PLAYER_BASE_ACTION_INTERVAL_MS / safeSpeedMultiplier
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 0.88,
      duration: 70,
      yoyo: true,
    })

    return true
  }

  equipTool(tool: ToolDefinition) {
    this.equippedTool = tool
  }

  getResourceDamage(baseDamage: number) {
    return Math.max(
      1,
      Math.round(baseDamage * this.equippedTool.resourceDamageMultiplier),
    )
  }

  getCombatDamage(baseDamage: number) {
    return Math.max(
      1,
      Math.round(baseDamage * this.equippedTool.combatDamageMultiplier),
    )
  }

  takeDamage(
    damage: number,
    source: WorldPoint,
    time: number,
    bypassShield = false,
  ) {
    if (damage <= 0 || time < this.invulnerableUntil || this.currentHp <= 0) {
      return false
    }

    let remainingDamage = damage

    if (!bypassShield && this.currentShield > 0) {
      const absorbedDamage = Math.min(this.currentShield, remainingDamage)

      this.currentShield -= absorbedDamage
      remainingDamage -= absorbedDamage
      this.shieldRegenerationStartsAt = time + SHIELD_REGEN_DELAY_MS
      this.lastShieldUpdateAt = time
    }

    this.currentHp = Math.max(0, this.currentHp - remainingDamage)
    this.invulnerableUntil = time + PLAYER_HURT_INVULNERABILITY_MS
    this.movementLockedUntil = time + 140

    const knockbackX = this.x - source.x
    const knockbackY = this.y - source.y
    const knockbackLength = Math.hypot(knockbackX, knockbackY) || 1

    this.setVelocity(
      (knockbackX / knockbackLength) * 250,
      (knockbackY / knockbackLength) * 250,
    )
    this.setTintFill(0xffffff)
    this.scene.time.delayedCall(110, () => {
      if (this.active) {
        this.clearTint()
      }
    })

    return true
  }

  healFully() {
    this.currentHp = this.maxHp
    this.clearTint()
  }

  restoreHp(hp: number) {
    this.currentHp = Phaser.Math.Clamp(hp, 0, this.maxHp)
    this.clearTint()
  }

  configureShield(maxShield: number, shield = maxShield) {
    this.maxShield = Math.max(0, maxShield)
    this.currentShield = Phaser.Math.Clamp(shield, 0, this.maxShield)
    this.shieldRegenerationStartsAt = 0
    this.lastShieldUpdateAt = this.scene.time.now
  }

  restoreShieldFully() {
    this.currentShield = this.maxShield
    this.shieldRegenerationStartsAt = 0
    this.lastShieldUpdateAt = this.scene.time.now
  }

  updateShield(time: number) {
    if (this.maxShield <= 0 || this.currentShield >= this.maxShield) {
      this.lastShieldUpdateAt = time
      return false
    }

    if (time < this.shieldRegenerationStartsAt) {
      this.lastShieldUpdateAt = time
      return false
    }

    const elapsedMs = Math.max(0, time - this.lastShieldUpdateAt)

    if (elapsedMs === 0) {
      return false
    }

    this.lastShieldUpdateAt = time
    const previousShield = this.currentShield
    this.currentShield = Math.min(
      this.maxShield,
      this.currentShield +
        (elapsedMs / 1_000) * SHIELD_REGEN_PER_SECOND,
    )
    return this.currentShield !== previousShield
  }

  getFacingDirection() {
    return { x: this.facingX, y: this.facingY }
  }
}
