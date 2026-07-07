export type Grade = 'common' | 'rare' | 'hero' | 'legend' | 'myth'
export type Genre = 'battle' | 'fantasy' | 'magic' | 'mecha' | 'sports' | 'mystery'

export interface UnitDefinition {
  id: string
  name: string
  grade: Grade
  genre: Genre
  display: string
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

export interface GenreSynergy {
  count: number
  level: 0 | 1 | 2 | 3
  value: number
}

export interface DamageLog {
  battle: number
  fantasy: number
  magic: number
  mecha: number
  sports: number
  mystery: number
}

export interface RankingEntry {
  nickname: string
  score: number
  wave: number
  cleared: boolean
  topGenres: Genre[]
  createdAt: string
}
