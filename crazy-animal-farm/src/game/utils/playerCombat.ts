import { TOOL_DEFINITIONS } from '../data/equipment'
import type {
  EquipmentDurability,
  EquippedItems,
  ToolDefinitionId,
} from '../types/equipment'

export function getPlayerArmorRating(
  equippedItems: EquippedItems,
  equipmentDurability: EquipmentDurability,
) {
  const equippedToolIds = new Set(
    Object.values(equippedItems).filter(
      (toolId): toolId is ToolDefinitionId => toolId !== undefined,
    ),
  )

  let armorRating = 0

  equippedToolIds.forEach((toolId) => {
    if (!isEquipmentUsable(toolId, equipmentDurability)) {
      return
    }

    armorRating += TOOL_DEFINITIONS[toolId].armorRating ?? 0
  })

  return Math.max(0, Math.round(armorRating))
}

export function calculateMitigatedPlayerDamage(
  rawDamage: number,
  armorRating: number,
) {
  if (rawDamage <= 0) {
    return 0
  }

  const safeArmorRating = Math.max(0, armorRating)

  return Math.max(
    1,
    Math.round(rawDamage * (100 / (100 + safeArmorRating))),
  )
}

export function isEquipmentUsable(
  toolId: ToolDefinitionId,
  equipmentDurability: EquipmentDurability,
) {
  const maxDurability = TOOL_DEFINITIONS[toolId].maxDurability

  if (maxDurability === undefined) {
    return true
  }

  return (equipmentDurability[toolId] ?? maxDurability) > 0
}

export function getEquipmentDurability(
  toolId: ToolDefinitionId,
  equipmentDurability: EquipmentDurability,
) {
  const maxDurability = TOOL_DEFINITIONS[toolId].maxDurability

  if (maxDurability === undefined) {
    return null
  }

  return Math.min(
    maxDurability,
    Math.max(0, equipmentDurability[toolId] ?? maxDurability),
  )
}
