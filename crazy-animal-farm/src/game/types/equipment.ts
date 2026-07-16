export type PrimaryActionKind = 'combat' | 'gathering'
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

export type EquippedItems = Readonly<
  Partial<Record<EquipmentSlotId, ToolDefinitionId>>
>

export type ToolDefinition = Readonly<{
  id: ToolDefinitionId
  name: string
  equipmentSlot: EquipmentSlotId | null
  gatheringSpeedMultiplier: number
  combatSpeedMultiplier: number
  resourceDamageMultiplier: number
  combatDamageMultiplier: number
  shieldCapacity?: number
}>
