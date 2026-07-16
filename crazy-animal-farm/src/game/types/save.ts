import type {
  CapturedAnimal,
  CompanionCommandMode,
} from './animal'
import type { PlacedBuilding } from './building'
import type { InventoryItemKey } from './item'
import type { EquippedItems, ToolDefinitionId } from './equipment'
import type { HotbarSlot } from './hotbar'
import type { CraftingRecipeId } from './crafting'
import type { MapId, WorldPoint } from './map'
import type { ResourceSpawnState } from './resource'

export type ManualSaveSlotId =
  | 'slot-1'
  | 'slot-2'
  | 'slot-3'
  | 'slot-4'
  | 'slot-5'
export type SaveSlotId = 'auto' | ManualSaveSlotId

export type PlayerSaveData = Readonly<{
  currentMapId: MapId
  position: WorldPoint
  hp: number
  hunger: number
  level?: number
  experience?: number
  experienceToNextLevel?: number
  shield?: number
  maxShield?: number
  technologyPoints?: number
  unlockedRecipeIds?: readonly CraftingRecipeId[]
  ownedToolIds: readonly ToolDefinitionId[]
  equippedToolId: ToolDefinitionId
  equippedItems: EquippedItems
  hotbarSlots?: readonly HotbarSlot[]
  selectedHotbarIndex?: number
  activeAnimalPartyIds?: readonly string[]
  selectedCompanionAnimalId?: string | null
  summonedCompanionAnimalId?: string | null
  companionCommandMode?: CompanionCommandMode
}>

export type BaseSaveData = Readonly<{
  id: string
  storage: Record<InventoryItemKey, number>
  buildings: readonly PlacedBuilding[]
}>

export type MapSaveData = Readonly<{
  resources: readonly ResourceSpawnState[]
  processedEventIds: readonly string[]
}>

export type GameSavePayload = Readonly<{
  player: PlayerSaveData
  inventory: Record<InventoryItemKey, number>
  capturedAnimals: readonly CapturedAnimal[]
  bases: readonly BaseSaveData[]
  maps: Readonly<Partial<Record<MapId, MapSaveData>>>
}>

export type GameSave = GameSavePayload &
  Readonly<{
    version: number
    savedAt: number
  }>

export type SaveResult = Readonly<{
  success: boolean
  savedAt: number | null
  message: string
}>

export type SaveSlotSummary = Readonly<{
  id: SaveSlotId
  label: string
  isAuto: boolean
  save: GameSave | null
}>
