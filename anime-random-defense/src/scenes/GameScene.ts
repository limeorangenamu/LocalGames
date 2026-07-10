import Phaser from 'phaser'
import {
  BOARD,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  RENDER_HEIGHT,
  RENDER_SCALE,
  RENDER_WIDTH,
  GAME_RULES,
  GENRE_COLOR,
  GENRE_LABEL,
  GENRE_UPGRADE_ATTACK_BONUS,
  GENRE_UPGRADE_BASE_COST,
  GENRE_UPGRADE_COST_INCREMENT,
  GENRES,
  GRADES,
  GRADE_COLOR,
  GRADE_STATS,
  SELL_VALUES,
  SUMMON_RATES,
  getBossHp,
  getBossTimeLimitMs,
  getKillGold,
  getMonsterHp,
  getMonsterSpeed,
  getNextGrade,
  getNormalSpawnCount,
  getUnitsByGrade
} from '../game/balance'
import { addRanking, getNickname } from '../game/storage'
import type { DamageLog, Genre, Grade, MythStyle, RankingEntry, UnitAttackStyle, UnitDefinition } from '../game/types'
import { clamp, distance, formatNumber, gradeWeightObject, randomItem, weightedPick } from '../game/utils'

type MonsterKind = 'normal' | 'elite' | 'boss'
type WaveState = 'waiting' | 'spawning' | 'finished'
type SynergyLevel = 0 | 1 | 2 | 3
type AttackKind = 'melee' | 'single' | 'chain' | 'aoe' | 'mine'

interface AttackProfile {
  kind: AttackKind
  damageMultiplier: number
  intervalMultiplier: number
  rangeMultiplier: number
  splashRadius?: number
  splashDamageMultiplier?: number
  chainCount?: number
  chainRange?: number
}

interface GenreAttackProfile {
  damageMultiplier: number
  intervalMultiplier: number
  rangeMultiplier: number
}

interface ButtonHandle {
  rect: Phaser.GameObjects.Rectangle
  visual: Phaser.GameObjects.Graphics
  text: Phaser.GameObjects.Text
  setLabel: (label: string) => void
}

interface ButtonTextLayout {
  x: number
  y: number
  originX: number
  originY: number
  fontSize: string
  lineSpacing?: number
}

interface SynergyRowHandle {
  container: Phaser.GameObjects.Container
  bg: Phaser.GameObjects.Rectangle
  genreDot: Phaser.GameObjects.Rectangle
  tierBar: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  count: Phaser.GameObjects.Text
}

interface UnitRuntime {
  id: number
  def: UnitDefinition
  container: Phaser.GameObjects.Container
  avatar: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Shape
  ring: Phaser.GameObjects.Graphics
  x: number
  y: number
  targetX: number
  targetY: number
  lastAttackAt: number
  lastWalkEffectAt: number
  forcedTargetId: number | null
  autoTargetId: number | null
  nextTargetSearchAt: number
  nextSpecialAt: number
  selected: boolean
}

interface DamageZoneRuntime {
  visual: Phaser.GameObjects.Graphics
  unit: UnitRuntime
  x: number
  y: number
  radius: number
  damageMultiplier: number
  expiresAt: number
  nextTickAt: number
  pathWide: boolean
}

interface MythAvatarParts {
  back: Phaser.GameObjects.GameObject[]
  front: Phaser.GameObjects.GameObject[]
  spin: Phaser.GameObjects.GameObject[]
  counterSpin: Phaser.GameObjects.GameObject[]
  pulse: Phaser.GameObjects.GameObject[]
  sway: Phaser.GameObjects.GameObject[]
}

interface MonsterRuntime {
  id: number
  kind: MonsterKind
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Arc
  hpText: Phaser.GameObjects.Text
  baseColor: number
  auraColor: number
  threatTier: number
  hp: number
  maxHp: number
  speed: number
  pathIndex: number
  weight: number
  wave: number
  createdAt: number
  lastEffectAt: number
  lastHitFeedbackAt: number
  lastHpDisplayPercent: number
  alive: boolean
}

interface MonsterTheme {
  bodyColor: number
  auraColor: number
  hornColor: number
  eyeColor: number
  coreColor: number
  threatTier: number
}

interface SynergyState {
  levelByGenre: Record<Genre, SynergyLevel>
  countByGenre: Record<Genre, number>
  heroAttackBonus: number
  eliteBossDamageBonus: number
  attackSpeedBonus: number
  goldBonus: number
  lotteryGoldBonus: number
}

const GENRE_SHORT_LABEL: Record<Genre, string> = {
  mha: '붕의일족',
  onepunch: '거인사냥꾼',
  overwatch: '메카물',
  tooniverse: '제2금융권'
}

const GENRE_BUTTON_LABEL: Record<Genre, string> = {
  mha: '붕의 일족',
  onepunch: '거인 사냥',
  overwatch: '메카물',
  tooniverse: '제2 금융'
}

const GRADE_EFFECT_TIER: Record<Grade, number> = {
  common: 1,
  rare: 2,
  hero: 3,
  legend: 4,
  myth: 5
}

const GRADE_LABEL: Record<Grade, string> = {
  common: '일반',
  rare: '희귀',
  hero: '영웅',
  legend: '전설',
  myth: '신화'
}

const SYNERGY_THRESHOLDS = [5, 10, 15] as const

const UI_FONT = '"Malgun Gothic", "Noto Sans KR", "Segoe UI", sans-serif'

type UiButtonTone = 'primary' | 'accent' | 'secondary' | 'utility'

const UI_BUTTON_COLORS: Record<UiButtonTone, { fill: number; hover: number; stroke: number; text: string }> = {
  primary: { fill: 0xf77822, hover: 0xff9340, stroke: 0xffe2ab, text: '#ffffff' },
  accent: { fill: 0x7656d6, hover: 0x9278ed, stroke: 0xd9ccff, text: '#ffffff' },
  secondary: { fill: 0x244d82, hover: 0x3266a6, stroke: 0x9ad8f5, text: '#f5fbff' },
  utility: { fill: 0x18365e, hover: 0x285484, stroke: 0x7bbce6, text: '#eaf7ff' }
}

const SYNERGY_TIER_COLOR: Record<SynergyLevel, number> = {
  0: 0x475569,
  1: 0x06b6d4,
  2: 0x8b5cf6,
  3: 0xec4899
}

const SYNERGY_TIER_TEXT_COLOR: Record<SynergyLevel, string> = {
  0: '#94a3b8',
  1: '#67e8f9',
  2: '#ddd6fe',
  3: '#fbcfe8'
}

const SYNERGY_TIER_NAME: Record<SynergyLevel, string> = {
  0: '비활성',
  1: '1단계',
  2: '2단계',
  3: '3단계'
}

const SYNERGY_EFFECT_VALUES: Record<Genre, [number, number, number, number]> = {
  mha: [0, 0.15, 0.25, 0.4],
  onepunch: [0, 0.2, 0.4, 0.6],
  overwatch: [0, 0.2, 0.4, 0.6],
  tooniverse: [0, 0.2, 0.4, 0.6]
}

const GENRE_ATTACK_PROFILES: Record<Genre, GenreAttackProfile> = {
  mha: { damageMultiplier: 1, intervalMultiplier: 1, rangeMultiplier: 1 },
  onepunch: { damageMultiplier: 1, intervalMultiplier: 1, rangeMultiplier: 1 },
  overwatch: { damageMultiplier: 1, intervalMultiplier: 1, rangeMultiplier: 1 },
  tooniverse: { damageMultiplier: 1, intervalMultiplier: 1, rangeMultiplier: 1 }
}

const ATTACK_STYLE_PROFILES: Record<UnitAttackStyle, AttackProfile> = {
  fist: { kind: 'melee', damageMultiplier: 1.12, intervalMultiplier: 0.96, rangeMultiplier: 0.42 },
  dumbbell: { kind: 'melee', damageMultiplier: 1.28, intervalMultiplier: 1.08, rangeMultiplier: 0.5 },
  fast_fist: { kind: 'melee', damageMultiplier: 0.86, intervalMultiplier: 0.48, rangeMultiplier: 0.45 },
  barbell: { kind: 'melee', damageMultiplier: 1.58, intervalMultiplier: 1.25, rangeMultiplier: 0.62 },
  kick: { kind: 'melee', damageMultiplier: 1.46, intervalMultiplier: 0.92, rangeMultiplier: 0.57 },
  flurry_fist: { kind: 'melee', damageMultiplier: 0.7, intervalMultiplier: 0.38, rangeMultiplier: 0.47 },
  flute_blade: { kind: 'melee', damageMultiplier: 1.8, intervalMultiplier: 1.04, rangeMultiplier: 0.62 },
  spear: { kind: 'melee', damageMultiplier: 1.6, intervalMultiplier: 1.02, rangeMultiplier: 0.72 },
  greatsword: { kind: 'melee', damageMultiplier: 2.8, intervalMultiplier: 1.14, rangeMultiplier: 0.76 },
  nut_throw: { kind: 'single', damageMultiplier: 1.04, intervalMultiplier: 1.02, rangeMultiplier: 1.02 },
  slingshot: { kind: 'single', damageMultiplier: 0.94, intervalMultiplier: 0.68, rangeMultiplier: 1.08 },
  bow: { kind: 'single', damageMultiplier: 1.2, intervalMultiplier: 0.9, rangeMultiplier: 1.18 },
  sniper: { kind: 'single', damageMultiplier: 2.6, intervalMultiplier: 1.35, rangeMultiplier: 1.42 },
  laser: { kind: 'single', damageMultiplier: 1.8, intervalMultiplier: 0.7, rangeMultiplier: 1.26 },
  tear_throw: { kind: 'single', damageMultiplier: 2.2, intervalMultiplier: 1.26, rangeMultiplier: 1.16 },
  rapid_burst: { kind: 'single', damageMultiplier: 0.68, intervalMultiplier: 0.22, rangeMultiplier: 1.22 },
  weak_laser: { kind: 'single', damageMultiplier: 0.84, intervalMultiplier: 0.75, rangeMultiplier: 1.16 },
  machine_gun: { kind: 'single', damageMultiplier: 0.72, intervalMultiplier: 0.42, rangeMultiplier: 1.12 },
  pistol: { kind: 'single', damageMultiplier: 1.18, intervalMultiplier: 0.76, rangeMultiplier: 1.2 },
  lava_pool: { kind: 'aoe', damageMultiplier: 1.1, intervalMultiplier: 1.16, rangeMultiplier: 1.08, splashRadius: 54, splashDamageMultiplier: 0.55 },
  mech_bomb: { kind: 'single', damageMultiplier: 0.92, intervalMultiplier: 0.44, rangeMultiplier: 1.12 },
  twin_laser: { kind: 'single', damageMultiplier: 2.1, intervalMultiplier: 0.62, rangeMultiplier: 1.3 },
  nuke: { kind: 'aoe', damageMultiplier: 1.12, intervalMultiplier: 0.92, rangeMultiplier: 1.25, splashRadius: 110, splashDamageMultiplier: 0.8 },
  drill_zone: { kind: 'aoe', damageMultiplier: 1.3, intervalMultiplier: 1.05, rangeMultiplier: 1.2, splashRadius: 72, splashDamageMultiplier: 0.6 },
  coin_throw: { kind: 'single', damageMultiplier: 1.02, intervalMultiplier: 0.88, rangeMultiplier: 1.08 },
  syringe_throw: { kind: 'single', damageMultiplier: 1.1, intervalMultiplier: 1.02, rangeMultiplier: 1.12 },
  gun: { kind: 'single', damageMultiplier: 1.22, intervalMultiplier: 0.76, rangeMultiplier: 1.2 },
  smg: { kind: 'single', damageMultiplier: 0.74, intervalMultiplier: 0.38, rangeMultiplier: 1.16 },
  bill_throw: { kind: 'single', damageMultiplier: 1.36, intervalMultiplier: 0.96, rangeMultiplier: 1.12 },
  coin_bomb: { kind: 'aoe', damageMultiplier: 1.18, intervalMultiplier: 1.08, rangeMultiplier: 1.08, splashRadius: 60, splashDamageMultiplier: 0.58 },
  dice_bomb: { kind: 'aoe', damageMultiplier: 1.44, intervalMultiplier: 1.16, rangeMultiplier: 1.1, splashRadius: 70, splashDamageMultiplier: 0.62 },
  debt_photo: { kind: 'aoe', damageMultiplier: 1.7, intervalMultiplier: 1.22, rangeMultiplier: 1.12, splashRadius: 92, splashDamageMultiplier: 0.7 },
  lottery_support: { kind: 'single', damageMultiplier: 0, intervalMultiplier: 999, rangeMultiplier: 0 },
  gold_bar: { kind: 'aoe', damageMultiplier: 1.9, intervalMultiplier: 1.28, rangeMultiplier: 1.08, splashRadius: 86, splashDamageMultiplier: 0.7 },
  money_rain: { kind: 'aoe', damageMultiplier: 1.6, intervalMultiplier: 1.02, rangeMultiplier: 1.35, splashRadius: 100, splashDamageMultiplier: 0.72 }
}

export class GameScene extends Phaser.Scene {
  private nickname = 'Player'
  private units: UnitRuntime[] = []
  private monsters: MonsterRuntime[] = []
  private monstersById = new Map<number, MonsterRuntime>()
  private damageZones: DamageZoneRuntime[] = []
  private selectedUnitIds = new Set<number>()
  private nextUnitId = 1
  private nextMonsterId = 1

  private gold: number = GAME_RULES.startGold
  private lives: number = GAME_RULES.startLives
  private wave: number = 0
  private waveState: WaveState = 'waiting'
  private waveGapRemainingMs = 10_000
  private spawnRemaining = 0
  private waveSpawnTotal = 0
  private spawnCooldownMs = 0
  private eliteSpawnedThisWave = false
  private summonLevel = 0
  private summonCost: number = GAME_RULES.summonCost
  private genreUpgradeLevel: Record<Genre, number> = {
    mha: 0,
    onepunch: 0,
    overwatch: 0,
    tooniverse: 0
  }

  private killsNormal = 0
  private killsElite = 0
  private bossKills = 0
  private damageLog: DamageLog = {
    mha: 0,
    onepunch: 0,
    overwatch: 0,
    tooniverse: 0
  }

  private isPaused = false
  private isGameOver = false
  private isCleared = false
  private isTestMode = false
  private attackMode = false
  private currentBossId: number | null = null
  private bossTimeRemainingMs: number | null = null

  private dragStart: Phaser.Math.Vector2 | null = null
  private dragBox: Phaser.GameObjects.Rectangle | null = null
  private isDraggingSelection = false
  private lastClickAt = 0
  private lastClickedDefId: string | null = null

  private pathPoints: Phaser.Math.Vector2[] = []
  private pointerWorldPosition = new Phaser.Math.Vector2()
  private synergy: SynergyState = this.createEmptySynergy()
  private summonMessages: Phaser.GameObjects.Text[] = []
  private summonKeyDelay: Phaser.Time.TimerEvent | null = null
  private summonKeyRepeat: Phaser.Time.TimerEvent | null = null
  private uiRefreshRemainingMs = 0

  private topText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private bossText!: Phaser.GameObjects.Text
  private pauseOverlay!: Phaser.GameObjects.Container
  private escapeMenuOverlay!: Phaser.GameObjects.Container
  private attackCursor!: Phaser.GameObjects.Graphics
  private rangeIndicator!: Phaser.GameObjects.Graphics
  private rangeIndicatorUnit: UnitRuntime | null = null
  private summonButton!: ButtonHandle
  private summonUpgradeButton!: ButtonHandle
  private mergeButton!: ButtonHandle
  private sellButton!: ButtonHandle
  private pauseButton!: ButtonHandle
  private genreButtons: Record<Genre, ButtonHandle> = {} as Record<Genre, ButtonHandle>
  private genreButtonSwatches: Record<Genre, Phaser.GameObjects.Rectangle> = {} as Record<Genre, Phaser.GameObjects.Rectangle>
  private genreButtonCounts: Record<Genre, Phaser.GameObjects.Text> = {} as Record<Genre, Phaser.GameObjects.Text>
  private synergyRows: Record<Genre, SynergyRowHandle> = {} as Record<Genre, SynergyRowHandle>
  private synergyTooltip!: Phaser.GameObjects.Container
  private synergyTooltipText!: Phaser.GameObjects.Text
  private unitInfoPanel!: Phaser.GameObjects.Container
  private unitInfoText!: Phaser.GameObjects.Text
  private escapeMenuWasPaused = false
  private testSelectedGrade: Grade = 'myth'
  private testSelectedUnitIndex: Record<Grade, number> = {
    common: 0,
    rare: 0,
    hero: 0,
    legend: 0,
    myth: 0
  }
  private testUnitLabel?: Phaser.GameObjects.Text

  constructor() {
    super('GameScene')
  }

  init(data: { nickname?: string; testMode?: boolean }): void {
    const nickname = data.nickname || getNickname() || 'Player'
    this.resetRuntimeState()
    this.nickname = nickname
    this.isTestMode = data.testMode === true
    if (this.isTestMode) {
      this.gold = 999_999
      this.waveGapRemainingMs = 0
      this.waveState = 'finished'
    }
  }

  private resetRuntimeState(): void {
    this.units = []
    this.monsters = []
    this.monstersById = new Map<number, MonsterRuntime>()
    this.damageZones = []
    this.selectedUnitIds = new Set<number>()
    this.nextUnitId = 1
    this.nextMonsterId = 1

    this.gold = GAME_RULES.startGold
    this.lives = GAME_RULES.startLives
    this.wave = 0
    this.waveState = 'waiting'
    this.waveGapRemainingMs = 10_000
    this.spawnRemaining = 0
    this.waveSpawnTotal = 0
    this.spawnCooldownMs = 0
    this.eliteSpawnedThisWave = false
    this.summonLevel = 0
    this.summonCost = GAME_RULES.summonCost
    this.genreUpgradeLevel = {
      mha: 0,
      onepunch: 0,
      overwatch: 0,
      tooniverse: 0
    }

    this.killsNormal = 0
    this.killsElite = 0
    this.bossKills = 0
    this.damageLog = {
      mha: 0,
      onepunch: 0,
      overwatch: 0,
      tooniverse: 0
    }

    this.isPaused = false
    this.isGameOver = false
    this.isCleared = false
    this.isTestMode = false
    this.attackMode = false
    this.currentBossId = null
    this.bossTimeRemainingMs = null

    this.dragStart = null
    this.dragBox = null
    this.isDraggingSelection = false
    this.lastClickAt = 0
    this.lastClickedDefId = null

    this.pathPoints = []
    this.pointerWorldPosition.set(0, 0)
    this.synergy = this.createEmptySynergy()
    this.summonMessages = []
    this.summonKeyDelay = null
    this.summonKeyRepeat = null
    this.uiRefreshRemainingMs = 0
    this.genreButtons = {} as Record<Genre, ButtonHandle>
    this.genreButtonSwatches = {} as Record<Genre, Phaser.GameObjects.Rectangle>
    this.genreButtonCounts = {} as Record<Genre, Phaser.GameObjects.Text>
    this.synergyRows = {} as Record<Genre, SynergyRowHandle>
    this.escapeMenuWasPaused = false
    this.testSelectedGrade = 'myth'
    this.testSelectedUnitIndex = {
      common: 0,
      rare: 0,
      hero: 0,
      legend: 0,
      myth: 0
    }
    this.testUnitLabel = undefined
    this.rangeIndicatorUnit = null
  }

  private restartGame(): void {
    this.isPaused = false
    this.isGameOver = false
    this.attackMode = false
    this.escapeMenuWasPaused = false
    this.escapeMenuOverlay.setVisible(false)
    this.pauseOverlay.setVisible(false)
    this.game.canvas.style.cursor = 'default'
    this.stopSummonKeyRepeat()
    this.scene.restart({ nickname: this.nickname, testMode: this.isTestMode })
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101217')
    this.configureViewport()
    this.input.mouse?.disableContextMenu()
    this.drawBoard()
    this.rangeIndicator = this.add.graphics().setDepth(8).setVisible(false)
    this.createUi()
    this.applyTextResolution()
    this.createInputHandlers()
    this.recalculateSynergy()
    this.updateUi()
  }

  preload(): void {
    this.load.image('debt-photo', '/assets/attack/사채업자.jpg')
  }

  private configureViewport(): void {
    this.cameras.main
      .setViewport(0, 0, RENDER_WIDTH, RENDER_HEIGHT)
      .setOrigin(0, 0)
      .setZoom(RENDER_SCALE)
      .setScroll(0, 0)
    this.applyTextResolution()
  }

  private getWorldPointer(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return pointer.positionToCamera(this.cameras.main, this.pointerWorldPosition) as Phaser.Math.Vector2
  }

  private applyTextResolution(): void {
    const resolution = Math.min(2, Math.max(1, this.cameras.main.zoomX))
    const apply = (objects: Phaser.GameObjects.GameObject[]): void => {
      for (const object of objects) {
        if (object instanceof Phaser.GameObjects.Text) object.setResolution(resolution)
        if (object instanceof Phaser.GameObjects.Container) apply(object.list)
      }
    }
    apply(this.children.list)
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return
    this.updateAttackCursor()

    if (this.isPaused) {
      this.refreshUi(delta)
      return
    }

    if (!this.isTestMode) {
      this.updateWave(delta)
    }
    this.updateUnits(delta)
    this.updateRangeIndicatorPosition()
    this.updateMonsters(delta)
    this.updateDamageZones()
    this.updateCombat()
    if (!this.isTestMode) {
      this.updateBossTimer(delta)
    }
    this.refreshUi(delta)
    if (!this.isTestMode) {
      this.checkVictory()
    }
  }

  private refreshUi(delta: number): void {
    this.uiRefreshRemainingMs -= delta
    if (this.uiRefreshRemainingMs > 0) return
    this.uiRefreshRemainingMs = 100
    this.updateUi()
  }

  private drawBoard(): void {
    const { outer, inner, pathThickness } = BOARD
    const g = this.add.graphics().setDepth(-6)

    // A painted sky and garden replaces the unrelated photo textures. The board is
    // deliberately flat and high contrast so units, projectiles, and the path read at a glance.
    g.fillStyle(0x17325e, 1)
    g.fillRect(-400, -260, CANVAS_WIDTH + 800, CANVAS_HEIGHT + 520)
    g.fillStyle(0x203f70, 1)
    g.fillRoundedRect(0, 0, CANVAS_WIDTH, 286, 0)
    g.fillStyle(0x4e7fb0, 0.38)
    g.fillCircle(660, 80, 248)
    g.fillCircle(220, 34, 168)
    g.fillStyle(0xdaf4ff, 0.18)
    g.fillEllipse(500, 58, 250, 50)
    g.fillEllipse(726, 118, 320, 58)
    g.fillEllipse(104, 150, 210, 42)

    g.fillStyle(0x0d2342, 0.45)
    g.fillRoundedRect(outer.x + 8, outer.y + 13, outer.width, outer.height, 30)
    g.fillStyle(0x7db7cf, 1)
    g.fillRoundedRect(outer.x, outer.y, outer.width, outer.height, 30)
    g.lineStyle(5, 0xd6f2f5, 0.88)
    g.strokeRoundedRect(outer.x, outer.y, outer.width, outer.height, 30)
    g.lineStyle(2, 0x315b7b, 0.8)
    g.strokeRoundedRect(outer.x + 7, outer.y + 7, outer.width - 14, outer.height - 14, 25)

    // The outer stone path frames a calm garden arena, keeping the play space readable without neon greens.
    g.fillStyle(0xcaa365, 1)
    g.fillRoundedRect(outer.x + 13, outer.y + 13, outer.width - 26, outer.height - 26, 23)
    g.fillStyle(0x8f6c3e, 0.3)
    for (let x = outer.x + 42; x < outer.x + outer.width - 26; x += 34) {
      g.fillCircle(x, outer.y + pathThickness / 2, 3)
      g.fillCircle(x, outer.y + outer.height - pathThickness / 2, 3)
    }
    for (let y = outer.y + 42; y < outer.y + outer.height - 26; y += 34) {
      g.fillCircle(outer.x + pathThickness / 2, y, 3)
      g.fillCircle(outer.x + outer.width - pathThickness / 2, y, 3)
    }

    g.fillStyle(0x91c87c, 1)
    g.fillRoundedRect(inner.x, inner.y, inner.width, inner.height, 20)
    g.lineStyle(4, 0x477d63, 0.92)
    g.strokeRoundedRect(inner.x, inner.y, inner.width, inner.height, 20)
    g.lineStyle(1, 0xe4f6cc, 0.48)
    g.strokeRoundedRect(inner.x + 8, inner.y + 8, inner.width - 16, inner.height - 16, 14)

    g.fillStyle(0xd7efb3, 0.23)
    for (let x = inner.x + 42; x < inner.x + inner.width - 20; x += 54) {
      for (let y = inner.y + 36; y < inner.y + inner.height - 16; y += 54) {
        const offset = Math.floor((x + y) / 54) % 2 === 0 ? 5 : -5
        g.fillCircle(x + offset, y, 2.5)
        g.fillCircle(x + offset + 8, y + 6, 1.5)
      }
    }

    const flowerCorners = [
      [inner.x + 25, inner.y + 24], [inner.x + inner.width - 25, inner.y + 24],
      [inner.x + 25, inner.y + inner.height - 24], [inner.x + inner.width - 25, inner.y + inner.height - 24]
    ]
    flowerCorners.forEach(([x, y], index) => {
      g.fillStyle(index % 2 === 0 ? 0xf59eb5 : 0x8ee7dc, 0.96)
      g.fillCircle(x, y, 8)
      g.fillCircle(x + 9, y + 4, 5)
      g.fillCircle(x - 7, y + 7, 5)
      g.fillStyle(0xfff5b4, 1)
      g.fillCircle(x + 1, y + 5, 3)
    })

    const left = outer.x + pathThickness / 2
    const right = outer.x + outer.width - pathThickness / 2
    const top = outer.y + pathThickness / 2
    const bottom = outer.y + outer.height - pathThickness / 2
    this.pathPoints = [
      new Phaser.Math.Vector2(left, top),
      new Phaser.Math.Vector2(right, top),
      new Phaser.Math.Vector2(right, bottom),
      new Phaser.Math.Vector2(left, bottom)
    ]

    const guide = this.add.graphics().setDepth(-3)
    guide.lineStyle(2, 0xffffff, 0.54)
    guide.strokeRoundedRect(outer.x + pathThickness / 2, outer.y + pathThickness / 2, outer.width - pathThickness, outer.height - pathThickness, 10)
    guide.fillStyle(0xffed9b, 0.88)
    guide.fillTriangle(left - 7, top, left - 22, top - 9, left - 22, top + 9)
    guide.fillStyle(0x9ed7ff, 0.9)
    guide.fillCircle(right, bottom, 8)
  }

  private createUi(): void {
    const header = this.add.graphics().setDepth(100)
    header.fillStyle(0x10284e, 0.94)
    header.fillRoundedRect(16, 8, 864, 40, 16)
    header.lineStyle(2, 0x8ad3f3, 0.8)
    header.strokeRoundedRect(16, 8, 864, 40, 16)
    header.fillStyle(0xffbf4d, 1)
    header.fillCircle(38, 28, 8)
    header.fillStyle(0xfff2b5, 0.8)
    header.fillCircle(36, 26, 2)

    this.topText = this.add.text(54, 17, '', {
      fontFamily: UI_FONT,
      fontSize: '17px',
      color: '#f8fbff',
      fontStyle: '800'
    }).setDepth(101)

    this.bossText = this.add.text(860, 17, '', {
      fontFamily: UI_FONT,
      fontSize: '17px',
      color: '#ffd1c3',
      fontStyle: '800'
    }).setOrigin(1, 0).setDepth(101)

    const uiX = BOARD.uiX
    const sidePanel = this.add.graphics()
    sidePanel.fillStyle(0x0a1c3b, 0.42)
    sidePanel.fillRoundedRect(uiX - 14, 12, 372, 708, 24)
    sidePanel.fillStyle(0x152f59, 0.98)
    sidePanel.fillRoundedRect(uiX - 20, 0, 380, 720, 24)
    sidePanel.lineStyle(2, 0x83cbed, 0.9)
    sidePanel.strokeRoundedRect(uiX - 20, 0, 380, 720, 24)
    sidePanel.lineStyle(1, 0xffffff, 0.18)
    sidePanel.strokeRoundedRect(uiX - 12, 8, 364, 704, 20)
    this.createSynergyPanel()
    this.add.text(uiX, 24, '랜덤 디펜스', {
      fontFamily: UI_FONT,
      fontSize: '24px',
      color: '#fff4d2',
      fontStyle: '800'
    })
    this.add.text(uiX, 54, `닉네임: ${this.nickname}`, {
      fontFamily: UI_FONT,
      fontSize: '15px',
      color: '#b9efbd',
      fontStyle: '700'
    })

    this.statusText = this.add.text(uiX, 82, '', {
      fontFamily: UI_FONT,
      fontSize: '15px',
      color: '#dcecff',
      lineSpacing: 4
    })

    this.summonButton = this.createButton(uiX, 190, 300, 38, '', () => this.summonUnit(), false, true, 'primary')
    this.summonUpgradeButton = this.createButton(uiX, 238, 300, 38, '', () => this.upgradeSummon(), false, true, 'accent')
    this.mergeButton = this.createButton(uiX, 286, 145, 38, '선택 합성', () => this.mergeSelectedUnits(), false, true, 'secondary')
    this.sellButton = this.createButton(uiX + 155, 286, 145, 38, '선택 판매', () => this.sellSelectedUnits(), false, false, 'utility')
    this.pauseButton = this.createButton(uiX, 334, 300, 34, '', () => this.togglePause(), true, false, 'utility')

    this.add.text(uiX, 390, '시너지별 공격력 강화', {
      fontFamily: UI_FONT,
      fontSize: '17px',
      color: '#fff4d2',
      fontStyle: '800'
    })

    GENRES.forEach((genre, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const x = uiX + col * 154
      const y = 420 + row * 46
      this.genreButtons[genre] = this.createButton(x, y, 145, 36, '', () => this.upgradeGenre(genre), false, true, 'secondary', {
        x: 84,
        y: 18,
        originX: 0.5,
        originY: 0.5,
        fontSize: '10px',
        lineSpacing: 0
      })
      this.genreButtonSwatches[genre] = this.add.rectangle(x + 11, y + 18, 9, 18, GENRE_COLOR[genre], 1)
        .setOrigin(0, 0.5)
      this.genreButtonCounts[genre] = this.add.text(x + 134, y + 18, '', {
        fontFamily: UI_FONT,
        fontSize: '11px',
        color: '#e2e8f0',
        fontStyle: '800'
      }).setOrigin(1, 0.5).setVisible(false)
    })

    this.createUnitInfoPanel(uiX)

    if (this.isTestMode) {
      this.createTestControls(uiX)
    }

    this.pauseOverlay = this.add.container(450, 360)
    const overlayBg = this.add.rectangle(0, 0, 520, 170, 0x122b52, 0.95).setStrokeStyle(3, 0xffc85b)
    const overlayText = this.add.text(0, -18, '일시정지', {
      fontFamily: UI_FONT,
      fontSize: '38px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    const overlaySub = this.add.text(0, 36, 'P 또는 Space를 누르면 다시 진행합니다.', {
      fontFamily: UI_FONT,
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5)
    this.pauseOverlay.add([overlayBg, overlayText, overlaySub])
    this.pauseOverlay.setDepth(999)
    this.pauseOverlay.setVisible(false)
    this.createEscapeMenuOverlay()

    this.attackCursor = this.add.graphics().setDepth(1000)
    this.attackCursor.setVisible(false)
  }

  private createTestControls(uiX: number): void {
    void uiX
    const panelX = 12
    const panelY = CANVAS_HEIGHT - 188
    const makeTestButton = (
      x: number,
      y: number,
      width: number,
      height: number,
      label: string,
      onClick: () => void
    ): ButtonHandle => {
      const button = this.createButton(x, y, width, height, label, onClick, true)
      button.rect.setDepth(642)
      button.visual.setDepth(642)
      button.text.setDepth(643)
      return button
    }

    this.add.rectangle(panelX, panelY, 316, 176, 0x020617, 0.78)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x64748b, 0.85)
      .setDepth(640)

    this.add.text(panelX + 12, panelY + 10, '서버장 테스트 소환', {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setDepth(641)

    GRADES.forEach((grade, index) => {
      makeTestButton(panelX + 10 + index * 60, panelY + 36, 56, 24, GRADE_LABEL[grade], () => {
        this.testSelectedGrade = grade
        this.updateTestUnitLabel()
      })
    })

    this.testUnitLabel = this.add.text(panelX + 12, panelY + 68, '', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    }).setDepth(641)
    this.updateTestUnitLabel()

    makeTestButton(panelX + 10, panelY + 90, 70, 26, '이전', () => this.shiftTestUnit(-1))
    makeTestButton(panelX + 88, panelY + 90, 136, 26, '선택 유닛 소환', () => this.summonSelectedTestUnit())
    makeTestButton(panelX + 232, panelY + 90, 70, 26, '다음', () => this.shiftTestUnit(1))
    makeTestButton(panelX + 10, panelY + 122, 292, 24, '현재 등급 전체 소환', () => this.summonAllTestUnitsInGrade())

    this.add.text(panelX + 12, panelY + 151, '적 소환', {
      fontFamily: UI_FONT,
      fontSize: '13px',
      color: '#fecaca',
      fontStyle: 'bold'
    }).setDepth(641)
    makeTestButton(panelX + 68, panelY + 149, 62, 22, '일반', () => this.spawnTestMonster('normal'))
    makeTestButton(panelX + 136, panelY + 149, 62, 22, '엘리트', () => this.spawnTestMonster('elite'))
    makeTestButton(panelX + 204, panelY + 149, 52, 22, '보스', () => this.spawnTestMonster('boss'))
    makeTestButton(panelX + 262, panelY + 149, 40, 22, '정리', () => this.clearTestMonsters())
  }

  private createUnitInfoPanel(uiX: number): void {
    const panelWidth = 300
    const panelHeight = 152
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x102b52, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffce72, 0.9)
    this.unitInfoText = this.add.text(12, 10, '', {
      fontFamily: UI_FONT,
      fontSize: '13px',
      color: '#eff9ff',
      lineSpacing: 3
    })
    this.unitInfoPanel = this.add.container(uiX, 512, [bg, this.unitInfoText])
      .setDepth(620)
      .setVisible(false)
  }

  private updateTestUnitLabel(): void {
    if (!this.testUnitLabel) return
    const units = getUnitsByGrade(this.testSelectedGrade)
    const index = clamp(this.testSelectedUnitIndex[this.testSelectedGrade], 0, Math.max(0, units.length - 1))
    this.testSelectedUnitIndex[this.testSelectedGrade] = index
    const def = units[index]
    this.testUnitLabel.setText(`${GRADE_LABEL[this.testSelectedGrade]} ${index + 1}/${units.length}: ${def?.name ?? '-'}`)
  }

  private shiftTestUnit(direction: number): void {
    const units = getUnitsByGrade(this.testSelectedGrade)
    if (units.length === 0) return
    const nextIndex = (this.testSelectedUnitIndex[this.testSelectedGrade] + direction + units.length) % units.length
    this.testSelectedUnitIndex[this.testSelectedGrade] = nextIndex
    this.updateTestUnitLabel()
  }

  private summonSelectedTestUnit(): void {
    const units = getUnitsByGrade(this.testSelectedGrade)
    const def = units[this.testSelectedUnitIndex[this.testSelectedGrade]]
    if (def) this.summonTestUnit(def)
  }

  private summonAllTestUnitsInGrade(): void {
    if (!this.isTestMode || this.isGameOver) return
    const defs = getUnitsByGrade(this.testSelectedGrade)
    const createdUnits: UnitRuntime[] = []
    for (const def of defs) {
      const point = this.getNextSummonPoint(createdUnits)
      const created = this.createUnit(def, point.x, point.y)
      this.playUnitAppearEffect(created)
      createdUnits.push(created)
    }
    this.selectUnits(createdUnits)
    this.recalculateSynergy()
  }

  private createEscapeMenuOverlay(): void {
    const overlay = this.add.container(0, 0).setDepth(1600).setVisible(false)
    const dim = this.add.rectangle(-400, -260, CANVAS_WIDTH + 800, CANVAS_HEIGHT + 520, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setInteractive()
      .on('pointerdown', () => this.closeEscapeMenu())

    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2
    const panel = this.add.rectangle(centerX, centerY, 430, 230, 0x0f172a, 0.98)
      .setStrokeStyle(2, 0x94a3b8, 1)
      .setInteractive()
    const title = this.add.text(centerX, centerY - 72, '게임 메뉴', {
      fontFamily: UI_FONT,
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    const description = this.add.text(centerX, centerY - 32, '현재 게임을 어떻게 할까요?', {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: '#cbd5e1'
    }).setOrigin(0.5)

    const restartButton = this.createEscapeMenuButton(centerX - 112, centerY + 42, 170, 52, '재시작', 0x16a34a, 0x22c55e, () => {
      this.restartGame()
    })
    const exitButton = this.createEscapeMenuButton(centerX + 112, centerY + 42, 170, 52, '나가기', 0xdc2626, 0xef4444, () => {
      this.scene.start('MenuScene')
    })
    const closeButton = this.createEscapeMenuButton(centerX + 182, centerY - 84, 32, 32, 'x', 0x1e293b, 0x64748b, () => {
      this.closeEscapeMenu()
    }, '18px')

    overlay.add([dim, panel, title, description, ...restartButton, ...exitButton, ...closeButton])
    this.escapeMenuOverlay = overlay
  }

  private createEscapeMenuButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    hoverColor: number,
    onClick: () => void,
    fontSize = '20px'
  ): Phaser.GameObjects.GameObject[] {
    const rect = this.add.rectangle(x, y, width, height, color, 1)
      .setStrokeStyle(2, hoverColor, 1)
      .setInteractive({ useHandCursor: true })
    const text = this.add.text(x, y, label, {
      fontFamily: UI_FONT,
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    rect.on('pointerover', () => rect.setFillStyle(hoverColor, 1))
    rect.on('pointerout', () => rect.setFillStyle(color, 1))
    rect.on('pointerdown', onClick)
    text.on('pointerdown', onClick)

    return [rect, text]
  }

  private createSynergyPanel(): void {
    const panelX = 6
    const panelY = 88
    const panelWidth = 156
    const rowWidth = 132
    const rowHeight = 26

    const panel = this.add.graphics().setDepth(110)
    panel.fillStyle(0x112b52, 0.96)
    panel.fillRoundedRect(panelX, panelY, panelWidth, 248, 16)
    panel.lineStyle(2, 0x7cc8ee, 0.85)
    panel.strokeRoundedRect(panelX, panelY, panelWidth, 248, 16)
    panel.lineStyle(1, 0xffffff, 0.18)
    panel.strokeRoundedRect(panelX + 5, panelY + 5, panelWidth - 10, 238, 12)
    this.add.text(panelX + 12, panelY + 10, '시너지', {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: '#fff4d2',
      fontStyle: '800'
    }).setDepth(111)
    this.add.text(panelX + 74, panelY + 13, '5 / 10 / 15', {
      fontFamily: UI_FONT,
      fontSize: '11px',
      color: '#94a3b8'
    }).setDepth(111)

    GENRES.forEach((genre, index) => {
      const rowY = panelY + 40 + index * 31
      const container = this.add.container(panelX + 12, rowY).setDepth(112)
      const bg = this.add.rectangle(0, 0, rowWidth, rowHeight, 0x18375f, 0.94)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x75bce2, 0.62)
      const genreDot = this.add.rectangle(8, rowHeight / 2, 7, 16, GENRE_COLOR[genre], 1)
        .setOrigin(0, 0.5)
      const tierBar = this.add.rectangle(19, rowHeight / 2, 4, 16, SYNERGY_TIER_COLOR[0], 0.55)
        .setOrigin(0, 0.5)
      const label = this.add.text(29, 5, '', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#94a3b8',
        fontStyle: 'bold'
      })
      const count = this.add.text(rowWidth - 8, 5, '', {
        fontFamily: UI_FONT,
        fontSize: '11px',
        color: '#cbd5e1',
        fontStyle: 'bold'
      }).setOrigin(1, 0)

      container.add([bg, genreDot, tierBar, label, count])
      container.setSize(rowWidth, rowHeight)
      container.setInteractive(new Phaser.Geom.Rectangle(0, 0, rowWidth, rowHeight), Phaser.Geom.Rectangle.Contains)
      container.on('pointerover', () => this.showSynergyTooltip(genre, panelX + panelWidth + 8, rowY - 4))
      container.on('pointerout', () => this.synergyTooltip.setVisible(false))

      this.synergyRows[genre] = { container, bg, genreDot, tierBar, label, count }
    })

    const tooltipBg = this.add.rectangle(0, 0, 254, 130, 0x102b52, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffd16b, 0.9)
    this.synergyTooltipText = this.add.text(12, 10, '', {
      fontFamily: UI_FONT,
      fontSize: '12px',
      color: '#e2e8f0',
      lineSpacing: 4,
      wordWrap: { width: 230 }
    })
    this.synergyTooltip = this.add.container(panelX + panelWidth + 8, panelY, [tooltipBg, this.synergyTooltipText])
      .setDepth(650)
      .setVisible(false)
  }

  private createInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return
      if (this.isPaused) return
      if (this.isPointerOverUi(pointer)) return

      if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer)
        return
      }

      if (pointer.leftButtonDown()) {
        if (this.attackMode) {
          this.handleAttackClick(pointer)
          return
        }
        this.startSelectionDrag(pointer)
      }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDraggingSelection || !this.dragStart || !this.dragBox || this.isPaused || this.attackMode) return
      if (!pointer.leftButtonDown()) {
        this.cancelSelectionDrag()
        return
      }
      this.updateSelectionDrag(pointer)
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return
      if (!this.isDraggingSelection) return
      if (this.isPaused) {
        this.cancelSelectionDrag()
        return
      }
      this.finishSelectionDrag(pointer)
    })

    this.input.keyboard?.on('keydown-A', () => {
      if (!this.isPaused && !this.isGameOver && this.selectedUnitIds.size > 0) {
        this.attackMode = true
        this.game.canvas.style.cursor = 'crosshair'
      }
    })

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.isGameOver) return
      if (this.isEscapeMenuOpen()) {
        this.closeEscapeMenu()
      } else {
        this.openEscapeMenu()
      }
    })

    this.input.keyboard?.on('keydown-P', () => this.togglePause())
    this.input.keyboard?.on('keydown-SPACE', () => this.togglePause())
    this.input.keyboard?.on('keydown-S', () => this.startSummonKeyRepeat())
    this.input.keyboard?.on('keyup-S', () => this.stopSummonKeyRepeat())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopSummonKeyRepeat())
  }

  private isPointerOverUi(pointer: Phaser.Input.Pointer): boolean {
    const point = this.getWorldPointer(pointer)
    const overRightPanel = point.x >= BOARD.uiX - 24
    const overSynergyPanel = point.x >= 6 && point.x <= 162 && point.y >= 88 && point.y <= 336
    const overTestPanel = this.isTestMode && point.x >= 12 && point.x <= 328 && point.y >= CANVAS_HEIGHT - 188 && point.y <= CANVAS_HEIGHT - 12
    return overRightPanel || overSynergyPanel || overTestPanel
  }

  private startSummonKeyRepeat(): void {
    if (this.isPaused || this.isGameOver) return
    if (this.summonKeyDelay || this.summonKeyRepeat) return
    this.summonUnit()
    this.summonKeyDelay = this.time.delayedCall(260, () => {
      this.summonKeyRepeat = this.time.addEvent({
        delay: 115,
        loop: true,
        callback: () => this.summonUnit()
      })
    })
  }

  private stopSummonKeyRepeat(): void {
    this.summonKeyDelay?.remove(false)
    this.summonKeyRepeat?.remove(false)
    this.summonKeyDelay = null
    this.summonKeyRepeat = null
  }

  private startSelectionDrag(pointer: Phaser.Input.Pointer): void {
    const point = this.getWorldPointer(pointer)
    this.dragStart = new Phaser.Math.Vector2(point.x, point.y)
    this.isDraggingSelection = true
    this.ensureDragBox()
  }

  private updateSelectionDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStart || !this.dragBox) return
    const point = this.getWorldPointer(pointer)
    const dx = point.x - this.dragStart.x
    const dy = point.y - this.dragStart.y
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return

    const x = Math.min(this.dragStart.x, point.x)
    const y = Math.min(this.dragStart.y, point.y)
    this.dragBox.setPosition(x, y)
    this.dragBox.setSize(Math.abs(dx), Math.abs(dy))
    this.dragBox.setVisible(true)
  }

  private finishSelectionDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStart) return
    const point = this.getWorldPointer(pointer)
    const dragDistance = distance(this.dragStart, point)
    if (dragDistance > 8 && this.dragBox?.visible) {
      this.selectUnitsInRect(this.dragBox.getBounds())
    } else {
      this.handleUnitClick(pointer)
    }
    this.cancelSelectionDrag()
  }

  private cancelSelectionDrag(): void {
    this.isDraggingSelection = false
    this.dragStart = null
    this.dragBox?.setVisible(false)
  }

  private openEscapeMenu(): void {
    if (this.isGameOver || this.isEscapeMenuOpen()) return
    this.escapeMenuWasPaused = this.isPaused
    this.isPaused = true
    this.attackMode = false
    this.cancelSelectionDrag()
    this.game.canvas.style.cursor = 'default'
    this.escapeMenuOverlay.setVisible(true)
  }

  private closeEscapeMenu(): void {
    if (!this.isEscapeMenuOpen()) return
    this.escapeMenuOverlay.setVisible(false)
    if (!this.escapeMenuWasPaused) {
      this.isPaused = false
    }
  }

  private isEscapeMenuOpen(): boolean {
    return this.escapeMenuOverlay?.visible === true
  }

  private updateWave(delta: number): void {
    if (this.waveState === 'waiting') {
      this.waveGapRemainingMs -= delta
      if (this.waveGapRemainingMs <= 0) {
        this.startNextWave()
      }
      return
    }

    if (this.waveState !== 'spawning') return

    this.spawnCooldownMs -= delta
    while (this.spawnRemaining > 0 && this.spawnCooldownMs <= 0) {
      this.spawnMonster('normal')
      this.spawnRemaining -= 1
      this.trySpawnEliteAtWaveProgress()
      this.spawnCooldownMs += GAME_RULES.spawnIntervalMs
    }

    if (this.spawnRemaining <= 0) {
      this.waveState = 'finished'
      if (this.wave < GAME_RULES.maxWave) {
        this.waveState = 'waiting'
        this.waveGapRemainingMs = GAME_RULES.waveGapMs
      }
    }
  }

  private startNextWave(): void {
    if (this.wave >= GAME_RULES.maxWave) return
    this.wave += 1
    this.spawnRemaining = getNormalSpawnCount(this.wave)
    this.waveSpawnTotal = this.spawnRemaining
    this.spawnCooldownMs = 0
    this.eliteSpawnedThisWave = false
    this.waveState = 'spawning'

    if (this.wave % 5 === 0) {
      this.spawnMonster('boss')
    }
  }

  private trySpawnEliteAtWaveProgress(): void {
    if (this.eliteSpawnedThisWave || this.waveSpawnTotal <= 0) return
    const spawnedCount = this.waveSpawnTotal - this.spawnRemaining
    if (spawnedCount / this.waveSpawnTotal < 0.7) return
    this.eliteSpawnedThisWave = true
    this.spawnMonster('elite')
  }

  private spawnMonster(kind: MonsterKind): void {
    if (!this.isTestMode && kind !== 'boss' && this.getMobWeight() >= GAME_RULES.mobDangerThreshold) {
      this.lives -= 1
      if (this.lives <= 0) {
        this.finishGame(false, '몬스터가 100마리 이상 쌓여 라이프가 모두 소진되었습니다.')
        return
      }
    }

    while (!this.isTestMode && kind !== 'boss' && this.getMobWeight() >= GAME_RULES.mobHardCap) {
      const oldest = this.monsters.filter((monster) => monster.kind !== 'boss').sort((a, b) => a.createdAt - b.createdAt)[0]
      if (!oldest) break
      this.removeMonster(oldest, false)
    }

    const wave = Math.max(1, this.wave)
    const baseHp = getMonsterHp(wave)
    const hp = kind === 'boss' ? getBossHp(wave) : kind === 'elite' ? baseHp * 4 : baseHp
    const speed = (kind === 'boss' ? getMonsterSpeed(wave) * 0.62 : kind === 'elite' ? getMonsterSpeed(wave) * 0.85 : getMonsterSpeed(wave))
    const radius = kind === 'boss' ? 28 : kind === 'elite' ? 20 : 13
    const theme = this.getMonsterTheme(kind, wave)

    const startPoint = this.pathPoints[0]
    const shadow = this.add.ellipse(0, radius + 4, radius * 1.65, 8, 0x000000, 0.24)
    const aura = this.createMonsterThreatAura(kind, radius, theme)
    const leftHorn = this.add.triangle(-radius * 0.42, -radius * 0.58, 0, 0, 7, -13, 14, 0, theme.hornColor, 0.9)
      .setAngle(-18)
    const rightHorn = this.add.triangle(radius * 0.42, -radius * 0.58, 0, 0, 7, -13, 14, 0, theme.hornColor, 0.9)
      .setAngle(18)
    const body = this.add.circle(0, 0, radius, theme.bodyColor, 1).setStrokeStyle(2, theme.threatTier >= 3 ? 0x020617 : 0xffffff, 0.9)
    const eyeColor = theme.eyeColor
    const leftEye = this.add.circle(-radius * 0.35, -radius * 0.15, Math.max(2.5, radius * 0.15), eyeColor, 1)
    const rightEye = this.add.circle(radius * 0.35, -radius * 0.15, Math.max(2.5, radius * 0.15), eyeColor, 1)
    const core = this.add.circle(0, radius * 0.28, Math.max(3, radius * 0.16), theme.coreColor, 0.9)
    const leftFoot = this.add.ellipse(-radius * 0.42, radius * 0.78, radius * 0.55, radius * 0.28, theme.bodyColor, 0.96)
    const rightFoot = this.add.ellipse(radius * 0.42, radius * 0.78, radius * 0.55, radius * 0.28, theme.bodyColor, 0.96)
    const mouth = this.add.ellipse(0, radius * 0.42, radius * 0.34, Math.max(2, radius * 0.12), 0x17233a, 0.7)
    const hpText = this.add.text(0, radius + 7, '', {
      fontFamily: UI_FONT,
      fontSize: kind === 'boss' ? '12px' : '10px',
      color: '#ffffff'
    }).setOrigin(0.5)
    const container = this.add.container(startPoint.x, startPoint.y, [shadow, aura, leftFoot, rightFoot, leftHorn, rightHorn, body, leftEye, rightEye, core, mouth, hpText]).setDepth(kind === 'boss' ? 20 : 10)

    const monster: MonsterRuntime = {
      id: this.nextMonsterId++,
      kind,
      container,
      body,
      hpText,
      baseColor: theme.bodyColor,
      auraColor: theme.auraColor,
      threatTier: theme.threatTier,
      hp,
      maxHp: hp,
      speed,
      pathIndex: 1,
      weight: kind === 'elite' ? 3 : kind === 'boss' ? 0 : 1,
      wave,
      createdAt: this.time.now,
      lastEffectAt: 0,
      lastHitFeedbackAt: 0,
      lastHpDisplayPercent: -1,
      alive: true
    }

    this.monsters.push(monster)
    this.monstersById.set(monster.id, monster)
    this.updateMonsterHpText(monster)
    this.playMonsterSpawnEffect(monster)

    if (kind === 'boss') {
      this.currentBossId = monster.id
      this.bossTimeRemainingMs = this.isTestMode ? null : getBossTimeLimitMs(wave)
    }
  }

  private getMonsterTheme(kind: MonsterKind, wave: number): MonsterTheme {
    const waveTier = clamp(Math.floor((wave - 1) / 8), 0, 4)
    const kindBonus = kind === 'boss' ? 2 : kind === 'elite' ? 1 : 0
    const threatTier = clamp(waveTier + kindBonus, 0, 5)
    const palette: Record<MonsterKind, number[]> = {
      normal: [0x7dd3fc, 0x38bdf8, 0x2563eb, 0x7c3aed, 0xbe123c, 0x450a0a],
      elite: [0xfdba74, 0xfb923c, 0xf97316, 0xc2410c, 0x991b1b, 0x3f0b0b],
      boss: [0xfca5a5, 0xef4444, 0xdc2626, 0x991b1b, 0x7f1d1d, 0x1c0505]
    }
    const auraPalette = [0xbae6fd, 0x93c5fd, 0xa78bfa, 0xf87171, 0xdc2626, 0x7f1d1d]
    const bodyColor = palette[kind][threatTier]
    return {
      bodyColor,
      auraColor: auraPalette[threatTier],
      hornColor: threatTier >= 3 ? 0x0f172a : kind === 'normal' ? 0xbae6fd : 0xfef3c7,
      eyeColor: threatTier >= 3 ? 0xfffbeb : 0xeff6ff,
      coreColor: threatTier >= 4 ? 0xfef2f2 : kind === 'boss' ? 0xfacc15 : 0x0f172a,
      threatTier
    }
  }

  private createMonsterThreatAura(kind: MonsterKind, radius: number, theme: MonsterTheme): Phaser.GameObjects.Graphics {
    const aura = this.add.graphics()
    if (theme.threatTier <= 0 && kind === 'normal') return aura

    aura.lineStyle(1 + Math.min(3, theme.threatTier), theme.auraColor, 0.16 + theme.threatTier * 0.08)
    aura.strokeCircle(0, 0, radius + 5 + theme.threatTier * 2)
    if (theme.threatTier >= 2) {
      aura.lineStyle(2, theme.auraColor, 0.28)
      aura.strokeCircle(0, 0, radius + 12 + theme.threatTier * 2)
    }
    if (theme.threatTier >= 4) {
      aura.lineStyle(2, 0x020617, 0.65)
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8
        aura.lineBetween(
          Math.cos(angle) * (radius + 8),
          Math.sin(angle) * (radius + 8),
          Math.cos(angle) * (radius + 20 + theme.threatTier * 2),
          Math.sin(angle) * (radius + 20 + theme.threatTier * 2)
        )
      }
    }

    const canAnimateAura = kind === 'boss' || this.monsters.length < 60 || this.nextMonsterId % 3 === 0
    if (canAnimateAura) {
      this.tweens.add({
        targets: aura,
        scale: 1.08 + theme.threatTier * 0.03,
        alpha: theme.threatTier >= 3 ? 0.66 : 0.82,
        duration: 900 - Math.min(420, theme.threatTier * 80),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }
    return aura
  }

  private playMonsterSpawnEffect(monster: MonsterRuntime): void {
    const radius = monster.kind === 'boss' ? 42 : monster.kind === 'elite' ? 30 : 20
    const scale = 1 + monster.threatTier * 0.16
    this.drawBurstRing(monster.container.x, monster.container.y, radius * scale, monster.auraColor)
    this.spawnBurst(
      monster.container.x,
      monster.container.y,
      monster.auraColor,
      4 + monster.threatTier * 3 + (monster.kind === 'boss' ? 8 : 0),
      radius * scale
    )
  }

  private playMonsterThreatTrail(monster: MonsterRuntime): void {
    const now = this.time.now
    if (monster.threatTier <= 0 || now - monster.lastEffectAt < 180 - Math.min(90, monster.threatTier * 18)) return
    const visualLoad = this.units.length + this.monsters.length
    if (visualLoad > 130 && monster.kind !== 'boss' && monster.id % 3 !== Math.floor(now / 180) % 3) return
    monster.lastEffectAt = now

    const radius = monster.kind === 'boss' ? 18 : monster.kind === 'elite' ? 12 : 8
    const smoke = this.add.ellipse(
      monster.container.x,
      monster.container.y + radius * 0.7,
      radius * (1.5 + monster.threatTier * 0.2),
      radius * 0.62,
      monster.threatTier >= 4 ? 0x020617 : monster.auraColor,
      monster.threatTier >= 4 ? 0.34 : 0.18
    ).setDepth(monster.kind === 'boss' ? 18 : 8)

    this.tweens.add({
      targets: smoke,
      scaleX: 1.45,
      scaleY: 0.65,
      alpha: 0,
      duration: 380 + monster.threatTier * 30,
      ease: 'Quad.easeOut',
      onComplete: () => smoke.destroy()
    })

    if (monster.threatTier >= 4) {
      const spark = this.add.graphics().setDepth(monster.kind === 'boss' ? 19 : 9)
      spark.lineStyle(2, monster.auraColor, 0.82)
      spark.lineBetween(-6, -5, 0, 0)
      spark.lineBetween(0, 0, -3, 8)
      spark.setPosition(monster.container.x + Phaser.Math.Between(-8, 8), monster.container.y + Phaser.Math.Between(-8, 8))
      this.tweens.add({
        targets: spark,
        alpha: 0,
        y: spark.y + 12,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      })
    }
  }

  private updateMonsters(delta: number): void {
    for (const monster of this.monsters) {
      const target = this.pathPoints[monster.pathIndex]
      const current = new Phaser.Math.Vector2(monster.container.x, monster.container.y)
      const toTarget = target.clone().subtract(current)
      const dist = toTarget.length()
      const step = monster.speed * (delta / 1000)

      if (dist <= step) {
        monster.container.setPosition(target.x, target.y)
        monster.pathIndex = (monster.pathIndex + 1) % this.pathPoints.length
      } else {
        toTarget.normalize().scale(step)
        monster.container.setPosition(monster.container.x + toTarget.x, monster.container.y + toTarget.y)
      }
      this.playMonsterThreatTrail(monster)
    }
  }

  private updateUnits(delta: number): void {
    let movedAnyUnit = false
    for (const unit of this.units) {
      const stats = GRADE_STATS[unit.def.grade]
      const dx = unit.targetX - unit.x
      const dy = unit.targetY - unit.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const step = stats.moveSpeed * (delta / 1000)
      if (dist > 2) {
        movedAnyUnit = true
        const ratio = Math.min(1, step / dist)
        unit.x += dx * ratio
        unit.y += dy * ratio
        unit.container.setPosition(unit.x, unit.y)
        this.playUnitWalkEffect(unit, dx, dy)
      }
    }
    if (movedAnyUnit) this.resolveUnitOverlaps()
  }

  private resolveUnitOverlaps(): void {
    const cellSize = 72
    const forwardNeighborOffsets = [[1, 0], [0, 1], [1, 1], [-1, 1]] as const

    for (let iteration = 0; iteration < 3; iteration += 1) {
      const cells = new Map<string, { x: number; y: number; units: UnitRuntime[] }>()
      for (const unit of this.units) {
        const x = Math.floor(unit.x / cellSize)
        const y = Math.floor(unit.y / cellSize)
        const key = `${x}:${y}`
        const cell = cells.get(key) ?? { x, y, units: [] }
        cell.units.push(unit)
        cells.set(key, cell)
      }

      for (const cell of cells.values()) {
        for (let i = 0; i < cell.units.length; i += 1) {
          for (let j = i + 1; j < cell.units.length; j += 1) {
            this.separateUnitPair(cell.units[i], cell.units[j])
          }
        }

        for (const [offsetX, offsetY] of forwardNeighborOffsets) {
          const neighbor = cells.get(`${cell.x + offsetX}:${cell.y + offsetY}`)
          if (!neighbor) continue
          for (const first of cell.units) {
            for (const second of neighbor.units) {
              this.separateUnitPair(first, second)
            }
          }
        }
      }
    }
  }

  private separateUnitPair(first: UnitRuntime, second: UnitRuntime): void {
    const firstRadius = GRADE_STATS[first.def.grade].radius
    const secondRadius = GRADE_STATS[second.def.grade].radius
    const minDistance = Math.max(48, firstRadius + secondRadius + 18)
    let dx = second.x - first.x
    let dy = second.y - first.y
    let currentDistance = Math.sqrt(dx * dx + dy * dy)

    if (currentDistance >= minDistance) return
    if (currentDistance <= 0.001) {
      const angle = Phaser.Math.DegToRad((first.id * 37 + second.id * 17) % 360)
      dx = Math.cos(angle)
      dy = Math.sin(angle)
      currentDistance = 1
    }

    const push = (minDistance - currentDistance) / 2
    const nx = dx / currentDistance
    const ny = dy / currentDistance
    this.pushUnitPosition(first, -nx * push, -ny * push)
    this.pushUnitPosition(second, nx * push, ny * push)
  }

  private pushUnitPosition(unit: UnitRuntime, dx: number, dy: number): void {
    const point = this.clampToInner(unit.x + dx, unit.y + dy)
    const appliedDx = point.x - unit.x
    const appliedDy = point.y - unit.y
    unit.x = point.x
    unit.y = point.y
    const targetPoint = this.clampToInner(unit.targetX + appliedDx, unit.targetY + appliedDy)
    unit.targetX = targetPoint.x
    unit.targetY = targetPoint.y
    unit.container.setPosition(unit.x, unit.y)
  }

  private updateCombat(): void {
    for (const unit of this.units) {
      if (unit.def.attackStyle === 'lottery_support') continue
      if (unit.def.attackStyle === 'nuke') {
        if (this.monsters.length > 0 && this.time.now >= unit.nextSpecialAt) this.triggerNuclearPulse(unit)
        continue
      }
      if (unit.def.attackStyle === 'money_rain') {
        if (this.monsters.length > 0 && this.time.now >= unit.nextSpecialAt) this.triggerMoneyRain(unit)
        continue
      }
      const target = this.getTargetForUnit(unit)
      if (!target) continue

      const attackRange = this.getAttackRange(unit)
      const d = distance(unit, { x: target.container.x, y: target.container.y })
      if (unit.forcedTargetId === target.id && d > attackRange) {
        const movePoint = this.getClosestInnerPointTo(target.container.x, target.container.y)
        unit.targetX = movePoint.x
        unit.targetY = movePoint.y
        continue
      }
      if (d > attackRange) continue

      const attackInterval = this.getAttackInterval(unit)
      if (this.time.now - unit.lastAttackAt >= attackInterval) {
        unit.lastAttackAt = this.time.now
        this.attack(unit, target)
      }
    }
  }

  private updateDamageZones(): void {
    const now = this.time.now
    for (let index = this.damageZones.length - 1; index >= 0; index -= 1) {
      const zone = this.damageZones[index]
      if (now >= zone.expiresAt) {
        zone.visual.destroy()
        this.damageZones.splice(index, 1)
        continue
      }
      if (now < zone.nextTickAt) continue

      zone.nextTickAt = now + 260
      const targets = zone.pathWide
        ? [...this.monsters]
        : this.monsters.filter((monster) => monster.alive && distance({ x: zone.x, y: zone.y }, { x: monster.container.x, y: monster.container.y }) <= zone.radius)
      for (const monster of targets) {
        if (monster.alive) this.applyDamageToTarget(zone.unit, monster, zone.damageMultiplier, false)
      }
    }
  }

  private createDamageZone(
    unit: UnitRuntime,
    x: number,
    y: number,
    radius: number,
    duration: number,
    damageMultiplier: number,
    color: number,
    pathWide = false
  ): void {
    for (let index = this.damageZones.length - 1; index >= 0; index -= 1) {
      const existing = this.damageZones[index]
      if (existing.unit.id === unit.id && existing.pathWide === pathWide) {
        existing.visual.destroy()
        this.damageZones.splice(index, 1)
      }
    }
    if (this.damageZones.length >= 36) {
      const oldest = this.damageZones.shift()
      oldest?.visual.destroy()
    }
    const visual = this.add.graphics().setDepth(22)
    if (pathWide) {
      const { inner, pathThickness } = BOARD
      visual.lineStyle(12, color, 0.22)
      visual.strokeRoundedRect(inner.x - pathThickness / 2, inner.y - pathThickness / 2, inner.width + pathThickness, inner.height + pathThickness, 34)
      visual.lineStyle(2, 0xffffff, 0.38)
      visual.strokeRoundedRect(inner.x - pathThickness / 2, inner.y - pathThickness / 2, inner.width + pathThickness, inner.height + pathThickness, 34)
      visual.fillStyle(0xfef3c7, 0.7)
      for (let index = 0; index < 24; index += 1) {
        const px = Phaser.Math.Between(inner.x - 12, inner.x + inner.width + 12)
        const py = Phaser.Math.Between(inner.y - 12, inner.y + inner.height + 12)
        visual.fillRect(px, py, 7, 4)
      }
    } else {
      visual.fillStyle(color, 0.18)
      visual.fillCircle(x, y, radius)
      visual.lineStyle(4, color, 0.76)
      visual.strokeCircle(x, y, radius)
      visual.lineStyle(1, 0xffffff, 0.6)
      visual.strokeCircle(x, y, Math.max(0, radius - 7))
    }
    this.tweens.add({
      targets: visual,
      alpha: 0.28,
      duration: Math.max(260, duration / 3),
      yoyo: true,
      repeat: Math.max(0, Math.floor(duration / Math.max(260, duration / 3)) - 1),
      ease: 'Sine.easeInOut'
    })
    this.damageZones.push({
      visual,
      unit,
      x,
      y,
      radius,
      damageMultiplier,
      expiresAt: this.time.now + duration,
      nextTickAt: this.time.now + 110,
      pathWide
    })
  }

  private attack(unit: UnitRuntime, target: MonsterRuntime): void {
    const profile = this.getAttackProfile(unit)
    const impactX = target.container.x
    const impactY = target.container.y
    const chainTargets = profile.kind === 'chain'
      ? this.getChainTargets(target, profile.chainCount ?? 3, profile.chainRange ?? 80)
      : [target]

    const resolveImpact = () => {
      if (profile.kind === 'chain') {
        chainTargets.forEach((monster, index) => {
          this.applyDamageToTarget(unit, monster, profile.damageMultiplier * Math.pow(0.72, index), index === 0)
        })
        return
      }

      if (profile.kind === 'aoe' || profile.kind === 'mine') {
        this.applyAreaImpactDamage(unit, target, impactX, impactY, profile)
        return
      }

      this.applyDirectImpactDamage(unit, target, impactX, impactY, profile.damageMultiplier)
    }

    if (unit.def.attackStyle === 'lava_pool') {
      this.createDamageZone(unit, impactX, impactY, 54, 2600, 0.24, 0xf97316)
    }
    if (unit.def.attackStyle === 'drill_zone') {
      this.createDamageZone(unit, impactX, impactY, 72, 3000, 0.34, 0xfacc15)
    }
    if (unit.def.attackStyle === 'mech_bomb' && this.time.now >= unit.nextSpecialAt) {
      unit.nextSpecialAt = this.time.now + 8000
      this.launchMechBomb(unit, target)
    }

    if (!this.shouldRenderAttackEffect(unit)) {
      resolveImpact()
      return
    }

    this.playUnitAttackMotion(unit, target)

    if (profile.kind === 'chain') {
      this.drawAttackEffect(unit, target, profile, chainTargets, resolveImpact)
      return
    }

    if (profile.kind === 'aoe' || profile.kind === 'mine') {
      this.drawAttackEffect(unit, target, profile, [target], resolveImpact)
      return
    }

    this.drawAttackEffect(unit, target, profile, [target], resolveImpact)
  }

  private triggerNuclearPulse(unit: UnitRuntime): void {
    unit.nextSpecialAt = this.time.now + 10000
    this.drawNuclearPulse(unit)
    this.time.delayedCall(450, () => {
      for (const monster of [...this.monsters]) {
        if (monster.alive) this.applyDamageToTarget(unit, monster, 5.8, false)
      }
    })
  }

  private triggerMoneyRain(unit: UnitRuntime): void {
    unit.nextSpecialAt = this.time.now + 3000
    this.createDamageZone(unit, 0, 0, 0, 2800, 0.28, 0xfacc15, true)
    this.drawMoneyRain(unit)
  }

  private shouldRenderAttackEffect(unit: UnitRuntime): boolean {
    const visualLoad = this.units.length + this.monsters.length
    if (visualLoad <= 75) return true
    const tier = GRADE_EFFECT_TIER[unit.def.grade]
    if (visualLoad <= 130) return tier >= 3 || unit.id % 2 === 0
    return tier >= 4 || unit.id % 5 === 0
  }

  private shouldRenderHitFeedback(target: MonsterRuntime): boolean {
    const visualLoad = this.units.length + this.monsters.length
    if (visualLoad <= 75) return true
    const interval = visualLoad <= 130 ? 90 : 180
    if (this.time.now - target.lastHitFeedbackAt < interval) return false
    target.lastHitFeedbackAt = this.time.now
    return true
  }

  private getParticleBudget(count: number): number {
    const visualLoad = this.units.length + this.monsters.length
    if (visualLoad > 130) return Math.min(2, count)
    if (visualLoad > 75) return Math.min(5, count)
    return count
  }

  private applyDirectImpactDamage(unit: UnitRuntime, target: MonsterRuntime, impactX: number, impactY: number, multiplier: number): void {
    if (!target.alive) return
    const hitRadius = this.getMonsterHitRadius(target) + 20
    if (distance({ x: impactX, y: impactY }, { x: target.container.x, y: target.container.y }) > hitRadius) return
    this.applyDamageToTarget(unit, target, multiplier)
  }

  private applyAreaImpactDamage(unit: UnitRuntime, primaryTarget: MonsterRuntime, impactX: number, impactY: number, profile: AttackProfile): void {
    const radius = profile.splashRadius ?? 52
    const targets = this.monsters.filter((monster) => {
      if (!monster.alive) return false
      return distance({ x: impactX, y: impactY }, { x: monster.container.x, y: monster.container.y }) <= radius
    })

    for (const monster of targets) {
      const primary = monster.id === primaryTarget.id
      const multiplier = primary
        ? profile.damageMultiplier
        : profile.damageMultiplier * (profile.splashDamageMultiplier ?? 0.5)
      this.applyDamageToTarget(unit, monster, multiplier, primary)
    }
  }

  private getMonsterHitRadius(monster: MonsterRuntime): number {
    if (monster.kind === 'boss') return 34
    if (monster.kind === 'elite') return 25
    return 18
  }

  private getChainTargets(firstTarget: MonsterRuntime, maxTargets: number, jumpRange: number): MonsterRuntime[] {
    const targets: MonsterRuntime[] = [firstTarget]
    while (targets.length < maxTargets) {
      const source = targets[targets.length - 1]
      let next: MonsterRuntime | null = null
      let bestDistance = Number.POSITIVE_INFINITY
      for (const monster of this.monsters) {
        if (!monster.alive || targets.includes(monster)) continue
        const d = distance({ x: source.container.x, y: source.container.y }, { x: monster.container.x, y: monster.container.y })
        if (d <= jumpRange && d < bestDistance) {
          next = monster
          bestDistance = d
        }
      }
      if (!next) break
      targets.push(next)
    }
    return targets
  }

  private applyDamageToTarget(unit: UnitRuntime, target: MonsterRuntime, multiplier = 1, primary = true): void {
    if (!target.alive) return
    const damage = this.calculateDamage(unit, target, multiplier)
    const actualDamage = Math.min(damage, target.hp)
    target.hp -= actualDamage
    this.damageLog[unit.def.genre] += actualDamage
    if (this.shouldRenderHitFeedback(target)) {
      this.showDamageNumber(target, actualDamage, primary ? GRADE_COLOR[unit.def.grade] : GENRE_COLOR[unit.def.genre])
      this.flashMonsterHit(target)
    }

    if (target.hp <= 0) {
      this.killMonster(target)
    } else {
      this.updateMonsterHpText(target)
    }
  }

  private calculateDamage(unit: UnitRuntime, target: MonsterRuntime, multiplier = 1): number {
    const stats = GRADE_STATS[unit.def.grade]
    let damage = stats.attack * multiplier
    damage *= 1 + this.genreUpgradeLevel[unit.def.genre] * GENRE_UPGRADE_ATTACK_BONUS

    damage *= 1 + this.synergy.heroAttackBonus
    if (target.kind === 'elite' || target.kind === 'boss') damage *= 1 + this.synergy.eliteBossDamageBonus

    return damage
  }

  private getAttackInterval(unit: UnitRuntime): number {
    const stats = GRADE_STATS[unit.def.grade]
    let interval = stats.attackIntervalMs * this.getAttackProfile(unit).intervalMultiplier
    interval = interval / (1 + this.synergy.attackSpeedBonus)
    return interval
  }

  private getAttackRange(unit: UnitRuntime): number {
    return GRADE_STATS[unit.def.grade].range * this.getAttackProfile(unit).rangeMultiplier
  }

  private getAttackProfile(unit: UnitRuntime): AttackProfile {
    const style = ATTACK_STYLE_PROFILES[unit.def.attackStyle]
    const genre = GENRE_ATTACK_PROFILES[unit.def.genre]
    return {
      ...style,
      damageMultiplier: style.damageMultiplier * genre.damageMultiplier,
      intervalMultiplier: style.intervalMultiplier * genre.intervalMultiplier,
      rangeMultiplier: style.rangeMultiplier * genre.rangeMultiplier
    }
  }

  private getTargetForUnit(unit: UnitRuntime): MonsterRuntime | null {
    if (unit.forcedTargetId !== null) {
      const forced = this.monstersById.get(unit.forcedTargetId)
      if (forced) return forced
      unit.forcedTargetId = null
    }

    const range = this.getAttackRange(unit)
    const currentTarget = unit.autoTargetId === null ? undefined : this.monstersById.get(unit.autoTargetId)
    if (currentTarget && currentTarget.alive && distance(unit, { x: currentTarget.container.x, y: currentTarget.container.y }) <= range) {
      return currentTarget
    }

    if (this.time.now < unit.nextTargetSearchAt) return null
    unit.nextTargetSearchAt = this.time.now + 100

    let best: MonsterRuntime | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const monster of this.monsters) {
      const d = distance(unit, { x: monster.container.x, y: monster.container.y })
      if (d <= range && d < bestDistance) {
        best = monster
        bestDistance = d
      }
    }
    unit.autoTargetId = best?.id ?? null
    return best
  }

  private updateBossTimer(delta: number): void {
    if (this.currentBossId === null || this.bossTimeRemainingMs === null) return
    const boss = this.monsters.find((monster) => monster.id === this.currentBossId && monster.alive)
    if (!boss) {
      this.currentBossId = null
      this.bossTimeRemainingMs = null
      return
    }

    this.bossTimeRemainingMs -= delta
    if (this.bossTimeRemainingMs <= 0) {
      this.finishGame(false, '보스를 제한시간 안에 처치하지 못했습니다.')
    }
  }

  private summonUnit(): void {
    if (this.isPaused || this.isGameOver) return
    if (!this.isTestMode) {
      if (this.gold < this.summonCost) return
      this.gold -= this.summonCost
    }

    const row = SUMMON_RATES[this.summonLevel]
    const grade = weightedPick<Grade>(gradeWeightObject(row))
    const def = randomItem(getUnitsByGrade(grade))
    const point = this.getNextSummonPoint()
    const created = this.createUnit(def, point.x, point.y)
    this.playUnitAppearEffect(created)
    this.showUnitMessage(def, 'summon', row[grade])
    this.recalculateSynergy()
  }

  private summonTestUnit(def: UnitDefinition): void {
    if (!this.isTestMode || this.isGameOver) return
    const point = this.getNextSummonPoint()
    const created = this.createUnit(def, point.x, point.y)
    this.playUnitAppearEffect(created)
    this.showUnitMessage(def, 'summon')
    this.selectUnits([created])
    this.recalculateSynergy()
  }

  private spawnTestMonster(kind: MonsterKind): void {
    if (!this.isTestMode || this.isGameOver) return
    this.spawnMonster(kind)
  }

  private clearTestMonsters(): void {
    if (!this.isTestMode) return
    for (const monster of [...this.monsters]) {
      this.removeMonster(monster, true)
    }
    this.currentBossId = null
    this.bossTimeRemainingMs = null
  }

  private createUnit(def: UnitDefinition, x: number, y: number): UnitRuntime {
    const stats = GRADE_STATS[def.grade]
    const { avatar, body } = this.createUnitAvatar(def, stats.radius)
    const ring = this.add.graphics()
    ring.lineStyle(3, 0xffd166, 1)
    ring.strokeCircle(0, 0, stats.radius + 7)
    ring.lineStyle(1, 0xffffff, 0.78)
    ring.strokeCircle(0, 0, stats.radius + 11)
    ring.setVisible(false)

    const container = this.add.container(x, y, [ring, avatar]).setDepth(30)
    const unit: UnitRuntime = {
      id: this.nextUnitId++,
      def,
      container,
      avatar,
      body,
      ring,
      x,
      y,
      targetX: x,
      targetY: y,
      lastAttackAt: 0,
      lastWalkEffectAt: 0,
      forcedTargetId: null,
      autoTargetId: null,
      nextTargetSearchAt: 0,
      nextSpecialAt: 0,
      selected: false
    }
    this.units.push(unit)
    const canAnimateIdle = this.units.length <= 60 || GRADE_EFFECT_TIER[def.grade] >= 4 || unit.id % 4 === 0
    if (canAnimateIdle) {
      this.tweens.add({
        targets: avatar,
        y: -2,
        duration: Phaser.Math.Between(720, 980),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }
    return unit
  }

  private createUnitAvatar(def: UnitDefinition, radius: number): { avatar: Phaser.GameObjects.Container; body: Phaser.GameObjects.Shape } {
    const compact = this.units.length >= 70 && GRADE_EFFECT_TIER[def.grade] <= 2
    if (compact) return this.createCompactUnitAvatar(def, radius)

    const gradeColor = GRADE_COLOR[def.grade]
    const genreColor = GENRE_COLOR[def.genre]
    const shadow = this.add.ellipse(0, radius * 0.78, radius * 1.8, 8, 0x000000, 0.28)
    const mythParts = def.mythStyle
      ? this.createMythAvatarParts(def.mythStyle, radius, gradeColor, genreColor)
      : this.createEmptyMythAvatarParts()
    const aura = this.add.graphics()
    this.drawGradeAura(aura, def, radius, gradeColor, def.grade)
    const body = this.createUnitBody(def.genre, radius, genreColor, 0x0f172a)
    const cape = this.createChibiCape(def.genre, radius, gradeColor)
    const leftLeg = this.add.rectangle(-radius * 0.25, radius * 0.77, radius * 0.22, radius * 0.36, 0x21314b, 0.98).setOrigin(0.5)
    const rightLeg = this.add.rectangle(radius * 0.25, radius * 0.77, radius * 0.22, radius * 0.36, 0x21314b, 0.98).setOrigin(0.5)
    const skinColor = def.genre === 'mha' ? 0xffdab2 : def.genre === 'onepunch' ? 0xf2c39e : def.genre === 'overwatch' ? 0xeab88d : 0xffd4bd
    const head = this.add.circle(0, -radius * 0.3, radius * 0.53, skinColor, 1).setStrokeStyle(2, 0x26324a, 0.85)
    const hair = this.createChibiHair(def.genre, radius, gradeColor)
    const identity = this.createUnitIdentity(def, radius)
    const leftEye = this.add.circle(-radius * 0.18, -radius * 0.28, Math.max(1.6, radius * 0.09), 0x17233a, 1)
    const rightEye = this.add.circle(radius * 0.18, -radius * 0.28, Math.max(1.6, radius * 0.09), 0x17233a, 1)
    const cheeks = this.add.graphics()
    cheeks.fillStyle(0xff8e9b, 0.48)
    cheeks.fillCircle(-radius * 0.32, -radius * 0.1, Math.max(1.5, radius * 0.09))
    cheeks.fillCircle(radius * 0.32, -radius * 0.1, Math.max(1.5, radius * 0.09))
    const emblem = this.createUnitEmblem(def.genre, radius)
    const gradeBadge = this.add.circle(-radius * 0.46, radius * 0.3, Math.max(3, radius * 0.16), gradeColor, 0.98)
      .setStrokeStyle(1, 0xffffff, 0.8)
    const weapon = this.createUnitWeapon(def, radius)
    const avatar = this.add.container(0, 0, [
      shadow,
      ...mythParts.back,
      aura,
      cape,
      leftLeg,
      rightLeg,
      body,
      head,
      hair,
      identity,
      emblem,
      gradeBadge,
      leftEye,
      rightEye,
      cheeks,
      weapon,
      ...mythParts.front
    ])
    this.playMythIdleEffect(mythParts)

    return { avatar, body }
  }

  private createCompactUnitAvatar(def: UnitDefinition, radius: number): { avatar: Phaser.GameObjects.Container; body: Phaser.GameObjects.Shape } {
    const gradeColor = GRADE_COLOR[def.grade]
    const genreColor = GENRE_COLOR[def.genre]
    const shadow = this.add.ellipse(0, radius * 0.78, radius * 1.65, 7, 0x000000, 0.24)
    const aura = this.add.graphics()
    this.drawGradeAura(aura, def, radius, gradeColor, def.grade, true)
    const body = this.createUnitBody(def.genre, radius, genreColor, 0x0f172a)
    const head = this.add.circle(0, -radius * 0.28, radius * 0.5, 0xffd1ae, 1).setStrokeStyle(1.5, 0x26324a, 0.85)
    const visor = this.add.rectangle(0, -radius * 0.3, radius * 0.58, Math.max(2, radius * 0.13), 0x203b67, 0.85).setOrigin(0.5)
    const gradeBadge = this.add.circle(-radius * 0.44, radius * 0.3, Math.max(3, radius * 0.14), gradeColor, 0.98)
      .setStrokeStyle(1, 0xffffff, 0.78)
    const avatar = this.add.container(0, 0, [shadow, aura, body, head, visor, gradeBadge])
    return { avatar, body }
  }

  private createUnitBody(genre: Genre, radius: number, color: number, strokeColor: number): Phaser.GameObjects.Shape {
    const body = this.add.ellipse(0, radius * 0.32, radius * 1.08, radius * 1.05, color, 1)
      .setStrokeStyle(2, strokeColor, 0.9)
    if (genre === 'mha') body.setScale(0.96, 1.08)
    if (genre === 'onepunch') body.setScale(1.08, 0.98)
    if (genre === 'overwatch') body.setScale(0.9, 1.12)
    return body
  }

  private createChibiCape(genre: Genre, radius: number, gradeColor: number): Phaser.GameObjects.Graphics {
    const cape = this.add.graphics()
    const capeColor = genre === 'mha' ? 0x5aa4d6 : genre === 'onepunch' ? 0xd9575f : genre === 'overwatch' ? 0x5368a5 : 0xd874a8
    cape.fillStyle(capeColor, 0.92)
    cape.fillTriangle(-radius * 0.42, -radius * 0.05, radius * 0.42, -radius * 0.05, 0, radius * 0.92)
    cape.lineStyle(1, gradeColor, 0.85)
    cape.lineBetween(-radius * 0.42, -radius * 0.05, 0, radius * 0.92)
    cape.lineBetween(radius * 0.42, -radius * 0.05, 0, radius * 0.92)
    return cape
  }

  private createChibiHair(genre: Genre, radius: number, gradeColor: number): Phaser.GameObjects.Graphics {
    const hair = this.add.graphics()
    if (genre === 'mha') {
      hair.fillStyle(0x4c8fc0, 1)
      hair.fillRoundedRect(-radius * 0.55, -radius * 0.88, radius * 1.1, radius * 0.38, 7)
      hair.fillStyle(0xdff7ff, 0.85)
      hair.fillRoundedRect(-radius * 0.35, -radius * 0.68, radius * 0.7, radius * 0.1, 3)
    } else if (genre === 'onepunch') {
      hair.fillStyle(0x8f4b30, 1)
      for (let index = 0; index < 5; index += 1) {
        const x = (index - 2) * radius * 0.21
        hair.fillTriangle(x, -radius * 0.64, x + radius * 0.16, -radius * 1.02, x + radius * 0.31, -radius * 0.6)
      }
    } else if (genre === 'overwatch') {
      hair.fillStyle(0x344f7d, 1)
      hair.fillCircle(0, -radius * 0.67, radius * 0.52)
      hair.fillStyle(0x83cbed, 0.9)
      hair.fillRoundedRect(-radius * 0.57, -radius * 0.64, radius * 1.14, radius * 0.15, 4)
      hair.lineStyle(2, gradeColor, 0.9)
      hair.lineBetween(-radius * 0.28, -radius * 0.39, radius * 0.28, -radius * 0.39)
    } else {
      hair.fillStyle(0xf2a2ca, 1)
      hair.fillTriangle(-radius * 0.55, -radius * 0.56, -radius * 0.45, -radius * 1.05, -radius * 0.02, -radius * 0.62)
      hair.fillTriangle(radius * 0.55, -radius * 0.56, radius * 0.45, -radius * 1.05, radius * 0.02, -radius * 0.62)
      hair.fillStyle(gradeColor, 0.9)
      hair.fillCircle(0, -radius * 0.7, radius * 0.2)
    }
    hair.lineStyle(1, 0xffffff, 0.45)
    hair.strokeCircle(0, -radius * 0.3, radius * 0.53)
    return hair
  }

  private createEmptyMythAvatarParts(): MythAvatarParts {
    return {
      back: [],
      front: [],
      spin: [],
      counterSpin: [],
      pulse: [],
      sway: []
    }
  }

  private createMythAvatarParts(style: MythStyle, radius: number, gradeColor: number, genreColor: number): MythAvatarParts {
    const parts = this.createEmptyMythAvatarParts()

    if (style === 'greatsword') {
      const halo = this.add.graphics()
      halo.lineStyle(3, 0xff3d71, 0.72)
      halo.strokeCircle(0, 0, radius + 21)
      halo.lineStyle(1, 0xffffff, 0.72)
      halo.strokeCircle(0, 0, radius + 29)
      const blade = this.add.rectangle(radius * 1.18, -radius * 0.72, 8, radius * 1.75, 0xffe7a3, 0.94).setAngle(-42)
      const crown = this.add.graphics()
      crown.fillStyle(0xfff7ad, 0.94)
      crown.fillTriangle(0, -radius - 25, -8, -radius - 5, 8, -radius - 5)
      crown.fillTriangle(-13, -radius - 19, -20, -radius - 5, -7, -radius - 5)
      crown.fillTriangle(13, -radius - 19, 7, -radius - 5, 20, -radius - 5)
      parts.back.push(halo)
      parts.front.push(blade, crown)
      parts.counterSpin.push(halo)
      parts.pulse.push(blade)
      return parts
    }

    if (style === 'rapid_burst') {
      const shell = this.add.graphics()
      shell.lineStyle(3, 0xf8fafc, 0.8)
      shell.strokeCircle(0, 0, radius + 20)
      shell.lineStyle(2, 0x22c55e, 0.85)
      for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI * 2 * index) / 6
        shell.lineBetween(Math.cos(angle) * (radius + 10), Math.sin(angle) * (radius + 10), Math.cos(angle) * (radius + 24), Math.sin(angle) * (radius + 24))
      }
      const cannon = this.add.rectangle(radius * 1.12, -radius * 0.24, radius * 0.96, radius * 0.24, 0x334155, 0.98).setStrokeStyle(2, 0xf8fafc, 0.8)
      parts.back.push(shell)
      parts.front.push(cannon)
      parts.counterSpin.push(shell)
      parts.pulse.push(cannon)
      return parts
    }

    if (style === 'drill') {
      const spiral = this.add.graphics()
      spiral.lineStyle(3, 0xfacc15, 0.86)
      spiral.arc(0, 0, radius + 22, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(340), false)
      spiral.lineStyle(2, 0xffffff, 0.72)
      spiral.arc(0, 0, radius + 12, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(530), false)
      const drill = this.add.triangle(radius * 1.22, -radius * 0.36, 0, -radius * 0.34, radius * 0.96, 0, 0, radius * 0.34, 0xfacc15, 0.98)
      parts.back.push(spiral)
      parts.front.push(drill)
      parts.counterSpin.push(spiral)
      parts.pulse.push(drill)
      return parts
    }

    if (style === 'money_rain') {
      const orbit = this.add.graphics()
      orbit.lineStyle(3, 0x86efac, 0.8)
      orbit.strokeCircle(0, 0, radius + 21)
      orbit.lineStyle(2, 0xfacc15, 0.85)
      orbit.strokeCircle(0, 0, radius + 12)
      const bills = this.add.container(0, 0)
      bills.add([
        this.add.rectangle(radius + 18, -8, 12, 7, 0x86efac, 0.94),
        this.add.rectangle(-radius - 18, 8, 12, 7, 0x86efac, 0.94),
        this.add.rectangle(0, -radius - 24, 12, 7, 0x86efac, 0.94)
      ])
      parts.back.push(orbit, bills)
      parts.counterSpin.push(orbit)
      parts.spin.push(bills)
      return parts
    }

    if (style === 'solar') {
      const rays = this.add.graphics()
      rays.fillStyle(0xfff2a6, 0.42)
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8
        const left = angle - 0.11
        const right = angle + 0.11
        rays.fillTriangle(
          Math.cos(angle) * (radius + 26),
          Math.sin(angle) * (radius + 26),
          Math.cos(left) * (radius + 7),
          Math.sin(left) * (radius + 7),
          Math.cos(right) * (radius + 7),
          Math.sin(right) * (radius + 7)
        )
      }

      const halo = this.add.graphics()
      halo.lineStyle(2, gradeColor, 0.82)
      halo.strokeCircle(0, 0, radius + 17)
      halo.lineStyle(1, 0xffffff, 0.55)
      halo.strokeCircle(0, 0, radius + 23)

      const crown = this.add.graphics()
      crown.fillStyle(0xfef3c7, 0.95)
      crown.fillTriangle(0, -radius - 23, -7, -radius - 5, 7, -radius - 5)
      crown.fillTriangle(-12, -radius - 17, -18, -radius - 5, -6, -radius - 5)
      crown.fillTriangle(12, -radius - 17, 6, -radius - 5, 18, -radius - 5)
      crown.lineStyle(2, gradeColor, 0.9)
      crown.lineBetween(-18, -radius - 5, 18, -radius - 5)

      const blade = this.add.rectangle(radius * 0.98, -radius * 0.8, 6, radius * 1.35, 0xfff7ad, 0.92)
        .setAngle(-35)
        .setStrokeStyle(1, 0xffffff, 0.8)

      parts.back.push(rays, halo)
      parts.front.push(crown, blade)
      parts.spin.push(rays)
      parts.counterSpin.push(halo)
      parts.pulse.push(blade)
      return parts
    }

    if (style === 'gravity') {
      const vortex = this.add.graphics()
      vortex.lineStyle(3, 0xa78bfa, 0.72)
      vortex.arc(0, 0, radius + 21, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(505), false)
      vortex.lineStyle(2, 0x4c1d95, 0.72)
      vortex.arc(0, 0, radius + 11, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(315), false)
      vortex.fillStyle(0x020617, 0.5)
      vortex.fillCircle(0, 0, radius + 4)

      const orbit = this.add.container(0, 0)
      const moonA = this.add.circle(radius + 19, 0, 4, 0xe9d5ff, 0.95)
      const moonB = this.add.circle(-radius - 15, 0, 3, 0xc4b5fd, 0.85)
      const moonC = this.add.circle(0, -radius - 18, 3, 0xffffff, 0.82)
      orbit.add([moonA, moonB, moonC])

      const mask = this.add.graphics()
      mask.fillStyle(0x111827, 0.72)
      mask.fillCircle(-radius * 0.12, -radius * 0.14, radius * 0.64)
      mask.fillStyle(0xa78bfa, 0.9)
      mask.fillCircle(radius * 0.22, -radius * 0.12, radius * 0.16)
      mask.lineStyle(2, 0xffffff, 0.42)
      mask.arc(0, 0, radius * 0.72, Phaser.Math.DegToRad(18), Phaser.Math.DegToRad(162), false)

      parts.back.push(vortex, orbit)
      parts.front.push(mask)
      parts.spin.push(orbit)
      parts.counterSpin.push(vortex)
      parts.pulse.push(mask)
      return parts
    }

    if (style === 'railgun') {
      const rig = this.add.container(0, 0)
      const leftWing = this.add.rectangle(-radius * 0.96, -radius * 0.04, radius * 0.38, radius * 1.55, 0x475569, 0.96)
        .setAngle(18)
        .setStrokeStyle(1, 0xe2e8f0, 0.55)
      const rightWing = this.add.rectangle(radius * 0.96, -radius * 0.04, radius * 0.38, radius * 1.55, 0x475569, 0.96)
        .setAngle(-18)
        .setStrokeStyle(1, 0xe2e8f0, 0.55)
      const leftMuzzle = this.add.rectangle(-radius * 1.2, -radius * 0.72, radius * 0.58, radius * 0.2, genreColor, 1)
        .setAngle(18)
      const rightMuzzle = this.add.rectangle(radius * 1.2, -radius * 0.72, radius * 0.58, radius * 0.2, genreColor, 1)
        .setAngle(-18)
      rig.add([leftWing, rightWing, leftMuzzle, rightMuzzle])

      const radar = this.add.graphics()
      radar.lineStyle(2, 0xbae6fd, 0.78)
      radar.strokeCircle(0, 0, radius + 19)
      radar.lineBetween(-radius - 19, 0, radius + 19, 0)
      radar.lineBetween(0, -radius - 19, 0, radius + 19)

      const visor = this.add.rectangle(0, -radius * 0.38, radius * 1.04, radius * 0.28, 0x0f172a, 0.9)
        .setStrokeStyle(1, 0x93c5fd, 0.85)
      const core = this.add.circle(0, radius * 0.28, radius * 0.2, gradeColor, 0.95)
        .setStrokeStyle(1, 0xffffff, 0.8)

      parts.back.push(rig, radar)
      parts.front.push(visor, core)
      parts.counterSpin.push(radar)
      parts.pulse.push(core)
      parts.sway.push(rig)
      return parts
    }

    if (style === 'puppet') {
      const strings = this.add.graphics()
      strings.lineStyle(1, 0xbfdbfe, 0.72)
      strings.lineBetween(-radius * 0.8, -radius - 28, -radius * 0.32, -radius * 0.18)
      strings.lineBetween(0, -radius - 32, 0, -radius * 0.24)
      strings.lineBetween(radius * 0.8, -radius - 28, radius * 0.32, -radius * 0.18)
      strings.lineStyle(2, 0xfef3c7, 0.65)
      strings.lineBetween(-radius, -radius - 28, radius, -radius - 28)

      const charms = this.add.container(0, 0)
      charms.add([
        this.add.rectangle(radius + 15, 0, 7, 7, 0xfef3c7, 0.92).setAngle(45),
        this.add.rectangle(-radius - 14, 0, 6, 6, 0x93c5fd, 0.85).setAngle(45),
        this.add.circle(0, radius + 16, 3, 0xffffff, 0.88)
      ])

      const needle = this.add.graphics()
      needle.lineStyle(3, 0xffffff, 0.82)
      needle.lineBetween(-radius * 0.94, radius * 0.62, radius * 0.92, -radius * 0.66)
      needle.fillStyle(gradeColor, 0.9)
      needle.fillCircle(radius * 0.7, -radius * 0.5, radius * 0.13)
      needle.lineStyle(1, 0x93c5fd, 0.75)
      needle.strokeCircle(radius * 0.7, -radius * 0.5, radius * 0.22)

      parts.back.push(strings, charms)
      parts.front.push(needle)
      parts.spin.push(charms)
      parts.pulse.push(needle)
      parts.sway.push(strings)
      return parts
    }

    const lightning = this.add.graphics()
    lightning.lineStyle(4, 0xfef08a, 0.9)
    lightning.lineBetween(-radius - 8, -radius - 10, -radius * 0.25, -radius * 0.22)
    lightning.lineBetween(-radius * 0.25, -radius * 0.22, -radius * 0.58, radius * 0.28)
    lightning.lineBetween(radius + 9, -radius - 12, radius * 0.24, -radius * 0.18)
    lightning.lineBetween(radius * 0.24, -radius * 0.18, radius * 0.58, radius * 0.32)

    const panel = this.add.graphics()
    panel.lineStyle(3, gradeColor, 0.8)
    panel.strokeRoundedRect(-radius - 10, -radius - 8, radius * 2 + 20, radius * 1.55, 8)
    panel.lineStyle(1, 0xffffff, 0.45)
    panel.lineBetween(-radius - 16, radius * 0.2, -radius - 26, radius * 0.46)
    panel.lineBetween(radius + 16, -radius * 0.1, radius + 28, -radius * 0.36)

    const spark = this.add.graphics()
    spark.fillStyle(0xffffff, 0.96)
    spark.fillTriangle(0, -radius - 20, 5, -radius - 7, -5, -radius - 7)
    spark.fillTriangle(0, radius + 20, 5, radius + 7, -5, radius + 7)
    spark.fillTriangle(-radius - 20, 0, -radius - 7, -5, -radius - 7, 5)
    spark.fillTriangle(radius + 20, 0, radius + 7, -5, radius + 7, 5)
    spark.fillStyle(genreColor, 0.95)
    spark.fillCircle(0, 0, radius * 0.15)

    parts.back.push(lightning, panel)
    parts.front.push(spark)
    parts.counterSpin.push(panel)
    parts.pulse.push(lightning, spark)
    parts.sway.push(spark)
    return parts
  }

  private playMythIdleEffect(parts: MythAvatarParts): void {
    if (parts.spin.length > 0) {
      this.tweens.add({
        targets: parts.spin,
        angle: '+=360',
        duration: 5200,
        repeat: -1,
        ease: 'Linear'
      })
    }

    if (parts.counterSpin.length > 0) {
      this.tweens.add({
        targets: parts.counterSpin,
        angle: '-=360',
        duration: 7200,
        repeat: -1,
        ease: 'Linear'
      })
    }

    if (parts.pulse.length > 0) {
      this.tweens.add({
        targets: parts.pulse,
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: 0.72,
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }

    if (parts.sway.length > 0) {
      this.tweens.add({
        targets: parts.sway,
        angle: '+=7',
        duration: 980,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }
  }

  private createUnitEmblem(genre: Genre, radius: number): Phaser.GameObjects.Graphics {
    const emblem = this.add.graphics()
    emblem.fillStyle(0xffffff, 0.34)
    emblem.lineStyle(1, 0xffffff, 0.45)

    if (genre === 'mha') {
      emblem.strokeTriangle(0, -radius * 0.02, radius * 0.28, radius * 0.34, -radius * 0.28, radius * 0.34)
      emblem.fillCircle(0, radius * 0.2, radius * 0.1)
      emblem.lineBetween(-radius * 0.24, radius * 0.1, radius * 0.24, radius * 0.1)
    } else if (genre === 'onepunch') {
      emblem.fillCircle(-radius * 0.18, radius * 0.16, radius * 0.15)
      emblem.fillCircle(0, radius * 0.12, radius * 0.16)
      emblem.fillCircle(radius * 0.18, radius * 0.16, radius * 0.15)
      emblem.fillRoundedRect(-radius * 0.24, radius * 0.17, radius * 0.48, radius * 0.18, 4)
    } else if (genre === 'overwatch') {
      emblem.strokeCircle(0, radius * 0.18, radius * 0.24)
      emblem.lineBetween(-radius * 0.32, radius * 0.18, radius * 0.32, radius * 0.18)
      emblem.lineBetween(0, -radius * 0.14, 0, radius * 0.5)
      emblem.fillCircle(0, radius * 0.18, radius * 0.08)
    } else {
      emblem.fillTriangle(0, -radius * 0.04, radius * 0.12, radius * 0.14, radius * 0.32, radius * 0.16)
      emblem.fillTriangle(0, -radius * 0.04, -radius * 0.12, radius * 0.14, -radius * 0.32, radius * 0.16)
      emblem.fillTriangle(0, radius * 0.42, radius * 0.12, radius * 0.2, -radius * 0.12, radius * 0.2)
      emblem.fillCircle(0, radius * 0.22, radius * 0.13)
    }

    return emblem
  }

  private drawGradeAura(aura: Phaser.GameObjects.Graphics, def: UnitDefinition, radius: number, color: number, grade: Grade, compact = false): void {
    aura.clear()
    const tier = GRADE_EFFECT_TIER[grade]
    const genre = def.genre
    const drawSilhouette = (lineWidth: number, alpha: number, scale = 1): void => {
      aura.lineStyle(lineWidth, color, alpha)
      aura.strokeCircle(0, -radius * 0.3 * scale, radius * 0.62 * scale)
      aura.strokeEllipse(0, radius * 0.32 * scale, radius * 1.38 * scale, radius * 1.4 * scale)
      if (!compact) {
        aura.lineBetween(-radius * 0.5 * scale, -radius * 0.04 * scale, 0, radius * 0.98 * scale)
        aura.lineBetween(radius * 0.5 * scale, -radius * 0.04 * scale, 0, radius * 0.98 * scale)
      }

      if (compact) {
        aura.strokeRoundedRect(-radius * 0.34 * scale, -radius * 0.43 * scale, radius * 0.68 * scale, radius * 0.2 * scale, radius * 0.08 * scale)
      } else if (genre === 'mha') {
        aura.strokeRoundedRect(-radius * 0.64 * scale, -radius * 0.97 * scale, radius * 1.28 * scale, radius * 0.46 * scale, radius * 0.18 * scale)
      } else if (genre === 'onepunch') {
        aura.lineBetween(-radius * 0.54 * scale, -radius * 0.6 * scale, -radius * 0.24 * scale, -radius * 1.08 * scale)
        aura.lineBetween(0, -radius * 0.62 * scale, 0, -radius * 1.14 * scale)
        aura.lineBetween(radius * 0.54 * scale, -radius * 0.6 * scale, radius * 0.24 * scale, -radius * 1.08 * scale)
      } else if (genre === 'overwatch') {
        aura.strokeCircle(0, -radius * 0.66 * scale, radius * 0.56 * scale)
      } else {
        aura.lineBetween(-radius * 0.54 * scale, -radius * 0.56 * scale, -radius * 0.44 * scale, -radius * 1.1 * scale)
        aura.lineBetween(radius * 0.54 * scale, -radius * 0.56 * scale, radius * 0.44 * scale, -radius * 1.1 * scale)
      }

      if (!compact) {
        const longWeapon = ['barbell', 'spear', 'greatsword', 'bow', 'sniper', 'laser', 'weak_laser', 'twin_laser', 'drill_zone'].includes(def.attackStyle)
        const gunWeapon = ['machine_gun', 'pistol', 'gun', 'smg', 'rapid_burst', 'mech_bomb'].includes(def.attackStyle)
        if (longWeapon) aura.lineBetween(radius * 0.24 * scale, radius * 0.38 * scale, radius * 1.35 * scale, -radius * 0.82 * scale)
        if (gunWeapon) aura.strokeRoundedRect(radius * 0.18 * scale, -radius * 0.42 * scale, radius * 0.98 * scale, radius * 0.32 * scale, radius * 0.08 * scale)
        if (def.attackStyle === 'dumbbell' || def.attackStyle === 'fist' || def.attackStyle === 'fast_fist' || def.attackStyle === 'flurry_fist') {
          aura.strokeCircle(radius * 0.9 * scale, -radius * 0.22 * scale, radius * 0.3 * scale)
        }
      }
    }

    drawSilhouette(10 + tier * 2, 0.11 + tier * 0.035, 1.06)
    drawSilhouette(3 + tier, 0.46 + tier * 0.075)
    if (tier >= 4) drawSilhouette(1.5, 0.92, 1.13)
  }

  private createBaseWeapon(def: Pick<UnitDefinition, 'genre' | 'grade'> & { attackStyle: string }, radius: number): Phaser.GameObjects.Graphics {
    const weapon = this.add.graphics()
    const color = GENRE_COLOR[def.genre]
    const gradeColor = GRADE_COLOR[def.grade]
    const scale = 0.86 + GRADE_EFFECT_TIER[def.grade] * 0.08
    weapon.lineStyle(3, 0xffffff, 0.88)
    weapon.fillStyle(color, 0.94)

    if (def.attackStyle === 'melee_fist') {
      weapon.fillStyle(color, 0.98)
      weapon.fillCircle(radius * 0.92, -radius * 0.22, radius * 0.28 * scale)
      weapon.fillRoundedRect(radius * 0.38, -radius * 0.08, radius * 0.6, radius * 0.22, 6)
      weapon.lineStyle(2, 0xffffff, 0.72)
      weapon.strokeCircle(radius * 0.92, -radius * 0.22, radius * 0.36 * scale)
    } else if (def.attackStyle === 'melee_sword') {
      weapon.lineStyle(4, 0xffffff, 0.86)
      weapon.lineBetween(radius * 0.16, radius * 0.28, radius * 1.22 * scale, -radius * 0.72 * scale)
      weapon.lineStyle(2, gradeColor, 0.95)
      weapon.lineBetween(radius * 0.28, radius * 0.18, radius * 1.1 * scale, -radius * 0.62 * scale)
      weapon.fillStyle(color, 0.96)
      weapon.fillTriangle(radius * 1.12 * scale, -radius * 0.78 * scale, radius * 1.34 * scale, -radius * 0.58 * scale, radius * 1.02 * scale, -radius * 0.48 * scale)
    } else if (def.attackStyle === 'melee_spear') {
      weapon.lineStyle(3, 0xfef3c7, 0.95)
      weapon.lineBetween(-radius * 0.5, radius * 0.5, radius * 1.34 * scale, -radius * 0.64 * scale)
      weapon.fillStyle(color, 0.98)
      weapon.fillTriangle(radius * 1.34 * scale, -radius * 0.64 * scale, radius * 1.08 * scale, -radius * 0.5 * scale, radius * 1.14 * scale, -radius * 0.88 * scale)
    } else if (def.attackStyle === 'ranged_arrow') {
      weapon.lineStyle(3, 0xfef3c7, 0.88)
      weapon.arc(radius * 0.58, -radius * 0.12, radius * 0.48 * scale, Phaser.Math.DegToRad(250), Phaser.Math.DegToRad(90), false)
      weapon.lineStyle(1, 0xffffff, 0.7)
      weapon.lineBetween(radius * 0.58, -radius * 0.6 * scale, radius * 0.58, radius * 0.35 * scale)
      weapon.lineStyle(2, color, 0.95)
      weapon.lineBetween(radius * 0.3, -radius * 0.12, radius * 1.2 * scale, -radius * 0.12)
    } else if (def.attackStyle === 'ranged_crossbow') {
      weapon.fillStyle(0xe2e8f0, 0.95)
      weapon.fillRoundedRect(radius * 0.26, -radius * 0.25, radius * 0.94 * scale, radius * 0.22, 3)
      weapon.lineStyle(3, color, 0.95)
      weapon.lineBetween(radius * 0.5, -radius * 0.46, radius * 0.5, radius * 0.12)
      weapon.lineBetween(radius * 0.2, -radius * 0.17, radius * 0.86, -radius * 0.17)
    } else if (def.attackStyle === 'ranged_shuriken') {
      const size = radius * 0.36 * scale
      weapon.fillStyle(0xffffff, 0.92)
      weapon.fillTriangle(radius * 0.9, -radius * 0.52 - size, radius * 0.9 + size * 0.34, -radius * 0.52, radius * 0.9 - size * 0.34, -radius * 0.52)
      weapon.fillTriangle(radius * 0.9 + size, -radius * 0.52, radius * 0.9, -radius * 0.52 + size * 0.34, radius * 0.9, -radius * 0.52 - size * 0.34)
      weapon.fillTriangle(radius * 0.9, -radius * 0.52 + size, radius * 0.9 + size * 0.34, -radius * 0.52, radius * 0.9 - size * 0.34, -radius * 0.52)
      weapon.fillTriangle(radius * 0.9 - size, -radius * 0.52, radius * 0.9, -radius * 0.52 + size * 0.34, radius * 0.9, -radius * 0.52 - size * 0.34)
      weapon.fillStyle(color, 0.95)
      weapon.fillCircle(radius * 0.9, -radius * 0.52, radius * 0.1)
    } else if (def.attackStyle === 'ranged_gun') {
      weapon.fillStyle(0xe2e8f0, 0.95)
      weapon.fillRoundedRect(radius * 0.32, -radius * 0.34, radius * 0.88 * scale, radius * 0.34, 3)
      weapon.fillStyle(color, 1)
      weapon.fillRect(radius * 0.95 * scale, -radius * 0.25, radius * 0.36 * scale, radius * 0.16)
    } else if (def.attackStyle === 'chain_lightning') {
      weapon.lineStyle(3, gradeColor, 0.82)
      weapon.strokeCircle(radius * 0.9, -radius * 0.38, radius * 0.28 * scale)
      weapon.lineStyle(2, color, 0.95)
      weapon.lineBetween(radius * 0.68, -radius * 0.58, radius * 0.92, -radius * 0.38)
      weapon.lineBetween(radius * 0.92, -radius * 0.38, radius * 0.72, -radius * 0.18)
      weapon.lineBetween(radius * 1.0, -radius * 0.56, radius * 1.18, -radius * 0.3)
    } else if (def.attackStyle === 'fireball') {
      weapon.fillStyle(color, 0.76)
      weapon.fillCircle(radius * 0.96, -radius * 0.36, radius * 0.3 * scale)
      weapon.fillStyle(0xfff7ad, 0.82)
      weapon.fillCircle(radius * 0.96, -radius * 0.36, radius * 0.16 * scale)
      weapon.lineStyle(2, color, 0.7)
      weapon.arc(radius * 0.96, -radius * 0.36, radius * 0.42 * scale, Phaser.Math.DegToRad(40), Phaser.Math.DegToRad(310), false)
    } else if (def.attackStyle === 'bomb') {
      weapon.fillStyle(0x111827, 0.96)
      weapon.fillCircle(radius * 0.9, -radius * 0.32, radius * 0.28 * scale)
      weapon.lineStyle(2, color, 0.95)
      weapon.strokeCircle(radius * 0.9, -radius * 0.32, radius * 0.34 * scale)
      weapon.lineStyle(2, 0xfef3c7, 0.9)
      weapon.lineBetween(radius * 1.02, -radius * 0.54, radius * 1.24, -radius * 0.78)
    } else {
      weapon.fillStyle(0x020617, 0.86)
      weapon.fillCircle(radius * 0.96, -radius * 0.32, radius * 0.25 * scale)
      weapon.lineStyle(2, color, 0.92)
      weapon.strokeCircle(radius * 0.96, -radius * 0.32, radius * 0.36 * scale)
      for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI * 2 * index) / 6
        weapon.lineBetween(
          radius * 0.96 + Math.cos(angle) * radius * 0.22 * scale,
          -radius * 0.32 + Math.sin(angle) * radius * 0.22 * scale,
          radius * 0.96 + Math.cos(angle) * radius * 0.42 * scale,
          -radius * 0.32 + Math.sin(angle) * radius * 0.42 * scale
        )
      }
    }

    return weapon
  }

  private createUnitIdentity(def: UnitDefinition, radius: number): Phaser.GameObjects.Graphics {
    const identity = this.add.graphics()
    const style = def.attackStyle
    const accent = GRADE_COLOR[def.grade]

    if (style === 'fist' || style === 'fast_fist' || style === 'flurry_fist') {
      identity.lineStyle(3, 0xef4444, 0.94)
      identity.lineBetween(-radius * 0.58, -radius * 0.56, radius * 0.58, -radius * 0.56)
      identity.fillStyle(0xffffff, 0.9)
      identity.fillRect(-radius * 0.08, -radius * 0.64, radius * 0.16, radius * 0.16)
      if (style === 'fast_fist') identity.lineBetween(-radius * 0.72, -radius * 0.08, -radius * 1.06, -radius * 0.34)
      if (style === 'flurry_fist') identity.lineBetween(radius * 0.72, -radius * 0.08, radius * 1.06, -radius * 0.34)
      return identity
    }
    if (style === 'dumbbell' || style === 'barbell') {
      identity.fillStyle(0x334155, 0.95)
      identity.fillRoundedRect(-radius * 0.58, -radius * 0.98, radius * 1.16, radius * 0.22, 4)
      identity.fillStyle(accent, 0.92)
      identity.fillCircle(-radius * 0.42, -radius * 0.87, radius * 0.16)
      identity.fillCircle(radius * 0.42, -radius * 0.87, radius * 0.16)
      return identity
    }
    if (style === 'kick') {
      identity.fillStyle(0xf97316, 0.92)
      identity.fillTriangle(-radius * 0.64, radius * 0.5, -radius * 0.15, radius * 0.46, -radius * 0.42, radius * 0.82)
      return identity
    }
    if (style === 'flute_blade') {
      identity.fillStyle(0x7c3aed, 0.94)
      identity.fillRoundedRect(-radius * 0.54, -radius * 0.9, radius * 1.08, radius * 0.24, 5)
      identity.fillStyle(0xfef3c7, 0.88)
      identity.fillCircle(-radius * 0.24, -radius * 0.78, radius * 0.05)
      identity.fillCircle(0, -radius * 0.78, radius * 0.05)
      identity.fillCircle(radius * 0.24, -radius * 0.78, radius * 0.05)
      return identity
    }
    if (style === 'bow') {
      identity.fillStyle(0x14532d, 0.9)
      identity.fillTriangle(0, -radius * 1.17, -radius * 0.62, -radius * 0.38, radius * 0.62, -radius * 0.38)
      return identity
    }
    if (style === 'sniper') {
      identity.fillStyle(0x111827, 0.92)
      identity.fillRoundedRect(-radius * 0.58, -radius * 0.72, radius * 1.16, radius * 0.26, 4)
      identity.fillStyle(0xff3d71, 0.95)
      identity.fillRect(-radius * 0.18, -radius * 0.64, radius * 0.36, radius * 0.07)
      return identity
    }
    if (style === 'machine_gun' || style === 'weak_laser' || style === 'twin_laser' || style === 'laser' || style === 'mech_bomb' || style === 'drill_zone' || style === 'nuke') {
      identity.fillStyle(0x1e293b, 0.96)
      identity.fillRoundedRect(-radius * 0.54, -radius * 0.96, radius * 1.08, radius * 0.34, 5)
      identity.fillStyle(style === 'nuke' ? 0xf97316 : 0x67e8f9, 0.94)
      identity.fillCircle(0, -radius * 0.79, radius * 0.12)
      identity.lineStyle(2, accent, 0.9)
      identity.lineBetween(-radius * 0.72, -radius * 0.7, radius * 0.72, -radius * 0.7)
      return identity
    }
    if (style === 'coin_throw' || style === 'coin_bomb' || style === 'bill_throw' || style === 'dice_bomb' || style === 'debt_photo' || style === 'gold_bar' || style === 'money_rain' || style === 'lottery_support') {
      identity.fillStyle(0x1f2937, 0.96)
      identity.fillTriangle(-radius * 0.58, -radius * 0.5, radius * 0.58, -radius * 0.5, 0, radius * 0.45)
      identity.fillStyle(0xfacc15, 0.92)
      identity.fillRoundedRect(-radius * 0.16, -radius * 0.48, radius * 0.32, radius * 0.26, 3)
      if (style === 'lottery_support') {
        identity.fillStyle(0xffffff, 0.95)
        identity.fillCircle(0, -radius * 0.94, radius * 0.2)
      }
      return identity
    }
    if (style === 'syringe_throw' || style === 'tear_throw') {
      identity.fillStyle(style === 'tear_throw' ? 0x7dd3fc : 0x86efac, 0.92)
      identity.fillCircle(0, -radius * 0.88, radius * 0.2)
      return identity
    }
    if (style === 'nut_throw' || style === 'slingshot') {
      identity.fillStyle(0x92400e, 0.95)
      identity.fillTriangle(-radius * 0.55, -radius * 0.48, 0, -radius * 1.06, radius * 0.55, -radius * 0.48)
      return identity
    }
    return identity
  }

  private createUnitWeapon(def: UnitDefinition, radius: number): Phaser.GameObjects.Graphics {
    const fallback: Record<UnitAttackStyle, string> = {
      fist: 'melee_fist', dumbbell: 'melee_fist', fast_fist: 'melee_fist', barbell: 'melee_spear', kick: 'melee_fist', flurry_fist: 'melee_fist', flute_blade: 'melee_sword', spear: 'melee_spear', greatsword: 'melee_sword',
      nut_throw: 'ranged_shuriken', slingshot: 'ranged_shuriken', bow: 'ranged_arrow', sniper: 'ranged_gun', laser: 'ranged_gun', tear_throw: 'fireball', rapid_burst: 'ranged_gun',
      weak_laser: 'ranged_gun', machine_gun: 'ranged_gun', pistol: 'ranged_gun', lava_pool: 'fireball', mech_bomb: 'ranged_gun', twin_laser: 'ranged_gun', nuke: 'bomb', drill_zone: 'mine',
      coin_throw: 'ranged_shuriken', syringe_throw: 'ranged_shuriken', gun: 'ranged_gun', smg: 'ranged_gun', bill_throw: 'ranged_shuriken', coin_bomb: 'bomb', dice_bomb: 'bomb', debt_photo: 'bomb', lottery_support: 'chain_lightning', gold_bar: 'bomb', money_rain: 'fireball'
    }
    const weapon = this.createBaseWeapon({ genre: def.genre, grade: def.grade, attackStyle: fallback[def.attackStyle] }, radius)
    const color = GENRE_COLOR[def.genre]
    const scale = 0.92 + GRADE_EFFECT_TIER[def.grade] * 0.08
    const style = def.attackStyle

    if (style === 'dumbbell' || style === 'barbell') {
      weapon.clear()
      const length = style === 'barbell' ? radius * 2.1 : radius * 1.15
      weapon.lineStyle(style === 'barbell' ? 5 : 6, 0xe2e8f0, 0.95)
      weapon.lineBetween(radius * 0.24, radius * 0.34, radius * 0.24 + length, -radius * 0.52)
      weapon.fillStyle(color, 0.98)
      weapon.fillCircle(radius * 0.18, radius * 0.38, radius * 0.22 * scale)
      weapon.fillCircle(radius * 0.3 + length, -radius * 0.56, radius * (style === 'barbell' ? 0.28 : 0.24) * scale)
    } else if (style === 'flute_blade') {
      weapon.clear()
      weapon.lineStyle(6, 0x7c3aed, 0.98)
      weapon.lineBetween(radius * 0.1, radius * 0.26, radius * 1.42, -radius * 0.52)
      weapon.lineStyle(2, 0xfef3c7, 0.95)
      weapon.lineBetween(radius * 0.18, radius * 0.3, radius * 1.48, -radius * 0.48)
      for (let index = 0; index < 3; index += 1) weapon.fillCircle(radius * (0.64 + index * 0.22), -radius * (0.08 + index * 0.13), radius * 0.06)
    } else if (style === 'greatsword') {
      weapon.clear()
      weapon.lineStyle(10, 0xffe7a3, 0.92)
      weapon.lineBetween(radius * 0.08, radius * 0.38, radius * 1.62, -radius * 1.08)
      weapon.lineStyle(4, 0xff3d71, 0.96)
      weapon.lineBetween(radius * 0.12, radius * 0.42, radius * 1.62, -radius * 1.08)
      weapon.fillStyle(0x334155, 1)
      weapon.fillRect(radius * 0.06, radius * 0.2, radius * 0.62, radius * 0.14)
    } else if (style === 'sniper') {
      weapon.clear()
      weapon.fillStyle(0x111827, 1)
      weapon.fillRoundedRect(radius * 0.18, -radius * 0.38, radius * 1.45 * scale, radius * 0.28, 3)
      weapon.fillStyle(0xff3d71, 0.96)
      weapon.fillRect(radius * 1.38 * scale, -radius * 0.3, radius * 0.46, radius * 0.1)
      weapon.lineStyle(2, 0xffffff, 0.82)
      weapon.strokeCircle(radius * 0.6, -radius * 0.5, radius * 0.16)
    } else if (style === 'laser' || style === 'weak_laser' || style === 'twin_laser') {
      weapon.clear()
      const width = style === 'weak_laser' ? 0.44 : style === 'twin_laser' ? 1.2 : 0.82
      weapon.fillStyle(0x1e293b, 1)
      weapon.fillRoundedRect(radius * 0.15, -radius * 0.35, radius * width, radius * 0.36, 4)
      weapon.fillStyle(style === 'weak_laser' ? 0x67e8f9 : 0xff4d6d, 0.96)
      weapon.fillRect(radius * (0.55 + width), -radius * 0.24, radius * 0.45, radius * 0.14)
      if (style === 'twin_laser') weapon.fillRect(radius * (0.55 + width), -radius * 0.02, radius * 0.45, radius * 0.12)
    } else if (style === 'drill_zone') {
      weapon.clear()
      weapon.fillStyle(0x475569, 1)
      weapon.fillRoundedRect(radius * 0.1, -radius * 0.34, radius * 0.92, radius * 0.34, 4)
      weapon.fillStyle(0xfacc15, 1)
      weapon.fillTriangle(radius * 1.5, -radius * 0.17, radius * 0.95, -radius * 0.48, radius * 0.95, radius * 0.14)
      weapon.lineStyle(2, 0xffffff, 0.86)
      for (let index = 0; index < 3; index += 1) weapon.lineBetween(radius * (0.72 + index * 0.2), -radius * 0.33, radius * (0.87 + index * 0.2), -radius * 0.02)
    } else if (style === 'coin_throw' || style === 'coin_bomb' || style === 'gold_bar' || style === 'bill_throw' || style === 'debt_photo' || style === 'lottery_support' || style === 'money_rain') {
      weapon.clear()
      weapon.fillStyle(style === 'bill_throw' || style === 'money_rain' ? 0x86efac : 0xfacc15, 0.98)
      if (style === 'gold_bar') weapon.fillRoundedRect(radius * 0.48, -radius * 0.5, radius * 0.92, radius * 0.34, 3)
      else if (style === 'bill_throw' || style === 'money_rain' || style === 'debt_photo') weapon.fillRoundedRect(radius * 0.48, -radius * 0.58, radius * 0.88, radius * 0.56, 3)
      else weapon.fillCircle(radius * 0.9, -radius * 0.3, radius * 0.32)
      weapon.lineStyle(2, 0xffffff, 0.84)
      weapon.strokeCircle(radius * 0.9, -radius * 0.3, radius * 0.38)
    }
    return weapon
  }

  private showUnitMessage(def: UnitDefinition, kind: 'summon' | 'merge', chance = 100): void {
    while (this.summonMessages.length >= 5) {
      this.removeSummonMessage(this.summonMessages[0], false)
    }

    const chancePrefix = kind === 'summon' && chance < 5 ? `${this.formatSummonChance(chance)}% 확률로 ` : ''
    const actionText = kind === 'merge' ? '합성에 성공하였습니다.' : '소환했습니다.'
    const message = `${chancePrefix}[${GENRE_LABEL[def.genre]}] ${def.name} ${actionText}`
    const text = this.add.text(this.getMapCenterX(), this.getMessageBaseY(), message, {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: this.colorNumberToHex(GRADE_COLOR[def.grade]),
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 4
    }).setOrigin(0.5)
      .setDepth(900)

    this.summonMessages.push(text)
    this.layoutSummonMessages()
    this.time.delayedCall(3000, () => this.removeSummonMessage(text, true))

    if (def.grade === 'myth' && def.mythQuote) {
      this.showMythQuote(def)
    }
  }

  private showMythQuote(def: UnitDefinition): void {
    const quote = this.add.text(this.getMapCenterX(), this.getMessageBaseY() - 82, `"${def.mythQuote}"`, {
      fontFamily: UI_FONT,
      fontSize: '24px',
      color: this.colorNumberToHex(GRADE_COLOR.myth),
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 5
    }).setOrigin(0.5)
      .setDepth(910)

    this.tweens.add({
      targets: quote,
      y: quote.y - 18,
      scale: 1.08,
      duration: 280,
      yoyo: true,
      ease: 'Back.easeOut'
    })
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: quote,
        alpha: 0,
        duration: 240,
        onComplete: () => quote.destroy()
      })
    })
  }

  private layoutSummonMessages(): void {
    const baseY = this.getMessageBaseY()
    const spacing = 22
    this.summonMessages.forEach((message, index) => {
      message.setX(this.getMapCenterX())
      message.setY(baseY - (this.summonMessages.length - 1 - index) * spacing)
      message.setAlpha(1)
    })
  }

  private getMapCenterX(): number {
    return BOARD.inner.x + BOARD.inner.width / 2
  }

  private getMessageBaseY(): number {
    return BOARD.inner.y + BOARD.inner.height - 28
  }

  private removeSummonMessage(message: Phaser.GameObjects.Text, fade: boolean): void {
    if (!this.summonMessages.includes(message) || !message.active) return

    const destroyMessage = () => {
      this.summonMessages = this.summonMessages.filter((item) => item !== message)
      message.destroy()
      this.layoutSummonMessages()
    }

    if (!fade) {
      destroyMessage()
      return
    }

    this.tweens.add({
      targets: message,
      alpha: 0,
      duration: 220,
      onComplete: destroyMessage
    })
  }

  private formatSummonChance(chance: number): string {
    if (chance < 0.01) return chance.toFixed(3)
    if (chance < 0.1) return chance.toFixed(2)
    if (chance < 1) return chance.toFixed(1)
    return String(chance)
  }

  private colorNumberToHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`
  }

  private getMythStyleColor(style: MythStyle, fallbackGenre: Genre): number {
    if (style === 'greatsword') return 0xff3d71
    if (style === 'rapid_burst') return 0xf8fafc
    if (style === 'drill') return 0xfacc15
    if (style === 'money_rain') return 0x86efac
    if (style === 'solar') return 0xfacc15
    if (style === 'gravity') return 0xa78bfa
    if (style === 'railgun') return 0x38bdf8
    if (style === 'puppet') return 0xfef3c7
    if (style === 'storm') return 0xfef08a
    return GENRE_COLOR[fallbackGenre]
  }

  private playUnitAppearEffect(unit: UnitRuntime, merged = false): void {
    const color = GRADE_COLOR[unit.def.grade]
    const tier = GRADE_EFFECT_TIER[unit.def.grade]
    const scale = this.getGradeEffectScale(unit.def.grade)
    unit.avatar.setScale(0.55)
    this.tweens.add({
      targets: unit.avatar,
      scale: 1,
      duration: merged ? 280 : 170 + tier * 28,
      ease: 'Back.easeOut'
    })
    for (let index = 0; index < Math.min(tier, 4); index += 1) {
      this.time.delayedCall(index * 38, () => {
        this.drawBurstRing(unit.x, unit.y, GRADE_STATS[unit.def.grade].radius + 12 + index * 9 * scale + (merged ? 10 : 0), color)
      })
    }
    this.drawSummonGradeGlyph(unit.x, unit.y, unit.def.grade, color)
    this.spawnBurst(unit.x, unit.y, color, merged ? 12 + tier * 5 : 6 + tier * 4, merged ? 46 * scale : 28 * scale)
    if (tier >= 4) {
      this.cameras.main.shake(tier === 5 ? 90 : 55, tier === 5 ? 0.001 : 0.0006)
    }
  }

  private drawSummonGradeGlyph(x: number, y: number, grade: Grade, color: number): void {
    const tier = GRADE_EFFECT_TIER[grade]
    const glyph = this.add.graphics().setDepth(128)
    const radius = 14 + tier * 8
    glyph.lineStyle(2 + tier * 0.5, color, 0.82)
    glyph.strokeCircle(0, 0, radius)
    if (tier >= 3) {
      glyph.lineStyle(2, 0xffffff, 0.62)
      glyph.lineBetween(-radius, 0, radius, 0)
      glyph.lineBetween(0, -radius, 0, radius)
    }
    if (tier >= 4) {
      glyph.lineStyle(2, color, 0.72)
      glyph.strokeRect(-radius * 0.72, -radius * 0.72, radius * 1.44, radius * 1.44)
    }
    if (tier >= 5) {
      glyph.fillStyle(0xffffff, 0.8)
      glyph.fillTriangle(0, -radius - 16, 6, -radius - 2, -6, -radius - 2)
      glyph.fillTriangle(0, radius + 16, 6, radius + 2, -6, radius + 2)
      glyph.fillTriangle(-radius - 16, 0, -radius - 2, -6, -radius - 2, 6)
      glyph.fillTriangle(radius + 16, 0, radius + 2, -6, radius + 2, 6)
    }
    glyph.setPosition(x, y)
    glyph.setScale(0.35)
    this.tweens.add({
      targets: glyph,
      scale: 1.18,
      angle: tier >= 4 ? 45 : 0,
      alpha: 0,
      duration: 280 + tier * 70,
      ease: 'Cubic.easeOut',
      onComplete: () => glyph.destroy()
    })
  }

  private playUnitWalkEffect(unit: UnitRuntime, dx: number, dy: number): void {
    if (unit.def.mythStyle) {
      this.playMythWalkEffect(unit, dx, dy)
      return
    }
    const tier = GRADE_EFFECT_TIER[unit.def.grade]
    if (tier < 3 || this.time.now - unit.lastWalkEffectAt < 145) return
    unit.lastWalkEffectAt = this.time.now

    const angle = Math.atan2(dy, dx)
    const backX = unit.x - Math.cos(angle) * 15
    const backY = unit.y - Math.sin(angle) * 15
    const color = GRADE_COLOR[unit.def.grade]
    const mark = this.add.graphics().setDepth(23)
    mark.lineStyle(tier >= 4 ? 2 : 1, color, tier >= 4 ? 0.7 : 0.42)
    mark.strokeCircle(0, 0, 4 + tier * 2)
    if (tier >= 4) {
      mark.lineBetween(-8, 0, 8, 0)
      mark.lineBetween(0, -8, 0, 8)
    }
    mark.setPosition(backX, backY)
    mark.setAngle(Phaser.Math.RadToDeg(angle))
    this.tweens.add({
      targets: mark,
      scale: 1.35,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => mark.destroy()
    })
  }

  private playMythWalkEffect(unit: UnitRuntime, dx: number, dy: number): void {
    const style = unit.def.mythStyle
    if (!style || this.time.now - unit.lastWalkEffectAt < 95) return
    unit.lastWalkEffectAt = this.time.now

    const angle = Math.atan2(dy, dx)
    const backX = unit.x - Math.cos(angle) * 18
    const backY = unit.y - Math.sin(angle) * 18
    const color = this.getMythStyleColor(style, unit.def.genre)

    if (style === 'solar') {
      const ember = this.add.graphics().setDepth(24)
      ember.lineStyle(2, color, 0.72)
      ember.strokeCircle(0, 0, 8)
      ember.lineStyle(1, 0xffffff, 0.48)
      ember.lineBetween(-10, 0, 10, 0)
      ember.lineBetween(0, -10, 0, 10)
      ember.setPosition(backX, backY)
      this.tweens.add({
        targets: ember,
        scale: 1.6,
        alpha: 0,
        duration: 360,
        ease: 'Cubic.easeOut',
        onComplete: () => ember.destroy()
      })
      return
    }

    if (style === 'gravity') {
      const dent = this.add.ellipse(backX, backY + 3, 24, 9, 0x312e81, 0.34).setDepth(23)
      dent.setAngle(Phaser.Math.RadToDeg(angle))
      this.tweens.add({
        targets: dent,
        scaleX: 1.4,
        scaleY: 0.45,
        alpha: 0,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => dent.destroy()
      })
      return
    }

    if (style === 'railgun') {
      const trail = this.add.container(backX, backY).setDepth(24)
      const flash = this.add.rectangle(0, 0, 28, 3, color, 0.78)
      const heat = this.add.rectangle(-8, 5, 18, 2, 0xffffff, 0.42)
      trail.add([flash, heat])
      trail.setRotation(angle)
      this.tweens.add({
        targets: trail,
        x: backX - Math.cos(angle) * 24,
        y: backY - Math.sin(angle) * 24,
        alpha: 0,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => trail.destroy()
      })
      return
    }

    if (style === 'puppet') {
      const stitch = this.add.graphics().setDepth(24)
      stitch.lineStyle(2, color, 0.65)
      stitch.lineBetween(-9, -4, -3, 4)
      stitch.lineBetween(2, -4, 8, 4)
      stitch.strokeCircle(0, 0, 7)
      stitch.setPosition(backX, backY)
      stitch.setAngle(Phaser.Math.RadToDeg(angle))
      this.tweens.add({
        targets: stitch,
        y: stitch.y + 8,
        alpha: 0,
        duration: 390,
        ease: 'Sine.easeOut',
        onComplete: () => stitch.destroy()
      })
      return
    }

    const spark = this.add.graphics().setDepth(24)
    spark.lineStyle(3, color, 0.82)
    spark.lineBetween(-8, -6, 0, 0)
    spark.lineBetween(0, 0, -4, 9)
    spark.lineStyle(1, 0xffffff, 0.72)
    spark.lineBetween(4, -8, 10, 2)
    spark.setPosition(backX, backY)
    spark.setAngle(Phaser.Math.RadToDeg(angle))
    this.tweens.add({
      targets: spark,
      scale: 1.35,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => spark.destroy()
    })
  }

  private playMonsterDeathEffect(monster: MonsterRuntime): void {
    this.drawBurstRing(monster.container.x, monster.container.y, monster.kind === 'boss' ? 54 : 28, monster.baseColor)
    this.spawnBurst(monster.container.x, monster.container.y, monster.baseColor, monster.kind === 'boss' ? 20 : 8, monster.kind === 'boss' ? 58 : 30)
  }

  private upgradeSummon(): void {
    if (this.isPaused || this.isGameOver) return
    if (this.summonLevel >= SUMMON_RATES.length - 1) return
    const nextCost = SUMMON_RATES[this.summonLevel + 1].cost ?? 0
    if (this.gold < nextCost) return
    this.gold -= nextCost
    this.summonLevel += 1
    this.increaseSummonCost()
  }

  private upgradeGenre(genre: Genre): void {
    if (this.isPaused || this.isGameOver) return
    const level = this.genreUpgradeLevel[genre]
    const cost = GENRE_UPGRADE_BASE_COST + level * GENRE_UPGRADE_COST_INCREMENT
    if (this.gold < cost) return
    this.gold -= cost
    this.genreUpgradeLevel[genre] += 1
  }

  private mergeSelectedUnits(): void {
    if (this.isPaused || this.isGameOver) return
    const mergeable = this.getMergeableSelectedGroup()
    if (!mergeable) return

    const nextGrade = getNextGrade(mergeable.def.grade)
    if (!nextGrade) return

    const materials = mergeable.units.slice(0, 3)
    const x = materials.reduce((sum, unit) => sum + unit.x, 0) / 3
    const y = materials.reduce((sum, unit) => sum + unit.y, 0) / 3
    for (const unit of materials) this.removeUnit(unit)

    const def = randomItem(getUnitsByGrade(nextGrade))
    const point = this.clampToInner(x, y)
    const created = this.createUnit(def, point.x, point.y)
    this.playUnitAppearEffect(created, true)
    this.showUnitMessage(def, 'merge')
    this.addUnitsToSelection([created])
    this.recalculateSynergy()
  }

  private sellSelectedUnits(): void {
    if (this.isPaused || this.isGameOver) return
    const selected = this.getSelectedUnits()
    if (selected.length === 0) return
    const value = selected.reduce((sum, unit) => sum + this.getSellValue(unit), 0)
    for (const unit of selected) this.removeUnit(unit)
    this.gold += value
    this.clearSelection()
    this.recalculateSynergy()
  }

  private killMonster(monster: MonsterRuntime): void {
    if (!monster.alive) return
    if (monster.kind === 'normal') this.killsNormal += 1
    if (monster.kind === 'elite') this.killsElite += 1
    if (monster.kind === 'boss') {
      this.bossKills += 1
      this.currentBossId = null
      this.bossTimeRemainingMs = null
      this.increaseSummonCost()
    }

    const baseGold = monster.kind === 'boss'
      ? this.getBossGold(monster.wave)
      : getKillGold(monster.wave) * (monster.kind === 'elite' ? 5 : 1)
    this.gold += Math.round(baseGold * (1 + this.synergy.goldBonus + this.synergy.lotteryGoldBonus))
    this.playMonsterDeathEffect(monster)
    this.removeMonster(monster, true)
  }

  private removeMonster(monster: MonsterRuntime, clearForcedTargets: boolean): void {
    monster.alive = false
    this.monstersById.delete(monster.id)
    monster.container.destroy(true)
    this.monsters = this.monsters.filter((item) => item.id !== monster.id)
    if (clearForcedTargets) {
      for (const unit of this.units) {
        if (unit.forcedTargetId === monster.id) unit.forcedTargetId = null
      }
    }
  }

  private removeUnit(unit: UnitRuntime): void {
    this.tweens.killTweensOf(unit.avatar)
    this.tweens.killTweensOf(unit.avatar.list)
    for (let index = this.damageZones.length - 1; index >= 0; index -= 1) {
      if (this.damageZones[index].unit.id === unit.id) {
        this.damageZones[index].visual.destroy()
        this.damageZones.splice(index, 1)
      }
    }
    unit.container.destroy(true)
    this.selectedUnitIds.delete(unit.id)
    this.units = this.units.filter((item) => item.id !== unit.id)
  }

  private getBossGold(wave: number): number {
    const bossNumber = Math.max(1, Math.floor(wave / 5))
    return Math.round(120 + bossNumber * bossNumber * 38)
  }

  private getSellValue(unit: UnitRuntime): number {
    return unit.def.attackStyle === 'lottery_support' ? 10000 : SELL_VALUES[unit.def.grade]
  }

  private increaseSummonCost(): void {
    this.summonCost += 5
  }

  private handleUnitClick(pointer: Phaser.Input.Pointer): void {
    const point = this.getWorldPointer(pointer)
    const unit = this.getUnitAt(point.x, point.y)
    const now = this.time.now
    if (!unit) {
      this.clearSelection()
      this.lastClickedDefId = null
      this.lastClickAt = 0
      return
    }

    if (this.lastClickedDefId === unit.def.id && now - this.lastClickAt <= 320) {
      const sameUnits = this.units.filter((item) => item.def.id === unit.def.id)
      this.selectUnits(sameUnits)
    } else {
      this.selectUnits([unit])
    }

    this.lastClickedDefId = unit.def.id
    this.lastClickAt = now
  }

  private handleRightClick(pointer: Phaser.Input.Pointer): void {
    this.attackMode = false
    this.game.canvas.style.cursor = 'default'
    const point = this.getWorldPointer(pointer)
    this.moveSelectedUnitsTo(point.x, point.y, 0xfde68a)
  }

  private handleAttackClick(pointer: Phaser.Input.Pointer): void {
    const point = this.getWorldPointer(pointer)
    const monster = this.getMonsterAt(point.x, point.y)
    if (!monster) {
      this.moveSelectedUnitsTo(point.x, point.y, 0x22c55e)
      this.attackMode = false
      this.game.canvas.style.cursor = 'default'
      return
    }

    for (const unit of this.getSelectedUnits()) {
      unit.forcedTargetId = monster.id
    }
    this.attackMode = false
    this.game.canvas.style.cursor = 'default'
  }

  private moveSelectedUnitsTo(x: number, y: number, markerColor: number): void {
    const selected = this.getSelectedUnits()
    if (selected.length === 0) return

    const point = this.clampToInner(x, y)
    const positions = this.getFormationPositions(point.x, point.y, selected.length)
    selected.forEach((unit, index) => {
      const p = this.clampToInner(positions[index].x, positions[index].y)
      unit.targetX = p.x
      unit.targetY = p.y
      unit.forcedTargetId = null
    })
    this.drawMoveMarker(point.x, point.y, markerColor)
  }

  private getUnitAt(x: number, y: number): UnitRuntime | null {
    const sorted = [...this.units].sort((a, b) => b.id - a.id)
    for (const unit of sorted) {
      const stats = GRADE_STATS[unit.def.grade]
      if (distance(unit, { x, y }) <= stats.radius + 6) return unit
    }
    return null
  }

  private getMonsterAt(x: number, y: number): MonsterRuntime | null {
    const sorted = [...this.monsters].sort((a, b) => b.id - a.id)
    for (const monster of sorted) {
      const radius = monster.kind === 'boss' ? 34 : monster.kind === 'elite' ? 25 : 18
      if (distance({ x: monster.container.x, y: monster.container.y }, { x, y }) <= radius) return monster
    }
    return null
  }

  private selectUnits(units: UnitRuntime[]): void {
    this.clearSelection()
    this.addUnitsToSelection(units)
  }

  private addUnitsToSelection(units: UnitRuntime[]): void {
    for (const unit of units) {
      unit.selected = true
      unit.ring.setVisible(true)
      this.selectedUnitIds.add(unit.id)
    }
    this.refreshRangeIndicator()
  }

  private selectUnitsInRect(rect: Phaser.Geom.Rectangle): void {
    const selected = this.units.filter((unit) => this.unitIntersectsRect(unit, rect))
    this.selectUnits(selected)
  }

  private unitIntersectsRect(unit: UnitRuntime, rect: Phaser.Geom.Rectangle): boolean {
    const radius = GRADE_STATS[unit.def.grade].radius + 8
    const closestX = clamp(unit.x, rect.x, rect.x + rect.width)
    const closestY = clamp(unit.y, rect.y, rect.y + rect.height)
    const dx = unit.x - closestX
    const dy = unit.y - closestY
    return dx * dx + dy * dy <= radius * radius
  }

  private clearSelection(): void {
    for (const unit of this.units) {
      unit.selected = false
      unit.ring.setVisible(false)
    }
    this.selectedUnitIds.clear()
    this.rangeIndicatorUnit = null
    this.rangeIndicator?.setVisible(false)
  }

  private refreshRangeIndicator(): void {
    const selected = this.getSelectedUnits()
    if (selected.length !== 1) {
      this.rangeIndicatorUnit = null
      this.rangeIndicator.setVisible(false)
      return
    }

    this.rangeIndicatorUnit = selected[0]
    this.drawRangeIndicator(selected[0])
  }

  private updateRangeIndicatorPosition(): void {
    if (!this.rangeIndicatorUnit || !this.rangeIndicatorUnit.selected) return
    this.drawRangeIndicator(this.rangeIndicatorUnit)
  }

  private drawRangeIndicator(unit: UnitRuntime): void {
    const radius = this.getAttackRange(unit)
    this.rangeIndicator.clear()
    this.rangeIndicator.fillStyle(0xffffff, 0.055)
    this.rangeIndicator.fillCircle(unit.x, unit.y, radius)
    this.rangeIndicator.lineStyle(2, 0xffffff, 0.9)
    this.rangeIndicator.strokeCircle(unit.x, unit.y, radius)
    this.rangeIndicator.lineStyle(1, 0xbdefff, 0.76)
    this.rangeIndicator.strokeCircle(unit.x, unit.y, Math.max(0, radius - 4))
    this.rangeIndicator.setVisible(true)
  }

  private getSelectedUnits(): UnitRuntime[] {
    return this.units.filter((unit) => this.selectedUnitIds.has(unit.id))
  }

  private ensureDragBox(): void {
    if (this.dragBox) return
    this.dragBox = this.add.rectangle(0, 0, 0, 0, 0x22c55e, 0.14)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x22c55e, 0.8)
      .setDepth(500)
      .setVisible(false)
  }

  private drawMoveMarker(x: number, y: number, color = 0xfde68a): void {
    const marker = this.add.graphics().setDepth(600)
    marker.lineStyle(3, color, 1)
    marker.strokeCircle(x, y, 13)
    marker.lineBetween(x - 9, y, x + 9, y)
    marker.lineBetween(x, y - 9, x, y + 9)
    this.tweens.add({
      targets: marker,
      alpha: 0,
      duration: 1000,
      onComplete: () => marker.destroy()
    })
  }

  private updateMonsterHpText(monster: MonsterRuntime): void {
    const percent = Math.max(0, monster.hp / monster.maxHp)
    const roundedPercent = Math.ceil(percent * 100)
    if (roundedPercent === monster.lastHpDisplayPercent) return
    monster.lastHpDisplayPercent = roundedPercent
    monster.hpText.setText(`${roundedPercent}%`)
  }

  private playUnitAttackMotion(unit: UnitRuntime, target: MonsterRuntime): void {
    const dx = target.container.x - unit.x
    const angle = clamp(dx / 8, -12, 12)
    this.tweens.add({
      targets: unit.avatar,
      scaleX: 1.16,
      scaleY: 0.86,
      angle,
      duration: 68,
      yoyo: true,
      ease: 'Quad.easeOut'
    })
  }

  private drawAttackEffect(
    unit: UnitRuntime,
    target: MonsterRuntime,
    profile: AttackProfile,
    chainTargets: MonsterRuntime[] = [target],
    onImpact: () => void = () => undefined
  ): void {
    if (unit.def.mythStyle) {
      this.drawMythAttackEffect(unit, target, unit.def.mythStyle, profile, chainTargets, onImpact)
      return
    }

    const color = GENRE_COLOR[unit.def.genre]
    const scale = this.getGradeEffectScale(unit.def.grade)
    const endX = target.container.x
    const endY = target.container.y

    if (unit.def.attackStyle === 'fist' || unit.def.attackStyle === 'fast_fist' || unit.def.attackStyle === 'flurry_fist') {
      const hits = unit.def.attackStyle === 'flurry_fist' ? 5 : unit.def.attackStyle === 'fast_fist' ? 3 : 1
      this.drawPunchCombo(unit.x, unit.y, endX, endY, color, scale, hits, onImpact)
      return
    }
    if (unit.def.attackStyle === 'dumbbell' || unit.def.attackStyle === 'barbell') {
      this.drawWeightedSwing(unit.x, unit.y, endX, endY, color, scale, unit.def.attackStyle === 'barbell', onImpact)
      return
    }
    if (unit.def.attackStyle === 'kick') {
      this.drawKickImpact(unit.x, unit.y, endX, endY, color, scale, onImpact)
      return
    }
    if (unit.def.attackStyle === 'flute_blade') {
      this.drawFluteBladeSlash(unit.x, unit.y, endX, endY, color, scale, onImpact)
      return
    }
    if (unit.def.attackStyle === 'spear') {
      this.drawSpearThrust(unit.x, unit.y, endX, endY, color, scale * 1.25)
      this.time.delayedCall(85, onImpact)
      return
    }
    if (unit.def.attackStyle === 'bow') {
      this.drawArrowShot(unit.x, unit.y, endX, endY, color, scale * 1.08, true, onImpact)
      return
    }
    if (unit.def.attackStyle === 'sniper') {
      this.drawSniperShot(unit.x, unit.y, endX, endY, color, scale, onImpact)
      return
    }
    if (unit.def.attackStyle === 'laser' || unit.def.attackStyle === 'weak_laser' || unit.def.attackStyle === 'twin_laser') {
      const beams = unit.def.attackStyle === 'twin_laser' ? 2 : 1
      const width = unit.def.attackStyle === 'weak_laser' ? 2 : unit.def.attackStyle === 'twin_laser' ? 5 : 4
      this.drawLaserBeam(unit.x, unit.y, endX, endY, color, scale, beams, width, onImpact)
      return
    }
    if (unit.def.attackStyle === 'machine_gun' || unit.def.attackStyle === 'smg' || unit.def.attackStyle === 'rapid_burst') {
      const rounds = unit.def.attackStyle === 'rapid_burst' ? 6 : unit.def.attackStyle === 'smg' ? 4 : 3
      this.drawBurstShots(unit.x, unit.y, endX, endY, color, scale, rounds, onImpact)
      return
    }
    if (unit.def.attackStyle === 'pistol' || unit.def.attackStyle === 'gun' || unit.def.attackStyle === 'mech_bomb') {
      this.drawBulletShot(unit.x, unit.y, endX, endY, color, scale, onImpact)
      return
    }
    if (unit.def.attackStyle === 'lava_pool') {
      this.drawLavaPour(unit.x, unit.y, endX, endY, color, profile.splashRadius ?? 54, scale, onImpact)
      return
    }
    if (unit.def.attackStyle === 'drill_zone') {
      this.drawDrillThrow(unit.x, unit.y, endX, endY, color, scale, onImpact)
      return
    }
    if (unit.def.attackStyle === 'coin_bomb' || unit.def.attackStyle === 'dice_bomb' || unit.def.attackStyle === 'debt_photo' || unit.def.attackStyle === 'gold_bar') {
      this.drawThrownPayload(unit, target, color, scale, profile.splashRadius ?? 60, onImpact)
      return
    }

    this.drawThrownPayload(unit, target, color, scale, 0, onImpact)
  }

  private drawMythAttackEffect(
    unit: UnitRuntime,
    target: MonsterRuntime,
    style: MythStyle,
    profile: AttackProfile,
    chainTargets: MonsterRuntime[],
    onImpact: () => void
  ): void {
    if (style === 'greatsword') {
      this.drawGreatswordCrescent(unit.x, unit.y, target.container.x, target.container.y, onImpact)
      return
    }
    if (style === 'rapid_burst') {
      this.drawBurstShots(unit.x, unit.y, target.container.x, target.container.y, 0xf8fafc, 1.6, 9, onImpact)
      return
    }
    if (style === 'drill') {
      this.drawDrillThrow(unit.x, unit.y, target.container.x, target.container.y, 0xffd60a, 1.7, onImpact)
      return
    }
    if (style === 'money_rain') {
      onImpact()
      return
    }
    const color = this.getMythStyleColor(style, unit.def.genre)
    const scale = this.getGradeEffectScale(unit.def.grade)
    const startX = unit.x
    const startY = unit.y
    const endX = target.container.x
    const endY = target.container.y

    if (style === 'solar') {
      const beam = this.add.graphics().setDepth(132)
      beam.lineStyle(8, 0xfff7ad, 0.6)
      beam.arc(endX, endY, 38 * scale, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(340), false)
      beam.lineStyle(4, 0xffffff, 0.86)
      beam.arc(endX, endY, 28 * scale, Phaser.Math.DegToRad(220), Phaser.Math.DegToRad(325), false)
      beam.lineStyle(2, color, 1)
      beam.lineBetween(startX, startY, endX, endY)
      this.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 170,
        ease: 'Quad.easeOut',
        onComplete: () => beam.destroy()
      })
      this.spawnBurst(endX, endY, color, 10 + GRADE_EFFECT_TIER[unit.def.grade] * 3, 34 * scale)
      this.time.delayedCall(75, onImpact)
      return
    }

    if (style === 'gravity') {
      const singularity = this.add.graphics().setDepth(132)
      singularity.fillStyle(0x020617, 0.72)
      singularity.fillCircle(0, 0, 28)
      singularity.lineStyle(4, color, 0.9)
      singularity.arc(0, 0, 34, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(330), false)
      singularity.lineStyle(2, 0xffffff, 0.5)
      singularity.strokeCircle(0, 0, 17)
      singularity.setPosition(endX, endY)
      singularity.setScale(0.45)
      this.tweens.add({
        targets: singularity,
        scale: 1.24,
        angle: '+=180',
        alpha: 0,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => singularity.destroy()
      })
      this.drawChainLightningTargets(startX, startY, chainTargets, color, scale * 0.82)
      this.spawnBurst(endX, endY, color, profile.kind === 'aoe' ? 18 : 11, profile.splashRadius ?? 42)
      this.cameras.main.shake(90, 0.001)
      this.time.delayedCall(140, onImpact)
      return
    }

    if (style === 'railgun') {
      const beam = this.add.graphics().setDepth(132)
      beam.lineStyle(9, 0xe0f2fe, 0.78)
      beam.lineBetween(startX, startY, endX, endY)
      beam.lineStyle(4, color, 1)
      beam.lineBetween(startX, startY, endX, endY)
      beam.lineStyle(2, 0xffffff, 0.8)
      beam.strokeCircle(startX, startY, 13)
      beam.strokeCircle(endX, endY, 18)
      this.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 120,
        ease: 'Quad.easeOut',
        onComplete: () => beam.destroy()
      })
      this.drawBurstRing(endX, endY, 28 * scale, color)
      this.time.delayedCall(65, onImpact)
      return
    }

    if (style === 'puppet') {
      const sigil = this.add.graphics().setDepth(132)
      sigil.lineStyle(2, 0xffffff, 0.7)
      sigil.lineBetween(startX, startY - 10, endX - 14, endY - 16)
      sigil.lineBetween(startX, startY, endX + 12, endY - 4)
      sigil.lineBetween(startX, startY + 10, endX - 6, endY + 14)
      sigil.lineStyle(3, color, 0.94)
      sigil.strokeCircle(endX, endY, 26)
      sigil.lineBetween(endX - 26, endY, endX + 26, endY)
      sigil.lineBetween(endX, endY - 26, endX, endY + 26)
      this.tweens.add({
        targets: sigil,
        alpha: 0,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 230,
        ease: 'Sine.easeOut',
        onComplete: () => sigil.destroy()
      })
      this.drawChainLightningTargets(startX, startY, chainTargets, color, scale * 0.72)
      this.spawnBurst(endX, endY, color, 9, 30 * scale)
      this.time.delayedCall(115, onImpact)
      return
    }

    const bolt = this.add.graphics().setDepth(132)
    const points = this.createLightningPoints(startX, startY, endX, endY, 5, 18 * scale)
    bolt.lineStyle(7, 0xffffff, 0.78)
    this.strokePointPath(bolt, points)
    bolt.lineStyle(3, color, 1)
    this.strokePointPath(bolt, points)
    bolt.lineStyle(2, 0xfef3c7, 0.9)
    bolt.strokeCircle(endX, endY, 24 * scale)
    this.tweens.add({
      targets: bolt,
      alpha: 0,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => bolt.destroy()
    })
    this.drawFireballShot(startX, startY, endX, endY, color, profile.splashRadius ?? 60, scale * 0.85, onImpact)
    this.spawnBurst(endX, endY, color, 12, 34 * scale)
  }

  private getGradeEffectScale(grade: Grade): number {
    return 1 + (GRADE_EFFECT_TIER[grade] - 1) * 0.18
  }

  private drawPunchCombo(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, hits: number, onImpact: () => void): void {
    for (let index = 0; index < hits; index += 1) {
      this.time.delayedCall(index * 34, () => {
        const offset = (index - (hits - 1) / 2) * 7 * scale
        this.drawPunchImpact(x1, y1, x2, y2 + offset, color, scale * (1 + index * 0.04))
        if (index === hits - 1) onImpact()
      })
    }
  }

  private drawWeightedSwing(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, barbell: boolean, onImpact: () => void): void {
    const swing = this.add.container(x1, y1).setDepth(128)
    const length = (barbell ? 58 : 42) * scale
    const shaft = this.add.rectangle(length * 0.45, 0, length, barbell ? 5 : 7, 0xe2e8f0, 0.96).setOrigin(0.5)
    const leftWeight = this.add.circle(length * 0.08, 0, (barbell ? 11 : 9) * scale, color, 0.98).setStrokeStyle(2, 0xffffff, 0.7)
    const rightWeight = this.add.circle(length * 0.82, 0, (barbell ? 12 : 10) * scale, color, 0.98).setStrokeStyle(2, 0xffffff, 0.7)
    swing.add([shaft, leftWeight, rightWeight])
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    swing.setRotation(angle - 1.35)
    this.tweens.add({
      targets: swing,
      rotation: angle + 0.72,
      duration: barbell ? 170 : 135,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.drawShockwave(x2, y2, (barbell ? 34 : 26) * scale, color)
        this.spawnBurst(x2, y2, color, this.getParticleBudget(barbell ? 10 : 7), 28 * scale)
        onImpact()
        swing.destroy()
      }
    })
  }

  private drawKickImpact(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, onImpact: () => void): void {
    const arc = this.add.graphics().setDepth(128)
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    arc.lineStyle(9 * scale, 0xffffff, 0.58)
    arc.arc(x2, y2, 27 * scale, angle - 1.5, angle + 0.5, false)
    arc.lineStyle(4 * scale, color, 1)
    arc.arc(x2, y2, 30 * scale, angle - 1.45, angle + 0.45, false)
    this.tweens.add({
      targets: arc,
      alpha: 0,
      scale: 1.22,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: () => arc.destroy()
    })
    this.time.delayedCall(70, () => {
      this.drawShockwave(x2, y2, 28 * scale, color)
      onImpact()
    })
  }

  private drawFluteBladeSlash(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, onImpact: () => void): void {
    const slash = this.add.graphics().setDepth(130)
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    slash.lineStyle(8 * scale, 0xfef3c7, 0.62)
    slash.arc(x2, y2, 34 * scale, angle - 1.25, angle + 0.8, false)
    slash.lineStyle(3 * scale, color, 1)
    slash.arc(x2, y2, 43 * scale, angle - 1.08, angle + 0.64, false)
    slash.lineStyle(2 * scale, 0xffffff, 0.9)
    slash.lineBetween(x1, y1, x2, y2)
    for (let index = 0; index < 3; index += 1) {
      const noteY = y2 - 22 * scale - index * 8
      slash.fillStyle(0xffffff, 0.82)
      slash.fillCircle(x2 - 18 * scale + index * 12, noteY, 3 * scale)
      slash.lineStyle(1.5 * scale, color, 0.9)
      slash.lineBetween(x2 - 15 * scale + index * 12, noteY, x2 - 15 * scale + index * 12, noteY - 10 * scale)
    }
    this.tweens.add({ targets: slash, alpha: 0, duration: 190, ease: 'Quad.easeOut', onComplete: () => slash.destroy() })
    this.time.delayedCall(75, onImpact)
  }

  private drawSniperShot(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, onImpact: () => void): void {
    const beam = this.add.graphics().setDepth(133)
    beam.lineStyle(7 * scale, 0xffffff, 0.75)
    beam.lineBetween(x1, y1, x2, y2)
    beam.lineStyle(2 * scale, color, 1)
    beam.lineBetween(x1, y1, x2, y2)
    beam.lineStyle(2, 0xffffff, 0.92)
    beam.strokeCircle(x2, y2, 17 * scale)
    beam.lineBetween(x2 - 24 * scale, y2, x2 + 24 * scale, y2)
    beam.lineBetween(x2, y2 - 24 * scale, x2, y2 + 24 * scale)
    this.tweens.add({ targets: beam, alpha: 0, duration: 130, ease: 'Quad.easeOut', onComplete: () => beam.destroy() })
    this.time.delayedCall(60, () => {
      this.drawBurstRing(x2, y2, 28 * scale, color)
      onImpact()
    })
  }

  private drawLaserBeam(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, beams: number, width: number, onImpact: () => void): void {
    const laser = this.add.graphics().setDepth(132)
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    const offsetX = -Math.sin(angle) * 7 * scale
    const offsetY = Math.cos(angle) * 7 * scale
    for (let index = 0; index < beams; index += 1) {
      const side = beams === 1 ? 0 : index === 0 ? -1 : 1
      laser.lineStyle((width + 5) * scale, color, 0.3)
      laser.lineBetween(x1 + offsetX * side, y1 + offsetY * side, x2 + offsetX * side, y2 + offsetY * side)
      laser.lineStyle(width * scale, 0xffffff, 0.9)
      laser.lineBetween(x1 + offsetX * side, y1 + offsetY * side, x2 + offsetX * side, y2 + offsetY * side)
    }
    laser.fillStyle(color, 0.85)
    laser.fillCircle(x2, y2, (9 + beams * 3) * scale)
    this.tweens.add({ targets: laser, alpha: 0, duration: beams === 2 ? 220 : 150, ease: 'Quad.easeOut', onComplete: () => laser.destroy() })
    this.time.delayedCall(55, onImpact)
  }

  private drawBurstShots(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, rounds: number, onImpact: () => void): void {
    const burst = this.add.graphics().setDepth(131)
    const baseAngle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    for (let index = 0; index < rounds; index += 1) {
      const spread = (index - (rounds - 1) / 2) * 0.035
      const angle = baseAngle + spread
      const muzzleX = x1 + Math.cos(angle) * 18 * scale
      const muzzleY = y1 + Math.sin(angle) * 18 * scale
      burst.lineStyle(3 * scale, color, 0.82)
      burst.lineBetween(muzzleX, muzzleY, x2, y2)
      burst.fillStyle(0xffffff, 0.95)
      burst.fillCircle(muzzleX, muzzleY, 3 * scale)
    }
    this.tweens.add({ targets: burst, alpha: 0, duration: 120, ease: 'Quad.easeOut', onComplete: () => burst.destroy() })
    this.time.delayedCall(45, onImpact)
  }

  private drawLavaPour(x1: number, y1: number, x2: number, y2: number, color: number, radius: number, scale: number, onImpact: () => void): void {
    const stream = this.add.graphics().setDepth(129)
    stream.lineStyle(8 * scale, 0xff9d25, 0.62)
    stream.lineBetween(x1, y1, x2, y2)
    stream.lineStyle(3 * scale, 0xfff0a6, 0.95)
    stream.lineBetween(x1, y1, x2, y2)
    stream.fillStyle(0xf97316, 0.72)
    stream.fillCircle(x2, y2, radius * 0.55)
    stream.lineStyle(2, 0xfff7ad, 0.86)
    stream.strokeCircle(x2, y2, radius * 0.7)
    this.tweens.add({ targets: stream, alpha: 0, duration: 230, ease: 'Quad.easeOut', onComplete: () => stream.destroy() })
    this.time.delayedCall(95, onImpact)
  }

  private drawDrillThrow(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, onImpact: () => void): void {
    const drill = this.add.container(x1, y1).setDepth(130)
    const shaft = this.add.rectangle(0, 0, 34 * scale, 12 * scale, 0x334155, 1).setStrokeStyle(2, color, 0.9)
    const cone = this.add.triangle(24 * scale, 0, 0, -13 * scale, 30 * scale, 0, 0, 13 * scale, color, 1)
    const spiral = this.add.graphics()
    spiral.lineStyle(2, 0xffffff, 0.85)
    for (let index = -1; index <= 1; index += 1) spiral.lineBetween(index * 10 * scale, -5 * scale, (index + 1) * 10 * scale, 5 * scale)
    drill.add([shaft, cone, spiral])
    drill.setRotation(Phaser.Math.Angle.Between(x1, y1, x2, y2))
    this.tweens.add({
      targets: drill,
      x: x2,
      y: y2,
      angle: '+=1080',
      duration: 230,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.drawShockwave(x2, y2, 46 * scale, color)
        onImpact()
        drill.destroy()
      }
    })
  }

  private drawThrownPayload(unit: UnitRuntime, target: MonsterRuntime, color: number, scale: number, radius: number, onImpact: () => void): void {
    const payload = this.add.container(unit.x, unit.y).setDepth(129)
    const style = unit.def.attackStyle
    if (style === 'debt_photo') {
      const photo = this.add.image(0, 0, 'debt-photo').setDisplaySize(42 * scale, 30 * scale)
      payload.add(photo)
    } else {
      const graphic = this.add.graphics()
      if (style === 'coin_throw' || style === 'coin_bomb') {
        graphic.fillStyle(0xfacc15, 1)
        graphic.fillCircle(0, 0, 9 * scale)
        graphic.lineStyle(2, 0xfffbeb, 0.88)
        graphic.strokeCircle(0, 0, 6 * scale)
      } else if (style === 'syringe_throw') {
        graphic.fillStyle(0xe2e8f0, 0.95)
        graphic.fillRoundedRect(-15 * scale, -3 * scale, 30 * scale, 6 * scale, 2)
        graphic.fillStyle(0x22c55e, 0.94)
        graphic.fillRect(1 * scale, -3 * scale, 10 * scale, 6 * scale)
        graphic.lineStyle(2, color, 0.95)
        graphic.lineBetween(15 * scale, 0, 22 * scale, 0)
      } else if (style === 'bill_throw') {
        graphic.fillStyle(0x86efac, 0.96)
        graphic.fillRoundedRect(-14 * scale, -9 * scale, 28 * scale, 18 * scale, 3)
        graphic.lineStyle(1.5, 0x166534, 0.9)
        graphic.strokeRoundedRect(-14 * scale, -9 * scale, 28 * scale, 18 * scale, 3)
        graphic.fillStyle(0x166534, 0.7)
        graphic.fillCircle(0, 0, 4 * scale)
      } else if (style === 'dice_bomb') {
        graphic.fillStyle(0xf8fafc, 1)
        graphic.fillRoundedRect(-10 * scale, -10 * scale, 20 * scale, 20 * scale, 4)
        graphic.lineStyle(2, color, 0.9)
        graphic.strokeRoundedRect(-10 * scale, -10 * scale, 20 * scale, 20 * scale, 4)
        graphic.fillStyle(0x0f172a, 0.9)
        graphic.fillCircle(-4 * scale, -4 * scale, 2 * scale)
        graphic.fillCircle(4 * scale, 4 * scale, 2 * scale)
      } else if (style === 'gold_bar') {
        graphic.fillStyle(0xfacc15, 1)
        graphic.fillRoundedRect(-17 * scale, -8 * scale, 34 * scale, 16 * scale, 3)
        graphic.lineStyle(2, 0xffffff, 0.8)
        graphic.strokeRoundedRect(-17 * scale, -8 * scale, 34 * scale, 16 * scale, 3)
      } else if (style === 'tear_throw') {
        graphic.fillStyle(0x7dd3fc, 0.95)
        graphic.fillTriangle(0, -18 * scale, 10 * scale, 10 * scale, -10 * scale, 10 * scale)
        graphic.fillCircle(0, 7 * scale, 10 * scale)
      } else if (style === 'nut_throw') {
        graphic.fillStyle(0x92400e, 0.98)
        graphic.fillCircle(0, 0, 10 * scale)
        graphic.lineStyle(2, 0xfef3c7, 0.76)
        graphic.lineBetween(-7 * scale, 0, 7 * scale, 0)
      } else if (style === 'slingshot') {
        graphic.fillStyle(0x64748b, 1)
        graphic.fillCircle(0, 0, 7 * scale)
      } else {
        graphic.fillStyle(color, 0.98)
        graphic.fillCircle(0, 0, 8 * scale)
      }
      payload.add(graphic)
    }
    const endX = target.container.x
    const endY = target.container.y
    payload.setRotation(Phaser.Math.Angle.Between(unit.x, unit.y, endX, endY))
    this.tweens.add({
      targets: payload,
      x: endX,
      y: endY,
      angle: '+=540',
      duration: radius > 0 ? 220 : 160,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (radius > 0) {
          this.drawShockwave(endX, endY, radius * scale, color)
          this.spawnBurst(endX, endY, color, this.getParticleBudget(10), radius * 0.65 * scale)
        }
        onImpact()
        payload.destroy()
      }
    })
  }

  private drawGreatswordCrescent(x1: number, y1: number, x2: number, y2: number, onImpact: () => void): void {
    const crescent = this.add.graphics().setDepth(134)
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    crescent.lineStyle(16, 0xffe7a3, 0.5)
    crescent.arc(x2, y2, 58, angle - 1.35, angle + 1.1, false)
    crescent.lineStyle(7, 0xffffff, 0.9)
    crescent.arc(x2, y2, 48, angle - 1.25, angle + 0.98, false)
    crescent.lineStyle(3, 0xff3d71, 1)
    crescent.arc(x2, y2, 66, angle - 1.16, angle + 0.9, false)
    this.tweens.add({ targets: crescent, alpha: 0, scale: 1.2, duration: 230, ease: 'Cubic.easeOut', onComplete: () => crescent.destroy() })
    this.time.delayedCall(85, () => {
      this.drawShockwave(x2, y2, 62, 0xff3d71)
      this.cameras.main.shake(80, 0.001)
      onImpact()
    })
  }

  private launchMechBomb(unit: UnitRuntime, target: MonsterRuntime): void {
    const mech = this.add.container(unit.x, unit.y).setDepth(131)
    const hull = this.add.rectangle(0, 0, 30, 22, 0xf472b6, 0.98).setStrokeStyle(2, 0xffffff, 0.78)
    const core = this.add.circle(4, 0, 6, 0x67e8f9, 1)
    const wing = this.add.triangle(-17, 0, 0, -9, 18, 0, 0, 9, 0x8b5cf6, 0.96)
    mech.add([wing, hull, core])
    const endX = target.container.x
    const endY = target.container.y
    this.tweens.add({
      targets: mech,
      x: endX,
      y: endY,
      angle: '+=720',
      duration: 360,
      ease: 'Quad.easeIn',
      onComplete: () => {
        for (const monster of [...this.monsters]) {
          if (!monster.alive) continue
          const d = distance({ x: endX, y: endY }, { x: monster.container.x, y: monster.container.y })
          if (d <= 82) this.applyDamageToTarget(unit, monster, monster.id === target.id ? 3.4 : 1.8, monster.id === target.id)
        }
        this.drawShockwave(endX, endY, 82, 0xf472b6)
        this.spawnBurst(endX, endY, 0xf472b6, this.getParticleBudget(18), 66)
        this.cameras.main.shake(85, 0.001)
        mech.destroy()
      }
    })
  }

  private drawNuclearPulse(unit: UnitRuntime): void {
    const pulse = this.add.graphics().setDepth(140)
    const centerX = BOARD.outer.x + BOARD.outer.width / 2
    const centerY = BOARD.outer.y + BOARD.outer.height / 2
    pulse.fillStyle(0xfff7ad, 0.32)
    pulse.fillCircle(centerX, centerY, 28)
    pulse.lineStyle(10, 0xff7a00, 0.5)
    pulse.strokeCircle(centerX, centerY, 38)
    pulse.lineStyle(4, 0xffffff, 0.9)
    pulse.strokeCircle(centerX, centerY, 24)
    this.tweens.add({
      targets: pulse,
      scale: 13,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => pulse.destroy()
    })
    this.cameras.main.shake(150, 0.002)
    this.showBattleBanner(unit, 'NUCLEAR STRIKE', '#fff4b0')
  }

  private drawMoneyRain(unit: UnitRuntime): void {
    const rain = this.add.graphics().setDepth(141)
    const { outer } = BOARD
    rain.fillStyle(0x86efac, 0.88)
    for (let index = 0; index < this.getParticleBudget(24); index += 1) {
      const x = Phaser.Math.Between(outer.x, outer.x + outer.width)
      const y = Phaser.Math.Between(outer.y, outer.y + outer.height)
      rain.fillRect(x, y, 9, 5)
      rain.lineStyle(1, 0xffffff, 0.7)
      rain.strokeRect(x, y, 9, 5)
    }
    this.tweens.add({ targets: rain, y: 84, alpha: 0, duration: 760, ease: 'Quad.easeIn', onComplete: () => rain.destroy() })
    this.showBattleBanner(unit, 'MONEY RAIN', '#bbf7d0')
  }

  private showBattleBanner(unit: UnitRuntime, label: string, color: string): void {
    const banner = this.add.text(unit.x, unit.y - 42, label, {
      fontFamily: UI_FONT,
      fontSize: '13px',
      fontStyle: '900',
      color,
      stroke: '#020617',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(150)
    this.tweens.add({ targets: banner, y: banner.y - 24, alpha: 0, duration: 760, ease: 'Quad.easeOut', onComplete: () => banner.destroy() })
  }

  private drawPunchImpact(x1: number, y1: number, x2: number, y2: number, color: number, scale: number): void {
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    const fist = this.add.graphics().setDepth(128)
    fist.lineStyle(5 * scale, 0xffffff, 0.75)
    fist.lineBetween(x2 - Math.cos(angle) * 26 * scale, y2 - Math.sin(angle) * 26 * scale, x2, y2)
    fist.lineStyle(3 * scale, color, 0.95)
    fist.strokeCircle(x2, y2, 15 * scale)
    fist.lineBetween(x2 - 12 * scale, y2, x2 + 12 * scale, y2)
    this.tweens.add({
      targets: fist,
      scale: 1.18,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => fist.destroy()
    })
    this.spawnBurst(x2, y2, color, Math.round(5 * scale), 22 * scale)
  }

  private drawSpearThrust(x1: number, y1: number, x2: number, y2: number, color: number, scale: number): void {
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    const spear = this.add.container(x1, y1).setDepth(128)
    const length = distance({ x: x1, y: y1 }, { x: x2, y: y2 })
    const shaft = this.add.rectangle(length / 2, 0, length, 3 * scale, 0xffffff, 0.82)
    const glow = this.add.rectangle(length / 2, 4 * scale, length * 0.92, 2 * scale, color, 0.72)
    const tip = this.add.triangle(length, 0, 0, -7 * scale, 16 * scale, 0, 0, 7 * scale, color, 1)
    spear.add([shaft, glow, tip])
    spear.setRotation(angle)
    this.tweens.add({
      targets: spear,
      alpha: 0,
      x: x1 + Math.cos(angle) * 18 * scale,
      y: y1 + Math.sin(angle) * 18 * scale,
      duration: 135,
      ease: 'Quad.easeOut',
      onComplete: () => spear.destroy()
    })
    this.spawnBurst(x2, y2, color, Math.round(4 * scale), 18 * scale)
  }

  private drawArrowShot(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, heavy: boolean, onImpact: () => void): void {
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    const arrow = this.add.container(x1, y1).setDepth(126)
    const length = heavy ? 30 * scale : 24 * scale
    const shaft = this.add.rectangle(0, 0, length, heavy ? 4 * scale : 3 * scale, heavy ? 0xe2e8f0 : 0xfef3c7, 0.96)
    const tip = this.add.triangle(length / 2 + 7 * scale, 0, 0, -6 * scale, 13 * scale, 0, 0, 6 * scale, color, 1)
    const feather = this.add.triangle(-length / 2 - 3 * scale, 0, 0, -5 * scale, -9 * scale, 0, 0, 5 * scale, 0xffffff, 0.75)
    arrow.add([shaft, tip, feather])
    arrow.setRotation(angle)
    this.tweens.add({
      targets: arrow,
      x: x2,
      y: y2,
      alpha: 0.35,
      duration: heavy ? 135 : 165,
      ease: 'Quad.easeOut',
      onComplete: () => {
        onImpact()
        arrow.destroy()
      }
    })
  }

  private drawShurikenShot(x1: number, y1: number, x2: number, y2: number, color: number, scale: number, onImpact: () => void): void {
    const star = this.add.graphics().setDepth(127)
    const size = 11 * scale
    star.fillStyle(0xffffff, 0.92)
    star.fillTriangle(0, -size, size * 0.35, -size * 0.2, -size * 0.35, -size * 0.2)
    star.fillTriangle(size, 0, size * 0.2, size * 0.35, size * 0.2, -size * 0.35)
    star.fillTriangle(0, size, size * 0.35, size * 0.2, -size * 0.35, size * 0.2)
    star.fillTriangle(-size, 0, -size * 0.2, size * 0.35, -size * 0.2, -size * 0.35)
    star.fillStyle(color, 0.95)
    star.fillCircle(0, 0, 4 * scale)
    star.setPosition(x1, y1)
    this.tweens.add({
      targets: star,
      x: x2,
      y: y2,
      angle: '+=540',
      alpha: 0.35,
      duration: 145,
      ease: 'Quad.easeOut',
      onComplete: () => {
        onImpact()
        star.destroy()
      }
    })
  }

  private drawChainLightningTargets(x: number, y: number, targets: MonsterRuntime[], color: number, scale: number, onImpact: () => void = () => undefined): void {
    if (targets.length === 0) return
    const bolt = this.add.graphics().setDepth(132)
    let fromX = x
    let fromY = y
    for (const target of targets) {
      const toX = target.container.x
      const toY = target.container.y
      const points = this.createLightningPoints(fromX, fromY, toX, toY, 5, 14 * scale)
      bolt.lineStyle(5 * scale, 0xffffff, 0.72)
      this.strokePointPath(bolt, points)
      bolt.lineStyle(2 * scale, color, 1)
      this.strokePointPath(bolt, points)
      bolt.strokeCircle(toX, toY, 13 * scale)
      fromX = toX
      fromY = toY
    }
    this.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 170,
      ease: 'Quad.easeOut',
      onComplete: () => bolt.destroy()
    })
    this.time.delayedCall(70, onImpact)
  }

  private drawFireballShot(x1: number, y1: number, x2: number, y2: number, color: number, radius: number, scale: number, onImpact: () => void): void {
    this.drawAreaTargetMarker(x2, y2, radius * scale, color, 190)
    const fireball = this.add.container(x1, y1).setDepth(127)
    const flame = this.add.circle(0, 0, 9 * scale, color, 0.96)
      .setStrokeStyle(2, 0xfff7ad, 0.8)
    const tail = this.add.rectangle(-13 * scale, 0, 18 * scale, 4 * scale, 0xfff7ad, 0.52)
    fireball.add([tail, flame])
    fireball.setRotation(Phaser.Math.Angle.Between(x1, y1, x2, y2))
    this.tweens.add({
      targets: fireball,
      x: x2,
      y: y2,
      scale: 1.2,
      duration: 190,
      ease: 'Quad.easeIn',
      onComplete: () => {
        fireball.destroy()
        onImpact()
        this.drawShockwave(x2, y2, radius * scale, color)
        this.spawnBurst(x2, y2, color, Math.round(10 * scale), radius * 0.72 * scale)
      }
    })
  }

  private drawBombShot(x1: number, y1: number, x2: number, y2: number, color: number, radius: number, scale: number, onImpact: () => void): void {
    this.drawAreaTargetMarker(x2, y2, radius * scale, color, 240)
    const bomb = this.add.container(x1, y1).setDepth(127)
    const shell = this.add.circle(0, 0, 8 * scale, 0x111827, 0.96)
      .setStrokeStyle(2, color, 0.95)
    const fuse = this.add.rectangle(5 * scale, -8 * scale, 8 * scale, 2 * scale, 0xfef3c7, 0.9)
      .setAngle(-35)
    bomb.add([shell, fuse])
    const midY = Math.min(y1, y2) - 45 * scale
    const totalDistance = Math.max(1, distance({ x: x1, y: y1 }, { x: x2, y: y2 }))
    this.tweens.add({
      targets: bomb,
      x: x2,
      y: y2,
      angle: '+=360',
      duration: 240,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const remaining = distance({ x: bomb.x, y: bomb.y }, { x: x2, y: y2 })
        const progress = Phaser.Math.Clamp(1 - remaining / totalDistance, 0, 1)
        bomb.y = Phaser.Math.Interpolation.QuadraticBezier(progress, y1, midY, y2)
      },
      onComplete: () => {
        bomb.destroy()
        onImpact()
        this.drawShockwave(x2, y2, radius * scale, color)
        this.cameras.main.shake(70, 0.001)
      }
    })
  }

  private drawMineEffect(x: number, y: number, color: number, radius: number, scale: number, onImpact: () => void): void {
    this.drawAreaTargetMarker(x, y, radius * scale, color, 210)
    const mine = this.add.graphics().setDepth(127)
    mine.fillStyle(0x020617, 0.88)
    mine.fillCircle(0, 0, 12 * scale)
    mine.lineStyle(2 * scale, color, 0.9)
    mine.strokeCircle(0, 0, 16 * scale)
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8
      mine.lineBetween(Math.cos(angle) * 10 * scale, Math.sin(angle) * 10 * scale, Math.cos(angle) * 22 * scale, Math.sin(angle) * 22 * scale)
    }
    mine.setPosition(x, y)
    this.tweens.add({
      targets: mine,
      scale: 1.28,
      alpha: 0,
      duration: 210,
      ease: 'Back.easeOut',
      onComplete: () => {
        mine.destroy()
        onImpact()
        this.drawShockwave(x, y, radius * scale, color)
      }
    })
  }

  private createLightningPoints(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    segments: number,
    jitter: number
  ): Array<{ x: number; y: number }> {
    const points = [{ x: startX, y: startY }]
    const angle = Phaser.Math.Angle.Between(startX, startY, endX, endY)
    const normalX = Math.cos(angle + Math.PI / 2)
    const normalY = Math.sin(angle + Math.PI / 2)
    for (let index = 1; index < segments; index += 1) {
      const t = index / segments
      const offset = Phaser.Math.FloatBetween(-jitter, jitter)
      points.push({
        x: Phaser.Math.Linear(startX, endX, t) + normalX * offset,
        y: Phaser.Math.Linear(startY, endY, t) + normalY * offset
      })
    }
    points.push({ x: endX, y: endY })
    return points
  }

  private strokePointPath(graphics: Phaser.GameObjects.Graphics, points: Array<{ x: number; y: number }>): void {
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineBetween(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y)
    }
  }

  private drawAreaTargetMarker(x: number, y: number, radius: number, color: number, duration: number): void {
    const marker = this.add.graphics().setDepth(124)
    marker.fillStyle(color, 0.1)
    marker.fillCircle(0, 0, radius)
    marker.lineStyle(2, 0xffffff, 0.52)
    marker.strokeCircle(0, 0, radius)
    marker.lineStyle(2, color, 0.9)
    marker.strokeCircle(0, 0, radius * 0.74)
    marker.lineBetween(-radius, 0, radius, 0)
    marker.lineBetween(0, -radius, 0, radius)
    marker.setPosition(x, y)
    marker.setScale(0.7)
    this.tweens.add({
      targets: marker,
      scale: 1,
      alpha: 0.25,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => marker.destroy()
    })
  }

  private drawShockwave(x: number, y: number, radius: number, color: number): void {
    const wave = this.add.graphics().setDepth(116)
    wave.fillStyle(color, 0.16)
    wave.fillCircle(0, 0, radius)
    wave.lineStyle(4, 0xffffff, 0.86)
    wave.strokeCircle(0, 0, radius)
    wave.lineStyle(3, color, 0.95)
    wave.strokeCircle(0, 0, radius * 0.64)
    wave.lineBetween(-radius, 0, radius, 0)
    wave.lineBetween(0, -radius, 0, radius)
    wave.setPosition(x, y)
    wave.setScale(0.45)
    this.tweens.add({
      targets: wave,
      scale: 1.35,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.easeOut',
      onComplete: () => wave.destroy()
    })
    this.spawnBurst(x, y, color, 14, radius)
  }

  private drawCartoonStarShot(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const star = this.add.graphics().setDepth(106)
    star.fillStyle(0xffffff, 0.95)
    star.fillTriangle(0, -11, 5, -2, -5, -2)
    star.fillTriangle(0, 11, 5, 2, -5, 2)
    star.fillTriangle(-11, 0, -2, -5, -2, 5)
    star.fillTriangle(11, 0, 2, -5, 2, 5)
    star.fillStyle(color, 1)
    star.fillCircle(0, 0, 6)
    star.setPosition(x1, y1)
    this.tweens.add({
      targets: star,
      x: x2,
      y: y2,
      angle: '+=360',
      alpha: 0.35,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => star.destroy()
    })
  }

  private drawBulletShot(x1: number, y1: number, x2: number, y2: number, color: number, scale = 1, onImpact: () => void = () => undefined): void {
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    const bullet = this.add.container(x1, y1).setDepth(107)
    const trailA = this.add.rectangle(-22 * scale, -4 * scale, 20 * scale, 2 * scale, 0xffffff, 0.5)
    const trailB = this.add.rectangle(-16 * scale, 5 * scale, 18 * scale, 2 * scale, color, 0.75)
    const core = this.add.rectangle(0, 0, 18 * scale, 5 * scale, color, 1).setStrokeStyle(1, 0xffffff, 0.85)
    bullet.add([trailA, trailB, core])
    bullet.setRotation(angle)
    this.tweens.add({
      targets: core,
      scaleX: 1.35,
      duration: 130
    })
    this.tweens.add({
      targets: bullet,
      x: x2,
      y: y2,
      alpha: 0.3,
      duration: 95,
      ease: 'Quad.easeOut',
      onComplete: () => {
        onImpact()
        bullet.destroy()
      }
    })
  }

  private drawSlash(x: number, y: number, color: number, scale = 1): void {
    const slash = this.add.graphics().setDepth(120)
    slash.lineStyle(5 * scale, 0xffffff, 0.82)
    slash.arc(x, y, 28 * scale, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(325), false)
    slash.lineStyle(2 * scale, color, 1)
    slash.arc(x, y, 34 * scale, Phaser.Math.DegToRad(210), Phaser.Math.DegToRad(325), false)
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 130,
      onComplete: () => slash.destroy()
    })
  }

  private drawBurstRing(x: number, y: number, radius: number, color: number): void {
    const ring = this.add.graphics().setDepth(115)
    ring.lineStyle(3, color, 0.9)
    ring.strokeCircle(0, 0, radius)
    ring.setPosition(x, y)
    ring.setScale(0.25)
    this.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy()
    })
  }

  private spawnBurst(x: number, y: number, color: number, count: number, spread: number): void {
    const particleCount = this.getParticleBudget(count)
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const distance = Phaser.Math.FloatBetween(spread * 0.35, spread)
      const particle = this.add.circle(x, y, Phaser.Math.FloatBetween(2, 4), color, 0.9).setDepth(130)
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(180, 360),
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      })
    }
  }

  private showDamageNumber(target: MonsterRuntime, damage: number, color: number): void {
    if (damage <= 0) return
    const text = this.add.text(target.container.x, target.container.y - 22, `${Math.ceil(damage)}`, {
      fontFamily: UI_FONT,
      fontSize: target.kind === 'boss' ? '16px' : '13px',
      color: this.colorNumberToHex(color),
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 3
    }).setOrigin(0.5)
      .setDepth(800)

    this.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy()
    })
  }

  private flashMonsterHit(target: MonsterRuntime): void {
    target.body.setFillStyle(0xffffff, 1)
    this.time.delayedCall(70, () => {
      if (target.alive) {
        target.body.setFillStyle(target.baseColor, 1)
      }
    })
  }

  private updateAttackCursor(): void {
    this.attackCursor.clear()
    if (!this.attackMode || this.isPaused || this.isGameOver) {
      this.attackCursor.setVisible(false)
      return
    }
    const pointer = this.getWorldPointer(this.input.activePointer)
    const color = this.getMonsterAt(pointer.x, pointer.y) ? 0xef4444 : 0x22c55e
    this.attackCursor.setVisible(true)
    this.attackCursor.lineStyle(2, color, 1)
    this.attackCursor.strokeCircle(pointer.x, pointer.y, 12)
    this.attackCursor.lineBetween(pointer.x - 16, pointer.y, pointer.x + 16, pointer.y)
    this.attackCursor.lineBetween(pointer.x, pointer.y - 16, pointer.x, pointer.y + 16)
  }

  private getFormationPositions(x: number, y: number, count: number): Array<{ x: number; y: number }> {
    if (count <= 1) return [{ x, y }]
    const positions: Array<{ x: number; y: number }> = []
    const spacing = 54
    const columns = Math.ceil(Math.sqrt(count))
    for (let i = 0; i < count; i += 1) {
      const col = i % columns
      const row = Math.floor(i / columns)
      const offsetX = (col - (columns - 1) / 2) * spacing
      const offsetY = (row - Math.floor((count - 1) / columns) / 2) * spacing
      positions.push({ x: x + offsetX, y: y + offsetY })
    }
    return positions
  }

  private getNextSummonPoint(reserved: Array<{ x: number; y: number }> = []): { x: number; y: number } {
    const { inner } = BOARD
    const centerX = inner.x + inner.width / 2
    const centerY = inner.y + inner.height / 2
    const spacing = 54
    const minDistance = 48
    const maxCells = 420
    let fallback: { x: number; y: number } | null = null

    for (const offset of this.getSquareSpiralOffsets(maxCells)) {
      const x = centerX + offset.x * spacing
      const y = centerY + offset.y * spacing
      if (x < inner.x + 26 || x > inner.x + inner.width - 26 || y < inner.y + 26 || y > inner.y + inner.height - 26) {
        continue
      }

      const point = { x, y }
      fallback ??= point
      const occupied = this.units.some((unit) => distance(unit, point) < minDistance) ||
        reserved.some((unit) => distance(unit, point) < minDistance)
      if (!occupied) return point
    }

    return fallback ?? { x: centerX, y: centerY }
  }

  private getSquareSpiralOffsets(maxCells: number): Array<{ x: number; y: number }> {
    const offsets: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }]
    let x = 0
    let y = 0
    let stepSize = 1

    while (offsets.length < maxCells) {
      for (let step = 0; step < stepSize && offsets.length < maxCells; step += 1) {
        x += 1
        offsets.push({ x, y })
      }
      for (let step = 0; step < stepSize && offsets.length < maxCells; step += 1) {
        y += 1
        offsets.push({ x, y })
      }
      stepSize += 1
      for (let step = 0; step < stepSize && offsets.length < maxCells; step += 1) {
        x -= 1
        offsets.push({ x, y })
      }
      for (let step = 0; step < stepSize && offsets.length < maxCells; step += 1) {
        y -= 1
        offsets.push({ x, y })
      }
      stepSize += 1
    }

    return offsets
  }

  private clampToInner(x: number, y: number): { x: number; y: number } {
    const { inner } = BOARD
    return {
      x: clamp(x, inner.x + 18, inner.x + inner.width - 18),
      y: clamp(y, inner.y + 18, inner.y + inner.height - 18)
    }
  }

  private getClosestInnerPointTo(x: number, y: number): { x: number; y: number } {
    return this.clampToInner(x, y)
  }

  private getMobWeight(): number {
    return this.monsters.reduce((sum, monster) => sum + monster.weight, 0)
  }

  private recalculateSynergy(): void {
    const state = this.createEmptySynergy()
    for (const unit of this.units) {
      state.countByGenre[unit.def.genre] += 1
    }

    for (const genre of GENRES) {
      const count = state.countByGenre[genre]
      const level = count >= 15 ? 3 : count >= 10 ? 2 : count >= 5 ? 1 : 0
      state.levelByGenre[genre] = level
    }

    state.heroAttackBonus = this.valueByLevel(state.levelByGenre.mha, SYNERGY_EFFECT_VALUES.mha)
    state.eliteBossDamageBonus = this.valueByLevel(state.levelByGenre.onepunch, SYNERGY_EFFECT_VALUES.onepunch)
    state.attackSpeedBonus = this.valueByLevel(state.levelByGenre.overwatch, SYNERGY_EFFECT_VALUES.overwatch)
    state.goldBonus = this.valueByLevel(state.levelByGenre.tooniverse, SYNERGY_EFFECT_VALUES.tooniverse)
    state.lotteryGoldBonus = this.units.filter((unit) => unit.def.attackStyle === 'lottery_support').length * 0.3
    this.synergy = state
  }

  private createEmptySynergy(): SynergyState {
    return {
      levelByGenre: { mha: 0, onepunch: 0, overwatch: 0, tooniverse: 0 },
      countByGenre: { mha: 0, onepunch: 0, overwatch: 0, tooniverse: 0 },
      heroAttackBonus: 0,
      eliteBossDamageBonus: 0,
      attackSpeedBonus: 0,
      goldBonus: 0,
      lotteryGoldBonus: 0
    }
  }

  private valueByLevel(level: SynergyLevel, values: [number, number, number, number]): number {
    return values[level]
  }

  private updateSynergyPanel(): void {
    for (const genre of GENRES) {
      const row = this.synergyRows[genre]
      const level = this.synergy.levelByGenre[genre]
      const count = this.synergy.countByGenre[genre]
      const activeThreshold = this.getActiveSynergyThreshold(level)
      const nextThreshold = this.getNextSynergyThreshold(level)
      const label = activeThreshold ? `${GENRE_SHORT_LABEL[genre]}(${activeThreshold})` : GENRE_SHORT_LABEL[genre]

      row.bg.setFillStyle(level > 0 ? SYNERGY_TIER_COLOR[level] : 0x0f172a, level > 0 ? 0.16 : 0.9)
      row.bg.setStrokeStyle(level > 0 ? 2 : 1, SYNERGY_TIER_COLOR[level], level > 0 ? 1 : 0.85)
      row.genreDot.setFillStyle(GENRE_COLOR[genre], 1)
      row.tierBar.setFillStyle(SYNERGY_TIER_COLOR[level], level > 0 ? 1 : 0.5)
      row.label.setText(label)
      row.label.setColor(SYNERGY_TIER_TEXT_COLOR[level])
      row.count.setText(level > 0 ? `${count}명` : `${count}/${nextThreshold}`)
      row.count.setColor(level > 0 ? '#ffffff' : '#cbd5e1')
    }
  }

  private getActiveSynergyThreshold(level: SynergyLevel): number | null {
    if (level === 1) return SYNERGY_THRESHOLDS[0]
    if (level === 2) return SYNERGY_THRESHOLDS[1]
    if (level === 3) return SYNERGY_THRESHOLDS[2]
    return null
  }

  private getNextSynergyThreshold(level: SynergyLevel): number {
    if (level === 0) return SYNERGY_THRESHOLDS[0]
    if (level === 1) return SYNERGY_THRESHOLDS[1]
    return SYNERGY_THRESHOLDS[2]
  }

  private showSynergyTooltip(genre: Genre, x: number, y: number): void {
    this.synergyTooltipText.setText(this.getSynergyTooltipText(genre))
    this.synergyTooltip.setPosition(x, clamp(y, 70, 560))
    this.synergyTooltip.setVisible(true)
  }

  private getSynergyTooltipText(genre: Genre): string {
    const level = this.synergy.levelByGenre[genre]
    const count = this.synergy.countByGenre[genre]
    return [
      `${GENRE_SHORT_LABEL[genre]}`,
      `현재: ${count}명 · ${SYNERGY_TIER_NAME[level]}`,
      `1단계(5): ${this.formatSynergyEffect(genre, SYNERGY_EFFECT_VALUES[genre][1])}`,
      `2단계(10): ${this.formatSynergyEffect(genre, SYNERGY_EFFECT_VALUES[genre][2])}`,
      `3단계(15): ${this.formatSynergyEffect(genre, SYNERGY_EFFECT_VALUES[genre][3])}`
    ].join('\n')
  }

  private formatSynergyEffect(genre: Genre, value: number): string {
    const percent = Math.round(value * 100)
    if (genre === 'mha') return `모든 유닛 공격력 +${percent}%`
    if (genre === 'onepunch') return `모든 유닛 엘리트/보스 공격력 +${percent}%`
    if (genre === 'overwatch') return `모든 유닛 공격 속도 +${percent}%`
    return `모든 처치 골드 +${percent}%`
  }

  private updateUi(): void {
    const bossText = this.bossTimeRemainingMs !== null
      ? `보스 제한시간: ${(this.bossTimeRemainingMs / 1000).toFixed(1)}초`
      : ''
    this.bossText.setText(bossText)

    this.topText.setText(this.isTestMode
      ? [
          '서버장 테스트 맵',
          `아군 ${this.units.length}마리`,
          `적 ${this.monsters.length}마리`,
          this.isPaused ? '일시정지' : ''
        ].filter(Boolean).join('   ')
      : [
          `웨이브 ${this.wave}/${GAME_RULES.maxWave}`,
          `라이프 ${this.lives}`,
          `골드 ${formatNumber(this.gold)}`,
          `몬스터 ${this.getMobWeight()}/${GAME_RULES.mobDangerThreshold}+`,
          this.isPaused ? '일시정지' : ''
        ].filter(Boolean).join('   '))

    const nextWaveText = this.isTestMode
      ? '수동 테스트: 버튼으로 아군/적을 소환'
      : this.waveState === 'waiting'
      ? `다음 웨이브: ${(this.waveGapRemainingMs / 1000).toFixed(1)}초`
      : this.waveState === 'spawning'
        ? `소환 남음: ${this.spawnRemaining}`
        : '웨이브 종료'

    this.statusText.setText([
      `소환 Lv.${this.summonLevel} / ${SUMMON_RATES.length - 1}`,
      nextWaveText,
      `선택 유닛: ${this.selectedUnitIds.size}마리`,
      `처치: 일반 ${this.killsNormal} / 엘리트 ${this.killsElite} / 보스 ${this.bossKills}`
    ].join('\n'))

    this.summonButton.setLabel(`랜덤 소환(s) (${this.summonCost}G)`)
    const nextSummonCost = this.summonLevel < SUMMON_RATES.length - 1 ? SUMMON_RATES[this.summonLevel + 1].cost : null
    this.summonUpgradeButton.setLabel(nextSummonCost ? `소환 확률 강화 Lv.${this.summonLevel + 1} (${nextSummonCost}G)` : '소환 확률 MAX')
    this.pauseButton.setLabel(this.isPaused ? '재개하기 (P/Space)' : '일시정지 (P/Space)')
    this.mergeButton.setLabel(this.canMergeSelected() ? '선택 합성 가능' : '선택 합성')
    const sellValue = this.getSelectedUnits().reduce((sum, unit) => sum + this.getSellValue(unit), 0)
    this.sellButton.setLabel(sellValue > 0 ? `판매 +${sellValue}G` : '선택 판매')

    for (const genre of GENRES) {
      const level = this.genreUpgradeLevel[genre]
      const cost = GENRE_UPGRADE_BASE_COST + level * GENRE_UPGRADE_COST_INCREMENT
      const label = `${GENRE_BUTTON_LABEL[genre]}\nLv.${level} · ${cost}G`
      this.genreButtons[genre].setLabel(label)
      this.genreButtonSwatches[genre].setFillStyle(GENRE_COLOR[genre], 1)
    }

    this.updateSynergyPanel()
    this.updateUnitInfoPanel()
    this.pauseOverlay.setVisible(this.isPaused && !this.isEscapeMenuOpen())
  }

  private updateUnitInfoPanel(): void {
    const selected = this.getSelectedUnits()
    if (selected.length !== 1) {
      this.unitInfoPanel.setVisible(false)
      return
    }

    const unit = selected[0]
    const attackInfo = this.getUnitAttackInfoText(unit)
    this.unitInfoText.setText([
      `시너지: ${GENRE_LABEL[unit.def.genre]}`,
      `이름: ${unit.def.name}`,
      `등급: ${GRADE_LABEL[unit.def.grade]}`,
      attackInfo.attackLine,
      attackInfo.rangeLine,
      attackInfo.speedLine,
      attackInfo.bossAttackLine
    ].filter(Boolean).join('\n'))
    this.unitInfoPanel.setVisible(true)
  }

  private getUnitAttackInfoText(unit: UnitRuntime): { attackLine: string; rangeLine: string; speedLine: string; bossAttackLine: string } {
    const baseAttack = this.calculateDamagePreview(unit, 'normal', false)
    const currentAttack = this.calculateDamagePreview(unit, 'normal', true)
    const attackGain = currentAttack - baseAttack
    const baseAttackSpeed = 1000 / this.getBaseAttackInterval(unit)
    const currentAttackSpeed = 1000 / this.getAttackInterval(unit)
    const speedGain = currentAttackSpeed - baseAttackSpeed

    const bossBaseAttack = this.calculateDamagePreview(unit, 'boss', false)
    const bossCurrentAttack = this.calculateDamagePreview(unit, 'boss', true)
    const shouldShowBossAttack = Math.abs(bossCurrentAttack - currentAttack) >= 0.05

    return {
      attackLine: `공격력: ${this.formatStat(currentAttack)} (+${this.formatStat(attackGain)})`,
      rangeLine: `공격사거리: ${this.formatStat(this.getAttackRange(unit))}`,
      speedLine: `공격속도: ${currentAttackSpeed.toFixed(2)}회/초 (+${Math.max(0, speedGain).toFixed(2)})`,
      bossAttackLine: shouldShowBossAttack
        ? `엘리트/보스 공격력: ${this.formatStat(bossCurrentAttack)} (+${this.formatStat(bossCurrentAttack - bossBaseAttack)})`
        : ''
    }
  }

  private calculateDamagePreview(unit: UnitRuntime, targetKind: MonsterKind, includeBonuses: boolean): number {
    const stats = GRADE_STATS[unit.def.grade]
    const profile = this.getAttackProfile(unit)
    let damage = stats.attack * profile.damageMultiplier
    if (!includeBonuses) return damage

    damage *= 1 + this.genreUpgradeLevel[unit.def.genre] * GENRE_UPGRADE_ATTACK_BONUS
    damage *= 1 + this.synergy.heroAttackBonus
    if (targetKind === 'elite' || targetKind === 'boss') damage *= 1 + this.synergy.eliteBossDamageBonus
    return damage
  }

  private getBaseAttackInterval(unit: UnitRuntime): number {
    const stats = GRADE_STATS[unit.def.grade]
    return stats.attackIntervalMs * this.getAttackProfile(unit).intervalMultiplier
  }

  private formatStat(value: number): string {
    return value >= 100 ? value.toFixed(0) : value.toFixed(1)
  }

  private canMergeSelected(): boolean {
    return this.getMergeableSelectedGroup() !== null
  }

  private getMergeableSelectedGroup(): { def: UnitDefinition; units: UnitRuntime[] } | null {
    const groups = new Map<string, { def: UnitDefinition; units: UnitRuntime[] }>()
    for (const unit of this.getSelectedUnits()) {
      if (unit.def.grade === 'myth') continue
      const group = groups.get(unit.def.id) ?? { def: unit.def, units: [] }
      group.units.push(unit)
      groups.set(unit.def.id, group)
    }
    return [...groups.values()].find((group) => group.units.length >= 3) ?? null
  }

  private togglePause(): void {
    if (this.isGameOver) return
    if (this.isEscapeMenuOpen()) return
    this.isPaused = !this.isPaused
    if (this.isPaused) {
      this.attackMode = false
      this.game.canvas.style.cursor = 'default'
    }
  }

  private checkVictory(): void {
    if (this.isCleared || this.isGameOver) return
    const bossAlive = this.currentBossId !== null && this.monsters.some((monster) => monster.id === this.currentBossId)
    if (this.wave >= GAME_RULES.maxWave && this.spawnRemaining <= 0 && !bossAlive) {
      this.finishGame(true, '최종 보스를 처치하고 모든 웨이브를 견뎠습니다!')
    }
  }

  private finishGame(cleared: boolean, reason: string): void {
    if (this.isGameOver) return
    this.isGameOver = true
    this.isCleared = cleared
    this.attackMode = false
    this.game.canvas.style.cursor = 'default'

    const score = this.calculateScore(cleared)
    const topGenres = this.getTopDamageGenres()
    const entry: RankingEntry = {
      nickname: this.nickname,
      score,
      wave: this.wave,
      cleared,
      topGenres,
      createdAt: new Date().toISOString()
    }
    void addRanking(entry)
    this.showResultOverlay(score, topGenres, reason)
  }

  private calculateScore(cleared: boolean): number {
    const legends = this.units.filter((unit) => unit.def.grade === 'legend').length
    const myths = this.units.filter((unit) => unit.def.grade === 'myth').length
    return Math.max(0,
      this.wave * 1000 +
      this.killsNormal * 10 +
      this.killsElite * 100 +
      this.bossKills * 1000 +
      legends * 1000 +
      myths * 3000 +
      this.lives * 300 +
      (cleared ? 20_000 : 0)
    )
  }

  private getTopDamageGenres(): Genre[] {
    return GENRES
      .map((genre) => ({ genre, damage: this.damageLog[genre] }))
      .sort((a, b) => b.damage - a.damage)
      .filter((item) => item.damage > 0)
      .slice(0, 3)
      .map((item) => item.genre)
  }

  private showResultOverlay(score: number, topGenres: Genre[], reason: string): void {
    const overlay = this.add.container(450, 360).setDepth(2000)
    const bg = this.add.rectangle(0, 0, 620, 420, 0x020617, 0.94).setStrokeStyle(3, this.isCleared ? 0xfacc15 : 0xef4444)
    const title = this.add.text(0, -165, this.isCleared ? '클리어!' : '게임 종료', {
      fontFamily: UI_FONT,
      fontSize: '42px',
      color: this.isCleared ? '#fde68a' : '#fecaca',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    const detail = this.add.text(0, -92, `${reason}\n점수: ${formatNumber(score)}점\n도달 웨이브: ${this.wave}/${GAME_RULES.maxWave}\nTOP 딜 시너지: ${topGenres.map((genre) => GENRE_LABEL[genre]).join(', ') || '-'}`, {
      fontFamily: UI_FONT,
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5)
    const buttonBg = this.add.rectangle(0, 120, 240, 48, 0x263142, 1).setStrokeStyle(2, 0x5eead4)
    const buttonText = this.add.text(0, 120, '메인화면으로', {
      fontFamily: UI_FONT,
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    buttonBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('MenuScene'))
    buttonText.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('MenuScene'))
    overlay.add([bg, title, detail, buttonBg, buttonText])
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    allowWhilePaused = false,
    repeatWhileHeld = false,
    tone: UiButtonTone = 'secondary',
    textLayout: ButtonTextLayout | null = null
  ): ButtonHandle {
    const palette = UI_BUTTON_COLORS[tone]
    const rect = this.add.rectangle(x, y, width, height, 0xffffff, 0.001).setOrigin(0, 0)
    rect.setInteractive({ useHandCursor: true })
    const visual = this.add.graphics()
    const text = this.add.text(x + (textLayout?.x ?? width / 2), y + (textLayout?.y ?? height / 2), label, {
      fontFamily: UI_FONT,
      fontSize: textLayout?.fontSize ?? (width < 160 ? '12px' : '16px'),
      color: palette.text,
      fontStyle: '800',
      align: 'center',
      lineSpacing: textLayout?.lineSpacing ?? 0
    }).setOrigin(textLayout?.originX ?? 0.5, textLayout?.originY ?? 0.5)

    const draw = (state: 'normal' | 'hover' | 'pressed' = 'normal') => {
      const isHover = state === 'hover'
      const isPressed = state === 'pressed'
      const offsetY = isPressed ? 2 : 0
      visual.clear()
      visual.fillStyle(0x06172e, 0.34)
      visual.fillRoundedRect(x, y + 4, width, height, 12)
      visual.fillStyle(isHover ? palette.hover : palette.fill, isPressed ? 0.92 : 1)
      visual.fillRoundedRect(x, y + offsetY, width, height, 12)
      visual.lineStyle(2, palette.stroke, isHover ? 1 : 0.82)
      visual.strokeRoundedRect(x + 1, y + offsetY + 1, width - 2, height - 2, 11)
      visual.lineStyle(1, 0xffffff, isHover ? 0.4 : 0.24)
      visual.lineBetween(x + 12, y + offsetY + 5, x + width - 12, y + offsetY + 5)
      text.setPosition(x + (textLayout?.x ?? width / 2), y + (textLayout?.y ?? height / 2) + offsetY)
    }
    draw()

    let repeatDelay: Phaser.Time.TimerEvent | null = null
    let repeatEvent: Phaser.Time.TimerEvent | null = null

    const stopRepeat = () => {
      repeatDelay?.remove(false)
      repeatEvent?.remove(false)
      repeatDelay = null
      repeatEvent = null
    }
    const stopRepeatIfReleased = (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) stopRepeat()
    }
    let hovering = false
    const restoreButton = () => draw(hovering ? 'hover' : 'normal')
    const handlePointerUp = () => {
      stopRepeat()
      restoreButton()
    }

    const wrappedClick = () => {
      if (this.isPaused && !allowWhilePaused) return
      onClick()
    }

    const wrappedPointerDown = () => {
      wrappedClick()
      if (!repeatWhileHeld) return

      stopRepeat()
      repeatDelay = this.time.delayedCall(260, () => {
        repeatEvent = this.time.addEvent({
          delay: 115,
          loop: true,
          callback: wrappedClick
        })
      })
    }

    const onOver = () => {
      hovering = true
      draw('hover')
    }
    const onOut = () => {
      hovering = false
      draw('normal')
    }
    rect.on('pointerover', onOver)
    rect.on('pointerout', onOut)
    rect.on('pointerdown', () => {
      draw('pressed')
      wrappedPointerDown()
    })
    text.setInteractive({ useHandCursor: true })
      .on('pointerover', onOver)
      .on('pointerout', onOut)
      .on('pointerdown', () => {
        draw('pressed')
        wrappedPointerDown()
      })
    this.input.on('pointerup', handlePointerUp)
    this.input.on('pointermove', stopRepeatIfReleased)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopRepeat()
      this.input.off('pointerup', handlePointerUp)
      this.input.off('pointermove', stopRepeatIfReleased)
    })

    return {
      rect,
      visual,
      text,
      setLabel: (nextLabel: string) => text.setText(nextLabel)
    }
  }
}
