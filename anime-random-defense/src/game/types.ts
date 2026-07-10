export type Grade = 'common' | 'rare' | 'hero' | 'legend' | 'myth'
export type Genre = 'mha' | 'onepunch' | 'overwatch' | 'tooniverse'
export type MythStyle = 'greatsword' | 'rapid_burst' | 'drill' | 'money_rain' | 'solar' | 'gravity' | 'railgun' | 'puppet' | 'storm'
export type UnitAttackStyle =
  | 'fist'
  | 'dumbbell'
  | 'fast_fist'
  | 'barbell'
  | 'kick'
  | 'flurry_fist'
  | 'flute_blade'
  | 'spear'
  | 'greatsword'
  | 'nut_throw'
  | 'slingshot'
  | 'bow'
  | 'sniper'
  | 'laser'
  | 'tear_throw'
  | 'rapid_burst'
  | 'weak_laser'
  | 'machine_gun'
  | 'pistol'
  | 'lava_pool'
  | 'mech_bomb'
  | 'twin_laser'
  | 'nuke'
  | 'drill_zone'
  | 'coin_throw'
  | 'syringe_throw'
  | 'gun'
  | 'smg'
  | 'bill_throw'
  | 'coin_bomb'
  | 'dice_bomb'
  | 'debt_photo'
  | 'lottery_support'
  | 'gold_bar'
  | 'money_rain'

export interface UnitDefinition {
  id: string
  name: string
  grade: Grade
  genre: Genre
  attackStyle: UnitAttackStyle
  mythStyle?: MythStyle
  mythQuote?: string
}

export interface GradeStat {
  attack: number
  attackIntervalMs: number
  range: number
  moveSpeed: number
  radius: number
}

export interface SummonRateRow {
  common: number
  rare: number
  hero: number
  legend: number
  myth: number
  cost: number | null
}

export type DamageLog = Record<Genre, number>

export interface RankingEntry {
  nickname: string
  score: number
  wave: number
  cleared: boolean
  topGenres: Genre[]
  createdAt: string
}
