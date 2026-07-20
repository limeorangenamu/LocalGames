import {
  BOAR_TEXTURE_KEY,
  RABBIT_TEXTURE_KEY,
  SHEEP_TEXTURE_KEY,
} from '../config/gameConstants'
import type { AnimalDefinition } from '../types/animal'

export const CRAZY_RABBIT_DEFINITION = {
  id: 'crazy-rabbit',
  name: '미친 토끼',
  element: 'air',
  textureKey: RABBIT_TEXTURE_KEY,
  width: 56,
  height: 64,
  maxHp: 45,
  moveSpeed: 120,
  attackDamage: 8,
  defense: 4,
  workSpeed: 100,
  attackRange: 64,
  attackCooldownMs: 900,
  detectionRange: 280,
  captureDifficulty: 0.2,
  speciesCaptureBonus: 0.04,
  behaviorType: 'coward',
  fleeHealthRatio: 0.25,
  retaliationDurationMs: 4_000,
  lootTables: {
    defeated: [
      { item: 'rabbitMeat', minAmount: 2, maxAmount: 2, chance: 1 },
      { item: 'rabbitFur', minAmount: 1, maxAmount: 1, chance: 1 },
    ],
    captured: [
      { item: 'rabbitFur', minAmount: 2, maxAmount: 2, chance: 1 },
    ],
  },
  blueprintLootTables: {
    defeated: [
      {
        blueprintId: 'hunting-bow:uncommon',
        minAmount: 1,
        maxAmount: 1,
        chance: 0.08,
      },
    ],
    captured: [
      {
        blueprintId: 'stone-axe:uncommon',
        minAmount: 1,
        maxAmount: 1,
        chance: 0.05,
      },
    ],
  },
  decisionInterval: { minMs: 200, maxMs: 400 },
  workSkills: { logging: 1, carrying: 1 },
  skillProgression: [
    { skillId: 'quick-strike', unlockLevel: 1 },
    { skillId: 'evasive-step', unlockLevel: 3 },
    { skillId: 'work-chant', unlockLevel: 6 },
    { skillId: 'power-charge', unlockLevel: 9 },
  ],
  partnerSkill: {
    id: 'wind-companion',
    name: '질풍 동행',
    description: '이동 속도가 18% 증가하고 스킬 재사용 시간이 15% 감소합니다.',
    requiredEquipmentId: 'rabbit-wind-harness',
    modifiers: {
      moveSpeedMultiplier: 1.18,
      cooldownMultiplier: 0.85,
    },
  },
} satisfies AnimalDefinition

export const WOOLLY_SHEEP_DEFINITION = {
  id: 'woolly-sheep',
  name: '몽실 들양',
  element: 'nature',
  textureKey: SHEEP_TEXTURE_KEY,
  width: 62,
  height: 62,
  maxHp: 60,
  moveSpeed: 92,
  attackDamage: 6,
  defense: 7,
  workSpeed: 100,
  attackRange: 58,
  attackCooldownMs: 1_100,
  detectionRange: 235,
  captureDifficulty: 0.28,
  speciesCaptureBonus: 0.02,
  behaviorType: 'passive',
  fleeHealthRatio: 0.3,
  retaliationDurationMs: 3_000,
  lootTables: {
    defeated: [
      { item: 'sheepWool', minAmount: 3, maxAmount: 5, chance: 1 },
    ],
    captured: [
      { item: 'sheepWool', minAmount: 2, maxAmount: 3, chance: 1 },
    ],
  },
  blueprintLootTables: {
    defeated: [
      {
        blueprintId: 'wool-cloak:uncommon',
        minAmount: 1,
        maxAmount: 1,
        chance: 0.1,
      },
      {
        blueprintId: 'hide-armor:uncommon',
        minAmount: 1,
        maxAmount: 1,
        chance: 0.04,
      },
    ],
    captured: [],
  },
  decisionInterval: { minMs: 260, maxMs: 460 },
  workSkills: { farming: 1, carrying: 2 },
  skillProgression: [
    { skillId: 'guard-call', unlockLevel: 1 },
    { skillId: 'work-chant', unlockLevel: 3 },
    { skillId: 'quick-strike', unlockLevel: 6 },
    { skillId: 'evasive-step', unlockLevel: 9 },
  ],
  partnerSkill: {
    id: 'wool-guardian',
    name: '포근한 수호',
    description: '동행 중 받는 피해가 25% 감소합니다.',
    requiredEquipmentId: 'sheep-guardian-bell',
    modifiers: {
      defenseMultiplier: 0.75,
    },
  },
} satisfies AnimalDefinition

export const ROCK_BOAR_DEFINITION = {
  id: 'rock-boar',
  name: '돌진 멧돼지',
  element: 'earth',
  textureKey: BOAR_TEXTURE_KEY,
  width: 64,
  height: 64,
  maxHp: 85,
  moveSpeed: 135,
  attackDamage: 14,
  defense: 10,
  workSpeed: 100,
  attackRange: 72,
  attackCooldownMs: 1_050,
  detectionRange: 320,
  captureDifficulty: 0.38,
  speciesCaptureBonus: -0.02,
  behaviorType: 'aggressive',
  fleeHealthRatio: 0.12,
  retaliationDurationMs: 6_000,
  lootTables: {
    defeated: [
      { item: 'boarMeat', minAmount: 2, maxAmount: 4, chance: 1 },
      { item: 'boarHide', minAmount: 1, maxAmount: 2, chance: 1 },
    ],
    captured: [
      { item: 'boarHide', minAmount: 1, maxAmount: 2, chance: 1 },
    ],
  },
  blueprintLootTables: {
    defeated: [
      {
        blueprintId: 'copper-sword:uncommon',
        minAmount: 1,
        maxAmount: 1,
        chance: 0.09,
      },
      {
        blueprintId: 'copper-helmet:uncommon',
        minAmount: 1,
        maxAmount: 1,
        chance: 0.05,
      },
    ],
    captured: [
      {
        blueprintId: 'copper-pickaxe:uncommon',
        minAmount: 1,
        maxAmount: 1,
        chance: 0.04,
      },
    ],
  },
  decisionInterval: { minMs: 180, maxMs: 340 },
  workSkills: { mining: 1, carrying: 2 },
  skillProgression: [
    { skillId: 'power-charge', unlockLevel: 1 },
    { skillId: 'guard-call', unlockLevel: 3 },
    { skillId: 'quick-strike', unlockLevel: 6 },
    { skillId: 'work-chant', unlockLevel: 9 },
  ],
  partnerSkill: {
    id: 'stone-charge',
    name: '암반 돌진',
    description: '공격력이 10% 증가하고 대지 속성 피해가 추가로 22% 증가합니다.',
    requiredEquipmentId: 'boar-stone-armor',
    modifiers: {
      attackMultiplier: 1.1,
      elementDamageBonuses: {
        earth: 1.22,
      },
    },
  },
} satisfies AnimalDefinition

export const ANIMAL_DEFINITIONS: Readonly<Record<string, AnimalDefinition>> = {
  [CRAZY_RABBIT_DEFINITION.id]: CRAZY_RABBIT_DEFINITION,
  [WOOLLY_SHEEP_DEFINITION.id]: WOOLLY_SHEEP_DEFINITION,
  [ROCK_BOAR_DEFINITION.id]: ROCK_BOAR_DEFINITION,
}
