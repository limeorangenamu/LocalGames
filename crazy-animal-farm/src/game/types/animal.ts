import type { InventoryItemKey, LootTableEntry } from './item'
import type { WorkAssignment, WorkSkill } from './work'

export type AnimalAiState =
  | 'WANDER'
  | 'FLEE'
  | 'ATTACK'
  | 'HURT'
  | 'CAPTURED'
  | 'DEAD'

export type AnimalBehaviorType = 'passive' | 'aggressive' | 'coward'
export type AnimalLootOutcome = 'defeated' | 'captured'
export type AnimalGender = 'male' | 'female'
export type CompanionCommandMode = 'follow' | 'stay' | 'focus'
export type AnimalCondition = 'healthy' | 'injured' | 'incapacitated'
export type AnimalElementId =
  | 'neutral'
  | 'flame'
  | 'aqua'
  | 'nature'
  | 'electric'
  | 'frost'
  | 'earth'
  | 'air'
  | 'shadow'
export type AnimalTargetStatusEffectId =
  | 'burning'
  | 'soaked'
  | 'rooted'
  | 'shocked'
  | 'chilled'
  | 'weakened'
export type AnimalSelfStatusEffectId =
  | 'guarded'
  | 'evasive'
  | 'inspired'
export type CompanionEquipmentId =
  | 'rabbit-wind-harness'
  | 'sheep-guardian-bell'
  | 'boar-stone-armor'
export type AnimalPassiveTraitId =
  | 'hearty'
  | 'ferocious'
  | 'stalwart'
  | 'diligent'
  | 'fleet-footed'
  | 'timid'
  | 'lazy'
  | 'fragile'
export type AnimalActiveSkillId =
  | 'quick-strike'
  | 'guard-call'
  | 'power-charge'
  | 'evasive-step'
  | 'work-chant'

export type AnimalSkillProgressionEntry = Readonly<{
  skillId: AnimalActiveSkillId
  unlockLevel: number
}>

export type AnimalActiveSkillDefinition = Readonly<{
  id: AnimalActiveSkillId
  name: string
  description: string
  unlockLevel: number
  element: AnimalElementId
  powerMultiplier: number
  cooldownMs: number
  targetStatusEffect?: Readonly<{
    id: AnimalTargetStatusEffectId
    chance: number
    durationMs: number
  }>
  selfStatusEffect?: Readonly<{
    id: AnimalSelfStatusEffectId
    durationMs: number
  }>
  healRatio?: number
}>

export type AnimalElementDefinition = Readonly<{
  id: AnimalElementId
  name: string
  color: string
  strongAgainst: readonly AnimalElementId[]
}>

export type AnimalTargetStatusEffectDefinition = Readonly<{
  id: AnimalTargetStatusEffectId
  name: string
  description: string
  moveSpeedMultiplier: number
  outgoingDamageMultiplier: number
}>

export type AnimalSelfStatusEffectDefinition = Readonly<{
  id: AnimalSelfStatusEffectId
  name: string
  description: string
}>

export type PartnerSkillModifiers = Readonly<{
  attackMultiplier?: number
  defenseMultiplier?: number
  moveSpeedMultiplier?: number
  cooldownMultiplier?: number
  elementDamageBonuses?: Readonly<
    Partial<Record<AnimalElementId, number>>
  >
}>

export type AnimalPartnerSkillDefinition = Readonly<{
  id: string
  name: string
  description: string
  requiredEquipmentId: CompanionEquipmentId
  modifiers: PartnerSkillModifiers
}>

export type CompanionEquipmentDefinition = Readonly<{
  id: CompanionEquipmentId
  name: string
  description: string
  animalDefinitionId: string
  inventoryItemId: InventoryItemKey
}>

export type CompanionSkillCooldownState = Readonly<{
  slotIndex: number
  skillId: AnimalActiveSkillId
  remainingMs: number
}>

export type AnimalPotential = Readonly<{
  vitality: number
  strength: number
  resilience: number
}>

export type AnimalStats = Readonly<{
  maxHp: number
  attack: number
  defense: number
  workSpeed: number
  moveSpeed: number
}>

export type AnimalPassiveTraitDefinition = Readonly<{
  id: AnimalPassiveTraitId
  name: string
  description: string
  tone: 'positive' | 'negative' | 'mixed'
  statModifiers: Readonly<Partial<Record<keyof AnimalStats, number>>>
}>

export type AnimalLootTables = Readonly<
  Record<AnimalLootOutcome, readonly LootTableEntry[]>
>

export type AnimalDefinition = Readonly<{
  id: string
  name: string
  element: AnimalElementId
  textureKey: string
  width: number
  height: number
  maxHp: number
  moveSpeed: number
  attackDamage: number
  defense: number
  workSpeed: number
  attackRange: number
  attackCooldownMs: number
  detectionRange: number
  captureDifficulty: number
  behaviorType: AnimalBehaviorType
  fleeHealthRatio: number
  retaliationDurationMs: number
  lootTables: AnimalLootTables
  decisionInterval: Readonly<{
    minMs: number
    maxMs: number
  }>
  workSkills: Readonly<Partial<Record<WorkSkill, number>>>
  skillProgression: readonly AnimalSkillProgressionEntry[]
  partnerSkill: AnimalPartnerSkillDefinition
}>

export type CapturedAnimal = Readonly<{
  dataVersion: number
  id: string
  animalDefinitionId: string
  name: string
  gender: AnimalGender
  capturedAt: number
  level: number
  experience: number
  experienceToNextLevel: number
  currentHp: number
  stats: AnimalStats
  potential: AnimalPotential
  passiveTraitIds: readonly AnimalPassiveTraitId[]
  condition: AnimalCondition
  trust: number
  learnedActiveSkillIds: readonly AnimalActiveSkillId[]
  equippedActiveSkillIds: readonly (AnimalActiveSkillId | null)[]
  partnerEquipmentId: CompanionEquipmentId | null
  lastRecoveryAt: number
  reviveAt: number | null
  workSkills: AnimalDefinition['workSkills']
  workAssignment: WorkAssignment | null
}>

export type AnimalSpawnPoint = Readonly<{
  id: string
  animalDefinitionId: string
  x: number
  y: number
}>
