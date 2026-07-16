import Phaser from 'phaser'
import {
  WORKER_MOVE_SPEED,
  WORKER_STUCK_TIMEOUT_MS,
} from '../config/gameConstants'
import type { CapturedAnimal } from '../types/animal'
import type { WorldPoint } from '../types/map'
import type { WorkerState } from '../types/work'

export class WorkerAnimal extends Phaser.Physics.Arcade.Sprite {
  readonly capturedAnimalId: string
  readonly buildingId: string
  readonly accessPoint: WorldPoint
  workerState: WorkerState = 'MOVING'

  private nextProgressCheckAt = 0
  private stuckSince: number | null = null
  private lastProgressPosition: WorldPoint

  constructor(
    scene: Phaser.Scene,
    capturedAnimal: CapturedAnimal,
    buildingId: string,
    textureKey: string,
    spawnPosition: WorldPoint,
    accessPoint: WorldPoint,
  ) {
    super(scene, spawnPosition.x, spawnPosition.y, textureKey)

    this.capturedAnimalId = capturedAnimal.id
    this.buildingId = buildingId
    this.accessPoint = accessPoint
    this.lastProgressPosition = { ...spawnPosition }

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDisplaySize(44, 50)
    this.setCircle(14, 11, 20)
    this.setTint(0x8cf5b2)
    this.setDepth(9)
    this.setCollideWorldBounds(true)
  }

  updateWorkMovement(time: number) {
    if (this.workerState === 'WORKING') {
      this.setVelocity(0, 0)
      return false
    }

    const offsetX = this.accessPoint.x - this.x
    const offsetY = this.accessPoint.y - this.y
    const distance = Math.hypot(offsetX, offsetY)

    if (distance <= 10) {
      this.setPosition(this.accessPoint.x, this.accessPoint.y)
      this.setVelocity(0, 0)
      this.workerState = 'WORKING'
      return true
    }

    const safeDistance = distance || 1
    this.setVelocity(
      (offsetX / safeDistance) * WORKER_MOVE_SPEED,
      (offsetY / safeDistance) * WORKER_MOVE_SPEED,
    )
    return this.recoverIfStuck(time)
  }

  playWorkAnimation() {
    this.scene.tweens.add({
      targets: this,
      angle: 10,
      duration: 90,
      yoyo: true,
      repeat: 3,
    })
  }

  private recoverIfStuck(time: number) {
    if (time < this.nextProgressCheckAt) {
      return false
    }

    const movedDistance = Phaser.Math.Distance.Between(
      this.lastProgressPosition.x,
      this.lastProgressPosition.y,
      this.x,
      this.y,
    )

    if (movedDistance < 3) {
      this.stuckSince ??= time

      if (time - this.stuckSince >= WORKER_STUCK_TIMEOUT_MS) {
        this.setPosition(this.accessPoint.x, this.accessPoint.y)

        if (this.body instanceof Phaser.Physics.Arcade.Body) {
          this.body.reset(this.accessPoint.x, this.accessPoint.y)
        }

        this.setVelocity(0, 0)
        this.workerState = 'WORKING'
        return true
      }
    } else {
      this.stuckSince = null
    }

    this.lastProgressPosition = { x: this.x, y: this.y }
    this.nextProgressCheckAt = time + 500
    return false
  }
}
