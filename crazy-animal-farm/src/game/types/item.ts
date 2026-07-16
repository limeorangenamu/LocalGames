export type InventoryItemKey =
  | 'wood'
  | 'stone'
  | 'rabbitMeat'
  | 'roastedRabbitMeat'
  | 'rabbitFur'
  | 'plantFiber'
  | 'copperOre'
  | 'wildBerry'
  | 'sheepWool'
  | 'boarHide'
  | 'boarMeat'
  | 'roastedBoarMeat'
  | 'captureCapsule'
  | 'rabbitWindHarness'
  | 'sheepGuardianBell'
  | 'boarStoneArmor'

export type ItemCategory =
  | 'material'
  | 'foodIngredient'
  | 'food'
  | 'captureTool'
  | 'companionEquipment'

export type ItemDefinition = Readonly<{
  id: InventoryItemKey
  name: string
  category: ItemCategory
  maxStack: number
  hungerRestore?: number
  animalFeedValue?: number
  captureBonus?: number
}>

export type ItemStack = Readonly<{
  item: InventoryItemKey
  amount: number
}>

export type LootTableEntry = Readonly<{
  item: InventoryItemKey
  minAmount: number
  maxAmount: number
  chance: number
}>
