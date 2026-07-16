import type { ItemStack } from './item'
import type { WorldPoint } from './map'

export type WorkSkill = 'logging' | 'mining' | 'farming' | 'carrying'

export type WorkstationDefinition = Readonly<{
  requiredSkill: WorkSkill
  slots: number
  intervalMs: number
  output: ItemStack
  accessOffset: WorldPoint
}>

export type WorkAssignment = Readonly<{
  buildingId: string
  skill: WorkSkill
}>

export type WorkerState = 'MOVING' | 'WORKING'
