import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { WorldScene } from '../scenes/WorldScene'
import {
  GAME_BACKGROUND_COLOR,
  GAME_HEIGHT,
  GAME_WIDTH,
} from './gameConstants'

export function createPhaserGame(parent: HTMLElement) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: GAME_BACKGROUND_COLOR,
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    banner: false,
    autoFocus: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: import.meta.env.DEV,
      },
    },
    scene: [BootScene, WorldScene],
  }

  return new Phaser.Game(config)
}
