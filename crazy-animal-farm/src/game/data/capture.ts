import {
  PLAYER_CAPTURE_POWER_PER_LEVEL,
  PLAYER_MAX_CAPTURE_POWER,
} from '../config/gameConstants'
import type { HotbarSlot } from '../types/hotbar'
import type { InventoryItemKey } from '../types/item'
import type {
  CaptureSupportModuleDefinition,
  CaptureSupportModuleId,
  CaptureToolDefinition,
  CaptureToolItemId,
} from '../types/capture'

export const CAPTURE_TOOL_DEFINITIONS = {
  captureCapsule: {
    itemId: 'captureCapsule',
    grade: 'basic',
    gradeName: '기초',
    captureBonus: 0.12,
    projectileTint: 0xd989ff,
  },
  reinforcedCaptureCapsule: {
    itemId: 'reinforcedCaptureCapsule',
    grade: 'reinforced',
    gradeName: '강화',
    captureBonus: 0.24,
    projectileTint: 0x77d9ff,
  },
  precisionCaptureCapsule: {
    itemId: 'precisionCaptureCapsule',
    grade: 'precision',
    gradeName: '정밀',
    captureBonus: 0.38,
    projectileTint: 0xffd66e,
  },
} as const satisfies Readonly<
  Record<CaptureToolItemId, CaptureToolDefinition>
>

export const CAPTURE_TOOL_ITEM_IDS = Object.keys(
  CAPTURE_TOOL_DEFINITIONS,
) as CaptureToolItemId[]

export const CAPTURE_SUPPORT_MODULES = {
  'condition-scanner': {
    id: 'condition-scanner',
    name: '상태 분석 모듈',
    description: '대상의 상태 이상마다 포획 보정을 추가로 얻습니다.',
    inventoryItemId: 'captureScannerModule',
    statusEffectBonusPerEffect: 0.025,
  },
  'rear-stabilizer': {
    id: 'rear-stabilizer',
    name: '후방 안정화 모듈',
    description: '대상의 후방에서 캡슐을 맞혔을 때 포획 보정을 추가로 얻습니다.',
    inventoryItemId: 'captureStabilizerModule',
    rearHitBonus: 0.08,
  },
} as const satisfies Readonly<
  Record<CaptureSupportModuleId, CaptureSupportModuleDefinition>
>

export const CAPTURE_SUPPORT_MODULE_IDS = Object.keys(
  CAPTURE_SUPPORT_MODULES,
) as CaptureSupportModuleId[]

export function isCaptureToolItemId(
  value: string,
): value is CaptureToolItemId {
  return Object.prototype.hasOwnProperty.call(
    CAPTURE_TOOL_DEFINITIONS,
    value,
  )
}

export function isCaptureSupportModuleId(
  value: string,
): value is CaptureSupportModuleId {
  return Object.prototype.hasOwnProperty.call(CAPTURE_SUPPORT_MODULES, value)
}

export function getCaptureSupportModuleByItemId(itemId: InventoryItemKey) {
  return CAPTURE_SUPPORT_MODULE_IDS.map(
    (moduleId) => CAPTURE_SUPPORT_MODULES[moduleId],
  ).find((definition) => definition.inventoryItemId === itemId) ?? null
}

export function resolveActiveCaptureToolItemId(
  inventory: Readonly<Record<InventoryItemKey, number>>,
  hotbarSlots: readonly HotbarSlot[],
  selectedHotbarIndex: number,
): CaptureToolItemId | null {
  const selectedSlot = hotbarSlots[selectedHotbarIndex]

  if (
    selectedSlot?.kind === 'item' &&
    isCaptureToolItemId(selectedSlot.itemId) &&
    inventory[selectedSlot.itemId] > 0
  ) {
    return selectedSlot.itemId
  }

  return (
    CAPTURE_TOOL_ITEM_IDS.find((itemId) => inventory[itemId] > 0) ?? null
  )
}

export function getDefaultPlayerCapturePower(level: number) {
  const safeLevel = Math.max(1, Math.floor(level))

  return Math.min(
    PLAYER_MAX_CAPTURE_POWER,
    (safeLevel - 1) * PLAYER_CAPTURE_POWER_PER_LEVEL,
  )
}

export function normalizePlayerCapturePower(
  value: number,
  fallbackLevel: number,
) {
  if (!Number.isFinite(value) || value < 0) {
    return getDefaultPlayerCapturePower(fallbackLevel)
  }

  return Math.min(PLAYER_MAX_CAPTURE_POWER, value)
}
