import type { DragEvent } from 'react'
import { TOOL_DEFINITIONS } from '../game/data/equipment'
import {
  EQUIPMENT_RARITIES,
  getEquipmentRarity,
} from '../game/data/equipmentProgression'
import type { EquipmentVariants } from '../game/types/equipment'
import { ITEM_DEFINITIONS } from '../game/data/items'
import type { HotbarSlot } from '../game/types/hotbar'
import { useGameStore } from '../store/useGameStore'
import { getEquipmentIcon, getItemIcon } from './itemPresentation'

type HotbarProps = Readonly<{
  variant: 'gameplay' | 'menu'
  editable?: boolean
  onDropSlot?: (event: DragEvent<HTMLElement>, index: number) => void
  onClearSlot?: (index: number) => void
  onSelectSlot?: (index: number) => void
}>

export function Hotbar({
  variant,
  editable = false,
  onDropSlot,
  onClearSlot,
  onSelectSlot,
}: HotbarProps) {
  const inventory = useGameStore((state) => state.inventory)
  const hotbarSlots = useGameStore((state) => state.hotbarSlots)
  const equipmentVariants = useGameStore((state) => state.equipmentVariants)
  const selectedHotbarIndex = useGameStore(
    (state) => state.selectedHotbarIndex,
  )
  const selectHotbarSlot = useGameStore((state) => state.selectHotbarSlot)

  return (
    <nav
      className={`hotbar hotbar--${variant}`}
      aria-label={editable ? '편집 가능한 장비 및 아이템 퀵바' : '장비 및 아이템 퀵바'}
    >
      {hotbarSlots.map((slot, index) => {
        const amount = slot?.kind === 'item' ? inventory[slot.itemId] : null
        const label = getHotbarLabel(slot, equipmentVariants)
        const toolRarity =
          slot?.kind === 'tool'
            ? getEquipmentRarity(slot.toolId, equipmentVariants)
            : null
        const keyLabel = getHotbarKeyLabel(index)

        return (
          <div
            key={index}
            className={`hotbar__slot${selectedHotbarIndex === index ? ' is-selected' : ''}${amount === 0 ? ' is-empty-stack' : ''}`}
            onDragOver={
              editable ? (event) => event.preventDefault() : undefined
            }
            onDrop={
              editable && onDropSlot
                ? (event) => onDropSlot(event, index)
                : undefined
            }
          >
            <button
              type="button"
              className="hotbar__select"
              aria-label={`${keyLabel}번 슬롯${label ? `: ${label}` : ': 비어 있음'}`}
              aria-pressed={selectedHotbarIndex === index}
              aria-keyshortcuts={String(keyLabel)}
              title={label || '비어 있음'}
              onClick={() => {
                if (onSelectSlot) {
                  onSelectSlot(index)
                } else {
                  selectHotbarSlot(index)
                }
              }}
            >
              <span className="hotbar__key">{keyLabel}</span>
              {slot && (
                <>
                  <span className="hotbar__icon">
                    {slot.kind === 'item'
                      ? getItemIcon(slot.itemId)
                      : getEquipmentIcon(slot.toolId)}
                  </span>
                  <span
                    className="hotbar__name"
                    style={
                      toolRarity
                        ? { color: EQUIPMENT_RARITIES[toolRarity].color }
                        : undefined
                    }
                  >
                    {label}
                  </span>
                  {amount !== null && (
                    <strong className="hotbar__amount">{amount}</strong>
                  )}
                </>
              )}
            </button>
            {editable && slot && onClearSlot && (
              <button
                type="button"
                className="hotbar__clear"
                aria-label={`${keyLabel}번 슬롯 비우기`}
                title="슬롯 비우기"
                onClick={() => onClearSlot(index)}
              >
                ×
              </button>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function getHotbarLabel(
  slot: HotbarSlot,
  equipmentVariants: EquipmentVariants,
) {
  if (!slot) {
    return ''
  }

  return slot.kind === 'item'
    ? ITEM_DEFINITIONS[slot.itemId].name
    : `[${EQUIPMENT_RARITIES[getEquipmentRarity(slot.toolId, equipmentVariants)].name}] ${TOOL_DEFINITIONS[slot.toolId].name}`
}

function getHotbarKeyLabel(index: number) {
  return index === 9 ? 0 : index + 1
}
