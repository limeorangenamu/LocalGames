import type { ToolDefinitionId } from './equipment'
import type { InventoryItemKey } from './item'

export const HOTBAR_SLOT_COUNT = 10

export type HotbarAssignment =
  | Readonly<{
      kind: 'item'
      itemId: InventoryItemKey
    }>
  | Readonly<{
      kind: 'tool'
      toolId: ToolDefinitionId
    }>

export type HotbarSlot = HotbarAssignment | null

export function createEmptyHotbarSlots(): HotbarSlot[] {
  return Array.from({ length: HOTBAR_SLOT_COUNT }, () => null)
}
