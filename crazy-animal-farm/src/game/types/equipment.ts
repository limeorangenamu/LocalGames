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

export type CraftableEquipmentId = Exclude<ToolDefinitionId, 'bare-hands'>
export type EquipmentRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
export type EquipmentBlueprintRarity = Exclude<EquipmentRarity, 'common'>
export type EquipmentBlueprintId =
  `${CraftableEquipmentId}:${EquipmentBlueprintRarity}`

export type EquipmentVariant = Readonly<{
  toolId: CraftableEquipmentId
  rarity: EquipmentRarity
  powerMultiplier: number
  protectionMultiplier: number
  durabilityMultiplier: number
}>

export type EquipmentVariants = Readonly<
  Partial<Record<ToolDefinitionId, EquipmentVariant>>
>

export type EquipmentBlueprintInventory = Readonly<
  Partial<Record<EquipmentBlueprintId, number>>
>

export type EquipmentBlueprintDrop = Readonly<{
  blueprintId: EquipmentBlueprintId
  amount: number
}>

export type EquipmentBlueprintLootEntry = Readonly<{
  blueprintId: EquipmentBlueprintId
  minAmount: number
  maxAmount: number
  chance: number
}>

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
