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
} satisfies ToolDefinition

export const STONE_AXE_TOOL = {
  id: 'stone-axe',
  name: '돌도끼',
  equipmentSlot: 'rightHand',
  gatheringSpeedMultiplier: 1.35,
  combatSpeedMultiplier: 1.05,
  resourceDamageMultiplier: 1.25,
  combatDamageMultiplier: 1.05,
} satisfies ToolDefinition

export const REINFORCED_LOGGING_AXE_TOOL = {
  id: 'reinforced-logging-axe',
  name: '강화 벌목도끼',
  equipmentSlot: 'rightHand',
  gatheringSpeedMultiplier: 1.8,
  combatSpeedMultiplier: 1.1,
  resourceDamageMultiplier: 1.7,
  combatDamageMultiplier: 1.15,
} satisfies ToolDefinition

export const WOODEN_SHIELD = {
  id: 'wooden-shield',
  name: '연습용 나무 쉴드',
  equipmentSlot: 'shield',
  gatheringSpeedMultiplier: 1,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1,
  combatDamageMultiplier: 1,
  shieldCapacity: 40,
} satisfies ToolDefinition

export const COPPER_PICKAXE = {
  id: 'copper-pickaxe',
  name: '구리 곡괭이',
  equipmentSlot: 'rightHand',
  gatheringSpeedMultiplier: 1.55,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1.55,
  combatDamageMultiplier: 1.08,
} satisfies ToolDefinition

export const WOOL_CLOAK = {
  id: 'wool-cloak',
  name: '들판 양털 망토',
  equipmentSlot: 'cloak',
  gatheringSpeedMultiplier: 1,
  combatSpeedMultiplier: 1,
  resourceDamageMultiplier: 1,
  combatDamageMultiplier: 1,
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
}

export function isToolDefinitionId(value: string): value is ToolDefinitionId {
  return Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, value)
}
