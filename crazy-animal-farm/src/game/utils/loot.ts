import type { ItemStack, LootTableEntry } from '../types/item'

export function rollLootTable(
  lootTable: readonly LootTableEntry[],
  random: () => number = Math.random,
): readonly ItemStack[] {
  const drops: ItemStack[] = []

  lootTable.forEach((entry) => {
    const chance = clamp(entry.chance, 0, 1)

    if (random() >= chance) {
      return
    }

    const minAmount = Math.max(0, Math.ceil(entry.minAmount))
    const maxAmount = Math.max(minAmount, Math.floor(entry.maxAmount))
    const amount =
      minAmount === maxAmount
        ? minAmount
        : minAmount + Math.floor(random() * (maxAmount - minAmount + 1))

    if (amount > 0) {
      drops.push({ item: entry.item, amount })
    }
  })

  return drops
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
