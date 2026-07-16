import { ANIMAL_DEFINITIONS } from '../data/animals'
import {
  ANIMAL_ACTIVE_SKILL_SLOT_COUNT,
  ANIMAL_INSTANCE_DATA_VERSION,
  ANIMAL_MAX_TRUST,
  ANIMAL_MAX_PASSIVE_TRAITS,
  ANIMAL_MAX_POTENTIAL,
  ANIMAL_PARTY_SLOT_COUNT,
  ANIMAL_REVIVE_DURATION_MS,
  PLAYER_MAX_HUNGER,
} from '../config/gameConstants'
import { ANIMAL_ACTIVE_SKILLS } from '../data/animalSkills'
import {
  COMPANION_EQUIPMENT,
  isCompanionEquipmentId,
} from '../data/companionEquipment'
import { ANIMAL_PASSIVE_TRAITS } from '../data/animalTraits'
import { BUILDING_DEFINITIONS } from '../data/buildings'
import { CRAFTING_RECIPES } from '../data/crafting'
import { isToolDefinitionId, TOOL_DEFINITIONS } from '../data/equipment'
import { ITEM_DEFINITIONS } from '../data/items'
import { getMapDefinition, isMapId } from '../data/maps'
import type {
  AnimalActiveSkillId,
  AnimalPassiveTraitId,
  AnimalPotential,
  AnimalStats,
  CapturedAnimal,
  CompanionEquipmentId,
} from '../types/animal'
import type {
  BaseSaveData,
  GameSave,
  GameSavePayload,
  MapSaveData,
  SaveResult,
  SaveSlotId,
  SaveSlotSummary,
} from '../types/save'
import type { PlacedBuilding } from '../types/building'
import type { InventoryItemKey } from '../types/item'
import type { EquipmentSlotId } from '../types/equipment'
import type { CraftingRecipeId } from '../types/crafting'
import { HOTBAR_SLOT_COUNT, type HotbarSlot } from '../types/hotbar'
import type { MapId, WorldPoint } from '../types/map'
import type { ResourceSpawnState } from '../types/resource'
import type { WorkAssignment, WorkSkill } from '../types/work'
import {
  calculateAnimalStats,
  createEquippedAnimalSkillSlots,
  createNeutralAnimalPotential,
  getAnimalCondition,
  getAnimalExperienceToNextLevel,
  getLearnedAnimalSkillIds,
  normalizeAnimalTrust,
} from '../utils/animalInstance'

const LEGACY_V4_STORAGE_KEY = 'crazy-animal-farm.save.v4'
const LEGACY_V4_STORAGE_PREFIX = 'crazy-animal-farm.save.v4.'
const LEGACY_V3_STORAGE_KEY = 'crazy-animal-farm.save.v3'
const LEGACY_V2_STORAGE_KEY = 'crazy-animal-farm.save.v2'
const LEGACY_V1_STORAGE_KEY = 'crazy-animal-farm.save.v1'
const LEGACY_V5_STORAGE_PREFIX = 'crazy-animal-farm.save.v5.'
const LEGACY_V6_STORAGE_PREFIX = 'crazy-animal-farm.save.v6.'
const SAVE_STORAGE_PREFIX = 'crazy-animal-farm.save.v7.'
const SAVE_VERSION = 7
let activeLoadSlotId: SaveSlotId = 'auto'
type SaveSource = Readonly<{
  key: string
  value: string | null
  shouldMigrateToSlot: boolean
}>

export const SAVE_SLOT_DEFINITIONS = [
  { id: 'auto', label: '자동저장', isAuto: true },
  { id: 'slot-1', label: '저장 슬롯 1', isAuto: false },
  { id: 'slot-2', label: '저장 슬롯 2', isAuto: false },
  { id: 'slot-3', label: '저장 슬롯 3', isAuto: false },
  { id: 'slot-4', label: '저장 슬롯 4', isAuto: false },
  { id: 'slot-5', label: '저장 슬롯 5', isAuto: false },
] as const satisfies readonly Readonly<{
  id: SaveSlotId
  label: string
  isAuto: boolean
}>[]
const EQUIPMENT_SLOT_IDS: readonly EquipmentSlotId[] = [
  'head',
  'earring',
  'ring',
  'body',
  'cloak',
  'legs',
  'feet',
  'shield',
  'rightHand',
  'leftHand',
]
const WORK_SKILLS: readonly WorkSkill[] = [
  'logging',
  'mining',
  'farming',
  'carrying',
]

export class SaveService {
  setActiveLoadSlot(slotId: SaveSlotId) {
    activeLoadSlotId = slotId
  }

  getActiveLoadSlot() {
    return activeLoadSlotId
  }

  getSlotSummaries(): readonly SaveSlotSummary[] {
    return SAVE_SLOT_DEFINITIONS.map((slot) => ({
      ...slot,
      save: this.load(slot.id),
    }))
  }

  load(slotId: SaveSlotId = activeLoadSlotId): GameSave | null {
    let sourceStorageKey = getSlotStorageKey(slotId)

    try {
      const slotStorageKey = getSlotStorageKey(slotId)
      const saveSources: SaveSource[] = [
        {
          key: slotStorageKey,
          value: localStorage.getItem(slotStorageKey),
          shouldMigrateToSlot: false,
        },
        {
          key: getLegacyV6SlotStorageKey(slotId),
          value: localStorage.getItem(getLegacyV6SlotStorageKey(slotId)),
          shouldMigrateToSlot: true,
        },
        {
          key: getLegacyV5SlotStorageKey(slotId),
          value: localStorage.getItem(getLegacyV5SlotStorageKey(slotId)),
          shouldMigrateToSlot: true,
        },
        {
          key: getLegacyV4SlotStorageKey(slotId),
          value: localStorage.getItem(getLegacyV4SlotStorageKey(slotId)),
          shouldMigrateToSlot: true,
        },
      ]

      if (slotId === 'auto') {
        saveSources.push(
          {
            key: LEGACY_V4_STORAGE_KEY,
            value: localStorage.getItem(LEGACY_V4_STORAGE_KEY),
            shouldMigrateToSlot: true,
          },
          {
            key: LEGACY_V3_STORAGE_KEY,
            value: localStorage.getItem(LEGACY_V3_STORAGE_KEY),
            shouldMigrateToSlot: true,
          },
          {
            key: LEGACY_V2_STORAGE_KEY,
            value: localStorage.getItem(LEGACY_V2_STORAGE_KEY),
            shouldMigrateToSlot: true,
          },
          {
            key: LEGACY_V1_STORAGE_KEY,
            value: localStorage.getItem(LEGACY_V1_STORAGE_KEY),
            shouldMigrateToSlot: true,
          },
        )
      }

      const saveSource = saveSources.find(
        (candidate) => candidate.value !== null,
      )

      if (!saveSource?.value) {
        return null
      }

      sourceStorageKey = saveSource.key
      const parsedSave: unknown = JSON.parse(saveSource.value)
      const migratedSave = normalizeSaveForCurrentContent(
        migrateLegacySave(parsedSave),
      )

      if (!isGameSave(migratedSave)) {
        console.warn('[SaveService] 저장 데이터가 유효하지 않아 새 게임으로 시작합니다.')
        this.discardInvalidSave(saveSource.key)
        return null
      }

      if (
        saveSource.shouldMigrateToSlot ||
        JSON.stringify(parsedSave) !== JSON.stringify(migratedSave)
      ) {
        localStorage.setItem(slotStorageKey, JSON.stringify(migratedSave))
      }

      if (saveSource.shouldMigrateToSlot) {
        this.discardInvalidSave(getLegacyV6SlotStorageKey(slotId))
        this.discardInvalidSave(getLegacyV5SlotStorageKey(slotId))
        this.discardInvalidSave(getLegacyV4SlotStorageKey(slotId))

        if (slotId === 'auto') {
          this.discardInvalidSave(LEGACY_V4_STORAGE_KEY)
          this.discardInvalidSave(LEGACY_V3_STORAGE_KEY)
          this.discardInvalidSave(LEGACY_V2_STORAGE_KEY)
          this.discardInvalidSave(LEGACY_V1_STORAGE_KEY)
        }
      }

      return migratedSave
    } catch (error) {
      console.warn('[SaveService] 저장 데이터를 불러오지 못했습니다.', error)
      this.discardInvalidSave(sourceStorageKey)
      return null
    }
  }

  save(
    payload: GameSavePayload,
    slotId: SaveSlotId = 'auto',
  ): SaveResult {
    const savedAt = Date.now()
    const gameSave: GameSave = {
      ...payload,
      version: SAVE_VERSION,
      savedAt,
    }

    try {
      localStorage.setItem(
        getSlotStorageKey(slotId),
        JSON.stringify(gameSave),
      )
      return {
        success: true,
        savedAt,
        message: `${getSaveSlotLabel(slotId)}에 게임을 저장했습니다.`,
      }
    } catch (error) {
      console.warn('[SaveService] 게임을 저장하지 못했습니다.', error)
      return {
        success: false,
        savedAt: null,
        message: '브라우저 저장소에 게임을 저장하지 못했습니다.',
      }
    }
  }

  deleteSlot(slotId: SaveSlotId) {
    try {
      localStorage.removeItem(getSlotStorageKey(slotId))
      localStorage.removeItem(getLegacyV6SlotStorageKey(slotId))
      localStorage.removeItem(getLegacyV5SlotStorageKey(slotId))
      localStorage.removeItem(getLegacyV4SlotStorageKey(slotId))

      if (slotId === 'auto') {
        localStorage.removeItem(LEGACY_V4_STORAGE_KEY)
        localStorage.removeItem(LEGACY_V3_STORAGE_KEY)
        localStorage.removeItem(LEGACY_V2_STORAGE_KEY)
        localStorage.removeItem(LEGACY_V1_STORAGE_KEY)
      }

      return true
    } catch (error) {
      console.warn('[SaveService] 저장 슬롯을 삭제하지 못했습니다.', error)
      return false
    }
  }

  private discardInvalidSave(storageKey: string) {
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('[SaveService] 잘못된 저장 데이터를 제거하지 못했습니다.', error)
    }
  }
}

export function getSaveSlotLabel(slotId: SaveSlotId) {
  return (
    SAVE_SLOT_DEFINITIONS.find((slot) => slot.id === slotId)?.label ??
    '저장 슬롯'
  )
}

function getSlotStorageKey(slotId: SaveSlotId) {
  return `${SAVE_STORAGE_PREFIX}${slotId}`
}

function getLegacyV6SlotStorageKey(slotId: SaveSlotId) {
  return `${LEGACY_V6_STORAGE_PREFIX}${slotId}`
}

function getLegacyV5SlotStorageKey(slotId: SaveSlotId) {
  return `${LEGACY_V5_STORAGE_PREFIX}${slotId}`
}

function getLegacyV4SlotStorageKey(slotId: SaveSlotId) {
  return `${LEGACY_V4_STORAGE_PREFIX}${slotId}`
}

function isGameSave(value: unknown): value is GameSave {
  if (
    !isRecord(value) ||
    value.version !== SAVE_VERSION ||
    !isFiniteNumber(value.savedAt) ||
    !isPlayerSaveData(value.player) ||
    !isItemStorage(value.inventory) ||
    !Array.isArray(value.capturedAnimals) ||
    !value.capturedAnimals.every(isCapturedAnimal) ||
    !Array.isArray(value.bases) ||
    !value.bases.every(isBaseSaveData) ||
    !isMapSaveRecord(value.maps)
  ) {
    return false
  }

  const capturedAnimals = value.capturedAnimals as CapturedAnimal[]
  const bases = value.bases as BaseSaveData[]
  const buildings = bases.flatMap((base) => base.buildings)
  const capturedAnimalIds = new Set(capturedAnimals.map((animal) => animal.id))
  const activeAnimalPartyIds =
    isRecord(value.player) && Array.isArray(value.player.activeAnimalPartyIds)
      ? (value.player.activeAnimalPartyIds as string[])
      : []
  const selectedCompanionAnimalId =
    isRecord(value.player) &&
    typeof value.player.selectedCompanionAnimalId === 'string'
      ? value.player.selectedCompanionAnimalId
      : null
  const summonedCompanionAnimalId =
    isRecord(value.player) &&
    typeof value.player.summonedCompanionAnimalId === 'string'
      ? value.player.summonedCompanionAnimalId
      : null
  const buildingIds = new Set(buildings.map((building) => building.id))
  const buildingCounts = new Map<string, number>()

  buildings.forEach((building) => {
    buildingCounts.set(
      building.definitionId,
      (buildingCounts.get(building.definitionId) ?? 0) + 1,
    )
  })

  if (
    capturedAnimalIds.size !== capturedAnimals.length ||
    activeAnimalPartyIds.some((animalId) => {
      const animal = capturedAnimals.find(
        (candidate) => candidate.id === animalId,
      )

      return (
        !animal ||
        Boolean(animal.workAssignment) ||
        animal.condition === 'incapacitated'
      )
    }) ||
    (selectedCompanionAnimalId !== null &&
      !activeAnimalPartyIds.includes(selectedCompanionAnimalId)) ||
    (summonedCompanionAnimalId !== null &&
      !activeAnimalPartyIds.includes(summonedCompanionAnimalId)) ||
    buildingIds.size !== buildings.length ||
    Object.values(BUILDING_DEFINITIONS).some(
      (definition) =>
        (buildingCounts.get(definition.id) ?? 0) > definition.maximumInstances,
    )
  ) {
    return false
  }

  return (
    capturedAnimals.every(
      (animal) => {
        if (!animal.workAssignment) {
          return true
        }

        if (animal.condition === 'incapacitated') {
          return false
        }

        const building = buildings.find(
          (candidate) => candidate.id === animal.workAssignment?.buildingId,
        )
        const work = building
          ? BUILDING_DEFINITIONS[building.definitionId].work
          : null

        return (
          buildingIds.has(animal.workAssignment.buildingId) &&
          building?.assignedAnimalIds.includes(animal.id) === true &&
          work?.requiredSkill === animal.workAssignment.skill &&
          (animal.workSkills[animal.workAssignment.skill] ?? 0) > 0
        )
      },
    ) &&
    buildings.every(
      (building) => {
        const work = BUILDING_DEFINITIONS[building.definitionId].work

        return (
          new Set(building.assignedAnimalIds).size ===
          building.assignedAnimalIds.length &&
          building.assignedAnimalIds.length <= (work?.slots ?? 0) &&
          building.assignedAnimalIds.every((animalId) => {
            const animal = capturedAnimals.find(
              (candidate) => candidate.id === animalId,
            )

            return (
              capturedAnimalIds.has(animalId) &&
              animal?.condition !== 'incapacitated' &&
              animal?.workAssignment?.buildingId === building.id
            )
          })
        )
      },
    )
  )
}

function isPlayerSaveData(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.currentMapId !== 'string' ||
    !isMapId(value.currentMapId) ||
    !isWorldPoint(value.position) ||
    !isFiniteNumber(value.hp) ||
    value.hp < 0 ||
    !isFiniteNumber(value.hunger) ||
    value.hunger < 0 ||
    value.hunger > PLAYER_MAX_HUNGER ||
    (value.level !== undefined &&
      (!Number.isInteger(value.level) || (value.level as number) < 1)) ||
    (value.experience !== undefined &&
      (!isFiniteNumber(value.experience) || value.experience < 0)) ||
    (value.experienceToNextLevel !== undefined &&
      (!isFiniteNumber(value.experienceToNextLevel) ||
        value.experienceToNextLevel <= 0)) ||
    (value.shield !== undefined &&
      (!isFiniteNumber(value.shield) || value.shield < 0)) ||
    (value.maxShield !== undefined &&
      (!isFiniteNumber(value.maxShield) || value.maxShield < 0)) ||
    (isFiniteNumber(value.shield) &&
      isFiniteNumber(value.maxShield) &&
      value.shield > value.maxShield) ||
    (value.technologyPoints !== undefined &&
      (!Number.isInteger(value.technologyPoints) ||
        (value.technologyPoints as number) < 0)) ||
    (value.unlockedRecipeIds !== undefined &&
      (!Array.isArray(value.unlockedRecipeIds) ||
        !value.unlockedRecipeIds.every(isCraftingRecipeId) ||
        new Set(value.unlockedRecipeIds).size !==
          value.unlockedRecipeIds.length)) ||
    !Array.isArray(value.ownedToolIds) ||
    !value.ownedToolIds.every(
      (toolId) => typeof toolId === 'string' && isToolDefinitionId(toolId),
    ) ||
    new Set(value.ownedToolIds).size !== value.ownedToolIds.length ||
    !value.ownedToolIds.includes('bare-hands') ||
    typeof value.equippedToolId !== 'string' ||
    !isToolDefinitionId(value.equippedToolId) ||
    !value.ownedToolIds.includes(value.equippedToolId) ||
    !isEquippedItems(
      value.equippedItems,
      value.ownedToolIds,
      value.equippedToolId,
    ) ||
    (value.hotbarSlots !== undefined &&
      !isHotbarSlots(value.hotbarSlots, value.ownedToolIds)) ||
    (value.selectedHotbarIndex !== undefined &&
      (!Number.isInteger(value.selectedHotbarIndex) ||
        (value.selectedHotbarIndex as number) < 0 ||
        (value.selectedHotbarIndex as number) >= HOTBAR_SLOT_COUNT)) ||
    (value.activeAnimalPartyIds !== undefined &&
      (!Array.isArray(value.activeAnimalPartyIds) ||
        value.activeAnimalPartyIds.length > ANIMAL_PARTY_SLOT_COUNT ||
        !value.activeAnimalPartyIds.every(
          (animalId) => typeof animalId === 'string',
        ) ||
        new Set(value.activeAnimalPartyIds).size !==
          value.activeAnimalPartyIds.length)) ||
    (value.selectedCompanionAnimalId !== undefined &&
      value.selectedCompanionAnimalId !== null &&
      typeof value.selectedCompanionAnimalId !== 'string') ||
    (value.summonedCompanionAnimalId !== undefined &&
      value.summonedCompanionAnimalId !== null &&
      typeof value.summonedCompanionAnimalId !== 'string') ||
    (value.companionCommandMode !== undefined &&
      value.companionCommandMode !== 'follow' &&
      value.companionCommandMode !== 'stay' &&
      value.companionCommandMode !== 'focus')
  ) {
    return false
  }

  const mapDefinition = getMapDefinition(value.currentMapId)

  return (
    value.position.x >= 0 &&
    value.position.y >= 0 &&
    value.position.x <= mapDefinition.width &&
    value.position.y <= mapDefinition.height
  )
}

function migrateLegacySave(value: unknown): unknown {
  if (
    !isRecord(value) ||
    (value.version !== 1 &&
      value.version !== 2 &&
      value.version !== 3 &&
      value.version !== 4 &&
      value.version !== 5 &&
      value.version !== 6) ||
    !isRecord(value.player)
  ) {
    return value
  }

  const ownedToolIds =
    value.version === 1 ? ['bare-hands'] : value.player.ownedToolIds
  const equippedToolId =
    value.version === 1 ? 'bare-hands' : value.player.equippedToolId
  const equippedItems =
    value.version === 3 ||
    value.version === 4 ||
    value.version === 5 ||
    value.version === 6
    ? value.player.equippedItems
    : typeof equippedToolId === 'string' &&
        isToolDefinitionId(equippedToolId) &&
        equippedToolId !== 'bare-hands'
      ? { rightHand: equippedToolId }
      : {}
  const capturedAnimals = Array.isArray(value.capturedAnimals)
    ? value.capturedAnimals.map((animal, index) =>
        isRecord(animal)
          ? {
              ...animal,
              gender:
                animal.gender === 'male' || animal.gender === 'female'
                  ? animal.gender
                  : index % 2 === 0
                    ? 'male'
                    : 'female',
            }
          : animal,
      )
    : value.capturedAnimals

  return {
    ...value,
    version: SAVE_VERSION,
    player: {
      ...value.player,
      ownedToolIds,
      equippedToolId,
      equippedItems,
      hunger:
        value.version === 4 ||
        value.version === 5 ||
        value.version === 6
          ? isFiniteNumber(value.player.hunger)
            ? value.player.hunger
            : PLAYER_MAX_HUNGER
          : PLAYER_MAX_HUNGER,
    },
    capturedAnimals,
    inventory: addNewFoodSlot(value.inventory),
    bases: Array.isArray(value.bases)
      ? value.bases.map((base) =>
          isRecord(base)
            ? { ...base, storage: addNewFoodSlot(base.storage) }
            : base,
        )
      : value.bases,
  }
}

function normalizeSaveForCurrentContent(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  const recoveryReferenceAt =
    isFiniteNumber(value.savedAt) && value.savedAt >= 0
      ? Math.floor(value.savedAt)
      : Date.now()
  const capturedAnimals = normalizeCapturedAnimals(
    value.capturedAnimals,
    recoveryReferenceAt,
  )
  const playerWithParty = addMissingAnimalParty(
    value.player,
    capturedAnimals,
  )

  return {
    ...value,
    player: addMissingCompanionState(playerWithParty),
    capturedAnimals,
    inventory: addMissingItemSlots(value.inventory),
    bases: Array.isArray(value.bases)
      ? value.bases.map((base) =>
          isRecord(base)
            ? { ...base, storage: addMissingItemSlots(base.storage) }
            : base,
        )
      : value.bases,
  }
}

function normalizeCapturedAnimals(
  value: unknown,
  recoveryReferenceAt: number,
): unknown {
  if (!Array.isArray(value)) {
    return value
  }

  return value.map((animal) =>
    normalizeCapturedAnimal(animal, recoveryReferenceAt),
  )
}

function normalizeCapturedAnimal(
  value: unknown,
  recoveryReferenceAt: number,
): unknown {
  if (
    !isRecord(value) ||
    typeof value.animalDefinitionId !== 'string' ||
    !Object.prototype.hasOwnProperty.call(
      ANIMAL_DEFINITIONS,
      value.animalDefinitionId,
    )
  ) {
    return value
  }

  const definition = ANIMAL_DEFINITIONS[value.animalDefinitionId]
  const level =
    Number.isInteger(value.level) && (value.level as number) >= 1
      ? (value.level as number)
      : 1
  const experience =
    isFiniteNumber(value.experience) && value.experience >= 0
      ? Math.floor(value.experience)
      : 0
  const experienceToNextLevel =
    isFiniteNumber(value.experienceToNextLevel) &&
    value.experienceToNextLevel > 0
      ? Math.max(1, Math.floor(value.experienceToNextLevel))
      : getAnimalExperienceToNextLevel(level)
  const potential = normalizeAnimalPotential(value.potential)
  const passiveTraitIds = normalizePassiveTraitIds(
    value.passiveTraitIds,
  )
  const stats = calculateAnimalStats(
    definition,
    level,
    potential,
    passiveTraitIds,
  )
  const previousMaxHp = getPreviousAnimalMaxHp(value, definition.maxHp)
  const previousCurrentHp =
    isFiniteNumber(value.currentHp) && value.currentHp >= 0
      ? value.currentHp
      : previousMaxHp
  const hpRatio = Math.max(
    0,
    Math.min(1, previousCurrentHp / previousMaxHp),
  )
  const currentHp =
    previousCurrentHp <= 0
      ? 0
      : Math.max(1, Math.round(stats.maxHp * hpRatio))
  const condition = getAnimalCondition(currentHp, stats.maxHp)
  const trust = normalizeAnimalTrust(
    isFiniteNumber(value.trust) ? value.trust : 0,
  )
  const learnedActiveSkillIds = getLearnedAnimalSkillIds(
    definition,
    level,
  )
  const equippedActiveSkillIds = normalizeEquippedActiveSkillIds(
    value.equippedActiveSkillIds,
    learnedActiveSkillIds,
  )
  const partnerEquipmentId = normalizeCompanionEquipmentId(
    value.partnerEquipmentId,
    value.animalDefinitionId,
  )
  const lastRecoveryAt =
    isFiniteNumber(value.lastRecoveryAt) && value.lastRecoveryAt >= 0
      ? Math.floor(value.lastRecoveryAt)
      : recoveryReferenceAt
  const reviveAt =
    condition === 'incapacitated'
      ? isFiniteNumber(value.reviveAt) && value.reviveAt >= 0
        ? Math.floor(value.reviveAt)
        : recoveryReferenceAt + ANIMAL_REVIVE_DURATION_MS
      : null

  return {
    dataVersion: ANIMAL_INSTANCE_DATA_VERSION,
    id: value.id,
    animalDefinitionId: value.animalDefinitionId,
    name: value.name,
    gender: value.gender,
    capturedAt:
      isFiniteNumber(value.capturedAt) && value.capturedAt >= 0
        ? Math.floor(value.capturedAt)
        : 0,
    level,
    experience: Math.min(experience, experienceToNextLevel - 1),
    experienceToNextLevel,
    currentHp,
    stats,
    potential,
    passiveTraitIds,
    condition,
    trust,
    learnedActiveSkillIds,
    equippedActiveSkillIds,
    partnerEquipmentId,
    lastRecoveryAt,
    reviveAt,
    workSkills: value.workSkills,
    workAssignment: value.workAssignment ?? null,
  }
}

function normalizeAnimalPotential(value: unknown): AnimalPotential {
  if (
    !isRecord(value) ||
    !isPotentialValue(value.vitality) ||
    !isPotentialValue(value.strength) ||
    !isPotentialValue(value.resilience)
  ) {
    return createNeutralAnimalPotential()
  }

  return {
    vitality: Math.round(value.vitality),
    strength: Math.round(value.strength),
    resilience: Math.round(value.resilience),
  }
}

function normalizePassiveTraitIds(
  value: unknown,
): readonly AnimalPassiveTraitId[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenTraitIds = new Set<AnimalPassiveTraitId>()

  return value
    .filter((traitId): traitId is AnimalPassiveTraitId => {
      if (
        typeof traitId !== 'string' ||
        !Object.prototype.hasOwnProperty.call(
          ANIMAL_PASSIVE_TRAITS,
          traitId,
        ) ||
        seenTraitIds.has(traitId as AnimalPassiveTraitId)
      ) {
        return false
      }

      seenTraitIds.add(traitId as AnimalPassiveTraitId)
      return true
    })
    .slice(0, ANIMAL_MAX_PASSIVE_TRAITS)
}

function normalizeEquippedActiveSkillIds(
  value: unknown,
  learnedActiveSkillIds: readonly AnimalActiveSkillId[],
) {
  const learnedSkillIdSet = new Set(learnedActiveSkillIds)
  const equippedSkillIds =
    Array.isArray(value) && value.length === ANIMAL_ACTIVE_SKILL_SLOT_COUNT
      ? value
      : createEquippedAnimalSkillSlots(learnedActiveSkillIds)
  const normalizedSlots = Array.from(
    { length: ANIMAL_ACTIVE_SKILL_SLOT_COUNT },
    () => null as AnimalActiveSkillId | null,
  )
  const usedSkillIds = new Set<AnimalActiveSkillId>()

  equippedSkillIds.forEach((skillId, index) => {
    if (
      index >= ANIMAL_ACTIVE_SKILL_SLOT_COUNT ||
      typeof skillId !== 'string' ||
      !learnedSkillIdSet.has(skillId as AnimalActiveSkillId) ||
      usedSkillIds.has(skillId as AnimalActiveSkillId)
    ) {
      return
    }

    normalizedSlots[index] = skillId as AnimalActiveSkillId
    usedSkillIds.add(skillId as AnimalActiveSkillId)
  })

  learnedActiveSkillIds.forEach((skillId) => {
    if (usedSkillIds.has(skillId)) {
      return
    }

    const emptySlotIndex = normalizedSlots.indexOf(null)

    if (emptySlotIndex < 0) {
      return
    }

    normalizedSlots[emptySlotIndex] = skillId
    usedSkillIds.add(skillId)
  })

  return normalizedSlots
}

function normalizeCompanionEquipmentId(
  value: unknown,
  animalDefinitionId: string,
): CompanionEquipmentId | null {
  if (
    typeof value !== 'string' ||
    !isCompanionEquipmentId(value) ||
    COMPANION_EQUIPMENT[value].animalDefinitionId !==
      animalDefinitionId
  ) {
    return null
  }

  return value
}

function getPreviousAnimalMaxHp(
  value: Record<string, unknown>,
  fallback: number,
) {
  if (
    isRecord(value.stats) &&
    isFiniteNumber(value.stats.maxHp) &&
    value.stats.maxHp > 0
  ) {
    return value.stats.maxHp
  }

  return isFiniteNumber(value.maxHp) && value.maxHp > 0
    ? value.maxHp
    : fallback
}

function isPotentialValue(value: unknown): value is number {
  return (
    isFiniteNumber(value) &&
    value >= 0 &&
    value <= ANIMAL_MAX_POTENTIAL
  )
}

function addMissingCompanionState(playerValue: unknown): unknown {
  if (!isRecord(playerValue)) {
    return playerValue
  }

  const activeAnimalPartyIds = Array.isArray(
    playerValue.activeAnimalPartyIds,
  )
    ? playerValue.activeAnimalPartyIds.filter(
        (animalId): animalId is string => typeof animalId === 'string',
      )
    : []
  const activeAnimalPartyIdSet = new Set(activeAnimalPartyIds)
  const selectedCompanionAnimalId =
    typeof playerValue.selectedCompanionAnimalId === 'string' &&
    activeAnimalPartyIdSet.has(playerValue.selectedCompanionAnimalId)
      ? playerValue.selectedCompanionAnimalId
      : activeAnimalPartyIds[0] ?? null
  const summonedCompanionAnimalId =
    typeof playerValue.summonedCompanionAnimalId === 'string' &&
    activeAnimalPartyIdSet.has(playerValue.summonedCompanionAnimalId)
      ? playerValue.summonedCompanionAnimalId
      : null
  const companionCommandMode =
    playerValue.companionCommandMode === 'stay' ||
    playerValue.companionCommandMode === 'focus'
      ? playerValue.companionCommandMode
      : 'follow'

  return {
    ...playerValue,
    selectedCompanionAnimalId,
    summonedCompanionAnimalId,
    companionCommandMode,
  }
}

function addMissingAnimalParty(
  playerValue: unknown,
  capturedAnimalsValue: unknown,
): unknown {
  if (!isRecord(playerValue)) {
    return playerValue
  }

  const availableAnimalIds = Array.isArray(capturedAnimalsValue)
    ? capturedAnimalsValue
        .filter(
          (animal) =>
            isRecord(animal) &&
            typeof animal.id === 'string' &&
            animal.condition !== 'incapacitated' &&
            (animal.workAssignment === null ||
              animal.workAssignment === undefined),
        )
        .map((animal) => animal.id as string)
    : []
  const availableAnimalIdSet = new Set(availableAnimalIds)
  const savedPartyIds = Array.isArray(playerValue.activeAnimalPartyIds)
    ? playerValue.activeAnimalPartyIds.filter(
        (animalId): animalId is string => typeof animalId === 'string',
      )
    : availableAnimalIds
  const seenAnimalIds = new Set<string>()
  const activeAnimalPartyIds = savedPartyIds
    .filter((animalId) => {
      if (
        !availableAnimalIdSet.has(animalId) ||
        seenAnimalIds.has(animalId)
      ) {
        return false
      }

      seenAnimalIds.add(animalId)
      return true
    })
    .slice(0, ANIMAL_PARTY_SLOT_COUNT)

  return {
    ...playerValue,
    activeAnimalPartyIds,
  }
}

function addNewFoodSlot(value: unknown): unknown {
  return addMissingItemSlots(value)
}

function addMissingItemSlots(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  const storage = { ...value }

  Object.keys(ITEM_DEFINITIONS).forEach((itemKey) => {
    if (!isFiniteNumber(storage[itemKey])) {
      storage[itemKey] = 0
    }
  })

  return storage
}

function isEquippedItems(
  value: unknown,
  ownedToolIds: readonly string[],
  equippedToolId: string,
) {
  if (!isRecord(value)) {
    return false
  }

  const equippedEntries = Object.entries(value)
  const equippedToolIds = equippedEntries.map(([, toolId]) => toolId)

  if (
    new Set(equippedToolIds).size !== equippedToolIds.length ||
    !equippedEntries.every(
      ([slotId, toolId]) =>
        EQUIPMENT_SLOT_IDS.includes(slotId as EquipmentSlotId) &&
        typeof toolId === 'string' &&
        isToolDefinitionId(toolId) &&
        ownedToolIds.includes(toolId) &&
        TOOL_DEFINITIONS[toolId].equipmentSlot === slotId,
    )
  ) {
    return false
  }

  return (value.rightHand ?? 'bare-hands') === equippedToolId
}

function isHotbarSlots(
  value: unknown,
  ownedToolIds: readonly string[],
): value is readonly HotbarSlot[] {
  return (
    Array.isArray(value) &&
    value.length === HOTBAR_SLOT_COUNT &&
    value.every((slot) => {
      if (slot === null) {
        return true
      }

      if (!isRecord(slot) || (slot.kind !== 'item' && slot.kind !== 'tool')) {
        return false
      }

      if (slot.kind === 'item') {
        return (
          typeof slot.itemId === 'string' &&
          Object.prototype.hasOwnProperty.call(ITEM_DEFINITIONS, slot.itemId)
        )
      }

      return (
        typeof slot.toolId === 'string' &&
        isToolDefinitionId(slot.toolId) &&
        ownedToolIds.includes(slot.toolId)
      )
    })
  )
}

function isBaseSaveData(value: unknown): value is BaseSaveData {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isItemStorage(value.storage) &&
    Array.isArray(value.buildings) &&
    value.buildings.every(isPlacedBuilding)
  )
}

function isMapSaveRecord(value: unknown) {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([mapId, mapState]) =>
        isMapId(mapId) && isMapSaveData(mapState, mapId),
    )
  )
}

function isMapSaveData(value: unknown, mapId: MapId): value is MapSaveData {
  if (
    !isRecord(value) ||
    !Array.isArray(value.resources) ||
    !value.resources.every(isResourceSpawnState) ||
    !Array.isArray(value.processedEventIds) ||
    !value.processedEventIds.every((eventId) => typeof eventId === 'string')
  ) {
    return false
  }

  const resourceIds = value.resources.map(
    (resourceState) => (resourceState as ResourceSpawnState).id,
  )
  const validResourceIds = new Set(
    getMapDefinition(mapId).resourceSpawns.map((spawnPoint) => spawnPoint.id),
  )

  return (
    new Set(resourceIds).size === resourceIds.length &&
    resourceIds.every((resourceId) => validResourceIds.has(resourceId))
  )
}

function isResourceSpawnState(value: unknown): value is ResourceSpawnState {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.respawnAt === null ||
      (isFiniteNumber(value.respawnAt) && value.respawnAt >= 0)) &&
    typeof value.blockedByBuilding === 'boolean'
  )
}

function isCapturedAnimal(value: unknown): value is CapturedAnimal {
  return (
    isRecord(value) &&
    value.dataVersion === ANIMAL_INSTANCE_DATA_VERSION &&
    typeof value.id === 'string' &&
    typeof value.animalDefinitionId === 'string' &&
    Object.prototype.hasOwnProperty.call(
      ANIMAL_DEFINITIONS,
      value.animalDefinitionId,
    ) &&
    typeof value.name === 'string' &&
    (value.gender === 'male' || value.gender === 'female') &&
    isFiniteNumber(value.capturedAt) &&
    value.capturedAt >= 0 &&
    Number.isInteger(value.level) &&
    (value.level as number) >= 1 &&
    Number.isInteger(value.experience) &&
    (value.experience as number) >= 0 &&
    Number.isInteger(value.experienceToNextLevel) &&
    (value.experienceToNextLevel as number) > 0 &&
    (value.experience as number) <
      (value.experienceToNextLevel as number) &&
    isFiniteNumber(value.currentHp) &&
    value.currentHp >= 0 &&
    isAnimalStats(value.stats) &&
    value.currentHp <= value.stats.maxHp &&
    isAnimalPotential(value.potential) &&
    isPassiveTraitIdList(value.passiveTraitIds) &&
    Number.isInteger(value.trust) &&
    (value.trust as number) >= 0 &&
    (value.trust as number) <= ANIMAL_MAX_TRUST &&
    isAnimalActiveSkillProgress(
      value.learnedActiveSkillIds,
      value.equippedActiveSkillIds,
    ) &&
    isValidCompanionEquipment(
      value.partnerEquipmentId,
      value.animalDefinitionId,
    ) &&
    isFiniteNumber(value.lastRecoveryAt) &&
    value.lastRecoveryAt >= 0 &&
    (value.reviveAt === null ||
      (isFiniteNumber(value.reviveAt) && value.reviveAt >= 0)) &&
    (value.condition === 'healthy' ||
      value.condition === 'injured' ||
      value.condition === 'incapacitated') &&
    value.condition === getAnimalCondition(value.currentHp, value.stats.maxHp) &&
    (value.condition === 'incapacitated'
      ? value.reviveAt !== null
      : value.reviveAt === null) &&
    isWorkSkillRecord(value.workSkills) &&
    (value.workAssignment === null || isWorkAssignment(value.workAssignment))
  )
}

function isAnimalStats(value: unknown): value is AnimalStats {
  return (
    isRecord(value) &&
    isPositiveFiniteNumber(value.maxHp) &&
    isPositiveFiniteNumber(value.attack) &&
    isPositiveFiniteNumber(value.defense) &&
    isPositiveFiniteNumber(value.workSpeed) &&
    isPositiveFiniteNumber(value.moveSpeed)
  )
}

function isAnimalPotential(value: unknown): value is AnimalPotential {
  return (
    isRecord(value) &&
    isPotentialValue(value.vitality) &&
    isPotentialValue(value.strength) &&
    isPotentialValue(value.resilience)
  )
}

function isPassiveTraitIdList(
  value: unknown,
): value is readonly AnimalPassiveTraitId[] {
  return (
    Array.isArray(value) &&
    value.length <= ANIMAL_MAX_PASSIVE_TRAITS &&
    new Set(value).size === value.length &&
    value.every(
      (traitId) =>
        typeof traitId === 'string' &&
        Object.prototype.hasOwnProperty.call(
          ANIMAL_PASSIVE_TRAITS,
          traitId,
        ),
    )
  )
}

function isAnimalActiveSkillProgress(
  learnedValue: unknown,
  equippedValue: unknown,
) {
  if (
    !Array.isArray(learnedValue) ||
    new Set(learnedValue).size !== learnedValue.length ||
    !learnedValue.every(isAnimalActiveSkillId) ||
    !Array.isArray(equippedValue) ||
    equippedValue.length !== ANIMAL_ACTIVE_SKILL_SLOT_COUNT ||
    !equippedValue.every(
      (skillId) => skillId === null || isAnimalActiveSkillId(skillId),
    )
  ) {
    return false
  }

  const equippedSkillIds = equippedValue.filter(
    (skillId): skillId is AnimalActiveSkillId => skillId !== null,
  )

  return (
    new Set(equippedSkillIds).size === equippedSkillIds.length &&
    equippedSkillIds.every((skillId) => learnedValue.includes(skillId))
  )
}

function isAnimalActiveSkillId(
  value: unknown,
): value is AnimalActiveSkillId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ANIMAL_ACTIVE_SKILLS, value)
  )
}

function isValidCompanionEquipment(
  value: unknown,
  animalDefinitionId: string,
) {
  return (
    value === null ||
    (typeof value === 'string' &&
      isCompanionEquipmentId(value) &&
      COMPANION_EQUIPMENT[value].animalDefinitionId ===
        animalDefinitionId)
  )
}

function isPlacedBuilding(value: unknown): value is PlacedBuilding {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.mapId !== 'string' ||
    !isMapId(value.mapId) ||
    typeof value.definitionId !== 'string' ||
    !Object.prototype.hasOwnProperty.call(
      BUILDING_DEFINITIONS,
      value.definitionId,
    ) ||
    typeof value.name !== 'string' ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    (value.rotation !== 0 &&
      value.rotation !== 90 &&
      value.rotation !== 180 &&
      value.rotation !== 270) ||
    !isFiniteNumber(value.width) ||
    value.width <= 0 ||
    !isFiniteNumber(value.height) ||
    value.height <= 0 ||
    (value.accessPoint !== null && !isWorldPoint(value.accessPoint)) ||
    !Array.isArray(value.assignedAnimalIds) ||
    !value.assignedAnimalIds.every((animalId) => typeof animalId === 'string')
  ) {
    return false
  }

  const mapDefinition = getMapDefinition(value.mapId)

  return (
    value.x - value.width / 2 >= 0 &&
    value.y - value.height / 2 >= 0 &&
    value.x + value.width / 2 <= mapDefinition.width &&
    value.y + value.height / 2 <= mapDefinition.height &&
    (value.accessPoint === null ||
      (value.accessPoint.x >= 0 &&
        value.accessPoint.y >= 0 &&
        value.accessPoint.x <= mapDefinition.width &&
        value.accessPoint.y <= mapDefinition.height))
  )
}

function isWorkAssignment(value: unknown): value is WorkAssignment {
  return (
    isRecord(value) &&
    typeof value.buildingId === 'string' &&
    typeof value.skill === 'string' &&
    WORK_SKILLS.includes(value.skill as WorkSkill)
  )
}

function isWorkSkillRecord(value: unknown) {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([skill, level]) =>
        WORK_SKILLS.includes(skill as WorkSkill) &&
        isFiniteNumber(level) &&
        level >= 0,
    )
  )
}

function isCraftingRecipeId(value: unknown): value is CraftingRecipeId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(CRAFTING_RECIPES, value)
  )
}

function isItemStorage(value: unknown): value is Record<InventoryItemKey, number> {
  return (
    isRecord(value) &&
    Object.keys(ITEM_DEFINITIONS).every(
      (itemKey) =>
        isFiniteNumber(value[itemKey]) &&
        (value[itemKey] as number) >= 0,
    )
  )
}

function isWorldPoint(value: unknown): value is WorldPoint {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0
}
