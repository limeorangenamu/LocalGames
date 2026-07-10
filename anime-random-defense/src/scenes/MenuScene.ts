import Phaser from 'phaser'
import { CANVAS_HEIGHT, CANVAS_WIDTH, RENDER_HEIGHT, RENDER_SCALE, RENDER_WIDTH } from '../game/balance'
import { clearRankings, getNickname, getRankings, isAdminNickname, isNicknameTaken, loadRankings, normalizeNickname, setNickname } from '../game/storage'
import { formatNumber } from '../game/utils'

const FONT_FAMILY = '"Malgun Gothic", "Noto Sans KR", "Segoe UI", sans-serif'
const MENU_TEXT_RESOLUTION = 2

type ButtonTone = 'primary' | 'secondary' | 'danger'

const BUTTON_TONES: Record<ButtonTone, {
  fill: number
  hover: number
  pressed: number
  stroke: number
  text: string
  alpha: number
  strokeAlpha: number
  shadowAlpha: number
}> = {
  primary: {
    fill: 0xf97316,
    hover: 0xea580c,
    pressed: 0xc2410c,
    stroke: 0xfff7ed,
    text: '#ffffff',
    alpha: 0.9,
    strokeAlpha: 0.34,
    shadowAlpha: 0.14
  },
  secondary: {
    fill: 0x244d82,
    hover: 0x3266a6,
    pressed: 0x1b3d6e,
    stroke: 0x9ad8f5,
    text: '#f5fbff',
    alpha: 0.92,
    strokeAlpha: 0.9,
    shadowAlpha: 0.2
  },
  danger: {
    fill: 0x7a3650,
    hover: 0x9b435f,
    pressed: 0x5d263e,
    stroke: 0xffb3c7,
    text: '#fff6f8',
    alpha: 0.92,
    strokeAlpha: 0.86,
    shadowAlpha: 0.2
  }
}

export class MenuScene extends Phaser.Scene {
  private nickname = ''

  constructor() {
    super('MenuScene')
  }

  preload(): void {
    this.load.image('menu-background', '/assets/menu/background.png')
    this.load.image('menu-logo', '/assets/menu/logo2.png')
  }

  create(): void {
    this.configureViewport()
    this.drawBackground()
    void this.createMenu()
  }

  private configureViewport(): void {
    this.cameras.main
      .setViewport(0, 0, RENDER_WIDTH, RENDER_HEIGHT)
      .setOrigin(0, 0)
      .setZoom(RENDER_SCALE)
      .setScroll(0, 0)
  }

  private drawBackground(): void {
    this.cameras.main.setBackgroundColor('#070b12')
    this.add.rectangle(-360, -240, CANVAS_WIDTH + 720, CANVAS_HEIGHT + 480, 0x071a3d, 1)
      .setOrigin(0, 0)
      .setDepth(-21)
    this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'menu-background')
      .setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT)
      .setDepth(-20)

    this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x071a3d, 0.24)
      .setOrigin(0, 0)
      .setDepth(-19)
  }

  private async createMenu(): Promise<void> {
    const loading = this.addText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '랭킹 불러오는 중...', {
      fontFamily: FONT_FAMILY,
      fontSize: '24px',
      color: '#e2e8f0',
      fontStyle: '700'
    }).setOrigin(0.5)

    await loadRankings()
    await this.ensureNickname()
    loading.destroy()
    this.drawMenu()
  }

  private async ensureNickname(): Promise<void> {
    const saved = getNickname()
    if (saved) {
      this.nickname = normalizeNickname(saved)
      setNickname(this.nickname)
      return
    }

    const nickname = await this.promptNickname('닉네임을 입력해주세요. 랭킹에 표시됩니다.', 'Player') ?? this.getFallbackNickname()
    setNickname(nickname)
    this.nickname = nickname
  }

  private drawMenu(): void {
    this.drawLogo()
    this.drawMainPanel()
    this.drawRankings()
  }

  private drawLogo(): void {
    const logo = this.add.image(CANVAS_WIDTH / 2, 142, 'menu-logo')
      .setOrigin(0.5)
      .setDepth(1)
    this.fitImage(logo, 660, 280)
  }

  private drawMainPanel(): void {
    const x = 94
    const y = 292
    const width = 430
    const height = isAdminNickname(this.nickname) ? 356 : 284
    this.createPanel(x, y, width, height, 0.62)

    this.addText(x + 30, y + 28, '플레이어', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#92e6ff',
      fontStyle: '700'
    })
    this.addText(x + 30, y + 58, this.nickname, {
      fontFamily: FONT_FAMILY,
      fontSize: '29px',
      color: '#fff4d2',
      fontStyle: '800'
    })

    this.createButton(x + 30, y + 112, width - 60, 58, '게임 시작', () => {
      this.scene.start('GameScene', { nickname: this.nickname })
    }, 'primary')

    this.createButton(x + 30, y + 186, width - 60, 48, '닉네임 변경', () => {
      void this.changeNickname()
    }, 'secondary')

    if (!isAdminNickname(this.nickname)) return

    this.createButton(x + 30, y + 246, 176, 46, '테스트 맵', () => {
      this.scene.start('GameScene', { nickname: this.nickname, testMode: true })
    }, 'secondary')

    this.createButton(x + 224, y + 246, 176, 46, '랭킹 초기화', () => {
      void this.resetRankings()
    }, 'danger')
  }

  private async changeNickname(): Promise<void> {
    const next = await this.promptNickname('새 닉네임을 입력해주세요.', this.nickname, this.nickname)
    if (next) {
      setNickname(next)
      this.nickname = next
      this.scene.restart()
    }
  }

  private async resetRankings(): Promise<void> {
    if (window.confirm('저장된 랭킹을 모두 삭제할까요?')) {
      await clearRankings()
      this.scene.restart()
    }
  }

  private drawRankings(): void {
    const x = 706
    const y = 292
    const width = 466
    const height = 344
    this.createPanel(x, y, width, height, 0.58)

    this.addText(x + 30, y + 26, '랭킹 TOP 10', {
      fontFamily: FONT_FAMILY,
      fontSize: '28px',
      color: '#fff4d2',
      fontStyle: '800'
    })

    this.addText(x + 30, y + 74, '플레이어', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#c9e9ff',
      fontStyle: '700'
    })
    this.addText(x + 244, y + 74, '점수', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#c9e9ff',
      fontStyle: '700'
    })
    this.addText(x + width - 30, y + 74, '웨이브', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#c9e9ff',
      fontStyle: '700'
    }).setOrigin(1, 0)

    const rankings = getRankings()
    if (rankings.length === 0) {
      this.addText(x + 30, y + 118, '아직 기록이 없습니다.\n첫 기록을 남겨보세요.', {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: '#e6f5ff',
        lineSpacing: 10
      })
      return
    }

    rankings.slice(0, 10).forEach((entry, index) => {
      const rowY = y + 104 + index * 22

      this.addText(x + 30, rowY, entry.nickname, {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#f6fbff',
        fontStyle: '700'
      })

      this.addText(x + 244, rowY, `${formatNumber(entry.score)}점`, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#ffc36d',
        fontStyle: '700'
      })

      this.addText(x + width - 30, rowY, `${entry.wave}W`, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#a9edbd',
        fontStyle: '700'
      }).setOrigin(1, 0)
    })
  }

  private createPanel(x: number, y: number, width: number, height: number, alpha: number): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x071833, 0.32)
    graphics.fillRoundedRect(x, y + 10, width, height, 26)
    graphics.fillStyle(0x102b52, Math.min(0.96, alpha + 0.22))
    graphics.fillRoundedRect(x, y, width, height, 26)
    graphics.lineStyle(2, 0x9ad8f5, 0.74)
    graphics.strokeRoundedRect(x, y, width, height, 26)
    graphics.lineStyle(1, 0xffffff, 0.18)
    graphics.strokeRoundedRect(x + 6, y + 6, width - 12, height - 12, 21)
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    tone: ButtonTone
  ): void {
    const palette = BUTTON_TONES[tone]
    const background = this.add.graphics()
    const text = this.addText(x + width / 2, y + height / 2, label, {
      fontFamily: FONT_FAMILY,
      fontSize: height >= 56 ? '21px' : '17px',
      color: palette.text,
      fontStyle: '800'
    }).setOrigin(0.5)
    const hitZone = this.add.zone(x, y, width, height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })

    const draw = (state: 'normal' | 'hover' | 'pressed'): void => {
      const fill = state === 'pressed' ? palette.pressed : state === 'hover' ? palette.hover : palette.fill
      const fillAlpha = Math.min(0.96, palette.alpha + (state === 'normal' ? 0 : state === 'hover' ? 0.08 : 0.12))
      const offsetY = state === 'pressed' ? 2 : 0

      background.clear()
      background.fillStyle(0x000000, palette.shadowAlpha)
      background.fillRoundedRect(x, y + 6, width, height, 18)
      background.fillStyle(fill, fillAlpha)
      background.fillRoundedRect(x, y + offsetY, width, height, 18)
      background.lineStyle(1, palette.stroke, palette.strokeAlpha)
      background.strokeRoundedRect(x, y + offsetY, width, height, 18)
      text.setPosition(x + width / 2, y + height / 2 + offsetY)
    }

    let hovering = false
    draw('normal')
    hitZone.on('pointerover', () => {
      hovering = true
      draw('hover')
    })
    hitZone.on('pointerout', () => {
      hovering = false
      draw('normal')
    })
    hitZone.on('pointerdown', () => {
      draw('pressed')
      this.time.delayedCall(80, () => draw(hovering ? 'hover' : 'normal'))
      onClick()
    })
  }

  private addText(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      ...style,
      resolution: MENU_TEXT_RESOLUTION
    })
  }

  private async promptNickname(message: string, initial: string, currentNickname = ''): Promise<string | null> {
    await loadRankings()
    let nextInitial = initial
    while (true) {
      const input = window.prompt(message, nextInitial)
      if (input === null) return null

      const nickname = normalizeNickname(input)
      if (!nickname) {
        window.alert('닉네임을 입력해주세요.')
        nextInitial = this.getFallbackNickname()
        continue
      }

      if (isNicknameTaken(nickname, currentNickname)) {
        window.alert('이미 랭킹에 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.')
        nextInitial = nickname
        continue
      }

      return nickname
    }
  }

  private fitImage(image: Phaser.GameObjects.Image, maxWidth: number, maxHeight: number): void {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height)
    image.setScale(scale)
  }

  private getFallbackNickname(): string {
    for (let index = 1; index < 1000; index += 1) {
      const nickname = index === 1 ? 'Player' : `Player${index}`
      if (!isNicknameTaken(nickname)) return nickname
    }
    return `Player${Date.now().toString().slice(-4)}`
  }
}
