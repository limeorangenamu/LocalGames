import Phaser from 'phaser'
import './style.css'
import { RENDER_HEIGHT, RENDER_WIDTH } from './game/balance'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: RENDER_WIDTH,
  height: RENDER_HEIGHT,
  parent: 'app',
  backgroundColor: '#101217',
  antialias: true,
  pixelArt: false,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true
  },
  scene: [MenuScene, GameScene]
}

new Phaser.Game(config)
