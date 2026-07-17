import {
  ANIMAL_ACTIVE_SKILL_SLOT_COUNT,
  ANIMAL_INITIAL_EXPERIENCE_TO_NEXT_LEVEL,
  ANIMAL_INSTANCE_DATA_VERSION,
  ANIMAL_MAX_PASSIVE_TRAITS,
  ANIMAL_MAX_POTENTIAL,
  ANIMAL_MAX_TRUST,
  ANIMAL_REVIVE_DURATION_MS,
  ANIMAL_REVIVE_HP_RATIO,
  ANIMAL_STORAGE_RECOVERY_INTERVAL_MS,
  ANIMAL_STORAGE_RECOVERY_RATIO,
} from '../config/gameConstants'
import {
  ANIMAL_PASSIVE_TRAIT_IDS,
  ANIMAL_PASSIVE_TRAITS,
} from '../data/animalTraits'
import type {
  AnimalActiveSkillId,
  AnimalCondition,
  AnimalDefinition,
  AnimalGender,
  AnimalPassiveTraitDefinition,
  AnimalPassiveTraitId,
  AnimalPotential,
  AnimalStats,
  CapturedAnimal,
} from '../types/animal'

export type AnimalGrowthResult = Readonly<{
  animal: CapturedAnimal
  levelsGained: number
  learnedSkillIds: readonly AnimalActiveSkillId[]
}>

export type AnimalDamageResult = Readonly<{
  animal: CapturedAnimal
  damageTaken: number
  incapacitated: boolean
}>

export type AnimalRecoveryResult = Readonly<{
  animal: CapturedAnimal
  healedAmount: number
  revived: boolean
}>

type CreateCapturedAnimalOptions = Readonly<{
  id: string
  definition: AnimalDefinition
  gender: AnimalGender
  wildCurrentHp: number
  capturedAt: number
  random?: () => number
}>

export function createCapturedAnimalInstance({
  id,
  definition,
  gender,
  wildCurrentHp,
  capturedAt,
  random = Math.random,
}: CreateCapturedAnimalOptions): CapturedAnimal {
  const level = 1
  const potential = rollAnimalPotential(random)
  const passiveTraitIds = rollAnimalPassiveTraits(random)
  const stats = calculateAnimalStats(
    definition,
    level,
    potential,
    passiveTraitIds,
  )
  const wildHpRatio = clamp(wildCurrentHp / definition.maxHp, 0, 1)
  const currentHp = Math.max(1, Math.round(stats.maxHp * wildHpRatio))
  const learnedActiveSkillIds = getLearnedAnimalSkillIds(definition, level)

  return {
    dataVersion: ANIMAL_INSTANCE_DATA_VERSION,
    id,
    animalDefinitionId: definition.id,
    name: definition.name,
    gender,
    capturedAt,
    level,
    experience: 0,
    experienceToNextLevel: getAnimalExperienceToNextLevel(level),
    currentHp,
    stats,
    potential,
    passiveTraitIds,
    condition: getAnimalCondition(currentHp, stats.maxHp),
    trust: 0,
    learnedActiveSkillIds,
    equippedActiveSkillIds: createEquippedAnimalSkillSlots(
      learnedActiveSkillIds,
    ),
    partnerEquipmentId: null,
    lastRecoveryAt: capturedAt,
    reviveAt: null,
    workSkills: definition.workSkills,
    workAssignment: null,
  }
}

export function gainAnimalExperience(
  animal: CapturedAnimal,
  definition: AnimalDefinition,
  amount: number,
): AnimalGrowthResult {
  const safeAmount = Math.max(0, Math.floor(amount))

  if (safeAmount === 0 || animal.condition === 'incapacitated') {
    return {
      animal,
      levelsGained: 0,
      learnedSkillIds: [],
    }
  }

  let level = animal.level
  let experience = animal.experience + safeAmount
  let experienceToNextLevel = animal.experienceToNextLevel
  let levelsGained = 0

  while (experience >= experienceToNextLevel) {
    experience -= experienceToNextLevel
    level += 1
    levelsGained += 1
    experienceToNextLevel = getAnimalExperienceToNextLevel(level)
  }

  if (levelsGained === 0) {
    return {
      animal: { ...animal, experience },
      levelsGained: 0,
      learnedSkillIds: [],
    }
  }

  const stats = calculateAnimalStats(
    definition,
    level,
    animal.potential,
    animal.passiveTraitIds,
  )
  const hpRatio = animal.currentHp / Math.max(1, animal.stats.maxHp)
  const currentHp = Math.max(1, Math.round(stats.maxHp * hpRatio))
  const learnedActiveSkillIds = getLearnedAnimalSkillIds(definition, level)
  const learnedSkillIds = learnedActiveSkillIds.filter(
    (skillId) => !animal.learnedActiveSkillIds.includes(skillId),
  )

  return {
    animal: {
      ...animal,
      level,
      experience,
      experienceToNextLevel,
      currentHp,
      stats,
      condition: getAnimalCondition(currentHp, stats.maxHp),
      learnedActiveSkillIds,
      equippedActiveSkillIds: fillEmptyAnimalSkillSlots(
        animal.equippedActiveSkillIds,
        learnedActiveSkillIds,
      ),
    },
    levelsGained,
    learnedSkillIds,
  }
}

export function applyAnimalDamage(
  animal: CapturedAnimal,
  rawDamage: number,
  damagedAt: number,
): AnimalDamageResult {
  if (
    rawDamage <= 0 ||
    animal.condition === 'incapacitated'
  ) {
    return {
      animal,
      damageTaken: 0,
      incapacitated: animal.condition === 'incapacitated',
    }
  }

  const damageTaken = Math.max(
    1,
    Math.round(
      rawDamage * (100 / (100 + animal.stats.defense * 4)),
    ),
  )
  const currentHp = Math.max(0, animal.currentHp - damageTaken)
  const incapacitated = currentHp === 0

  return {
    animal: {
      ...animal,
      currentHp,
      condition: getAnimalCondition(currentHp, animal.stats.maxHp),
      lastRecoveryAt: damagedAt,
      reviveAt: incapacitated
        ? damagedAt + ANIMAL_REVIVE_DURATION_MS
        : null,
    },
    damageTaken,
    incapacitated,
  }
}

export function recoverStoredAnimal(
  animal: CapturedAnimal,
  recoveryAt: number,
): AnimalRecoveryResult {
  if (animal.currentHp >= animal.stats.maxHp) {
    return {
      animal:
        animal.reviveAt === null
          ? animal
          : { ...animal, reviveAt: null },
      healedAmount: 0,
      revived: false,
    }
  }

  if (animal.condition === 'incapacitated') {
    if (!animal.reviveAt || recoveryAt < animal.reviveAt) {
      return { animal, healedAmount: 0, revived: false }
    }

    const currentHp = Math.max(
      1,
      Math.ceil(animal.stats.maxHp * ANIMAL_REVIVE_HP_RATIO),
    )

    return {
      animal: {
        ...animal,
        currentHp,
        condition: getAnimalCondition(currentHp, animal.stats.maxHp),
        lastRecoveryAt: recoveryAt,
        reviveAt: null,
      },
      healedAmount: currentHp,
      revived: true,
    }
  }

  const elapsedIntervals = Math.floor(
    Math.max(0, recoveryAt - animal.lastRecoveryAt) /
      ANIMAL_STORAGE_RECOVERY_INTERVAL_MS,
  )

  if (elapsedIntervals <= 0) {
    return { animal, healedAmount: 0, revived: false }
  }

  const healPerInterval = Math.max(
    1,
    Math.ceil(animal.stats.maxHp * ANIMAL_STORAGE_RECOVERY_RATIO),
  )
  const currentHp = Math.min(
    animal.stats.maxHp,
    animal.currentHp + healPerInterval * elapsedIntervals,
  )

  return {
    animal: {
      ...animal,
      currentHp,
      condition: getAnimalCondition(currentHp, animal.stats.maxHp),
      lastRecoveryAt:
        animal.lastRecoveryAt +
        elapsedIntervals * ANIMAL_STORAGE_RECOVERY_INTERVAL_MS,
    },
    healedAmount: currentHp - animal.currentHp,
    revived: false,
  }
}

export function getLearnedAnimalSkillIds(
  definition: AnimalDefinition,
  level: number,
): readonly AnimalActiveSkillId[] {
  return definition.skillProgression
    .filter((entry) => level >= entry.unlockLevel)
    .map((entry) => entry.skillId)
}

export function createEquippedAnimalSkillSlots(
  learnedSkillIds: readonly AnimalActiveSkillId[],
): readonly (AnimalActiveSkillId | null)[] {
  return Array.from(
    { length: ANIMAL_ACTIVE_SKILL_SLOT_COUNT },
    (_, index) => learnedSkillIds[index] ?? null,
  )
}

export function normalizeAnimalTrust(value: number) {
  return Math.max(0, Math.min(ANIMAL_MAX_TRUST, Math.round(value)))
}

export function calculateAnimalStats(
  definition: AnimalDefinition,
  level: number,
  potential: AnimalPotential,
  passiveTraitIds: readonly AnimalPassiveTraitId[],
): AnimalStats {
  const safeLevel = Math.max(1, Math.floor(level))
  const hpLevelMultiplier = 1 + (safeLevel - 1) * 0.06
  const combatLevelMultiplier = 1 + (safeLevel - 1) * 0.045
  const workLevelMultiplier = 1 + (safeLevel - 1) * 0.01
  const modifiers = getCombinedStatModifiers(passiveTraitIds)

  return {
    maxHp: roundStat(
      definition.maxHp *
        hpLevelMultiplier *
        getPotentialMultiplier(potential.vitality) *
        (1 + modifiers.maxHp),
    ),
    attack: roundStat(
      definition.attackDamage *
        combatLevelMultiplier *
        getPotentialMultiplier(potential.strength) *
        (1 + modifiers.attack),
    ),
    defense: roundStat(
      definition.defense *
        combatLevelMultiplier *
        getPotentialMultiplier(potential.resilience) *
        (1 + modifiers.defense),
    ),
    workSpeed: roundStat(
      definition.workSpeed *
        workLevelMultiplier *
        (1 + modifiers.workSpeed),
    ),
    moveSpeed: roundStat(
      definition.moveSpeed * (1 + modifiers.moveSpeed),
    ),
  }
}

export function createNeutralAnimalPotential(): AnimalPotential {
  return {
    vitality: ANIMAL_MAX_POTENTIAL / 2,
    strength: ANIMAL_MAX_POTENTIAL / 2,
    resilience: ANIMAL_MAX_POTENTIAL / 2,
  }
}

export function getAnimalExperienceToNextLevel(level: number) {
  const safeLevel = Math.max(1, Math.floor(level))

  return Math.round(
    ANIMAL_INITIAL_EXPERIENCE_TO_NEXT_LEVEL *
      Math.pow(1.18, safeLevel - 1),
  )
}

export function getAnimalCondition(
  currentHp: number,
  maxHp: number,
): AnimalCondition {
  if (currentHp <= 0) {
    return 'incapacitated'
  }

  return currentHp / Math.max(1, maxHp) <= 0.35
    ? 'injured'
    : 'healthy'
}

function rollAnimalPotential(random: () => number): AnimalPotential {
  return {
    vitality: rollPotentialValue(random),
    strength: rollPotentialValue(random),
    resilience: rollPotentialValue(random),
  }
}

function rollAnimalPassiveTraits(
  random: () => number,
): readonly AnimalPassiveTraitId[] {
  const traitCountRoll = random()
  const traitCount =
    traitCountRoll < 0.35
      ? 0
      : traitCountRoll < 0.88
        ? 1
        : 2
  const availableTraitIds = [...ANIMAL_PASSIVE_TRAIT_IDS]
  const selectedTraitIds: AnimalPassiveTraitId[] = []

  while (
    selectedTraitIds.length < traitCount &&
    availableTraitIds.length > 0 &&
    selectedTraitIds.length < ANIMAL_MAX_PASSIVE_TRAITS
  ) {
    const index = Math.min(
      availableTraitIds.length - 1,
      Math.floor(clamp(random(), 0, 0.999_999) * availableTraitIds.length),
    )
    const [traitId] = availableTraitIds.splice(index, 1)

    if (traitId) {
      selectedTraitIds.push(traitId)
    }
  }

  return selectedTraitIds
}

function getCombinedStatModifiers(
  passiveTraitIds: readonly AnimalPassiveTraitId[],
) {
  return passiveTraitIds.reduce(
    (result, traitId) => {
      const modifiers: AnimalPassiveTraitDefinition['statModifiers'] =
        ANIMAL_PASSIVE_TRAITS[traitId].statModifiers

      return {
        maxHp: result.maxHp + (modifiers.maxHp ?? 0),
        attack: result.attack + (modifiers.attack ?? 0),
        defense: result.defense + (modifiers.defense ?? 0),
        workSpeed: result.workSpeed + (modifiers.workSpeed ?? 0),
        moveSpeed: result.moveSpeed + (modifiers.moveSpeed ?? 0),
      }
    },
    {
      maxHp: 0,
      attack: 0,
      defense: 0,
      workSpeed: 0,
      moveSpeed: 0,
    },
  )
}

function getPotentialMultiplier(value: number) {
  return 0.9 + clamp(value, 0, ANIMAL_MAX_POTENTIAL) / 500
}

function rollPotentialValue(random: () => number) {
  return Math.round(
    clamp(random(), 0, 1) * ANIMAL_MAX_POTENTIAL,
  )
}

function roundStat(value: number) {
  return Math.max(1, Math.round(value))
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function fillEmptyAnimalSkillSlots(
  equippedSkillIds: readonly (AnimalActiveSkillId | null)[],
  learnedSkillIds: readonly AnimalActiveSkillId[],
) {
  const equipped = Array.from(
    { length: ANIMAL_ACTIVE_SKILL_SLOT_COUNT },
    (_, index) => equippedSkillIds[index] ?? null,
  )
  const equippedSkillIdSet = new Set(
    equipped.filter(
      (skillId): skillId is AnimalActiveSkillId => skillId !== null,
    ),
  )

  learnedSkillIds.forEach((skillId) => {
    if (equippedSkillIdSet.has(skillId)) {
      return
    }

    const emptySlotIndex = equipped.indexOf(null)

    if (emptySlotIndex >= 0) {
      equipped[emptySlotIndex] = skillId
      equippedSkillIdSet.add(skillId)
    }
  })

  return equipped
}
