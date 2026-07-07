import Phaser from 'phaser'
import {
  BOARD,
  GAME_RULES,
  GENRE_COLOR,
  GENRE_LABEL,
  GENRE_UPGRADE_ATTACK_BONUS,
  GENRE_UPGRADE_COSTS,
  GENRES,
  GRADE_COLOR,
  GRADE_LABEL,
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
import type { DamageLog, Genre, Grade, RankingEntry, UnitDefinition } from '../game/types'
import { clamp, distance, formatNumber, gradeWeightObject, randomItem, weightedPick } from '../game/utils'

type MonsterKind = 'normal' | 'elite' | 'boss'
type WaveState = 'waiting' | 'spawning' | 'finished'

interface ButtonHandle {
  rect: Phaser.GameObjects.Rectangle
  text: Phaser.GameObjects.Text
  setLabel: (label: string) => void
}

interface UnitRuntime {
  id: number
  def: UnitDefinition
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Arc
  label: Phaser.GameObjects.Text
  ring: Phaser.GameObjects.Graphics
  x: number
  y: number
  targetX: number
  targetY: number
  lastAttackAt: number
  forcedTargetId: number | null
  selected: boolean
}

interface MonsterRuntime {
  id: number
  kind: MonsterKind
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Arc
  hpText: Phaser.GameObjects.Text
  hp: number
  maxHp: number
  speed: number
  pathIndex: number
  weight: number
  wave: number
  createdAt: number
  slowUntil: number
  alive: boolean
}

interface SynergyState {
  levelByGenre: Record<Genre, 0 | 1 | 2 | 3>
  countByGenre: Record<Genre, number>
  battleAttackBonus: number
  fantasyGoldBonus: number
  magicSlowChance: number
  mechaBossBonus: number
  sportsSpeedBonus: number
  mysteryCritChance: number
}

export class GameScene extends Phaser.Scene {
  private nickname = 'Player'
  private units: UnitRuntime[] = []
  private monsters: MonsterRuntime[] = []
  private selectedUnitIds = new Set<number>()
  private nextUnitId = 1
  private nextMonsterId = 1

  private gold = GAME_RULES.startGold
  private lives = GAME_RULES.startLives
  private wave = 0
  private waveState: WaveState = 'waiting'
  private waveGapRemainingMs = 900
  private spawnRemaining = 0
  private spawnCooldownMs = 0
  private summonLevel = 0
  private genreUpgradeLevel: Record<Genre, number> = {
    battle: 0,
    fantasy: 0,
    magic: 0,
    mecha: 0,
    sports: 0,
    mystery: 0
  }

  private killsNormal = 0
  private killsElite = 0
  private bossKills = 0
  private damageLog: DamageLog = {
    battle: 0,
    fantasy: 0,
    magic: 0,
    mecha: 0,
    sports: 0,
    mystery: 0
  }

  private isPaused = false
  private isGameOver = false
  private isCleared = false
  private attackMode = false
  private currentBossId: number | null = null
  private bossTimeRemainingMs: number | null = null

  private dragStart: Phaser.Math.Vector2 | null = null
  private dragBox: Phaser.GameObjects.Rectangle | null = null
  private lastClickAt = 0
  private lastClickedDefId: string | null = null

  private pathPoints: Phaser.Math.Vector2[] = []
  private synergy: SynergyState = this.createEmptySynergy()

  private topText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private synergyText!: Phaser.GameObjects.Text
  private mergeHintText!: Phaser.GameObjects.Text
  private bossText!: Phaser.GameObjects.Text
  private pauseOverlay!: Phaser.GameObjects.Container
  private attackCursor!: Phaser.GameObjects.Graphics
  private summonButton!: ButtonHandle
  private summonUpgradeButton!: ButtonHandle
  private mergeButton!: ButtonHandle
  private sellButton!: ButtonHandle
  private pauseButton!: ButtonHandle
  private genreButtons: Record<Genre, ButtonHandle> = {} as Record<Genre, ButtonHandle>

  constructor() {
    super('GameScene')
  }

  init(data: { nickname?: string }): void {
    this.nickname = data.nickname || getNickname() || 'Player'
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101217')
    this.input.mouse?.disableContextMenu()
    this.drawBoard()
    this.createUi()
    this.createInputHandlers()
    this.recalculateSynergy()
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return
    this.updateAttackCursor()

    if (this.isPaused) {
      this.updateUi()
      return
    }

    this.updateWave(delta)
    this.updateUnits(delta)
    this.updateMonsters(delta)
    this.updateCombat()
    this.updateBossTimer(delta)
    this.updateUi()
    this.checkVictory()
  }

  private drawBoard(): void {
    const { outer, inner, pathThickness } = BOARD
    const g = this.add.graphics()
    g.fillStyle(0x1f2937, 1)
    g.fillRect(outer.x, outer.y, outer.width, outer.height)
    g.lineStyle(3, 0x94a3b8, 1)
    g.strokeRect(outer.x, outer.y, outer.width, outer.height)

    g.fillStyle(0x111827, 1)
    g.fillRect(inner.x, inner.y, inner.width, inner.height)
    g.lineStyle(3, 0x22c55e, 0.9)
    g.strokeRect(inner.x, inner.y, inner.width, inner.height)

    this.add.text(inner.x + inner.width / 2, inner.y + inner.height / 2, '유닛 자유 배치판', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#233044'
    }).setOrigin(0.5)

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

    const guide = this.add.graphics()
    guide.lineStyle(2, 0x64748b, 0.35)
    guide.strokeRect(outer.x + pathThickness / 2, outer.y + pathThickness / 2, outer.width - pathThickness, outer.height - pathThickness)
  }

  private createUi(): void {
    this.topText = this.add.text(24, 16, '', {
      fontFamily: 'Arial',
      fontSize: '19px',
      color: '#ffffff',
      fontStyle: 'bold'
    })

    this.bossText = this.add.text(430, 16, '', {
      fontFamily: 'Arial',
      fontSize: '21px',
      color: '#fca5a5',
      fontStyle: 'bold'
    })

    const uiX = BOARD.uiX
    this.add.rectangle(uiX - 24, 0, 384, 720, 0x0f172a, 0.96).setOrigin(0, 0)
    this.add.text(uiX, 24, 'Anime Random Defense', {
      fontFamily: 'Arial',
      fontSize: '23px',
      color: '#ffffff',
      fontStyle: 'bold'
    })
    this.add.text(uiX, 54, `닉네임: ${this.nickname}`, {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#d9f99d'
    })

    this.statusText = this.add.text(uiX, 82, '', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#cbd5e1',
      lineSpacing: 4
    })

    this.summonButton = this.createButton(uiX, 154, 300, 38, '', () => this.summonUnit())
    this.summonUpgradeButton = this.createButton(uiX, 200, 300, 38, '', () => this.upgradeSummon())
    this.mergeButton = this.createButton(uiX, 246, 145, 38, '선택 합성', () => this.mergeSelectedUnits())
    this.sellButton = this.createButton(uiX + 155, 246, 145, 38, '선택 판매', () => this.sellSelectedUnits())
    this.pauseButton = this.createButton(uiX, 292, 300, 34, '', () => this.togglePause(), true)

    this.add.text(uiX, 342, '장르별 공격력 강화', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold'
    })

    GENRES.forEach((genre, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const x = uiX + col * 154
      const y = 372 + row * 46
      this.genreButtons[genre] = this.createButton(x, y, 145, 36, '', () => this.upgradeGenre(genre))
    })

    this.synergyText = this.add.text(uiX, 520, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#bfdbfe',
      lineSpacing: 4
    })

    this.mergeHintText = this.add.text(uiX, 628, '', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#fef3c7',
      lineSpacing: 3
    })

    this.add.text(802, 610, '좌클릭 선택 · 드래그 다중선택 · 우클릭 이동 · A+좌클릭 점사 · P/Space 일시정지', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#94a3b8'
    })

    this.pauseOverlay = this.add.container(450, 360)
    const overlayBg = this.add.rectangle(0, 0, 520, 170, 0x020617, 0.88).setStrokeStyle(2, 0xfacc15)
    const overlayText = this.add.text(0, -18, '일시정지', {
      fontFamily: 'Arial',
      fontSize: '38px',
      color: '#fde68a',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    const overlaySub = this.add.text(0, 36, 'P 또는 Space를 누르면 다시 진행합니다.', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5)
    this.pauseOverlay.add([overlayBg, overlayText, overlaySub])
    this.pauseOverlay.setDepth(999)
    this.pauseOverlay.setVisible(false)

    this.attackCursor = this.add.graphics().setDepth(1000)
    this.attackCursor.setVisible(false)
  }

  private createInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return
      if (this.isPaused) return

      if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer)
        return
      }

      if (pointer.leftButtonDown()) {
        if (this.attackMode) {
          this.handleAttackClick(pointer)
          return
        }
        this.dragStart = new Phaser.Math.Vector2(pointer.x, pointer.y)
        this.ensureDragBox()
      }
    })

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || !this.dragBox || this.isPaused || this.attackMode) return
      const dx = pointer.x - this.dragStart.x
      const dy = pointer.y - this.dragStart.y
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      const x = Math.min(this.dragStart.x, pointer.x)
      const y = Math.min(this.dragStart.y, pointer.y)
      this.dragBox.setPosition(x, y)
      this.dragBox.setSize(Math.abs(dx), Math.abs(dy))
      this.dragBox.setVisible(true)
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return
      if (this.isPaused) return
      if (!this.dragStart || pointer.button !== 0) return

      const dragDistance = distance(this.dragStart, { x: pointer.x, y: pointer.y })
      if (dragDistance > 8 && this.dragBox?.visible) {
        this.selectUnitsInRect(this.dragBox.getBounds())
      } else {
        this.handleUnitClick(pointer)
      }

      this.dragStart = null
      this.dragBox?.setVisible(false)
    })

    this.input.keyboard?.on('keydown-A', () => {
      if (!this.isPaused && !this.isGameOver && this.selectedUnitIds.size > 0) {
        this.attackMode = true
        this.game.canvas.style.cursor = 'crosshair'
      }
    })

    this.input.keyboard?.on('keydown-ESC', () => {
      this.attackMode = false
      this.game.canvas.style.cursor = 'default'
      this.clearSelection()
    })

    this.input.keyboard?.on('keydown-P', () => this.togglePause())
    this.input.keyboard?.on('keydown-SPACE', () => this.togglePause())
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
    this.spawnCooldownMs = 0
    this.waveState = 'spawning'

    if ([5, 15, 25, 35].includes(this.wave)) {
      this.spawnMonster('elite')
    }

    if (this.wave % 10 === 0) {
      this.spawnMonster('boss')
    }
  }

  private spawnMonster(kind: MonsterKind): void {
    if (kind !== 'boss' && this.getMobWeight() >= GAME_RULES.mobDangerThreshold) {
      this.lives -= 1
      if (this.lives <= 0) {
        this.finishGame(false, '몬스터가 100마리 이상 쌓여 라이프가 모두 소진되었습니다.')
        return
      }
    }

    while (kind !== 'boss' && this.getMobWeight() >= GAME_RULES.mobHardCap) {
      const oldest = this.monsters.filter((monster) => monster.kind !== 'boss').sort((a, b) => a.createdAt - b.createdAt)[0]
      if (!oldest) break
      this.removeMonster(oldest, false)
    }

    const wave = Math.max(1, this.wave)
    const baseHp = getMonsterHp(wave)
    const hp = kind === 'boss' ? getBossHp(wave) : kind === 'elite' ? baseHp * 4 : baseHp
    const speed = (kind === 'boss' ? getMonsterSpeed(wave) * 0.62 : kind === 'elite' ? getMonsterSpeed(wave) * 0.85 : getMonsterSpeed(wave))
    const radius = kind === 'boss' ? 28 : kind === 'elite' ? 20 : 13
    const color = kind === 'boss' ? 0xef4444 : kind === 'elite' ? 0xf97316 : 0x38bdf8

    const startPoint = this.pathPoints[0]
    const body = this.add.circle(0, 0, radius, color, 1).setStrokeStyle(2, 0xffffff, 0.9)
    const hpText = this.add.text(0, radius + 7, '', {
      fontFamily: 'Arial',
      fontSize: kind === 'boss' ? '12px' : '10px',
      color: '#ffffff'
    }).setOrigin(0.5)
    const container = this.add.container(startPoint.x, startPoint.y, [body, hpText]).setDepth(kind === 'boss' ? 20 : 10)

    const monster: MonsterRuntime = {
      id: this.nextMonsterId++,
      kind,
      container,
      body,
      hpText,
      hp,
      maxHp: hp,
      speed,
      pathIndex: 1,
      weight: kind === 'elite' ? 3 : kind === 'boss' ? 0 : 1,
      wave,
      createdAt: this.time.now,
      slowUntil: 0,
      alive: true
    }

    this.monsters.push(monster)
    this.updateMonsterHpText(monster)

    if (kind === 'boss') {
      this.currentBossId = monster.id
      this.bossTimeRemainingMs = getBossTimeLimitMs(wave)
    }
  }

  private updateMonsters(delta: number): void {
    for (const monster of this.monsters) {
      const target = this.pathPoints[monster.pathIndex]
      const current = new Phaser.Math.Vector2(monster.container.x, monster.container.y)
      const toTarget = target.clone().subtract(current)
      const dist = toTarget.length()
      const slowMultiplier = this.time.now < monster.slowUntil ? 0.7 : 1
      const step = monster.speed * slowMultiplier * (delta / 1000)

      if (dist <= step) {
        monster.container.setPosition(target.x, target.y)
        monster.pathIndex = (monster.pathIndex + 1) % this.pathPoints.length
      } else {
        toTarget.normalize().scale(step)
        monster.container.setPosition(monster.container.x + toTarget.x, monster.container.y + toTarget.y)
      }
    }
  }

  private updateUnits(delta: number): void {
    for (const unit of this.units) {
      const stats = GRADE_STATS[unit.def.grade]
      const dx = unit.targetX - unit.x
      const dy = unit.targetY - unit.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const step = stats.moveSpeed * (delta / 1000)
      if (dist > 2) {
        const ratio = Math.min(1, step / dist)
        unit.x += dx * ratio
        unit.y += dy * ratio
        unit.container.setPosition(unit.x, unit.y)
      }
    }
  }

  private updateCombat(): void {
    for (const unit of this.units) {
      const target = this.getTargetForUnit(unit)
      if (!target) continue

      const stats = GRADE_STATS[unit.def.grade]
      const d = distance(unit, { x: target.container.x, y: target.container.y })
      if (unit.forcedTargetId === target.id && d > stats.range) {
        const movePoint = this.getClosestInnerPointTo(target.container.x, target.container.y)
        unit.targetX = movePoint.x
        unit.targetY = movePoint.y
        continue
      }
      if (d > stats.range) continue

      const attackInterval = this.getAttackInterval(unit)
      if (this.time.now - unit.lastAttackAt >= attackInterval) {
        unit.lastAttackAt = this.time.now
        this.attack(unit, target)
      }
    }
  }

  private attack(unit: UnitRuntime, target: MonsterRuntime): void {
    const damage = this.calculateDamage(unit, target)
    const actualDamage = Math.min(damage, target.hp)
    target.hp -= actualDamage
    this.damageLog[unit.def.genre] += actualDamage
    this.drawAttackLine(unit.x, unit.y, target.container.x, target.container.y, GENRE_COLOR[unit.def.genre])

    if (unit.def.genre === 'magic' && Math.random() < this.synergy.magicSlowChance) {
      target.slowUntil = this.time.now + 1500
      target.body.setStrokeStyle(3, 0x93c5fd, 1)
    }

    if (target.hp <= 0) {
      this.killMonster(target)
    } else {
      this.updateMonsterHpText(target)
    }
  }

  private calculateDamage(unit: UnitRuntime, target: MonsterRuntime): number {
    const stats = GRADE_STATS[unit.def.grade]
    let damage = stats.attack
    damage *= 1 + this.genreUpgradeLevel[unit.def.genre] * GENRE_UPGRADE_ATTACK_BONUS

    if (unit.def.genre === 'battle') damage *= 1 + this.synergy.battleAttackBonus
    if (unit.def.genre === 'mecha' && target.kind === 'boss') damage *= 1 + this.synergy.mechaBossBonus
    if (unit.def.genre === 'mystery' && Math.random() < this.synergy.mysteryCritChance) damage *= 2

    return damage
  }

  private getAttackInterval(unit: UnitRuntime): number {
    const stats = GRADE_STATS[unit.def.grade]
    let interval = stats.attackIntervalMs
    if (unit.def.genre === 'sports') {
      interval = interval / (1 + this.synergy.sportsSpeedBonus)
    }
    return interval
  }

  private getTargetForUnit(unit: UnitRuntime): MonsterRuntime | null {
    if (unit.forcedTargetId !== null) {
      const forced = this.monsters.find((monster) => monster.id === unit.forcedTargetId && monster.alive)
      if (forced) return forced
      unit.forcedTargetId = null
    }

    const stats = GRADE_STATS[unit.def.grade]
    let best: MonsterRuntime | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    for (const monster of this.monsters) {
      const d = distance(unit, { x: monster.container.x, y: monster.container.y })
      if (d <= stats.range && d < bestDistance) {
        best = monster
        bestDistance = d
      }
    }
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
    if (this.gold < GAME_RULES.summonCost) return
    this.gold -= GAME_RULES.summonCost

    const row = SUMMON_RATES[this.summonLevel]
    const grade = weightedPick<Grade>(gradeWeightObject(row))
    const def = randomItem(getUnitsByGrade(grade))
    const point = this.getRandomInnerPoint()
    this.createUnit(def, point.x, point.y)
    this.recalculateSynergy()
  }

  private createUnit(def: UnitDefinition, x: number, y: number): UnitRuntime {
    const stats = GRADE_STATS[def.grade]
    const body = this.add.circle(0, 0, stats.radius, GENRE_COLOR[def.genre], 1).setStrokeStyle(3, GRADE_COLOR[def.grade], 1)
    const label = this.add.text(0, 0, def.display, {
      fontFamily: 'Arial',
      fontSize: def.display.length > 1 ? '12px' : '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    const ring = this.add.graphics()
    ring.lineStyle(3, 0x22c55e, 1)
    ring.strokeCircle(0, 0, stats.radius + 7)
    ring.setVisible(false)

    const container = this.add.container(x, y, [ring, body, label]).setDepth(30)
    const unit: UnitRuntime = {
      id: this.nextUnitId++,
      def,
      container,
      body,
      label,
      ring,
      x,
      y,
      targetX: x,
      targetY: y,
      lastAttackAt: 0,
      forcedTargetId: null,
      selected: false
    }
    this.units.push(unit)
    return unit
  }

  private upgradeSummon(): void {
    if (this.isPaused || this.isGameOver) return
    if (this.summonLevel >= SUMMON_RATES.length - 1) return
    const nextCost = SUMMON_RATES[this.summonLevel + 1].cost ?? 0
    if (this.gold < nextCost) return
    this.gold -= nextCost
    this.summonLevel += 1
  }

  private upgradeGenre(genre: Genre): void {
    if (this.isPaused || this.isGameOver) return
    const level = this.genreUpgradeLevel[genre]
    if (level >= GENRE_UPGRADE_COSTS.length) return
    const cost = GENRE_UPGRADE_COSTS[level]
    if (this.gold < cost) return
    this.gold -= cost
    this.genreUpgradeLevel[genre] += 1
  }

  private mergeSelectedUnits(): void {
    if (this.isPaused || this.isGameOver) return
    const selected = this.getSelectedUnits()
    if (selected.length < 3) return
    const first = selected[0]
    if (first.def.grade === 'myth') return
    const same = selected.filter((unit) => unit.def.id === first.def.id)
    if (same.length < 3) return

    const nextGrade = getNextGrade(first.def.grade)
    if (!nextGrade) return

    const materials = same.slice(0, 3)
    const x = materials.reduce((sum, unit) => sum + unit.x, 0) / 3
    const y = materials.reduce((sum, unit) => sum + unit.y, 0) / 3
    for (const unit of materials) this.removeUnit(unit)

    const def = randomItem(getUnitsByGrade(nextGrade))
    const point = this.clampToInner(x, y)
    const created = this.createUnit(def, point.x, point.y)
    this.clearSelection()
    this.selectUnits([created])
    this.recalculateSynergy()
  }

  private sellSelectedUnits(): void {
    if (this.isPaused || this.isGameOver) return
    const selected = this.getSelectedUnits()
    if (selected.length === 0) return
    const value = selected.reduce((sum, unit) => sum + SELL_VALUES[unit.def.grade], 0)
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
    }

    const baseGold = monster.kind === 'boss'
      ? this.getBossGold(monster.wave)
      : getKillGold(monster.wave) * (monster.kind === 'elite' ? 5 : 1)
    this.gold += Math.round(baseGold * (1 + this.synergy.fantasyGoldBonus))
    this.removeMonster(monster, true)
  }

  private removeMonster(monster: MonsterRuntime, clearForcedTargets: boolean): void {
    monster.alive = false
    monster.container.destroy(true)
    this.monsters = this.monsters.filter((item) => item.id !== monster.id)
    if (clearForcedTargets) {
      for (const unit of this.units) {
        if (unit.forcedTargetId === monster.id) unit.forcedTargetId = null
      }
    }
  }

  private removeUnit(unit: UnitRuntime): void {
    unit.container.destroy(true)
    this.selectedUnitIds.delete(unit.id)
    this.units = this.units.filter((item) => item.id !== unit.id)
  }

  private getBossGold(wave: number): number {
    if (wave === 10) return 300
    if (wave === 20) return 850
    if (wave === 30) return 1600
    return 0
  }

  private handleUnitClick(pointer: Phaser.Input.Pointer): void {
    const unit = this.getUnitAt(pointer.x, pointer.y)
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
    const selected = this.getSelectedUnits()
    if (selected.length === 0) return

    const point = this.clampToInner(pointer.x, pointer.y)
    const positions = this.getFormationPositions(point.x, point.y, selected.length)
    selected.forEach((unit, index) => {
      const p = this.clampToInner(positions[index].x, positions[index].y)
      unit.targetX = p.x
      unit.targetY = p.y
      unit.forcedTargetId = null
    })
    this.drawMoveMarker(point.x, point.y)
  }

  private handleAttackClick(pointer: Phaser.Input.Pointer): void {
    const monster = this.getMonsterAt(pointer.x, pointer.y)
    if (!monster) return
    for (const unit of this.getSelectedUnits()) {
      unit.forcedTargetId = monster.id
    }
    this.attackMode = false
    this.game.canvas.style.cursor = 'default'
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
    for (const unit of units) {
      unit.selected = true
      unit.ring.setVisible(true)
      this.selectedUnitIds.add(unit.id)
    }
  }

  private selectUnitsInRect(rect: Phaser.Geom.Rectangle): void {
    const selected = this.units.filter((unit) => rect.contains(unit.x, unit.y))
    this.selectUnits(selected)
  }

  private clearSelection(): void {
    for (const unit of this.units) {
      unit.selected = false
      unit.ring.setVisible(false)
    }
    this.selectedUnitIds.clear()
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

  private drawMoveMarker(x: number, y: number): void {
    const marker = this.add.graphics().setDepth(600)
    marker.lineStyle(3, 0xfde68a, 1)
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

  private drawAttackLine(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const line = this.add.graphics().setDepth(80)
    line.lineStyle(2, color, 0.95)
    line.lineBetween(x1, y1, x2, y2)
    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 120,
      onComplete: () => line.destroy()
    })
  }

  private updateMonsterHpText(monster: MonsterRuntime): void {
    const percent = Math.max(0, monster.hp / monster.maxHp)
    monster.hpText.setText(`${Math.ceil(percent * 100)}%`)
  }

  private updateAttackCursor(): void {
    this.attackCursor.clear()
    if (!this.attackMode || this.isPaused || this.isGameOver) {
      this.attackCursor.setVisible(false)
      return
    }
    const pointer = this.input.activePointer
    this.attackCursor.setVisible(true)
    this.attackCursor.lineStyle(2, 0xef4444, 1)
    this.attackCursor.strokeCircle(pointer.x, pointer.y, 12)
    this.attackCursor.lineBetween(pointer.x - 16, pointer.y, pointer.x + 16, pointer.y)
    this.attackCursor.lineBetween(pointer.x, pointer.y - 16, pointer.x, pointer.y + 16)
  }

  private getFormationPositions(x: number, y: number, count: number): Array<{ x: number; y: number }> {
    if (count <= 1) return [{ x, y }]
    const positions: Array<{ x: number; y: number }> = []
    const spacing = 34
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

  private getRandomInnerPoint(): { x: number; y: number } {
    const { inner } = BOARD
    for (let i = 0; i < 20; i += 1) {
      const x = Phaser.Math.Between(inner.x + 24, inner.x + inner.width - 24)
      const y = Phaser.Math.Between(inner.y + 24, inner.y + inner.height - 24)
      const tooClose = this.units.some((unit) => distance(unit, { x, y }) < 30)
      if (!tooClose) return { x, y }
    }
    return {
      x: Phaser.Math.Between(inner.x + 24, inner.x + inner.width - 24),
      y: Phaser.Math.Between(inner.y + 24, inner.y + inner.height - 24)
    }
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
      const level = count >= 6 ? 3 : count >= 4 ? 2 : count >= 2 ? 1 : 0
      state.levelByGenre[genre] = level
    }

    state.battleAttackBonus = this.valueByLevel(state.levelByGenre.battle, [0, 0.1, 0.25, 0.45])
    state.fantasyGoldBonus = this.valueByLevel(state.levelByGenre.fantasy, [0, 0.08, 0.18, 0.32])
    state.magicSlowChance = this.valueByLevel(state.levelByGenre.magic, [0, 0.12, 0.22, 0.35])
    state.mechaBossBonus = this.valueByLevel(state.levelByGenre.mecha, [0, 0.15, 0.4, 0.75])
    state.sportsSpeedBonus = this.valueByLevel(state.levelByGenre.sports, [0, 0.08, 0.18, 0.3])
    state.mysteryCritChance = this.valueByLevel(state.levelByGenre.mystery, [0, 0.08, 0.18, 0.3])
    this.synergy = state
  }

  private createEmptySynergy(): SynergyState {
    return {
      levelByGenre: { battle: 0, fantasy: 0, magic: 0, mecha: 0, sports: 0, mystery: 0 },
      countByGenre: { battle: 0, fantasy: 0, magic: 0, mecha: 0, sports: 0, mystery: 0 },
      battleAttackBonus: 0,
      fantasyGoldBonus: 0,
      magicSlowChance: 0,
      mechaBossBonus: 0,
      sportsSpeedBonus: 0,
      mysteryCritChance: 0
    }
  }

  private valueByLevel(level: 0 | 1 | 2 | 3, values: [number, number, number, number]): number {
    return values[level]
  }

  private updateUi(): void {
    this.recalculateSynergy()
    const bossText = this.bossTimeRemainingMs !== null
      ? `보스 제한시간: ${(this.bossTimeRemainingMs / 1000).toFixed(1)}초`
      : ''
    this.bossText.setText(bossText)

    this.topText.setText([
      `웨이브 ${this.wave}/${GAME_RULES.maxWave}`,
      `라이프 ${this.lives}`,
      `골드 ${formatNumber(this.gold)}`,
      `몬스터 ${this.getMobWeight()}/${GAME_RULES.mobDangerThreshold}+`,
      this.isPaused ? '일시정지' : ''
    ].filter(Boolean).join('   '))

    const nextWaveText = this.waveState === 'waiting'
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

    this.summonButton.setLabel(`랜덤 소환 (${GAME_RULES.summonCost}G)`)
    const nextSummonCost = this.summonLevel < SUMMON_RATES.length - 1 ? SUMMON_RATES[this.summonLevel + 1].cost : null
    this.summonUpgradeButton.setLabel(nextSummonCost ? `소환 확률 강화 Lv.${this.summonLevel + 1} (${nextSummonCost}G)` : '소환 확률 MAX')
    this.pauseButton.setLabel(this.isPaused ? '재개하기 (P/Space)' : '일시정지 (P/Space)')
    this.mergeButton.setLabel(this.canMergeSelected() ? '선택 합성 가능' : '선택 합성')
    const sellValue = this.getSelectedUnits().reduce((sum, unit) => sum + SELL_VALUES[unit.def.grade], 0)
    this.sellButton.setLabel(sellValue > 0 ? `판매 +${sellValue}G` : '선택 판매')

    for (const genre of GENRES) {
      const level = this.genreUpgradeLevel[genre]
      const cost = level < GENRE_UPGRADE_COSTS.length ? GENRE_UPGRADE_COSTS[level] : null
      const label = cost ? `${GENRE_LABEL[genre]} Lv.${level} ${cost}G` : `${GENRE_LABEL[genre]} MAX`
      this.genreButtons[genre].setLabel(label)
    }

    const synergyLines = GENRES.map((genre) => {
      const level = this.synergy.levelByGenre[genre]
      const count = this.synergy.countByGenre[genre]
      return `${GENRE_LABEL[genre]} ${count}명 · 시너지 ${level}단계`
    })
    this.synergyText.setText(['현재 시너지', ...synergyLines].join('\n'))
    this.mergeHintText.setText(this.getMergeHintText())
    this.pauseOverlay.setVisible(this.isPaused)
  }

  private canMergeSelected(): boolean {
    const selected = this.getSelectedUnits()
    if (selected.length < 3) return false
    const first = selected[0]
    if (first.def.grade === 'myth') return false
    return selected.filter((unit) => unit.def.id === first.def.id).length >= 3
  }

  private getMergeHintText(): string {
    const counts = new Map<string, { def: UnitDefinition; count: number }>()
    for (const unit of this.units) {
      const item = counts.get(unit.def.id) ?? { def: unit.def, count: 0 }
      item.count += 1
      counts.set(unit.def.id, item)
    }
    const mergeables = [...counts.values()].filter((item) => item.count >= 3 && item.def.grade !== 'myth')
    if (mergeables.length === 0) {
      return '합성 가능 유닛 없음\n같은 유닛 3마리를 모아 더블클릭 후 합성하세요.'
    }
    return ['합성 가능'].concat(
      mergeables.slice(0, 4).map((item) => `${GRADE_LABEL[item.def.grade]} ${item.def.name} x${item.count}`)
    ).join('\n')
  }

  private togglePause(): void {
    if (this.isGameOver) return
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
    addRanking(entry)
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
      fontFamily: 'Arial',
      fontSize: '42px',
      color: this.isCleared ? '#fde68a' : '#fecaca',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    const detail = this.add.text(0, -92, `${reason}\n점수: ${formatNumber(score)}점\n도달 웨이브: ${this.wave}/${GAME_RULES.maxWave}\nTOP 딜 장르: ${topGenres.map((genre) => GENRE_LABEL[genre]).join(', ') || '-'}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5)
    const buttonBg = this.add.rectangle(0, 120, 240, 48, 0x263142, 1).setStrokeStyle(2, 0x5eead4)
    const buttonText = this.add.text(0, 120, '메인화면으로', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    buttonBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('MenuScene'))
    buttonText.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('MenuScene'))
    overlay.add([bg, title, detail, buttonBg, buttonText])
  }

  private createButton(x: number, y: number, width: number, height: number, label: string, onClick: () => void, allowWhilePaused = false): ButtonHandle {
    const rect = this.add.rectangle(x, y, width, height, 0x1e293b, 1).setOrigin(0, 0)
    rect.setStrokeStyle(2, 0x475569, 1)
    rect.setInteractive({ useHandCursor: true })
    const text = this.add.text(x + width / 2, y + height / 2, label, {
      fontFamily: 'Arial',
      fontSize: width < 160 ? '12px' : '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5)

    const wrappedClick = () => {
      if (this.isPaused && !allowWhilePaused) return
      onClick()
    }
    rect.on('pointerover', () => rect.setFillStyle(0x334155, 1))
    rect.on('pointerout', () => rect.setFillStyle(0x1e293b, 1))
    rect.on('pointerdown', wrappedClick)
    text.setInteractive({ useHandCursor: true }).on('pointerdown', wrappedClick)

    return {
      rect,
      text,
      setLabel: (nextLabel: string) => text.setText(nextLabel)
    }
  }
}
