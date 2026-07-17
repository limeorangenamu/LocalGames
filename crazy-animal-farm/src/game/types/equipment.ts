import type { InventoryItemKey, ItemStack } from './item'

export type PrimaryActionKind = 'combat' | 'gathering'
export type PlayerCombatStyle = 'unarmed' | 'melee' | 'ranged'
export type EquipmentSlotId =
  | 'head'
  | 'earring'
  | 'ring'
  | 'body'
  | 'cloak'
  | 'legs'
  | 'feet'
  | 'shield'
  // 기존 도구 장착 및 이전 저장 데이터 호환용 내부 슬롯
  | 'rightHand'
  | 'leftHand'
export type ToolDefinitionId =
  | 'bare-hands'
  | 'stone-axe'
  | 'reinforced-logging-axe'
  | 'wooden-shield'
  | 'copper-pickaxe'
  | 'wool-cloak'
  | 'copper-sword'
  | 'hunting-bow'
  | 'hide-armor'
  | 'copper-helmet'

export type EquippedItems = Readonly<
  Partial<Record<EquipmentSlotId, ToolDefinitionId>>
>

export type EquipmentDurability = Readonly<
  Partial<Record<ToolDefinitionId, number>>
>

export type ToolDefinition = Readonly<{
  id: ToolDefinitionId
  name: string
  equipmentSlot: EquipmentSlotId | null
  gatheringSpeedMultiplier: number
  combatSpeedMultiplier: number
  resourceDamageMultiplier: number
  combatDamageMultiplier: number
  combatStyle?: PlayerCombatStyle
  weaponDamage?: number
  attackRange?: number
  ammunitionItemId?: InventoryItemKey
  projectileSpeed?: number
  armorRating?: number
  shieldCapacity?: number
  maxDurability?: number
  durabilityLossPerUse?: number
  repairIngredients?: readonly ItemStack[]
  staminaCapacityBonus?: number
  staminaCostMultiplier?: number
  staminaRecoveryMultiplier?: number
  dodgeDistanceMultiplier?: number
}>
