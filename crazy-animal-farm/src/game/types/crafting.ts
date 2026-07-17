import type { ToolDefinitionId } from './equipment'
import type { ItemStack } from './item'

export type CraftingRecipeId =
  | 'stone-axe'
  | 'reinforced-logging-axe'
  | 'roasted-rabbit-meat'
  | 'wooden-shield'
  | 'capture-capsule-pack'
  | 'reinforced-capture-capsule-pack'
  | 'precision-capture-capsule-pack'
  | 'capture-condition-scanner'
  | 'capture-rear-stabilizer'
  | 'copper-pickaxe'
  | 'roasted-boar-meat'
  | 'wool-cloak'
  | 'rabbit-wind-harness'
  | 'sheep-guardian-bell'
  | 'boar-stone-armor'
  | 'copper-sword'
  | 'hunting-bow'
  | 'wooden-arrow-pack'
  | 'hide-armor'
  | 'copper-helmet'

export type CraftingStationId = 'primitive-workbench'

type CraftingRecipeBase = Readonly<{
  id: CraftingRecipeId
  name: string
  description: string
  category: 'tool' | 'equipment' | 'food'
  unlockLevel: number
  technologyPointCost: number
  requiredStationId: CraftingStationId
  ingredients: readonly ItemStack[]
  prerequisiteRecipeId?: CraftingRecipeId
}>

export type CraftingRecipe =
  | (CraftingRecipeBase &
      Readonly<{
        outputKind: 'tool'
        outputToolId: ToolDefinitionId
      }>)
  | (CraftingRecipeBase &
      Readonly<{
        outputKind: 'item'
        output: ItemStack
      }>)
