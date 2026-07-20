import Phaser from 'phaser'
import {
  ANIMAL_TARGET_STATUS_EFFECTS,
  getElementEffectiveness,
} from '../data/animalElements'
import { ANIMAL_DEFINITIONS } from '../data/animals'
import type { Animal } from '../entities/Animal'
import {
  CompanionAnimal,
  type CompanionCombatSnapshot,
} from '../entities/CompanionAnimal'
import type { Player } from '../entities/Player'
import type {
  AnimalActiveSkillId,
  AnimalElementId,
  CapturedAnimal,
  CompanionCommandMode,
} from '../types/animal'
import type { ItemStack } from '../types/item'
import type { EquipmentBlueprintDrop } from '../types/equipment'
import type { WorldPoint } from '../types/map'
import type { AnimalManager } from './AnimalManager'

export type CompanionAttackResult = Readonly<{
  defeated: boolean
  targetName: string
  drops: readonly ItemStack[]
  blueprintDrops: readonly EquipmentBlueprintDrop[]
  counterAttackDamage: number
  counterAttackEvaded: boolean
  skillId: AnimalActiveSkillId | null
  skillName: string
  element: AnimalElementId
  effectivenessMultiplier: number
  appliedStatusEffectName: string | null
  healing: number
}>

export class CompanionManager {
  private readonly scene: Phaser.Scene
  private readonly companionGroup: Phaser.Physics.Arcade.Group
  private activeCompanion: CompanionAnimal | null = null
  private commandMode: CompanionCommandMode = 'follow'
  private attackTarget: Animal | null = null
  private nextCounterAttackAt = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.companionGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: true,
    })
  }

  synchronize(
    capturedAnimal: CapturedAnimal | null,
    player: Player,
    commandMode: CompanionCommandMode,
  ) {
    if (
      capturedAnimal &&
      this.activeCompanion?.capturedAnimalId === capturedAnimal.id
    ) {
      this.activeCompanion.synchronizeCapturedAnimal(capturedAnimal)
      this.setCommandMode(commandMode)
      return
    }

    this.recallActive()

    if (!capturedAnimal) {
      return
    }

    const definition = ANIMAL_DEFINITIONS[capturedAnimal.animalDefinitionId]

    if (!definition) {
      return
    }

    const direction = player.getFacingDirection()
    const bounds = this.scene.physics.world.bounds
    const spawnPosition = {
      x: Phaser.Math.Clamp(
        player.x - direction.x * 58,
        bounds.left + 32,
        bounds.right - 32,
      ),
      y: Phaser.Math.Clamp(
        player.y - direction.y * 58,
        bounds.top + 32,
        bounds.bottom - 32,
      ),
    }
    const companion = new CompanionAnimal(
      this.scene,
      capturedAnimal,
      definition,
      spawnPosition,
    )

    this.activeCompanion = companion
    this.commandMode = commandMode
    companion.setCommandMode(commandMode)
    this.companionGroup.add(companion)
    this.playCommandRing(spawnPosition, 0x91e7ff)
    companion.playSummonAnimation()
  }

  setCommandMode(commandMode: CompanionCommandMode) {
    if (this.commandMode === commandMode) {
      return
    }

    this.commandMode = commandMode
    this.activeCompanion?.setCommandMode(commandMode)

    if (commandMode !== 'focus') {
      this.clearAttackTarget()
    }
  }

  commandAttack(target: Animal) {
    if (!this.activeCompanion || !target.active) {
      return false
    }

    this.attackTarget = target
    this.nextCounterAttackAt = this.scene.time.now + 280
    this.playCommandRing({ x: target.x, y: target.y }, 0xffd76f)
    return true
  }

  update(
    time: number,
    player: Player,
    animalManager: AnimalManager,
  ): CompanionAttackResult | null {
    const companion = this.activeCompanion

    if (!companion) {
      return null
    }

    if (this.attackTarget && !this.attackTarget.active) {
      this.clearAttackTarget()
    }

    const combatAction = companion.updateBehavior(
      time,
      player,
      this.commandMode,
      this.attackTarget,
    )

    if (!combatAction || !this.attackTarget) {
      return null
    }

    const target = this.attackTarget
    const targetName = target.definition.name
    const result = animalManager.attack(
      target,
      combatAction.damage,
      time,
      { x: companion.x, y: companion.y },
      {
        element: combatAction.element,
        targetStatusEffect: combatAction.targetStatusEffect,
      },
    )

    if (!result) {
      this.clearAttackTarget()
      return null
    }

    if (result.defeated) {
      this.clearAttackTarget()
    }

    const counterElementMultiplier = getElementEffectiveness(
      target.definition.element,
      companion.definition.element,
    )
    const counterResolution =
      !result.defeated && time >= this.nextCounterAttackAt
        ? companion.resolveIncomingDamage(
            target.getOutgoingAttackDamage(time) *
              counterElementMultiplier,
            time,
          )
        : { damage: 0, evaded: false }
    const counterAttackDamage = counterResolution.damage

    if (counterAttackDamage > 0 || counterResolution.evaded) {
      this.nextCounterAttackAt =
        time + target.definition.attackCooldownMs

      if (counterAttackDamage > 0) {
        companion.playHitAnimation()
      }
    }

    return {
      defeated: result.defeated,
      targetName,
      drops: result.drops,
      blueprintDrops: result.blueprintDrops,
      counterAttackDamage,
      counterAttackEvaded: counterResolution.evaded,
      skillId: combatAction.skillId,
      skillName: combatAction.skillName,
      element: combatAction.element,
      effectivenessMultiplier: result.effectivenessMultiplier,
      appliedStatusEffectName: result.appliedStatusEffectId
        ? ANIMAL_TARGET_STATUS_EFFECTS[result.appliedStatusEffectId].name
        : null,
      healing: combatAction.healing,
    }
  }

  recallActive() {
    const companion = this.activeCompanion

    if (!companion) {
      return
    }

    this.playCommandRing({ x: companion.x, y: companion.y }, 0xb99cff)
    companion.destroy()
    this.activeCompanion = null
    this.clearAttackTarget()
  }

  getPhysicsGroup() {
    return this.companionGroup
  }

  getActiveCompanionId() {
    return this.activeCompanion?.capturedAnimalId ?? null
  }

  getTargetName() {
    return this.attackTarget?.active
      ? this.attackTarget.definition.name
      : null
  }

  getCombatSnapshot(time: number): CompanionCombatSnapshot {
    return this.activeCompanion?.getCombatSnapshot(time) ?? {
      skillCooldowns: [],
      activeStatusEffectIds: [],
      partnerSkillActive: false,
    }
  }

  private clearAttackTarget() {
    this.attackTarget = null
    this.nextCounterAttackAt = 0
  }

  private playCommandRing(position: WorldPoint, color: number) {
    const ring = this.scene.add.graphics().setDepth(23)

    ring.setPosition(position.x, position.y)
    ring.lineStyle(4, color, 0.9)
    ring.strokeCircle(0, 0, 24)
    this.scene.tweens.add({
      targets: ring,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })
  }
}
