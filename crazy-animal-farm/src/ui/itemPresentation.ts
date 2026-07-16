import type { InventoryItemKey } from '../game/types/item'
import type { ToolDefinitionId } from '../game/types/equipment'

const ITEM_ICONS: Readonly<Record<InventoryItemKey, string>> = {
  wood: '🪵',
  stone: '🪨',
  rabbitMeat: '🥩',
  roastedRabbitMeat: '🍖',
  rabbitFur: '🧶',
  plantFiber: '🌿',
  copperOre: '🟠',
  wildBerry: '🫐',
  sheepWool: '☁️',
  boarHide: '🟫',
  boarMeat: '🥩',
  roastedBoarMeat: '🍗',
  captureCapsule: '🔴',
  rabbitWindHarness: '🪁',
  sheepGuardianBell: '🔔',
  boarStoneArmor: '🪨',
}

export function getItemIcon(itemId: InventoryItemKey) {
  return ITEM_ICONS[itemId]
}

export function getEquipmentIcon(toolId: ToolDefinitionId) {
  switch (toolId) {
    case 'wooden-shield':
      return '🛡️'
    case 'copper-pickaxe':
      return '⛏️'
    case 'wool-cloak':
      return '🧥'
    default:
      return '🪓'
  }
}
