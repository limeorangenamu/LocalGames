import Phaser from 'phaser'
import { ANIMAL_DEFINITIONS } from '../data/animals'
import { BUILDING_DEFINITIONS } from '../data/buildings'
import { WorkerAnimal } from '../entities/WorkerAnimal'
import type { CapturedAnimal } from '../types/animal'
import type {
  PlacedBuilding,
  WorkProductionEvent,
} from '../types/building'
import type { WorldPoint } from '../types/map'
import type { WorkAssignment } from '../types/work'

type RuntimeWorkAssignment = {
  animal: CapturedAnimal
  building: PlacedBuilding
  worker: WorkerAnimal
  nextProductionAt: number
}

export type AssignWorkerResult = Readonly<{
  assignment: WorkAssignment | null
  message: string
}>

export class WorkManager {
  private readonly scene: Phaser.Scene
  private readonly workerGroup: Phaser.Physics.Arcade.Group
  private readonly assignments = new Map<string, RuntimeWorkAssignment>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.workerGroup = scene.physics.add.group({
      allowGravity: false,
      collideWorldBounds: true,
    })
  }

  assignWorker(
    capturedAnimal: CapturedAnimal,
    building: PlacedBuilding,
    spawnPosition: WorldPoint,
    time: number,
  ): AssignWorkerResult {
    const buildingDefinition = BUILDING_DEFINITIONS[building.definitionId]
    const work = buildingDefinition.work

    if (capturedAnimal.condition === 'incapacitated') {
      return { assignment: null, message: '기절한 동물은 작업에 배치할 수 없습니다.' }
    }

    if (this.assignments.has(capturedAnimal.id)) {
      return { assignment: null, message: '이미 작업자로 생성된 동물입니다.' }
    }

    if (!work || !building.accessPoint) {
      return { assignment: null, message: '작업 기능이 없는 건물입니다.' }
    }

    const assignedSlotCount = [...this.assignments.values()].filter(
      (assignment) => assignment.building.id === building.id,
    ).length

    if (assignedSlotCount >= work.slots) {
      return { assignment: null, message: '벌목 작업대의 작업 슬롯이 찼습니다.' }
    }

    if (capturedAnimal.workAssignment) {
      return { assignment: null, message: '이미 다른 작업에 배치된 동물입니다.' }
    }

    if ((capturedAnimal.workSkills[work.requiredSkill] ?? 0) <= 0) {
      return {
        assignment: null,
        message: `${capturedAnimal.name}에게 필요한 작업 능력이 없습니다.`,
      }
    }

    const animalDefinition = ANIMAL_DEFINITIONS[capturedAnimal.animalDefinitionId]

    if (!animalDefinition) {
      return { assignment: null, message: '동물 정의를 찾지 못했습니다.' }
    }

    const worker = new WorkerAnimal(
      this.scene,
      capturedAnimal,
      building.id,
      animalDefinition.textureKey,
      spawnPosition,
      building.accessPoint,
    )

    this.workerGroup.add(worker)
    this.assignments.set(capturedAnimal.id, {
      animal: capturedAnimal,
      building,
      worker,
      nextProductionAt:
        time + getAdjustedWorkInterval(work.intervalMs, capturedAnimal),
    })

    return {
      assignment: {
        buildingId: building.id,
        skill: work.requiredSkill,
      },
      message: `${capturedAnimal.name}을(를) 벌목 작업대에 배치했습니다.`,
    }
  }

  restoreWorker(
    capturedAnimal: CapturedAnimal,
    building: PlacedBuilding,
    spawnPosition: WorldPoint,
    time: number,
  ) {
    const buildingDefinition = BUILDING_DEFINITIONS[building.definitionId]
    const work = buildingDefinition.work

    if (
      !work ||
      !building.accessPoint ||
      !capturedAnimal.workAssignment ||
      capturedAnimal.condition === 'incapacitated' ||
      capturedAnimal.workAssignment.buildingId !== building.id ||
      this.assignments.has(capturedAnimal.id)
    ) {
      return false
    }

    const assignedSlotCount = [...this.assignments.values()].filter(
      (assignment) => assignment.building.id === building.id,
    ).length
    const animalDefinition = ANIMAL_DEFINITIONS[capturedAnimal.animalDefinitionId]

    if (!animalDefinition || assignedSlotCount >= work.slots) {
      return false
    }

    const worker = new WorkerAnimal(
      this.scene,
      capturedAnimal,
      building.id,
      animalDefinition.textureKey,
      spawnPosition,
      building.accessPoint,
    )

    this.workerGroup.add(worker)
    this.assignments.set(capturedAnimal.id, {
      animal: capturedAnimal,
      building,
      worker,
      nextProductionAt:
        time + getAdjustedWorkInterval(work.intervalMs, capturedAnimal),
    })
    return true
  }

  update(time: number): readonly WorkProductionEvent[] {
    const productionEvents: WorkProductionEvent[] = []

    this.assignments.forEach((assignment) => {
      const work = BUILDING_DEFINITIONS[assignment.building.definitionId].work

      if (!work) {
        return
      }

      const startedWorking = assignment.worker.updateWorkMovement(time)

      if (startedWorking) {
        assignment.nextProductionAt =
          time + getAdjustedWorkInterval(work.intervalMs, assignment.animal)
      }

      if (
        assignment.worker.workerState !== 'WORKING' ||
        time < assignment.nextProductionAt
      ) {
        return
      }

      assignment.nextProductionAt =
        time + getAdjustedWorkInterval(work.intervalMs, assignment.animal)
      assignment.worker.playWorkAnimation()
      productionEvents.push({
        buildingId: assignment.building.id,
        animalId: assignment.animal.id,
        output: work.output,
      })
    })

    return productionEvents
  }

  synchronizeAssignments(
    capturedAnimals: readonly CapturedAnimal[],
  ): readonly string[] {
    const capturedAnimalById = new Map(
      capturedAnimals.map((animal) => [animal.id, animal] as const),
    )
    const releasedBuildingIds: string[] = []

    this.assignments.forEach((assignment, animalId) => {
      const persistedAnimal = capturedAnimalById.get(animalId)

      if (
        persistedAnimal?.condition !== 'incapacitated' &&
        persistedAnimal?.workAssignment?.buildingId ===
        assignment.building.id
      ) {
        return
      }

      releasedBuildingIds.push(assignment.building.id)
      assignment.worker.destroy()
      this.assignments.delete(animalId)
    })

    return releasedBuildingIds
  }

  getWorkerGroup() {
    return this.workerGroup
  }

  getActiveWorkerCount() {
    return this.assignments.size
  }
}

function getAdjustedWorkInterval(
  baseIntervalMs: number,
  animal: CapturedAnimal,
) {
  return Math.max(
    500,
    Math.round(baseIntervalMs * (100 / animal.stats.workSpeed)),
  )
}
