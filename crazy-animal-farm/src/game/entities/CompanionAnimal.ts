import Phaser from 'phaser'
import {
  COMPANION_FOLLOW_DISTANCE,
  COMPANION_STOP_DISTANCE,
  COMPANION_TELEPORT_DISTANCE,
} from '../config/gameConstants'
import { ANIMAL_ELEMENTS } from '../data/animalElements'
import { ANIMAL_ACTIVE_SKILLS } from '../data/animalSkills'
import {
  getActivePartnerSkillModifiers,
  isPartnerSkillActive,
} from '../data/companionEquipment'
import type { Animal } from './Animal'
import type { Player } from './Player'
import type {
  AnimalActiveSkillId,
  AnimalActiveSkillDefinition,
  AnimalDefinition,
  AnimalElementId,
  AnimalSelfStatusEffectId,
  AnimalTargetStatusEffectId,
  CapturedAnimal,
  CompanionSkillCooldownState,
  CompanionCommandMode,
} from '../types/animal'
import type { WorldPoint } from '../types/map'

export type CompanionCombatAction = Readonly<{
  skillId: AnimalActiveSkillId | null
  skillName: string
  element: AnimalElementId
  damage: number
  targetStatusEffect:
    | Readonly<{
        id: AnimalTargetStatusEffectId
        chance: number
        durationMs: number
      }>
    | undefined
  healing: number
}>

export type CompanionDamageResolution = Readonly<{
  damage: number
  evaded: boolean
}>

export type CompanionCombatSnapshot = Readonly<{
  skillCooldowns: readonly CompanionSkillCooldownState[]
  activeStatusEffectIds: readonly AnimalSelfStatusEffectId[]
  partnerSkillActive: boolean
}>

export class CompanionAnimal extends Phaser.Physics.Arcade.Sprite {
  readonly capturedAnimalId: string
  readonly definition: AnimalDefinition
  private capturedAnimal: CapturedAnimal

  private nextAttackAt = 0
  private nextSkillIndex = 0
  private holdPosition: WorldPoint
  private normalScaleX = 1
  private normalScaleY = 1
  private readonly skillReadyAt = new Map<AnimalActiveSkillId, number>()
  private readonly selfStatusEffects = new Map<
    AnimalSelfStatusEffectId,
    number
  >()

  constructor(
    scene: Phaser.Scene,
    capturedAnimal: CapturedAnimal,
    definition: AnimalDefinition,
    spawnPosition: WorldPoint,
  ) {
    super(
      scene,
      spawnPosition.x,
      spawnPosition.y,
      definition.textureKey,
    )

    this.capturedAnimalId = capturedAnimal.id
    this.definition = definition
    this.capturedAnimal = capturedAnimal
    this.holdPosition = { ...spawnPosition }

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setName(`companion-${capturedAnimal.id}`)
    this.setDisplaySize(definition.width, definition.height)
    this.normalScaleX = this.scaleX
    this.normalScaleY = this.scaleY
    this.setCircle(16, 16, 22)
    this.setTint(0x9be7ff)
    this.setDepth(10)
    this.setCollideWorldBounds(true)
  }

  setCommandMode(commandMode: CompanionCommandMode) {
    if (commandMode === 'stay') {
      this.holdPosition = { x: this.x, y: this.y }
    }
  }

  synchronizeCapturedAnimal(capturedAnimal: CapturedAnimal) {
    this.capturedAnimal = capturedAnimal
  }

  updateBehavior(
    time: number,
    player: Player,
    commandMode: CompanionCommandMode,
    target: Animal | null,
  ): CompanionCombatAction | null {
    if (!this.active) {
      return null
    }

    if (target?.active) {
      return this.updateAttackTarget(time, target)
    }

    const destination =
      commandMode === 'stay'
        ? this.holdPosition
        : { x: player.x, y: player.y }
    const offsetX = destination.x - this.x
    const offsetY = destination.y - this.y
    const distance = Math.hypot(offsetX, offsetY)

    if (
      commandMode !== 'stay' &&
      distance >= COMPANION_TELEPORT_DISTANCE
    ) {
      this.teleportNearPlayer(player)
      return null
    }

    const moveThreshold =
      commandMode === 'stay'
        ? 10
        : COMPANION_FOLLOW_DISTANCE

    if (distance <= moveThreshold) {
      this.setVelocity(0, 0)
      return null
    }

    const partnerModifiers = getActivePartnerSkillModifiers(
      this.capturedAnimal,
      this.definition,
    )

    this.moveToward(
      offsetX,
      offsetY,
      this.capturedAnimal.stats.moveSpeed *
        1.08 *
        (partnerModifiers.moveSpeedMultiplier ?? 1),
    )
    return null
  }

  playSummonAnimation() {
    const targetScaleX = this.normalScaleX
    const targetScaleY = this.normalScaleY

    this.setAlpha(0)
    this.setScale(targetScaleX * 0.15, targetScaleY * 0.15)
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 220,
      ease: 'Back.easeOut',
    })
  }

  playAttackAnimation(element: AnimalElementId = 'neutral') {
    const elementColor = Number.parseInt(
      ANIMAL_ELEMENTS[element].color.slice(1),
      16,
    )

    this.setTint(elementColor)
    this.scene.tweens.add({
      targets: this,
      scaleX: this.normalScaleX * 1.18,
      scaleY: this.normalScaleY * 0.86,
      duration: 85,
      yoyo: true,
      onComplete: () => {
        if (this.active) {
          this.setTint(0x9be7ff)
        }
      },
    })
  }

  playHitAnimation() {
    this.setTintFill(0xff9b9b)
    this.scene.time.delayedCall(130, () => {
      if (this.active) {
        this.setTint(0x9be7ff)
      }
    })
    this.scene.tweens.add({
      targets: this,
      alpha: 0.55,
      duration: 70,
      yoyo: true,
    })
  }

  resolveIncomingDamage(
    rawDamage: number,
    time: number,
  ): CompanionDamageResolution {
    this.removeExpiredSelfStatusEffects(time)

    if (this.selfStatusEffects.has('evasive')) {
      this.selfStatusEffects.delete('evasive')
      this.playEvadeAnimation()
      return { damage: 0, evaded: true }
    }

    let damageMultiplier = 1

    if (this.selfStatusEffects.has('guarded')) {
      damageMultiplier *= 0.55
      this.selfStatusEffects.delete('guarded')
    }

    const partnerModifiers = getActivePartnerSkillModifiers(
      this.capturedAnimal,
      this.definition,
    )

    damageMultiplier *= partnerModifiers.defenseMultiplier ?? 1

    return {
      damage: Math.max(1, Math.round(rawDamage * damageMultiplier)),
      evaded: false,
    }
  }

  getCombatSnapshot(time: number): CompanionCombatSnapshot {
    this.removeExpiredSelfStatusEffects(time)

    return {
      skillCooldowns: this.capturedAnimal.equippedActiveSkillIds.flatMap(
        (skillId, slotIndex) =>
          skillId
            ? [{
                slotIndex,
                skillId,
                remainingMs: Math.max(
                  0,
                  (this.skillReadyAt.get(skillId) ?? 0) - time,
                ),
              }]
            : [],
      ),
      activeStatusEffectIds: [...this.selfStatusEffects.keys()],
      partnerSkillActive: isPartnerSkillActive(
        this.capturedAnimal,
        this.definition,
      ),
    }
  }

  private updateAttackTarget(
    time: number,
    target: Animal,
  ): CompanionCombatAction | null {
    const offsetX = target.x - this.x
    const offsetY = target.y - this.y
    const distance = Math.hypot(offsetX, offsetY)

    if (distance > this.definition.attackRange) {
      const partnerModifiers = getActivePartnerSkillModifiers(
        this.capturedAnimal,
        this.definition,
      )

      this.moveToward(
        offsetX,
        offsetY,
        this.capturedAnimal.stats.moveSpeed *
          1.12 *
          (partnerModifiers.moveSpeedMultiplier ?? 1),
      )
      return null
    }

    this.setVelocity(0, 0)

    if (time < this.nextAttackAt) {
      return null
    }

    this.nextAttackAt = time + this.definition.attackCooldownMs
    const skillId = this.selectReadySkill(time)

    if (!skillId) {
      this.playAttackAnimation(this.definition.element)
      return {
        skillId: null,
        skillName: '기본 공격',
        element: this.definition.element,
        damage: this.getModifiedDamage(
          this.capturedAnimal.stats.attack * 0.65,
          this.definition.element,
          time,
        ),
        targetStatusEffect: undefined,
        healing: 0,
      }
    }

    const skill: AnimalActiveSkillDefinition =
      ANIMAL_ACTIVE_SKILLS[skillId]
    const partnerModifiers = getActivePartnerSkillModifiers(
      this.capturedAnimal,
      this.definition,
    )
    const cooldownMs =
      skill.cooldownMs * (partnerModifiers.cooldownMultiplier ?? 1)

    this.skillReadyAt.set(skillId, time + cooldownMs)

    if (skill.selfStatusEffect) {
      this.selfStatusEffects.set(
        skill.selfStatusEffect.id,
        time + skill.selfStatusEffect.durationMs,
      )
    }

    this.playAttackAnimation(skill.element)
    return {
      skillId,
      skillName: skill.name,
      element: skill.element,
      damage: this.getModifiedDamage(
        this.capturedAnimal.stats.attack * skill.powerMultiplier,
        skill.element,
        time,
      ),
      targetStatusEffect: skill.targetStatusEffect,
      healing: skill.healRatio
        ? Math.max(
            1,
            Math.ceil(
              this.capturedAnimal.stats.maxHp * skill.healRatio,
            ),
          )
        : 0,
    }
  }

  private selectReadySkill(time: number): AnimalActiveSkillId | null {
    const equippedSkillIds =
      this.capturedAnimal.equippedActiveSkillIds
    const slotCount = equippedSkillIds.length

    for (let offset = 0; offset < slotCount; offset += 1) {
      const slotIndex = (this.nextSkillIndex + offset) % slotCount
      const skillId = equippedSkillIds[slotIndex]

      if (
        skillId &&
        time >= (this.skillReadyAt.get(skillId) ?? 0)
      ) {
        this.nextSkillIndex = (slotIndex + 1) % slotCount
        return skillId
      }
    }

    return null
  }

  private getModifiedDamage(
    baseDamage: number,
    element: AnimalElementId,
    time: number,
  ) {
    this.removeExpiredSelfStatusEffects(time)
    const partnerModifiers = getActivePartnerSkillModifiers(
      this.capturedAnimal,
      this.definition,
    )
    const inspiredMultiplier =
      this.selfStatusEffects.has('inspired') ? 1.3 : 1
    const elementMultiplier =
      partnerModifiers.elementDamageBonuses?.[element] ?? 1

    return Math.max(
      1,
      Math.round(
        baseDamage *
          (partnerModifiers.attackMultiplier ?? 1) *
          inspiredMultiplier *
          elementMultiplier,
      ),
    )
  }

  private removeExpiredSelfStatusEffects(time: number) {
    this.selfStatusEffects.forEach((expiresAt, statusEffectId) => {
      if (time >= expiresAt) {
        this.selfStatusEffects.delete(statusEffectId)
      }
    })
  }

  private playEvadeAnimation() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0.25,
      x: this.x - 26,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut',
    })
  }

  private teleportNearPlayer(player: Player) {
    const direction = player.getFacingDirection()
    const bounds = this.scene.physics.world.bounds
    const x = Phaser.Math.Clamp(
      player.x - direction.x * COMPANION_STOP_DISTANCE,
      bounds.left + 32,
      bounds.right - 32,
    )
    const y = Phaser.Math.Clamp(
      player.y - direction.y * COMPANION_STOP_DISTANCE,
      bounds.top + 32,
      bounds.bottom - 32,
    )

    this.setPosition(x, y)

    if (this.body instanceof Phaser.Physics.Arcade.Body) {
      this.body.reset(x, y)
    }

    this.setVelocity(0, 0)
  }

  private moveToward(offsetX: number, offsetY: number, speed: number) {
    const distance = Math.hypot(offsetX, offsetY) || 1

    this.setVelocity(
      (offsetX / distance) * speed,
      (offsetY / distance) * speed,
    )
  }
}
