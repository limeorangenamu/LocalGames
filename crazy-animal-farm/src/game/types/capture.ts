import type { AnimalTargetStatusEffectId } from './animal'

export type CaptureToolItemId =
  | 'captureCapsule'
  | 'reinforcedCaptureCapsule'
  | 'precisionCaptureCapsule'

export type CaptureToolGrade = 'basic' | 'reinforced' | 'precision'

export type CaptureSupportModuleId =
  | 'condition-scanner'
  | 'rear-stabilizer'

export type CaptureToolDefinition = Readonly<{
  itemId: CaptureToolItemId
  grade: CaptureToolGrade
  gradeName: string
  captureBonus: number
  projectileTint: number
}>

export type CaptureSupportModuleDefinition = Readonly<{
  id: CaptureSupportModuleId
  name: string
  description: string
  inventoryItemId: 'captureScannerModule' | 'captureStabilizerModule'
  flatBonus?: number
  statusEffectBonusPerEffect?: number
  rearHitBonus?: number
}>

export type CaptureChanceBreakdown = Readonly<{
  chance: number
  baseChance: number
  healthBonus: number
  lowHealthBonus: number
  toolBonus: number
  statusEffectBonus: number
  rearHitBonus: number
  playerCapturePowerBonus: number
  supportModuleBonus: number
  speciesBonus: number
  difficultyPenalty: number
}>

export type CapturePreviewState = Readonly<{
  targetName: string
  toolItemId: CaptureToolItemId
  supportModuleId: CaptureSupportModuleId | null
  activeStatusEffectIds: readonly AnimalTargetStatusEffectId[]
  isRearHit: boolean
  breakdown: CaptureChanceBreakdown
}>
