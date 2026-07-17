import type {
  ToolDefinition,
  ToolDefinitionId,
} from '../types/equipment'

export const BARE_HANDS_TOOL = {
  id: 'bare-hands',
  name: '맨손',
  equipmentSlot: null,
  gatheringSpeedMultiplier: 1,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1,
  combatDamageMultiplier: 1,
  combatStyle: 'unarmed',
  weaponDamage: 12,
  attackRange: 70,
} satisfies ToolDefinition

export const STONE_AXE_TOOL = {
  id: 'stone-axe',
  name: '돌도끼',
  equipmentSlot: 'rightHand',
  gatheringSpeedMultiplier: 1.35,
  combatSpeedMultiplier: 1.05,
  resourceDamageMultiplier: 1.25,
  combatDamageMultiplier: 1.05,
  combatStyle: 'melee',
  weaponDamage: 14,
  attackRange: 74,
  maxDurability: 80,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'wood', amount: 2 },
    { item: 'stone', amount: 2 },
  ],
} satisfies ToolDefinition

export const REINFORCED_LOGGING_AXE_TOOL = {
  id: 'reinforced-logging-axe',
  name: '강화 벌목도끼',
  equipmentSlot: 'rightHand',
  gatheringSpeedMultiplier: 1.8,
  combatSpeedMultiplier: 1.1,
  resourceDamageMultiplier: 1.7,
  combatDamageMultiplier: 1.15,
  combatStyle: 'melee',
  weaponDamage: 18,
  attackRange: 78,
  maxDurability: 120,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'wood', amount: 4 },
    { item: 'stone', amount: 5 },
    { item: 'rabbitFur', amount: 2 },
  ],
} satisfies ToolDefinition

export const WOODEN_SHIELD = {
  id: 'wooden-shield',
  name: '연습용 나무 쉴드',
  equipmentSlot: 'shield',
  gatheringSpeedMultiplier: 1,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1,
  combatDamageMultiplier: 1,
  armorRating: 4,
  shieldCapacity: 40,
  maxDurability: 100,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'wood', amount: 5 },
    { item: 'rabbitFur', amount: 1 },
  ],
  staminaCostMultiplier: 1.08,
  dodgeDistanceMultiplier: 0.9,
} satisfies ToolDefinition

export const COPPER_PICKAXE = {
  id: 'copper-pickaxe',
  name: '구리 곡괭이',
  equipmentSlot: 'rightHand',
  gatheringSpeedMultiplier: 1.55,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1.55,
  combatDamageMultiplier: 1.08,
  combatStyle: 'melee',
  weaponDamage: 16,
  attackRange: 74,
  maxDurability: 110,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'wood', amount: 3 },
    { item: 'copperOre', amount: 4 },
  ],
} satisfies ToolDefinition

export const WOOL_CLOAK = {
  id: 'wool-cloak',
  name: '들판 양털 망토',
  equipmentSlot: 'cloak',
  gatheringSpeedMultiplier: 1,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1,
  combatDamageMultiplier: 1,
  armorRating: 3,
  maxDurability: 90,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'sheepWool', amount: 3 },
    { item: 'plantFiber', amount: 2 },
  ],
  staminaCapacityBonus: 20,
  staminaCostMultiplier: 0.92,
  staminaRecoveryMultiplier: 1.15,
  dodgeDistanceMultiplier: 1.08,
} satisfies ToolDefinition

export const COPPER_SWORD = {
  id: 'copper-sword',
  name: '구리 장검',
  equipmentSlot: 'rightHand',
  gatheringSpeedMultiplier: 0.8,
  combatSpeedMultiplier: 1.15,
  resourceDamageMultiplier: 0.75,
  combatDamageMultiplier: 1,
  combatStyle: 'melee',
  weaponDamage: 26,
  attackRange: 88,
  maxDurability: 140,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'copperOre', amount: 5 },
    { item: 'wood', amount: 2 },
    { item: 'boarHide', amount: 1 },
  ],
} satisfies ToolDefinition

export const HUNTING_BOW = {
  id: 'hunting-bow',
  name: '사냥용 활',
  equipmentSlot: 'rightHand',
  gatheringSpeedMultiplier: 0.6,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 0.5,
  combatDamageMultiplier: 1,
  combatStyle: 'ranged',
  weaponDamage: 20,
  attackRange: 520,
  ammunitionItemId: 'woodenArrow',
  projectileSpeed: 720,
  maxDurability: 120,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'wood', amount: 4 },
    { item: 'plantFiber', amount: 6 },
  ],
} satisfies ToolDefinition

export const HIDE_ARMOR = {
  id: 'hide-armor',
  name: '질긴 가죽 갑옷',
  equipmentSlot: 'body',
  gatheringSpeedMultiplier: 1,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1,
  combatDamageMultiplier: 1,
  armorRating: 18,
  maxDurability: 160,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'boarHide', amount: 5 },
    { item: 'plantFiber', amount: 4 },
  ],
} satisfies ToolDefinition

export const COPPER_HELMET = {
  id: 'copper-helmet',
  name: '구리 투구',
  equipmentSlot: 'head',
  gatheringSpeedMultiplier: 1,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1,
  combatDamageMultiplier: 1,
  armorRating: 10,
  maxDurability: 120,
  durabilityLossPerUse: 1,
  repairIngredients: [
    { item: 'copperOre', amount: 4 },
    { item: 'boarHide', amount: 2 },
  ],
} satisfies ToolDefinition

export const TOOL_DEFINITIONS: Readonly<
  Record<ToolDefinitionId, ToolDefinition>
> = {
  'bare-hands': BARE_HANDS_TOOL,
  'stone-axe': STONE_AXE_TOOL,
  'reinforced-logging-axe': REINFORCED_LOGGING_AXE_TOOL,
  'wooden-shield': WOODEN_SHIELD,
  'copper-pickaxe': COPPER_PICKAXE,
  'wool-cloak': WOOL_CLOAK,
  'copper-sword': COPPER_SWORD,
  'hunting-bow': HUNTING_BOW,
  'hide-armor': HIDE_ARMOR,
  'copper-helmet': COPPER_HELMET,
}

export function getDefaultEquipmentDurability(toolId: ToolDefinitionId) {
  return TOOL_DEFINITIONS[toolId].maxDurability ?? null
}

export function isToolDefinitionId(value: string): value is ToolDefinitionId {
  return Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, value)
}
