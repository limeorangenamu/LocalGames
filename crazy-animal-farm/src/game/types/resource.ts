import type { ItemStack } from './item'

export type ResourceDefinitionId =
  | 'tree'
  | 'stone'
  | 'fiber-plant'
  | 'berry-bush'
  | 'copper-deposit'
export type ResourceDrop = ItemStack

export type ResourceCollision = Readonly<{
  width: number
  height: number
  offsetX: number
  offsetY: number
}>

export type ResourceDefinition = Readonly<{
  id: ResourceDefinitionId
  name: string
  textureKey: string
  width: number
  height: number
  maxHp: number
  respawnDelayMs: number
  drop: ResourceDrop
  collision: ResourceCollision
}>

export type ResourceSpawnPoint = Readonly<{
  id: string
  resourceDefinitionId: ResourceDefinitionId
  x: number
  y: number
  respawnAt: number | null
  blockedByBuilding: boolean
}>

export type ResourceSpawnState = Readonly<{
  id: string
  respawnAt: number | null
  blockedByBuilding: boolean
}>
