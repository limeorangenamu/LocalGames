import {
  CAPTURE_BASE_CHANCE,
  CAPTURE_MAX_CHANCE,
  CAPTURE_MAX_STATUS_BONUS,
  CAPTURE_MIN_CHANCE,
  CAPTURE_REAR_HIT_BONUS,
  CAPTURE_STATUS_BONUS_PER_EFFECT,
  PLAYER_MAX_CAPTURE_POWER,
} from '../config/gameConstants'
import type {
  CaptureChanceBreakdown,
  CaptureSupportModuleDefinition,
} from '../types/capture'

export type CaptureChanceInput = Readonly<{
  currentHp: number
  maxHp: number
  captureDifficulty: number
  toolBonus: number
  activeStatusEffectCount: number
  isRearHit: boolean
  playerCapturePower: number
  supportModule: CaptureSupportModuleDefinition | null
  speciesBonus: number
}>

export function calculateCaptureChance({
  currentHp,
  maxHp,
  captureDifficulty,
  toolBonus,
  activeStatusEffectCount,
  isRearHit,
  playerCapturePower,
  supportModule,
  speciesBonus,
}: CaptureChanceInput) {
  return calculateCaptureChanceBreakdown({
    currentHp,
    maxHp,
    captureDifficulty,
    toolBonus,
    activeStatusEffectCount,
    isRearHit,
    playerCapturePower,
    supportModule,
    speciesBonus,
  }).chance
}

export function calculateCaptureChanceBreakdown({
  currentHp,
  maxHp,
  captureDifficulty,
  toolBonus,
  activeStatusEffectCount,
  isRearHit,
  playerCapturePower,
  supportModule,
  speciesBonus,
}: CaptureChanceInput): CaptureChanceBreakdown {
  const safeMaxHp = Math.max(1, maxHp)
  const hpRatio = clamp(currentHp / safeMaxHp, 0, 1)
  const missingHpRatio = 1 - hpRatio
  const healthBonus = missingHpRatio ** 3 * 0.75
  const lowHealthBonus =
    hpRatio <= 0.1 ? 0.4 : hpRatio <= 0.3 ? 0.22 : hpRatio <= 0.5 ? 0.06 : 0
  const safeStatusEffectCount = Math.max(
    0,
    Math.floor(activeStatusEffectCount),
  )
  const statusEffectBonus = Math.min(
    CAPTURE_MAX_STATUS_BONUS,
    safeStatusEffectCount *
      (CAPTURE_STATUS_BONUS_PER_EFFECT +
        (supportModule?.statusEffectBonusPerEffect ?? 0)),
  )
  const rearHitBonus = isRearHit
    ? CAPTURE_REAR_HIT_BONUS + (supportModule?.rearHitBonus ?? 0)
    : 0
  const playerCapturePowerBonus = clamp(
    playerCapturePower,
    0,
    PLAYER_MAX_CAPTURE_POWER,
  )
  const supportModuleBonus = Math.max(0, supportModule?.flatBonus ?? 0)
  const safeSpeciesBonus = clamp(speciesBonus, -0.25, 0.25)
  const difficultyPenalty = Math.max(0, captureDifficulty)
  const rawChance =
    CAPTURE_BASE_CHANCE +
    healthBonus +
    lowHealthBonus +
    Math.max(0, toolBonus) -
    difficultyPenalty +
    statusEffectBonus +
    rearHitBonus +
    playerCapturePowerBonus +
    supportModuleBonus +
    safeSpeciesBonus

  return {
    chance: clamp(rawChance, CAPTURE_MIN_CHANCE, CAPTURE_MAX_CHANCE),
    baseChance: CAPTURE_BASE_CHANCE,
    healthBonus,
    lowHealthBonus,
    toolBonus: Math.max(0, toolBonus),
    statusEffectBonus,
    rearHitBonus,
    playerCapturePowerBonus,
    supportModuleBonus,
    speciesBonus: safeSpeciesBonus,
    difficultyPenalty,
  }
}

export function getCaptureChanceLabel(chance: number) {
  if (chance >= 0.8) {
    return '매우 높음'
  }

  if (chance >= 0.6) {
    return '높음'
  }

  if (chance >= 0.4) {
    return '보통'
  }

  if (chance >= 0.2) {
    return '낮음'
  }

  return '매우 낮음'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
