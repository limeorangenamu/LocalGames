import Phaser from 'phaser'
import { OBSTACLE_TEXTURE_KEY } from '../config/gameConstants'
import type {
  MapDefinition,
  MapExitDefinition,
  ObstacleDefinition,
  WorldPoint,
} from '../types/map'

const WORLD_GRID_SIZE = 32

export class MapManager {
  private readonly scene: Phaser.Scene
  private readonly obstacleGroup: Phaser.Physics.Arcade.StaticGroup
  readonly definition: MapDefinition

  constructor(scene: Phaser.Scene, definition: MapDefinition) {
    this.scene = scene
    this.definition = definition
    this.obstacleGroup = scene.physics.add.staticGroup()
  }

  createWorld() {
    this.scene.physics.world.setBounds(
      0,
      0,
      this.definition.width,
      this.definition.height,
    )
    this.scene.cameras.main.setBounds(
      0,
      0,
      this.definition.width,
      this.definition.height,
    )

    this.drawGround()
    this.drawExits()
    this.definition.obstacles.forEach((obstacle) => {
      this.createObstacle(obstacle)
    })

    return this.obstacleGroup
  }

  findExitAt(position: WorldPoint) {
    return this.definition.exits.find((exit) =>
      Phaser.Geom.Rectangle.Contains(
        new Phaser.Geom.Rectangle(
          exit.x - exit.width / 2,
          exit.y - exit.height / 2,
          exit.width,
          exit.height,
        ),
        position.x,
        position.y,
      ),
    ) ?? null
  }

  private drawGround() {
    const graphics = this.scene.add.graphics().setDepth(-10)

    graphics.fillStyle(this.definition.backgroundColor, 1)
    graphics.fillRect(0, 0, this.definition.width, this.definition.height)

    graphics.lineStyle(1, this.definition.gridColor, 0.08)

    for (let x = 0; x <= this.definition.width; x += WORLD_GRID_SIZE) {
      graphics.lineBetween(x, 0, x, this.definition.height)
    }

    for (let y = 0; y <= this.definition.height; y += WORLD_GRID_SIZE) {
      graphics.lineBetween(0, y, this.definition.width, y)
    }

    graphics.fillStyle(0xb7975d, 0.32)
    this.definition.exits.forEach((exit) => {
      const centerX = this.definition.width / 2
      const centerY = this.definition.height / 2
      const isVerticalExit =
        exit.y < this.definition.height * 0.2 ||
        exit.y > this.definition.height * 0.8

      if (isVerticalExit) {
        const top = Math.min(centerY, exit.y)
        graphics.fillRoundedRect(
          centerX - 82,
          top,
          164,
          Math.abs(exit.y - centerY),
          38,
        )
      } else {
        const left = Math.min(centerX, exit.x)
        graphics.fillRoundedRect(
          left,
          centerY - 82,
          Math.abs(exit.x - centerX),
          164,
          38,
        )
      }
    })

    graphics.fillCircle(
      this.definition.width / 2,
      this.definition.height / 2,
      118,
    )

    graphics.lineStyle(10, 0x173e2c, 0.72)
    graphics.strokeRect(5, 5, this.definition.width - 10, this.definition.height - 10)
  }

  private drawExits() {
    this.definition.exits.forEach((exit) => this.drawExit(exit))
  }

  private drawExit(exit: MapExitDefinition) {
    const graphics = this.scene.add.graphics().setDepth(2)

    graphics.fillStyle(0xffe59b, 0.16)
    graphics.fillRoundedRect(
      exit.x - exit.width / 2,
      exit.y - exit.height / 2,
      exit.width,
      exit.height,
      22,
    )
    graphics.lineStyle(5, 0xffe59b, 0.72)
    graphics.strokeRoundedRect(
      exit.x - exit.width / 2,
      exit.y - exit.height / 2,
      exit.width,
      exit.height,
      22,
    )

    const isTopExit = exit.y <= this.definition.height * 0.15
    const labelY = isTopExit
      ? exit.y + exit.height / 2 + 12
      : exit.y - exit.height / 2 - 12

    this.scene.add
      .text(exit.x, labelY, exit.name, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#fff0b8',
        backgroundColor: '#241d16cc',
        padding: { x: 9, y: 5 },
      })
      .setOrigin(0.5, isTopExit ? 0 : 1)
      .setDepth(3)
  }

  private createObstacle(definition: ObstacleDefinition) {
    const obstacle = this.obstacleGroup.create(
      definition.x,
      definition.y,
      OBSTACLE_TEXTURE_KEY,
    ) as Phaser.Physics.Arcade.Sprite

    obstacle
      .setName(definition.id)
      .setDisplaySize(definition.width, definition.height)
      .setTint(definition.color)
      .setDepth(4)
      .refreshBody()
  }
}
