import { PLAYER_MAX_STAMINA } from '../config/gameConstants'
import { TOOL_DEFINITIONS } from '../data/equipment'
import type {
  EquippedItems,
  ToolDefinitionId,
} from '../types/equipment'
import type { PlayerActionResourceProfile } from '../types/player'

export function getPlayerActionResourceProfile(
  equippedToolId: ToolDefinitionId,
  equippedItems: EquippedItems,
): PlayerActionResourceProfile {
  const equippedDefinitionIds = new Set<ToolDefinitionId>(
    Object.values(equippedItems).filter(
      (toolId): toolId is ToolDefinitionId => toolId !== undefined,
    ),
  )

  if (equippedToolId !== 'bare-hands') {
    equippedDefinitionIds.add(equippedToolId)
  }

  let maxStamina = PLAYER_MAX_STAMINA
  let staminaCostMultiplier = 1
  let staminaRecoveryMultiplier = 1
  let dodgeDistanceMultiplier = 1

  equippedDefinitionIds.forEach((toolId) => {
    const definition = TOOL_DEFINITIONS[toolId]

    maxStamina += definition.staminaCapacityBonus ?? 0
    staminaCostMultiplier *= definition.staminaCostMultiplier ?? 1
    staminaRecoveryMultiplier *= definition.staminaRecoveryMultiplier ?? 1
    dodgeDistanceMultiplier *= definition.dodgeDistanceMultiplier ?? 1
  })

  return {
    maxStamina: Math.max(1, Math.round(maxStamina)),
    staminaCostMultiplier: clamp(staminaCostMultiplier, 0.5, 2),
    staminaRecoveryMultiplier: clamp(staminaRecoveryMultiplier, 0.5, 2),
    dodgeDistanceMultiplier: clamp(dodgeDistanceMultiplier, 0.5, 1.5),
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
