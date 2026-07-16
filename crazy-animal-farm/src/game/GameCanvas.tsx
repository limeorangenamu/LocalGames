import { useEffect, useRef } from 'react'
import { createPhaserGame } from './config/phaserConfig'
import './gameCanvas.css'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<ReturnType<typeof createPhaserGame> | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container || gameRef.current) {
      return
    }

    const game = createPhaserGame(container)
    gameRef.current = game

    // StrictMode가 개발 중 컴포넌트를 다시 마운트해도 기존 게임과 Canvas를 정리한다.
    return () => {
      game.destroy(true)

      if (gameRef.current === game) {
        gameRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="game-canvas"
      role="application"
      aria-label="Crazy Animal Farm Phaser 게임"
    />
  )
}

