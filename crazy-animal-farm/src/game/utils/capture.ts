import {
  CAPTURE_MAX_CHANCE,
  CAPTURE_MIN_CHANCE,
} from '../config/gameConstants'

type CaptureChanceInput = Readonly<{
  currentHp: number
  maxHp: number
  captureDifficulty: number
  toolBonus: number
}>

export function calculateCaptureChance({
  currentHp,
  maxHp,
  captureDifficulty,
  toolBonus,
}: CaptureChanceInput) {
  const safeMaxHp = Math.max(1, maxHp)
  const hpRatio = clamp(currentHp / safeMaxHp, 0, 1)
  const missingHpRatio = 1 - hpRatio
  const missingHpBonus = missingHpRatio ** 3 * 0.75
  const lowHealthBonus =
    hpRatio <= 0.1 ? 0.4 : hpRatio <= 0.3 ? 0.22 : hpRatio <= 0.5 ? 0.06 : 0
  const rawChance =
    0.08 +
    missingHpBonus +
    lowHealthBonus +
    Math.max(0, toolBonus) -
    Math.max(0, captureDifficulty)

  return clamp(rawChance, CAPTURE_MIN_CHANCE, CAPTURE_MAX_CHANCE)
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
