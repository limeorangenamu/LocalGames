import Phaser from 'phaser'
import { addRanking, clearRankings, getNickname, getRankings, setNickname } from '../game/storage'
import { GENRE_LABEL } from '../game/balance'
import { formatNumber, genreListText } from '../game/utils'

export class MenuScene extends Phaser.Scene {
  private nickname = ''

  constructor() {
    super('MenuScene')
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#101217')
    this.ensureNickname()
    this.drawMenu()
  }

  private ensureNickname(): void {
    const saved = getNickname()
    if (saved) {
      this.nickname = saved
      return
    }

    const input = window.prompt('닉네임을 입력하세요. 랭킹에 표시됩니다.', 'Player') ?? 'Player'
    const nickname = input.trim().slice(0, 12) || 'Player'
    setNickname(nickname)
    this.nickname = nickname
  }

  private drawMenu(): void {
    this.add.text(640, 92, 'Anime Random Defense', {
      fontFamily: 'Arial',
      fontSize: '46px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(640, 142, '웹 스타 유즈맵식 랜덤 디펜스 · 싱글 플레이', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aeb7c9'
    }).setOrigin(0.5)

    this.add.text(640, 190, `현재 닉네임: ${this.nickname}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#d9f99d'
    }).setOrigin(0.5)

    this.createButton(500, 235, 280, 54, '게임 시작', () => {
      this.scene.start('GameScene', { nickname: this.nickname })
    })

    this.createButton(500, 304, 280, 44, '닉네임 변경', () => {
      const next = window.prompt('새 닉네임을 입력하세요.', this.nickname) ?? this.nickname
      const trimmed = next.trim().slice(0, 12)
      if (trimmed) {
        setNickname(trimmed)
        this.nickname = trimmed
        this.scene.restart()
      }
    })

    this.createButton(500, 360, 280, 44, '테스트용 샘플 랭킹 추가', () => {
      addRanking({
        nickname: this.nickname,
        score: Math.floor(30_000 + Math.random() * 90_000),
        wave: 20 + Math.floor(Math.random() * 21),
        cleared: Math.random() > 0.55,
        topGenres: ['mecha', 'battle', 'mystery'],
        createdAt: new Date().toISOString()
      })
      this.scene.restart()
    })

    this.createButton(500, 416, 280, 44, '로컬 랭킹 초기화', () => {
      if (window.confirm('브라우저에 저장된 랭킹을 삭제할까요?')) {
        clearRankings()
        this.scene.restart()
      }
    })

    this.drawRankings()
    this.drawControls()
  }

  private drawRankings(): void {
    const x = 820
    const y = 230
    this.add.text(x, y - 48, '로컬 랭킹 TOP 10', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold'
    })

    const rankings = getRankings()
    if (rankings.length === 0) {
      this.add.text(x, y, '아직 기록이 없습니다.\n첫 클리어 기록을 남겨보세요.', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#aeb7c9',
        lineSpacing: 8
      })
      return
    }

    rankings.forEach((entry, index) => {
      const topGenres = genreListText(entry.topGenres)
      const crown = entry.cleared ? '🏆 ' : ''
      const line = `${index + 1}. ${crown}${entry.nickname} · ${formatNumber(entry.score)}점 · ${entry.cleared ? '클리어' : `${entry.wave}W`}\n   TOP 딜: ${topGenres}`
      this.add.text(x, y + index * 42, line, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: index === 0 ? '#fef3c7' : '#d8dee9',
        lineSpacing: 2
      })
    })
  }

  private drawControls(): void {
    const text = [
      '조작법',
      '좌클릭: 유닛 선택 / 드래그: 다중 선택',
      '더블클릭: 같은 유닛 전체 선택',
      '우클릭: 선택 유닛 이동',
      'A + 적 좌클릭: 집중 공격',
      'P 또는 Space: 일시정지 / ESC: 취소'
    ].join('\n')

    this.add.text(120, 520, text, {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#cbd5e1',
      lineSpacing: 8
    })
  }

  private createButton(x: number, y: number, width: number, height: number, label: string, onClick: () => void): void {
    const rect = this.add.rectangle(x, y, width, height, 0x263142, 1).setOrigin(0, 0)
    rect.setStrokeStyle(2, 0x5eead4, 0.9)
    rect.setInteractive({ useHandCursor: true })
    const text = this.add.text(x + width / 2, y + height / 2, label, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    rect.on('pointerover', () => rect.setFillStyle(0x334155, 1))
    rect.on('pointerout', () => rect.setFillStyle(0x263142, 1))
    rect.on('pointerdown', onClick)
    text.setInteractive({ useHandCursor: true }).on('pointerdown', onClick)
  }
}
