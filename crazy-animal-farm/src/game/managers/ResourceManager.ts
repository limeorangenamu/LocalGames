import Phaser from 'phaser'
import { RESOURCE_RESPAWN_CHECK_INTERVAL_MS } from '../config/gameConstants'
import { RESOURCE_DEFINITIONS } from '../data/resources'
import { ResourceNode } from '../entities/ResourceNode'
import type { BuildingFootprint } from '../types/building'
import type { WorldPoint } from '../types/map'
import type {
  ResourceDrop,
  ResourceSpawnState,
  ResourceSpawnPoint,
} from '../types/resource'
import { getAttackTargetDistance } from '../utils/targeting'

type RuntimeResourceSpawnPoint = {
  id: string
  resourceDefinitionId: ResourceSpawnPoint['resourceDefinitionId']
  x: number
  y: number
  respawnAt: number | null
  blockedByBuilding: boolean
}

export type ResourceAttackResult = Readonly<{
  targetId: string
  remainingHp: number
  drop: ResourceDrop | null
}>

export class ResourceManager {
  private readonly scene: Phaser.Scene
  private readonly resourceGroup: Phaser.Physics.Arcade.Group
  private readonly spawnPoints = new Map<string, RuntimeResourceSpawnPoint>()
  private readonly nodes = new Map<string, ResourceNode>()
  private nextRespawnCheckAt = 0

  constructor(
    scene: Phaser.Scene,
    spawnPoints: readonly ResourceSpawnPoint[],
    savedStates: readonly ResourceSpawnState[] = [],
  ) {
    this.scene = scene
    this.resourceGroup = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    })

    const savedStatesById = new Map(
      savedStates.map((savedState) => [savedState.id, savedState]),
    )

    spawnPoints.forEach((spawnPoint) => {
      const savedState = savedStatesById.get(spawnPoint.id)

      this.spawnPoints.set(spawnPoint.id, {
        ...spawnPoint,
        respawnAt: savedState ? savedState.respawnAt : spawnPoint.respawnAt,
        blockedByBuilding:
          savedState?.blockedByBuilding ?? spawnPoint.blockedByBuilding,
      })
    })
  }

  createResources() {
    this.spawnPoints.forEach((spawnPoint) => {
      const definition = RESOURCE_DEFINITIONS[spawnPoint.resourceDefinitionId]
      const node = new ResourceNode(this.scene, definition, spawnPoint)

      this.nodes.set(spawnPoint.id, node)
      this.resourceGroup.add(node)

      if (spawnPoint.respawnAt !== null) {
        if (
          spawnPoint.respawnAt <= Date.now() &&
          !spawnPoint.blockedByBuilding
        ) {
          spawnPoint.respawnAt = null
        } else {
          node.deplete()
        }
      }
    })

    return this.resourceGroup
  }

  attack(target: ResourceNode, damage: number): ResourceAttackResult | null {
    if (!target.active) {
      return null
    }

    const damageResult = target.takeDamage(damage)
    let drop: ResourceDrop | null = null

    if (damageResult.depleted) {
      const spawnPoint = this.spawnPoints.get(target.spawnPointId)

      if (spawnPoint) {
        spawnPoint.respawnAt = Date.now() + target.definition.respawnDelayMs
      }

      drop = target.definition.drop
      target.deplete()
    }

    return {
      targetId: target.spawnPointId,
      remainingHp: damageResult.remainingHp,
      drop,
    }
  }

  update(sceneTime: number) {
    if (sceneTime < this.nextRespawnCheckAt) {
      return
    }

    const now = Date.now()

    this.spawnPoints.forEach((spawnPoint) => {
      if (
        spawnPoint.respawnAt === null ||
        spawnPoint.respawnAt > now ||
        spawnPoint.blockedByBuilding
      ) {
        return
      }

      const node = this.nodes.get(spawnPoint.id)

      if (node) {
        node.respawn(spawnPoint.x, spawnPoint.y)
        spawnPoint.respawnAt = null
      }
    })

    this.nextRespawnCheckAt = sceneTime + RESOURCE_RESPAWN_CHECK_INTERVAL_MS
  }

  setSpawnBlocked(spawnPointId: string, blocked: boolean) {
    const spawnPoint = this.spawnPoints.get(spawnPointId)

    if (spawnPoint) {
      spawnPoint.blockedByBuilding = blocked
    }
  }

  getSpawnStates(): readonly ResourceSpawnState[] {
    return [...this.spawnPoints.values()].map((spawnPoint) => ({
      id: spawnPoint.id,
      respawnAt: spawnPoint.respawnAt,
      blockedByBuilding: spawnPoint.blockedByBuilding,
    }))
  }

  blockSpawnsWithinFootprint(footprint: BuildingFootprint) {
    this.spawnPoints.forEach((spawnPoint) => {
      const definition = RESOURCE_DEFINITIONS[spawnPoint.resourceDefinitionId]
      const horizontalReach = footprint.width / 2 + definition.width / 2
      const verticalReach = footprint.height / 2 + definition.height / 2
      const footprintCenterX = footprint.x + footprint.width / 2
      const footprintCenterY = footprint.y + footprint.height / 2

      if (
        Math.abs(spawnPoint.x - footprintCenterX) <= horizontalReach &&
        Math.abs(spawnPoint.y - footprintCenterY) <= verticalReach
      ) {
        spawnPoint.blockedByBuilding = true
      }
    })
  }

  findClosestTarget(
    origin: WorldPoint,
    aimPoint: WorldPoint,
    attackRange: number,
  ) {
    let closestNode: ResourceNode | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    for (const node of this.nodes.values()) {
      if (!node.active) {
        continue
      }

      const distance = getAttackTargetDistance(
        origin,
        aimPoint,
        node,
        node.displayWidth,
        node.displayHeight,
        attackRange,
      )

      if (distance !== null && distance < closestDistance) {
        closestDistance = distance
        closestNode = node
      }
    }

    return closestNode
  }
}
