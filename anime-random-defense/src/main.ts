import Phaser from 'phaser'
import './style.css'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'app',
  backgroundColor: '#101217',
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MenuScene, GameScene]
}

new Phaser.Game(config)
