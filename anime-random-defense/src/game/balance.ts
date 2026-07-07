import type { Genre, Grade, GradeStat, SummonRateRow, UnitDefinition } from './types'

export const CANVAS_WIDTH = 1280
export const CANVAS_HEIGHT = 720

export const BOARD = {
  outer: { x: 80, y: 60, width: 700, height: 600 },
  pathThickness: 55,
  inner: { x: 150, y: 130, width: 560, height: 460 },
  uiX: 920
} as const

export const GAME_RULES = {
  maxWave: 40,
  startGold: 150,
  summonCost: 30,
  startLives: 30,
  mobDangerThreshold: 100,
  mobHardCap: 130,
  waveGapMs: 4200,
  spawnIntervalMs: 740
} as const

export const GRADES: Grade[] = ['common', 'rare', 'hero', 'legend', 'myth']

export const GRADE_LABEL: Record<Grade, string> = {
  common: '일반',
  rare: '희귀',
  hero: '영웅',
  legend: '전설',
  myth: '신화'
}

export const GRADE_COLOR: Record<Grade, number> = {
  common: 0xbfc5d2,
  rare: 0x4fa3ff,
  hero: 0xb46cff,
  legend: 0xffaa2b,
  myth: 0xff4d6d
}

export const GENRES: Genre[] = ['battle', 'fantasy', 'magic', 'mecha', 'sports', 'mystery']

export const GENRE_LABEL: Record<Genre, string> = {
  battle: '배틀물',
  fantasy: '판타지/이세계',
  magic: '마법소녀/마법사',
  mecha: '메카/SF',
  sports: '스포츠/근성',
  mystery: '추리/두뇌전'
}

export const GENRE_COLOR: Record<Genre, number> = {
  battle: 0xff5c5c,
  fantasy: 0x7bd66f,
  magic: 0xff7fd9,
  mecha: 0x69d2ff,
  sports: 0xffd35c,
  mystery: 0xc8a2ff
}

export const GRADE_STATS: Record<Grade, GradeStat> = {
  common: { attack: 8, attackIntervalMs: 1000, range: 170, moveSpeed: 140, radius: 16 },
  rare: { attack: 23, attackIntervalMs: 1000, range: 180, moveSpeed: 140, radius: 17 },
  hero: { attack: 65, attackIntervalMs: 1050, range: 190, moveSpeed: 135, radius: 18 },
  legend: { attack: 170, attackIntervalMs: 1100, range: 205, moveSpeed: 130, radius: 20 },
  myth: { attack: 460, attackIntervalMs: 1200, range: 225, moveSpeed: 125, radius: 22 }
}

export const SUMMON_RATES: SummonRateRow[] = [
  { common: 74.899, rare: 20, hero: 5, legend: 0.1, myth: 0.001, cost: null },
  { common: 67.74, rare: 25, hero: 7, legend: 0.25, myth: 0.01, cost: 120 },
  { common: 59.45, rare: 30, hero: 10, legend: 0.5, myth: 0.05, cost: 220 },
  { common: 49.8, rare: 34, hero: 15, legend: 1, myth: 0.2, cost: 400 },
  { common: 39.4, rare: 36, hero: 22, legend: 2, myth: 0.6, cost: 700 },
  { common: 29, rare: 37, hero: 29, legend: 4, myth: 1, cost: 1100 },
  { common: 19, rare: 35, hero: 37, legend: 7, myth: 2, cost: 1700 }
]

export const GENRE_UPGRADE_COSTS = [90, 160, 280, 460, 720, 1050, 1450, 1950]
export const GENRE_UPGRADE_ATTACK_BONUS = 0.15

export const SELL_VALUES: Record<Grade, number> = {
  common: 8,
  rare: 25,
  hero: 75,
  legend: 220,
  myth: 700
}

export const UNITS: UnitDefinition[] = [
  { id: 'battle_common', name: '수련생 파이터', grade: 'common', genre: 'battle', display: '파' },
  { id: 'battle_rare', name: '오라 검사', grade: 'rare', genre: 'battle', display: '검' },
  { id: 'battle_hero', name: '폭주 권투가', grade: 'hero', genre: 'battle', display: '권' },
  { id: 'battle_legend', name: '용권의 영웅', grade: 'legend', genre: 'battle', display: '용' },
  { id: 'battle_myth', name: '최종 각성자', grade: 'myth', genre: 'battle', display: '각' },

  { id: 'fantasy_common', name: '슬라임 조련사', grade: 'common', genre: 'fantasy', display: '슬' },
  { id: 'fantasy_rare', name: '룬 궁수', grade: 'rare', genre: 'fantasy', display: '룬' },
  { id: 'fantasy_hero', name: '던전 현자', grade: 'hero', genre: 'fantasy', display: '현' },
  { id: 'fantasy_legend', name: '마왕 사냥꾼', grade: 'legend', genre: 'fantasy', display: '마' },
  { id: 'fantasy_myth', name: '세계수의 군주', grade: 'myth', genre: 'fantasy', display: '수' },

  { id: 'magic_common', name: '견습 마법사', grade: 'common', genre: 'magic', display: '마' },
  { id: 'magic_rare', name: '별지팡이 소녀', grade: 'rare', genre: 'magic', display: '별' },
  { id: 'magic_hero', name: '결계술사', grade: 'hero', genre: 'magic', display: '결' },
  { id: 'magic_legend', name: '달빛 대마도사', grade: 'legend', genre: 'magic', display: '달' },
  { id: 'magic_myth', name: '기적의 여왕', grade: 'myth', genre: 'magic', display: '기' },

  { id: 'mecha_common', name: '고철 파일럿', grade: 'common', genre: 'mecha', display: '고' },
  { id: 'mecha_rare', name: '레이저 병사', grade: 'rare', genre: 'mecha', display: '레' },
  { id: 'mecha_hero', name: '코어 엔지니어', grade: 'hero', genre: 'mecha', display: '코' },
  { id: 'mecha_legend', name: '타이탄 메카', grade: 'legend', genre: 'mecha', display: '타' },
  { id: 'mecha_myth', name: '은하 수호자', grade: 'myth', genre: 'mecha', display: '은' },

  { id: 'sports_common', name: '신입 러너', grade: 'common', genre: 'sports', display: '런' },
  { id: 'sports_rare', name: '날카로운 슈터', grade: 'rare', genre: 'sports', display: '슛' },
  { id: 'sports_hero', name: '에이스 스트라이커', grade: 'hero', genre: 'sports', display: '스' },
  { id: 'sports_legend', name: '불꽃의 주장', grade: 'legend', genre: 'sports', display: '불' },
  { id: 'sports_myth', name: '한계돌파 챔피언', grade: 'myth', genre: 'sports', display: '챔' },

  { id: 'mystery_common', name: '초보 탐정', grade: 'common', genre: 'mystery', display: '탐' },
  { id: 'mystery_rare', name: '카드 전략가', grade: 'rare', genre: 'mystery', display: '카' },
  { id: 'mystery_hero', name: '그림자 분석관', grade: 'hero', genre: 'mystery', display: '분' },
  { id: 'mystery_legend', name: '시간의 트릭스터', grade: 'legend', genre: 'mystery', display: '시' },
  { id: 'mystery_myth', name: '운명의 해석자', grade: 'myth', genre: 'mystery', display: '운' }
]

export function getNextGrade(grade: Grade): Grade | null {
  const index = GRADES.indexOf(grade)
  return index >= 0 && index < GRADES.length - 1 ? GRADES[index + 1] : null
}

export function getUnitsByGrade(grade: Grade): UnitDefinition[] {
  return UNITS.filter((unit) => unit.grade === grade)
}

export function getMonsterHp(wave: number): number {
  return Math.round(30 * Math.pow(1.115, wave - 1))
}

export function getMonsterSpeed(wave: number): number {
  return Math.min(62, 45 + wave * 0.35)
}

export function getNormalSpawnCount(wave: number): number {
  if (wave % 10 === 0) {
    const bossNumber = wave / 10
    return 8 + bossNumber * 4
  }
  return 6 + Math.floor(wave * 0.8)
}

export function getKillGold(wave: number): number {
  return 6 + Math.floor(wave / 4)
}

export function getBossTimeLimitMs(wave: number): number {
  const table: Record<number, number> = { 10: 45_000, 20: 50_000, 30: 55_000, 40: 60_000 }
  return table[wave] ?? 45_000
}

export function getBossHp(wave: number): number {
  const multiplier: Record<number, number> = { 10: 22, 20: 32, 30: 42, 40: 60 }
  return Math.round(getMonsterHp(wave) * (multiplier[wave] ?? 22))
}
