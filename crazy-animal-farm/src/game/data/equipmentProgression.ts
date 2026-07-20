import { TOOL_DEFINITIONS } from './equipment'
import type {
  CraftableEquipmentId,
  EquipmentBlueprintDrop,
  EquipmentBlueprintId,
  EquipmentBlueprintInventory,
  EquipmentBlueprintLootEntry,
  EquipmentBlueprintRarity,
  EquipmentRarity,
  EquipmentVariant,
  EquipmentVariants,
  ToolDefinition,
  ToolDefinitionId,
} from '../types/equipment'

type EquipmentRarityDefinition = Readonly<{
  id: EquipmentRarity
  name: string
  color: string
  rank: number
  ingredientMultiplier: number
  powerRange: readonly [number, number]
  protectionRange: readonly [number, number]
  durabilityRange: readonly [number, number]
}>

export const EQUIPMENT_RARITIES = {
  common: {
    id: 'common',
    name: '일반',
    color: '#d7ddd4',
    rank: 0,
    ingredientMultiplier: 1,
    powerRange: [1, 1],
    protectionRange: [1, 1],
    durabilityRange: [1, 1],
  },
  uncommon: {
    id: 'uncommon',
    name: '고급',
    color: '#79d889',
    rank: 1,
    ingredientMultiplier: 1.35,
    powerRange: [1.06, 1.1],
    protectionRange: [1.06, 1.11],
    durabilityRange: [1.08, 1.14],
  },
  rare: {
    id: 'rare',
    name: '희귀',
    color: '#65b8ff',
    rank: 2,
    ingredientMultiplier: 1.75,
    powerRange: [1.13, 1.2],
    protectionRange: [1.14, 1.22],
    durabilityRange: [1.16, 1.26],
  },
  epic: {
    id: 'epic',
    name: '영웅',
    color: '#c18cff',
    rank: 3,
    ingredientMultiplier: 2.3,
    powerRange: [1.23, 1.32],
    protectionRange: [1.25, 1.35],
    durabilityRange: [1.3, 1.42],
  },
  legendary: {
    id: 'legendary',
    name: '전설',
    color: '#ffbd55',
    rank: 4,
    ingredientMultiplier: 3,
    powerRange: [1.36, 1.48],
    protectionRange: [1.4, 1.55],
    durabilityRange: [1.48, 1.65],
  },
} as const satisfies Readonly<
  Record<EquipmentRarity, EquipmentRarityDefinition>
>

export const EQUIPMENT_RARITY_ORDER = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const satisfies readonly EquipmentRarity[]

export const EQUIPMENT_BLUEPRINT_RARITIES = [
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const satisfies readonly EquipmentBlueprintRarity[]

export function createEquipmentVariant(
  toolId: CraftableEquipmentId,
  rarity: EquipmentRarity,
  random: () => number = Math.random,
): EquipmentVariant {
  const definition = EQUIPMENT_RARITIES[rarity]

  return {
    toolId,
    rarity,
    powerMultiplier: rollMultiplier(definition.powerRange, random),
    protectionMultiplier: rollMultiplier(
      definition.protectionRange,
      random,
    ),
    durabilityMultiplier: rollMultiplier(
      definition.durabilityRange,
      random,
    ),
  }
}

export function getEquipmentVariant(
  toolId: ToolDefinitionId,
  variants: EquipmentVariants,
) {
  if (toolId === 'bare-hands') {
    return null
  }

  return variants[toolId] ?? createEquipmentVariant(toolId, 'common', () => 0)
}

export function getEffectiveToolDefinition(
  toolId: ToolDefinitionId,
  variants: EquipmentVariants,
): ToolDefinition {
  const base = TOOL_DEFINITIONS[toolId]
  const variant = getEquipmentVariant(toolId, variants)

  if (!variant) {
    return base
  }

  return {
    ...base,
    resourceDamageMultiplier: roundStat(
      base.resourceDamageMultiplier * variant.powerMultiplier,
      3,
    ),
    weaponDamage:
      base.weaponDamage === undefined
        ? undefined
        : Math.max(1, Math.round(base.weaponDamage * variant.powerMultiplier)),
    armorRating:
      base.armorRating === undefined
        ? undefined
        : Math.max(
            1,
            Math.round(base.armorRating * variant.protectionMultiplier),
          ),
    shieldCapacity:
      base.shieldCapacity === undefined
        ? undefined
        : Math.max(
            1,
            Math.round(base.shieldCapacity * variant.protectionMultiplier),
          ),
    maxDurability:
      base.maxDurability === undefined
        ? undefined
        : Math.max(
            1,
            Math.round(base.maxDurability * variant.durabilityMultiplier),
          ),
  }
}

export function getEquipmentMaxDurability(
  toolId: ToolDefinitionId,
  variants: EquipmentVariants,
) {
  return getEffectiveToolDefinition(toolId, variants).maxDurability ?? null
}

export function getEquipmentRarity(
  toolId: ToolDefinitionId,
  variants: EquipmentVariants,
): EquipmentRarity {
  return getEquipmentVariant(toolId, variants)?.rarity ?? 'common'
}

export function canReplaceEquipmentVariant(
  current: EquipmentVariant | undefined,
  nextRarity: EquipmentRarity,
) {
  return (
    !current ||
    EQUIPMENT_RARITIES[nextRarity].rank >
      EQUIPMENT_RARITIES[current.rarity].rank
  )
}

export function createEquipmentBlueprintId(
  toolId: CraftableEquipmentId,
  rarity: EquipmentBlueprintRarity,
): EquipmentBlueprintId {
  return `${toolId}:${rarity}`
}

export function parseEquipmentBlueprintId(
  blueprintId: EquipmentBlueprintId,
) {
  const separatorIndex = blueprintId.lastIndexOf(':')

  return {
    toolId: blueprintId.slice(0, separatorIndex) as CraftableEquipmentId,
    rarity: blueprintId.slice(separatorIndex + 1) as EquipmentBlueprintRarity,
  }
}

export function getEquipmentBlueprintName(blueprintId: EquipmentBlueprintId) {
  const { toolId, rarity } = parseEquipmentBlueprintId(blueprintId)
  return `${TOOL_DEFINITIONS[toolId].name} ${EQUIPMENT_RARITIES[rarity].name} 설계도`
}

export function getNextEquipmentBlueprintId(
  blueprintId: EquipmentBlueprintId,
): EquipmentBlueprintId | null {
  const { toolId, rarity } = parseEquipmentBlueprintId(blueprintId)
  const rarityIndex = EQUIPMENT_BLUEPRINT_RARITIES.indexOf(rarity)
  const nextRarity = EQUIPMENT_BLUEPRINT_RARITIES[rarityIndex + 1]

  return nextRarity
    ? createEquipmentBlueprintId(toolId, nextRarity)
    : null
}

export function getEquipmentBlueprintAmount(
  inventory: EquipmentBlueprintInventory,
  blueprintId: EquipmentBlueprintId,
) {
  return inventory[blueprintId] ?? 0
}

export function rollEquipmentBlueprintLoot(
  lootTable: readonly EquipmentBlueprintLootEntry[],
  random: () => number = Math.random,
): readonly EquipmentBlueprintDrop[] {
  return lootTable.flatMap((entry) => {
    if (random() >= clamp(entry.chance, 0, 1)) {
      return []
    }

    const minAmount = Math.max(1, Math.ceil(entry.minAmount))
    const maxAmount = Math.max(minAmount, Math.floor(entry.maxAmount))
    const amount =
      minAmount === maxAmount
        ? minAmount
        : minAmount + Math.floor(random() * (maxAmount - minAmount + 1))

    return [{ blueprintId: entry.blueprintId, amount }]
  })
}

export function isEquipmentRarity(value: string): value is EquipmentRarity {
  return Object.prototype.hasOwnProperty.call(EQUIPMENT_RARITIES, value)
}

export function isEquipmentBlueprintId(
  value: string,
): value is EquipmentBlueprintId {
  const separatorIndex = value.lastIndexOf(':')

  if (separatorIndex <= 0) {
    return false
  }

  const toolId = value.slice(0, separatorIndex)
  const rarity = value.slice(separatorIndex + 1)

  return (
    toolId !== 'bare-hands' &&
    Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, toolId) &&
    EQUIPMENT_BLUEPRINT_RARITIES.includes(
      rarity as EquipmentBlueprintRarity,
    )
  )
}

function rollMultiplier(
  range: readonly [number, number],
  random: () => number,
) {
  return roundStat(range[0] + (range[1] - range[0]) * clamp(random(), 0, 1), 3)
}

function roundStat(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
