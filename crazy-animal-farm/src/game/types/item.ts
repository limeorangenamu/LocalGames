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
  | 'reinforcedCaptureCapsule'
  | 'precisionCaptureCapsule'
  | 'captureScannerModule'
  | 'captureStabilizerModule'
  | 'rabbitWindHarness'
  | 'sheepGuardianBell'
  | 'boarStoneArmor'
  | 'woodenArrow'

export type ItemCategory =
  | 'material'
  | 'foodIngredient'
  | 'food'
  | 'captureTool'
  | 'captureModule'
  | 'companionEquipment'
  | 'ammunition'

export type ItemDefinition = Readonly<{
  id: InventoryItemKey
  name: string
  category: ItemCategory
  maxStack: number
  hungerRestore?: number
  animalFeedValue?: number
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
