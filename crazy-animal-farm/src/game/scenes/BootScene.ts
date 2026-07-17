import Phaser from 'phaser'
import {
  BASE_CORE_TEXTURE_KEY,
  BERRY_BUSH_TEXTURE_KEY,
  BOAR_TEXTURE_KEY,
  CAPTURE_CAPSULE_TEXTURE_KEY,
  COPPER_DEPOSIT_TEXTURE_KEY,
  FIBER_PLANT_TEXTURE_KEY,
  LOGGING_STATION_TEXTURE_KEY,
  OBSTACLE_TEXTURE_KEY,
  PLAYER_TEXTURE_KEY,
  PLAYER_PROJECTILE_TEXTURE_KEY,
  PRIMITIVE_WORKBENCH_TEXTURE_KEY,
  RABBIT_TEXTURE_KEY,
  SHEEP_TEXTURE_KEY,
  STONE_TEXTURE_KEY,
  TREE_TEXTURE_KEY,
} from '../config/gameConstants'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create() {
    this.createPlayerTexture()
    this.createObstacleTexture()
    this.createTreeTexture()
    this.createStoneTexture()
    this.createFiberPlantTexture()
    this.createBerryBushTexture()
    this.createCopperDepositTexture()
    this.createRabbitTexture()
    this.createSheepTexture()
    this.createBoarTexture()
    this.createCaptureCapsuleTexture()
    this.createPlayerProjectileTexture()
    this.createBaseCoreTexture()
    this.createLoggingStationTexture()
    this.createPrimitiveWorkbenchTexture()
    this.scene.start('world')
  }

  private createPlayerTexture() {
    if (this.textures.exists(PLAYER_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x4ca6ff, 1)
    graphics.fillCircle(32, 32, 26)
    graphics.lineStyle(6, 0xd8efff, 1)
    graphics.strokeCircle(32, 32, 26)
    graphics.fillStyle(0x102b4a, 1)
    graphics.fillCircle(23, 27, 4)
    graphics.fillCircle(41, 27, 4)
    graphics.generateTexture(PLAYER_TEXTURE_KEY, 64, 64)
    graphics.destroy()
  }

  private createObstacleTexture() {
    if (this.textures.exists(OBSTACLE_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0xffffff, 1)
    graphics.fillRoundedRect(4, 4, 56, 56, 14)
    graphics.lineStyle(5, 0x17271f, 0.28)
    graphics.strokeRoundedRect(4, 4, 56, 56, 14)
    graphics.generateTexture(OBSTACLE_TEXTURE_KEY, 64, 64)
    graphics.destroy()
  }

  private createTreeTexture() {
    if (this.textures.exists(TREE_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x765136, 1)
    graphics.fillRoundedRect(27, 48, 18, 44, 6)
    graphics.fillStyle(0x2d7a42, 1)
    graphics.fillCircle(24, 36, 22)
    graphics.fillCircle(48, 36, 22)
    graphics.fillCircle(36, 22, 24)
    graphics.lineStyle(4, 0xa8d56f, 0.78)
    graphics.strokeCircle(36, 31, 27)
    graphics.generateTexture(TREE_TEXTURE_KEY, 72, 96)
    graphics.destroy()
  }

  private createStoneTexture() {
    if (this.textures.exists(STONE_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x7f8a84, 1)
    graphics.fillRoundedRect(5, 16, 54, 42, 15)
    graphics.lineStyle(5, 0xc0cac4, 0.8)
    graphics.strokeRoundedRect(5, 16, 54, 42, 15)
    graphics.lineStyle(3, 0x56615c, 0.7)
    graphics.lineBetween(22, 22, 31, 34)
    graphics.lineBetween(31, 34, 42, 28)
    graphics.generateTexture(STONE_TEXTURE_KEY, 64, 64)
    graphics.destroy()
  }

  private createRabbitTexture() {
    if (this.textures.exists(RABBIT_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0xf4e8db, 1)
    graphics.fillRoundedRect(13, 2, 13, 32, 7)
    graphics.fillRoundedRect(38, 2, 13, 32, 7)
    graphics.fillEllipse(32, 39, 48, 43)
    graphics.fillStyle(0xff8d98, 1)
    graphics.fillEllipse(19, 15, 5, 19)
    graphics.fillEllipse(45, 15, 5, 19)
    graphics.fillStyle(0x2a1c2b, 1)
    graphics.fillCircle(23, 37, 4)
    graphics.fillCircle(41, 37, 4)
    graphics.fillStyle(0xd34c62, 1)
    graphics.fillCircle(32, 47, 4)
    graphics.lineStyle(3, 0x4a3347, 0.8)
    graphics.strokeEllipse(32, 39, 48, 43)
    graphics.generateTexture(RABBIT_TEXTURE_KEY, 64, 64)
    graphics.destroy()
  }

  private createSheepTexture() {
    if (this.textures.exists(SHEEP_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0xf4f0d8, 1)
    graphics.fillCircle(23, 34, 18)
    graphics.fillCircle(39, 31, 20)
    graphics.fillCircle(47, 41, 17)
    graphics.fillCircle(28, 46, 19)
    graphics.fillStyle(0x5d5548, 1)
    graphics.fillRoundedRect(40, 35, 20, 18, 7)
    graphics.fillRect(20, 51, 7, 11)
    graphics.fillRect(43, 51, 7, 11)
    graphics.fillStyle(0x171a18, 1)
    graphics.fillCircle(53, 41, 2)
    graphics.lineStyle(3, 0xb8b18e, 0.9)
    graphics.strokeCircle(35, 38, 27)
    graphics.generateTexture(SHEEP_TEXTURE_KEY, 64, 64)
    graphics.destroy()
  }

  private createBoarTexture() {
    if (this.textures.exists(BOAR_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x6f4a38, 1)
    graphics.fillEllipse(32, 39, 52, 38)
    graphics.fillStyle(0x8b6450, 1)
    graphics.fillRoundedRect(42, 32, 20, 19, 7)
    graphics.fillTriangle(14, 25, 24, 16, 27, 30)
    graphics.fillTriangle(37, 24, 47, 15, 50, 30)
    graphics.fillStyle(0xf0dfb0, 1)
    graphics.fillTriangle(49, 47, 59, 51, 52, 42)
    graphics.fillStyle(0x171512, 1)
    graphics.fillCircle(52, 36, 3)
    graphics.lineStyle(3, 0x3e2b24, 0.9)
    graphics.strokeEllipse(32, 39, 52, 38)
    graphics.generateTexture(BOAR_TEXTURE_KEY, 64, 64)
    graphics.destroy()
  }

  private createFiberPlantTexture() {
    if (this.textures.exists(FIBER_PLANT_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.lineStyle(7, 0x3e8a45, 1)
    graphics.lineBetween(28, 55, 12, 18)
    graphics.lineBetween(28, 55, 27, 9)
    graphics.lineBetween(28, 55, 45, 15)
    graphics.lineBetween(28, 55, 52, 30)
    graphics.lineStyle(3, 0xa8d56f, 0.8)
    graphics.lineBetween(28, 55, 27, 9)
    graphics.generateTexture(FIBER_PLANT_TEXTURE_KEY, 56, 58)
    graphics.destroy()
  }

  private createBerryBushTexture() {
    if (this.textures.exists(BERRY_BUSH_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x326d3c, 1)
    graphics.fillCircle(22, 34, 20)
    graphics.fillCircle(43, 32, 22)
    graphics.fillCircle(34, 21, 20)
    graphics.fillStyle(0x654ca6, 1)
    graphics.fillCircle(20, 31, 5)
    graphics.fillCircle(39, 22, 5)
    graphics.fillCircle(47, 39, 5)
    graphics.fillCircle(31, 43, 5)
    graphics.lineStyle(3, 0x8fcf78, 0.75)
    graphics.strokeCircle(34, 31, 27)
    graphics.generateTexture(BERRY_BUSH_TEXTURE_KEY, 68, 58)
    graphics.destroy()
  }

  private createCopperDepositTexture() {
    if (this.textures.exists(COPPER_DEPOSIT_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x75685f, 1)
    graphics.fillRoundedRect(5, 18, 62, 44, 14)
    graphics.lineStyle(4, 0x342f2b, 0.6)
    graphics.strokeRoundedRect(5, 18, 62, 44, 14)
    graphics.fillStyle(0xd17b43, 1)
    graphics.fillCircle(22, 36, 7)
    graphics.fillCircle(47, 29, 6)
    graphics.fillCircle(50, 49, 8)
    graphics.fillCircle(31, 53, 5)
    graphics.generateTexture(COPPER_DEPOSIT_TEXTURE_KEY, 72, 66)
    graphics.destroy()
  }

  private createCaptureCapsuleTexture() {
    if (this.textures.exists(CAPTURE_CAPSULE_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x28163d, 1)
    graphics.fillRoundedRect(3, 7, 26, 18, 8)
    graphics.lineStyle(3, 0xd6a1ff, 1)
    graphics.strokeRoundedRect(3, 7, 26, 18, 8)
    graphics.fillStyle(0x8cf5e0, 1)
    graphics.fillTriangle(16, 10, 22, 16, 16, 22)
    graphics.fillTriangle(16, 10, 10, 16, 16, 22)
    graphics.generateTexture(CAPTURE_CAPSULE_TEXTURE_KEY, 32, 32)
    graphics.destroy()
  }

  private createPlayerProjectileTexture() {
    if (this.textures.exists(PLAYER_PROJECTILE_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0xd6b864, 1)
    graphics.fillRoundedRect(2, 8, 24, 4, 2)
    graphics.fillStyle(0xe8e0c5, 1)
    graphics.fillTriangle(26, 4, 32, 10, 26, 16)
    graphics.fillStyle(0x8d5732, 1)
    graphics.fillTriangle(4, 10, 0, 5, 0, 15)
    graphics.generateTexture(PLAYER_PROJECTILE_TEXTURE_KEY, 32, 20)
    graphics.destroy()
  }

  private createBaseCoreTexture() {
    if (this.textures.exists(BASE_CORE_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x3a2c18, 1)
    graphics.fillRoundedRect(4, 4, 88, 88, 18)
    graphics.lineStyle(6, 0xffd65c, 1)
    graphics.strokeRoundedRect(4, 4, 88, 88, 18)
    graphics.fillStyle(0xffe898, 1)
    graphics.fillCircle(48, 48, 25)
    graphics.fillStyle(0xd89428, 1)
    graphics.fillTriangle(48, 20, 72, 63, 24, 63)
    graphics.fillStyle(0xfff2b8, 1)
    graphics.fillCircle(48, 48, 9)
    graphics.generateTexture(BASE_CORE_TEXTURE_KEY, 96, 96)
    graphics.destroy()
  }

  private createLoggingStationTexture() {
    if (this.textures.exists(LOGGING_STATION_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x5b3824, 1)
    graphics.fillRoundedRect(4, 10, 120, 60, 10)
    graphics.lineStyle(5, 0xc78a4f, 1)
    graphics.strokeRoundedRect(4, 10, 120, 60, 10)
    graphics.fillStyle(0x8d5a35, 1)
    graphics.fillRect(12, 18, 104, 12)
    graphics.fillStyle(0xd6b171, 1)
    graphics.fillCircle(32, 48, 13)
    graphics.fillCircle(64, 48, 13)
    graphics.fillCircle(96, 48, 13)
    graphics.lineStyle(3, 0x4d2d1d, 0.8)
    graphics.lineBetween(32, 35, 32, 61)
    graphics.lineBetween(64, 35, 64, 61)
    graphics.lineBetween(96, 35, 96, 61)
    graphics.generateTexture(LOGGING_STATION_TEXTURE_KEY, 128, 80)
    graphics.destroy()
  }

  private createPrimitiveWorkbenchTexture() {
    if (this.textures.exists(PRIMITIVE_WORKBENCH_TEXTURE_KEY)) {
      return
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false)

    graphics.fillStyle(0x4d3324, 1)
    graphics.fillRoundedRect(4, 12, 104, 44, 8)
    graphics.lineStyle(5, 0xc99b61, 1)
    graphics.strokeRoundedRect(4, 12, 104, 44, 8)
    graphics.fillStyle(0x755038, 1)
    graphics.fillRect(12, 19, 88, 10)
    graphics.fillStyle(0xcfd3c1, 1)
    graphics.fillTriangle(24, 42, 42, 32, 46, 50)
    graphics.fillStyle(0x865832, 1)
    graphics.fillRect(63, 33, 27, 8)
    graphics.fillRect(72, 28, 8, 24)
    graphics.fillStyle(0x3b281d, 1)
    graphics.fillRect(15, 56, 12, 14)
    graphics.fillRect(85, 56, 12, 14)
    graphics.generateTexture(PRIMITIVE_WORKBENCH_TEXTURE_KEY, 112, 72)
    graphics.destroy()
  }
}
