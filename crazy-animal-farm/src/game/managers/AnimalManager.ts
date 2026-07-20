import Phaser from 'phaser'
import { CAPTURE_PROJECTILE_RADIUS } from '../config/gameConstants'
import { getElementEffectiveness } from '../data/animalElements'
import { ANIMAL_DEFINITIONS } from '../data/animals'
import { rollEquipmentBlueprintLoot } from '../data/equipmentProgression'
import { Animal } from '../entities/Animal'
import type { Player } from '../entities/Player'
import type {
  AnimalElementId,
  AnimalSpawnPoint,
  AnimalTargetStatusEffectId,
  CapturedAnimal,
} from '../types/animal'
import type { EquipmentBlueprintDrop } from '../types/equipment'
import type { ItemStack } from '../types/item'
import type { WorldPoint } from '../types/map'
import { createCapturedAnimalInstance } from '../utils/animalInstance'
import { rollLootTable } from '../utils/loot'
import {
  getAttackTargetDistance,
  getPathCollisionDistance,
} from '../utils/targeting'

export type AnimalAttackResult = Readonly<{
  targetId: string
  remainingHp: number
  defeated: boolean
  drops: readonly ItemStack[]
  blueprintDrops: readonly EquipmentBlueprintDrop[]
  effectivenessMultiplier: number
  appliedStatusEffectId: AnimalTargetStatusEffectId | null
}>

export type AnimalAttackOptions = Readonly<{
  element?: AnimalElementId
  targetStatusEffect?: Readonly<{
    id: AnimalTargetStatusEffectId
    chance: number
    durationMs: number
  }>
}>

export type CaptureAttemptResult = Readonly<{
  success: boolean
  chance: number
  capturedAnimal: CapturedAnimal | null
  drops: readonly ItemStack[]
  blueprintDrops: readonly EquipmentBlueprintDrop[]
}>

export class AnimalManager {
  private readonly scene: Phaser.Scene
  private readonly animalGroup: Phaser.Physics.Arcade.Group
  private readonly animals = new Map<string, Animal>()
  private captureSequence = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.animalGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: true,
    })
  }

  createAnimals(spawnPoints: readonly AnimalSpawnPoint[]) {
    spawnPoints.forEach((spawnPoint) => {
      const definition = ANIMAL_DEFINITIONS[spawnPoint.animalDefinitionId]

      if (!definition) {
        console.error(
          `[AnimalManager] 정의되지 않은 동물 ID: ${spawnPoint.animalDefinitionId}`,
        )
        return
      }

      const animal = new Animal(this.scene, definition, spawnPoint)

      this.animals.set(spawnPoint.id, animal)
      this.animalGroup.add(animal)
      animal.setCollideWorldBounds(true)
    })

    return this.animalGroup
  }

  update(time: number, player: Player) {
    let playerDamaged = false

    for (const animal of this.animals.values()) {
      if (!animal.active) {
        continue
      }

      const attackDamage = animal.updateAi(time, player)
      animal.clampToWorldBounds()

      if (
        attackDamage > 0 &&
        player.takeDamage(attackDamage, animal, time)
      ) {
        playerDamaged = true
      }
    }

    return playerDamaged
  }

  findClosestTarget(
    origin: WorldPoint,
    aimPoint: WorldPoint,
    attackRange: number,
  ) {
    let closestAnimal: Animal | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    for (const animal of this.animals.values()) {
      if (!animal.active) {
        continue
      }

      const distance = getAttackTargetDistance(
        origin,
        aimPoint,
        animal,
        animal.displayWidth,
        animal.displayHeight,
        attackRange,
      )

      if (distance !== null && distance < closestDistance) {
        closestDistance = distance
        closestAnimal = animal
      }
    }

    return closestAnimal
  }

  findClosestToPoint(point: WorldPoint, maximumDistance: number) {
    let closestAnimal: Animal | null = null
    let closestDistance = maximumDistance

    for (const animal of this.animals.values()) {
      if (!animal.active || animal.aiState === 'CAPTURED') {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        point.x,
        point.y,
        animal.x,
        animal.y,
      )

      if (distance <= closestDistance) {
        closestDistance = distance
        closestAnimal = animal
      }
    }

    return closestAnimal
  }

  findCapturePathTarget(
    origin: WorldPoint,
    direction: WorldPoint,
    maximumDistance: number,
  ) {
    let closestAnimal: Animal | null = null
    let closestHitDistance = Number.POSITIVE_INFINITY

    for (const animal of this.animals.values()) {
      if (!animal.active || animal.aiState === 'CAPTURED') {
        continue
      }

      const collisionCenter = animal.getCaptureCollisionCenter()
      const hitDistance = getPathCollisionDistance(
        origin,
        direction,
        collisionCenter,
        animal.captureCollisionRadius + CAPTURE_PROJECTILE_RADIUS,
        maximumDistance,
      )

      if (hitDistance !== null && hitDistance < closestHitDistance) {
        closestHitDistance = hitDistance
        closestAnimal = animal
      }
    }

    return closestAnimal
  }

  getPhysicsGroup() {
    return this.animalGroup
  }

  attack(
    target: Animal,
    damage: number,
    time: number,
    attackerPosition: WorldPoint,
    options: AnimalAttackOptions = {},
  ): AnimalAttackResult | null {
    if (!target.active) {
      return null
    }

    const attackingElement = options.element ?? 'neutral'
    const targetStatusEffectIds =
      target.getActiveTargetStatusEffectIds(time)
    let effectivenessMultiplier = getElementEffectiveness(
      attackingElement,
      target.definition.element,
    )

    if (
      targetStatusEffectIds.includes('soaked') &&
      (attackingElement === 'electric' ||
        attackingElement === 'frost')
    ) {
      effectivenessMultiplier *= 1.2
    }

    const adjustedDamage = Math.max(
      1,
      Math.round(damage * effectivenessMultiplier),
    )
    const result = target.takeDamage(
      adjustedDamage,
      time,
      attackerPosition,
    )
    let appliedStatusEffectId: AnimalTargetStatusEffectId | null = null

    if (
      !result.defeated &&
      options.targetStatusEffect &&
      Math.random() <= options.targetStatusEffect.chance &&
      target.applyTargetStatusEffect(
        options.targetStatusEffect.id,
        options.targetStatusEffect.durationMs,
        time,
      )
    ) {
      appliedStatusEffectId = options.targetStatusEffect.id
    }
    const drops = result.defeated
      ? rollLootTable(target.definition.lootTables.defeated)
      : []
    const blueprintDrops = result.defeated
      ? rollEquipmentBlueprintLoot(
          target.definition.blueprintLootTables.defeated,
        )
      : []

    return {
      targetId: target.spawnPointId,
      remainingHp: result.remainingHp,
      defeated: result.defeated,
      drops,
      blueprintDrops,
      effectivenessMultiplier,
      appliedStatusEffectId,
    }
  }

  rollCapture(
    target: Animal,
    chance: number,
    random: () => number = Math.random,
  ): CaptureAttemptResult | null {
    if (!target.active) {
      return null
    }

    const safeChance = Phaser.Math.Clamp(chance, 0, 1)

    if (random() >= safeChance) {
      return {
        success: false,
        chance: safeChance,
        capturedAnimal: null,
        drops: [],
        blueprintDrops: [],
      }
    }

    const capturedAt = Date.now()
    const capturedAnimal = createCapturedAnimalInstance({
      id: `${target.definition.id}-${capturedAt}-${this.captureSequence}`,
      definition: target.definition,
      gender: random() < 0.5 ? 'male' : 'female',
      wildCurrentHp: target.currentHp,
      capturedAt,
      random,
    })

    this.captureSequence += 1

    return {
      success: true,
      chance: safeChance,
      capturedAnimal,
      drops: rollLootTable(target.definition.lootTables.captured),
      blueprintDrops: rollEquipmentBlueprintLoot(
        target.definition.blueprintLootTables.captured,
        random,
      ),
    }
  }
}
