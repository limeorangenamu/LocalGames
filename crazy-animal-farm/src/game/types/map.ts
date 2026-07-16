import type { AnimalSpawnPoint } from './animal'
import type { ResourceSpawnPoint } from './resource'

export type MapId =
  | 'meadow'
  | 'sunlit-plains'
  | 'whispering-grove'
  | 'clover-fields'
  | 'riverbank-meadow'
  | 'rock-canyon'

export type WorldPoint = Readonly<{
  x: number
  y: number
}>

export type ObstacleDefinition = Readonly<{
  id: string
  x: number
  y: number
  width: number
  height: number
  color: number
}>

export type BuildForbiddenArea = Readonly<{
  id: string
  x: number
  y: number
  width: number
  height: number
}>

export type MapExitDefinition = Readonly<{
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  targetMapId: MapId
  targetEntryId: string
}>

export type MapDefinition = Readonly<{
  id: MapId
  name: string
  width: number
  height: number
  backgroundColor: number
  gridColor: number
  playerSpawn: WorldPoint
  entryPoints: Readonly<Record<string, WorldPoint>>
  exits: readonly MapExitDefinition[]
  obstacles: readonly ObstacleDefinition[]
  resourceSpawns: readonly ResourceSpawnPoint[]
  animalSpawns: readonly AnimalSpawnPoint[]
  buildForbiddenAreas: readonly BuildForbiddenArea[]
}>
