import type { Genre, Grade, GradeStat, SummonRateRow, UnitDefinition } from './types'

export const CANVAS_WIDTH = 1280
export const CANVAS_HEIGHT = 720
export const RENDER_WIDTH = 1920
export const RENDER_HEIGHT = 1080
export const RENDER_SCALE = RENDER_WIDTH / CANVAS_WIDTH

export const BOARD = {
  outer: { x: 180, y: 60, width: 700, height: 600 },
  pathThickness: 55,
  inner: { x: 250, y: 130, width: 560, height: 460 },
  uiX: 920
} as const

export const GAME_RULES = {
  maxWave: 40,
  startGold: 150,
  summonCost: 30,
  startLives: 30,
  mobDangerThreshold: 100,
  mobHardCap: 130,
  difficultyMultiplier: 1.5,
  goldIncomeMultiplier: 0.65,
  waveGapMs: 4200,
  spawnIntervalMs: 740
} as const

export const GRADES: Grade[] = ['common', 'rare', 'hero', 'legend', 'myth']

export const GRADE_COLOR: Record<Grade, number> = {
  common: 0xf8fafc,
  rare: 0x0066ff,
  hero: 0x9d00ff,
  legend: 0xff7a00,
  myth: 0xff003c
}

export const GENRES: Genre[] = ['mha', 'onepunch', 'overwatch', 'tooniverse']

export const GENRE_LABEL: Record<Genre, string> = {
  mha: '붕의 일족',
  onepunch: '거인 사냥꾼',
  overwatch: '메카물',
  tooniverse: '제2금융권'
}

export const GENRE_COLOR: Record<Genre, number> = {
  mha: 0x94a3b8,
  onepunch: 0x22c55e,
  overwatch: 0xef4444,
  tooniverse: 0xfacc15
}

export const GRADE_STATS: Record<Grade, GradeStat> = {
  common: { attack: 10, attackIntervalMs: 1050, range: 168, moveSpeed: 140, radius: 16 },
  rare: { attack: 15, attackIntervalMs: 990, range: 180, moveSpeed: 143, radius: 17 },
  hero: { attack: 75, attackIntervalMs: 930, range: 196, moveSpeed: 147, radius: 18 },
  legend: { attack: 750, attackIntervalMs: 860, range: 216, moveSpeed: 151, radius: 20 },
  myth: { attack: 15000, attackIntervalMs: 790, range: 240, moveSpeed: 156, radius: 22 }
}

export const SUMMON_RATES: SummonRateRow[] = [
  { common: 75, rare: 22.5, hero: 2.35, legend: 0.14, myth: 0.01, cost: null },
  { common: 69, rare: 25, hero: 5.5, legend: 0.45, myth: 0.05, cost: 120 },
  { common: 61, rare: 28, hero: 9, legend: 1.75, myth: 0.25, cost: 220 },
  { common: 52, rare: 31, hero: 13, legend: 3.5, myth: 0.5, cost: 400 },
  { common: 42, rare: 33, hero: 18, legend: 6, myth: 1, cost: 700 },
  { common: 31, rare: 33, hero: 24, legend: 10, myth: 2, cost: 1100 },
  { common: 19, rare: 32, hero: 32, legend: 14, myth: 3, cost: 1700 }
]

export const GENRE_UPGRADE_BASE_COST = 20
export const GENRE_UPGRADE_COST_INCREMENT = 2
export const GENRE_UPGRADE_ATTACK_BONUS = 0.02

export const SELL_VALUES: Record<Grade, number> = {
  common: 8,
  rare: 25,
  hero: 75,
  legend: 220,
  myth: 700
}

export const UNITS: UnitDefinition[] = [
  { id: 'mha_common_1', name: '복싱 3일차', grade: 'common', genre: 'mha', attackStyle: 'fist' },
  { id: 'mha_common_2', name: '헬스 3일차', grade: 'common', genre: 'mha', attackStyle: 'dumbbell' },
  { id: 'mha_rare_1', name: '프로 복서', grade: 'rare', genre: 'mha', attackStyle: 'fast_fist' },
  { id: 'mha_rare_2', name: '헬창', grade: 'rare', genre: 'mha', attackStyle: 'barbell' },
  { id: 'mha_hero_1', name: '헥토파스칼 킥', grade: 'hero', genre: 'mha', attackStyle: 'kick' },
  { id: 'mha_hero_2', name: '주먹 초딩', grade: 'hero', genre: 'mha', attackStyle: 'flurry_fist' },
  { id: 'mha_legend_1', name: '단소 살인마', grade: 'legend', genre: 'mha', attackStyle: 'flute_blade' },
  { id: 'mha_legend_2', name: '자르반 84세', grade: 'legend', genre: 'mha', attackStyle: 'spear' },
  { id: 'mha_myth_1', name: '검존 김춘자', grade: 'myth', genre: 'mha', attackStyle: 'greatsword', mythStyle: 'greatsword', mythQuote: '미안해요 영감' },

  { id: 'onepunch_common_1', name: '호두까기 인형', grade: 'common', genre: 'onepunch', attackStyle: 'nut_throw' },
  { id: 'onepunch_common_2', name: '새총을 든 초딩', grade: 'common', genre: 'onepunch', attackStyle: 'slingshot' },
  { id: 'onepunch_rare_1', name: '로빈후드', grade: 'rare', genre: 'onepunch', attackStyle: 'bow' },
  { id: 'onepunch_rare_2', name: '호크아이', grade: 'rare', genre: 'onepunch', attackStyle: 'bow' },
  { id: 'onepunch_hero_1', name: '위도우', grade: 'hero', genre: 'onepunch', attackStyle: 'sniper' },
  { id: 'onepunch_hero_2', name: '아나', grade: 'hero', genre: 'onepunch', attackStyle: 'sniper' },
  { id: 'onepunch_legend_1', name: '홍석천', grade: 'legend', genre: 'onepunch', attackStyle: 'laser' },
  { id: 'onepunch_legend_2', name: '심영', grade: 'legend', genre: 'onepunch', attackStyle: 'tear_throw' },
  { id: 'onepunch_myth_1', name: '황분출 해병님', grade: 'myth', genre: 'onepunch', attackStyle: 'rapid_burst', mythStyle: 'rapid_burst', mythQuote: '아쌔이' },

  { id: 'overwatch_common_1', name: '건담 프라모델', grade: 'common', genre: 'overwatch', attackStyle: 'weak_laser' },
  { id: 'overwatch_common_2', name: '로봇 장난감', grade: 'common', genre: 'overwatch', attackStyle: 'machine_gun' },
  { id: 'overwatch_rare_1', name: '장난감 군대', grade: 'rare', genre: 'overwatch', attackStyle: 'machine_gun' },
  { id: 'overwatch_rare_2', name: '캐서디', grade: 'rare', genre: 'overwatch', attackStyle: 'pistol' },
  { id: 'overwatch_hero_1', name: '토르비욘', grade: 'hero', genre: 'overwatch', attackStyle: 'lava_pool' },
  { id: 'overwatch_hero_2', name: '디바', grade: 'hero', genre: 'overwatch', attackStyle: 'mech_bomb' },
  { id: 'overwatch_legend_1', name: '아이언맨', grade: 'legend', genre: 'overwatch', attackStyle: 'twin_laser' },
  { id: 'overwatch_legend_2', name: '정은 6호기', grade: 'legend', genre: 'overwatch', attackStyle: 'nuke' },
  { id: 'overwatch_myth_1', name: '천원돌파 그렌라간', grade: 'myth', genre: 'overwatch', attackStyle: 'drill_zone', mythStyle: 'drill', mythQuote: '내 드릴은 하늘을 뚫을 드릴이다.' },

  { id: 'tooniverse_common_1', name: '뒷골목 건달', grade: 'common', genre: 'tooniverse', attackStyle: 'coin_throw' },
  { id: 'tooniverse_common_2', name: '비실한 약쟁이', grade: 'common', genre: 'tooniverse', attackStyle: 'syringe_throw' },
  { id: 'tooniverse_rare_1', name: '보스의 오른팔', grade: 'rare', genre: 'tooniverse', attackStyle: 'gun' },
  { id: 'tooniverse_rare_2', name: '은행 도둑', grade: 'rare', genre: 'tooniverse', attackStyle: 'smg' },
  { id: 'tooniverse_hero_1', name: '차무식', grade: 'hero', genre: 'tooniverse', attackStyle: 'bill_throw' },
  { id: 'tooniverse_hero_2', name: '섀도어', grade: 'hero', genre: 'tooniverse', attackStyle: 'coin_bomb' },
  { id: 'tooniverse_hero_3', name: '도박사', grade: 'hero', genre: 'tooniverse', attackStyle: 'dice_bomb' },
  { id: 'tooniverse_legend_1', name: '사채업자', grade: 'legend', genre: 'tooniverse', attackStyle: 'debt_photo' },
  { id: 'tooniverse_legend_2', name: '로또 1등 당첨자', grade: 'legend', genre: 'tooniverse', attackStyle: 'lottery_support' },
  { id: 'tooniverse_legend_3', name: '금맥 발견자', grade: 'legend', genre: 'tooniverse', attackStyle: 'gold_bar' },
  { id: 'tooniverse_myth_1', name: '워렌 버핏', grade: 'myth', genre: 'tooniverse', attackStyle: 'money_rain', mythStyle: 'money_rain', mythQuote: '제1법칙. 절대 돈을 잃지 않을것' }
]

export function getNextGrade(grade: Grade): Grade | null {
  const index = GRADES.indexOf(grade)
  return index >= 0 && index < GRADES.length - 1 ? GRADES[index + 1] : null
}

export function getUnitsByGrade(grade: Grade): UnitDefinition[] {
  return UNITS.filter((unit) => unit.grade === grade)
}

export function getMonsterHp(wave: number): number {
  const growth = 1 + (1.115 - 1) * 2.5
  return Math.round(30 * Math.pow(growth, wave - 1) * GAME_RULES.difficultyMultiplier)
}

export function getMonsterSpeed(wave: number): number {
  return Math.min(105, 45 + wave * 0.35 * 2.5)
}

export function getNormalSpawnCount(wave: number): number {
  const scaleCount = (count: number) => Math.ceil(count * GAME_RULES.difficultyMultiplier * 3)
  if (wave % 5 === 0) {
    const bossNumber = wave / 5
    return scaleCount(8 + bossNumber * 4)
  }
  return scaleCount(6 + Math.floor(wave * 0.8))
}

export function getKillGold(wave: number): number {
  return Math.max(1, Math.floor((6 + Math.floor(wave / 4)) * GAME_RULES.goldIncomeMultiplier))
}

export function getBossTimeLimitMs(wave: number): number {
  const bossNumber = Math.max(1, Math.floor(wave / 5))
  const oldScaleSeconds = 40 + bossNumber * 2.5
  return Math.round(oldScaleSeconds * 2.5) * 1000
}

export function getBossHp(wave: number): number {
  const multiplier: Record<number, number> = { 10: 22, 20: 32, 30: 42, 40: 60 }
  return Math.round(getMonsterHp(wave) * (multiplier[wave] ?? 22))
}
