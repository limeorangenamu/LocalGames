import type { ItemStack } from './item'
import type { CraftingStationId } from './crafting'
import type { MapId, WorldPoint } from './map'
import type { WorkstationDefinition } from './work'

export type BuildingDefinitionId =
  | 'base-core'
  | 'logging-station'
  | 'primitive-workbench'
export type BuildingRotation = 0 | 90 | 180 | 270

export type BuildingDefinition = Readonly<{
  id: BuildingDefinitionId
  name: string
  textureKey: string
  width: number
  height: number
  maximumInstances: number
  requiresBaseRange: boolean
  baseRadius?: number
  work?: WorkstationDefinition
  craftingStationId?: CraftingStationId
}>

export type PlacedBuilding = Readonly<{
  id: string
  mapId: MapId
  definitionId: BuildingDefinitionId
  name: string
  x: number
  y: number
  rotation: BuildingRotation
  width: number
  height: number
  accessPoint: WorldPoint | null
  assignedAnimalIds: readonly string[]
}>

export type BuildingFootprint = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type WorkProductionEvent = Readonly<{
  buildingId: string
  animalId: string
  output: ItemStack
}>
