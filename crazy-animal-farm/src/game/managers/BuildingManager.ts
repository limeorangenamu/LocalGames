import Phaser from 'phaser'
import {
  BUILD_GRID_SIZE,
  WORKER_ACCESS_CLEARANCE,
} from '../config/gameConstants'
import { BUILDING_DEFINITIONS } from '../data/buildings'
import type {
  BuildingDefinition,
  BuildingDefinitionId,
  BuildingFootprint,
  BuildingRotation,
  PlacedBuilding,
} from '../types/building'
import type { CraftingStationId } from '../types/crafting'
import type { MapDefinition, WorldPoint } from '../types/map'

export type BuildingPlacementResult = Readonly<{
  building: PlacedBuilding | null
  message: string
}>

export class BuildingManager {
  private readonly scene: Phaser.Scene
  private readonly mapDefinition: MapDefinition
  private readonly buildingGroup: Phaser.Physics.Arcade.StaticGroup
  private readonly buildings = new Map<string, PlacedBuilding>()
  private readonly worldBuildingCounts = new Map<BuildingDefinitionId, number>()
  private readonly statusLabels = new Map<string, Phaser.GameObjects.Text>()
  private preview?: Phaser.GameObjects.Image
  private selectedDefinitionId: BuildingDefinitionId | null = null
  private previewRotation: BuildingRotation = 0
  private previewPosition: WorldPoint = { x: 0, y: 0 }
  private previewIsValid = false
  private previewMessage = ''
  private baseCoreId: string | null = null
  private buildingSequence = 0

  constructor(
    scene: Phaser.Scene,
    mapDefinition: MapDefinition,
    existingWorldBuildings: readonly PlacedBuilding[] = [],
  ) {
    this.scene = scene
    this.mapDefinition = mapDefinition
    this.buildingGroup = scene.physics.add.staticGroup()
    this.buildingSequence = existingWorldBuildings.length

    existingWorldBuildings.forEach((building) => {
      this.worldBuildingCounts.set(
        building.definitionId,
        (this.worldBuildingCounts.get(building.definitionId) ?? 0) + 1,
      )

      if (building.mapId === mapDefinition.id) {
        this.restoreBuilding(building)
      }
    })
  }

  beginPlacement(definitionId: BuildingDefinitionId) {
    const definition = BUILDING_DEFINITIONS[definitionId]

    this.selectedDefinitionId = definitionId
    this.previewRotation = 0

    if (!this.preview) {
      this.preview = this.scene.add.image(0, 0, definition.textureKey)
      this.preview.setDepth(30).setAlpha(0.58)
    }

    this.preview
      .setTexture(definition.textureKey)
      .setDisplaySize(definition.width, definition.height)
      .setAngle(this.previewRotation)
      .setVisible(true)
  }

  cancelPlacement() {
    this.selectedDefinitionId = null
    this.previewIsValid = false
    this.preview?.setVisible(false)
  }

  rotatePreview() {
    this.previewRotation = ((this.previewRotation + 90) % 360) as BuildingRotation
    this.preview?.setAngle(this.previewRotation)
  }

  updatePreview(worldPoint: WorldPoint) {
    if (!this.preview || !this.selectedDefinitionId) {
      return
    }

    const definition = BUILDING_DEFINITIONS[this.selectedDefinitionId]
    this.previewPosition = {
      x: Math.round(worldPoint.x / BUILD_GRID_SIZE) * BUILD_GRID_SIZE,
      y: Math.round(worldPoint.y / BUILD_GRID_SIZE) * BUILD_GRID_SIZE,
    }

    const dimensions = this.getRotatedDimensions(
      definition,
      this.previewRotation,
    )
    const validation = this.validatePlacement(
      definition,
      this.previewPosition,
      dimensions,
      this.previewRotation,
    )

    this.previewIsValid = validation.valid
    this.previewMessage = validation.message
    this.preview
      .setPosition(this.previewPosition.x, this.previewPosition.y)
      .setTint(validation.valid ? 0x8cf5b2 : 0xff6f6f)
  }

  placeSelected(): BuildingPlacementResult {
    if (!this.selectedDefinitionId || !this.previewIsValid) {
      return {
        building: null,
        message: this.previewMessage || '현재 위치에는 건설할 수 없습니다.',
      }
    }

    const definition = BUILDING_DEFINITIONS[this.selectedDefinitionId]
    const dimensions = this.getRotatedDimensions(
      definition,
      this.previewRotation,
    )
    const id = `${definition.id}-${Date.now()}-${this.buildingSequence}`
    const accessPoint = definition.work
      ? this.rotateOffset(
          this.previewPosition,
          definition.work.accessOffset,
          this.previewRotation,
        )
      : null
    const building: PlacedBuilding = {
      id,
      mapId: this.mapDefinition.id,
      definitionId: definition.id,
      name: definition.name,
      x: this.previewPosition.x,
      y: this.previewPosition.y,
      rotation: this.previewRotation,
      width: dimensions.width,
      height: dimensions.height,
      accessPoint,
      assignedAnimalIds: [],
    }

    this.buildingSequence += 1
    this.worldBuildingCounts.set(
      definition.id,
      (this.worldBuildingCounts.get(definition.id) ?? 0) + 1,
    )
    this.buildings.set(id, building)
    this.createBuildingGameObject(building, definition)

    if (definition.id === 'base-core') {
      this.baseCoreId = id
      this.drawBaseRadius(building, definition.baseRadius ?? 0)
    }

    if (definition.work) {
      this.createWorkStatusLabel(building)
    }

    return {
      building,
      message: `${definition.name}을(를) 설치했습니다.`,
    }
  }

  getSelectedBuildingName() {
    return this.selectedDefinitionId
      ? BUILDING_DEFINITIONS[this.selectedDefinitionId].name
      : null
  }

  getPreviewMessage() {
    return this.previewMessage
  }

  getBuildingGroup() {
    return this.buildingGroup
  }

  getCoreBuilding() {
    return this.baseCoreId ? this.buildings.get(this.baseCoreId) ?? null : null
  }

  getBuildingById(buildingId: string) {
    return this.buildings.get(buildingId) ?? null
  }

  getBuildings() {
    return [...this.buildings.values()]
  }

  findBuildingAt(position: WorldPoint) {
    return (
      [...this.buildings.values()]
        .reverse()
        .find(
          (building) =>
            position.x >= building.x - building.width / 2 &&
            position.x <= building.x + building.width / 2 &&
            position.y >= building.y - building.height / 2 &&
            position.y <= building.y + building.height / 2,
        ) ?? null
    )
  }

  findNearestWorkstation(position: WorldPoint, maximumDistance: number) {
    let nearest: PlacedBuilding | null = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const building of this.buildings.values()) {
      if (!BUILDING_DEFINITIONS[building.definitionId].work) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        position.x,
        position.y,
        building.x,
        building.y,
      )

      if (distance <= maximumDistance && distance < nearestDistance) {
        nearest = building
        nearestDistance = distance
      }
    }

    return nearest
  }

  findNearestCraftingStation(
    position: WorldPoint,
    maximumDistance: number,
    stationId?: CraftingStationId,
  ) {
    let nearest: PlacedBuilding | null = null
    let nearestDistance = Number.POSITIVE_INFINITY

    for (const building of this.buildings.values()) {
      const definition = BUILDING_DEFINITIONS[building.definitionId]

      if (
        !definition.craftingStationId ||
        (stationId && definition.craftingStationId !== stationId)
      ) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        position.x,
        position.y,
        building.x,
        building.y,
      )

      if (distance <= maximumDistance && distance < nearestDistance) {
        nearest = building
        nearestDistance = distance
      }
    }

    return nearest
  }

  setWorkStatus(buildingId: string, status: string) {
    this.statusLabels.get(buildingId)?.setText(status)
  }

  private validatePlacement(
    definition: BuildingDefinition,
    position: WorldPoint,
    dimensions: Readonly<{ width: number; height: number }>,
    rotation: BuildingRotation,
  ) {
    const footprint = this.toFootprint(position, dimensions)
    const accessFootprint = definition.work
      ? this.toAccessFootprint(
          this.rotateOffset(position, definition.work.accessOffset, rotation),
        )
      : null

    if (
      footprint.x < 0 ||
      footprint.y < 0 ||
      footprint.x + footprint.width > this.mapDefinition.width ||
      footprint.y + footprint.height > this.mapDefinition.height
    ) {
      return { valid: false, message: '맵 경계 밖에는 건설할 수 없습니다.' }
    }

    const existingCount = this.worldBuildingCounts.get(definition.id) ?? 0

    if (existingCount >= definition.maximumInstances) {
      return { valid: false, message: `${definition.name} 최대 개수에 도달했습니다.` }
    }

    if (this.overlapsForbiddenArea(footprint)) {
      return { valid: false, message: '맵 입구 주변에는 건설할 수 없습니다.' }
    }

    if (
      accessFootprint &&
      (!this.isFootprintInsideMap(accessFootprint) ||
        this.overlapsForbiddenArea(accessFootprint))
    ) {
      return {
        valid: false,
        message: '작업 동물이 설 접근 지점을 확보할 수 없습니다.',
      }
    }

    if (this.overlapsExistingAccessArea(footprint, accessFootprint)) {
      return {
        valid: false,
        message: '다른 작업대의 접근 지점을 막을 수 없습니다.',
      }
    }

    if (definition.requiresBaseRange) {
      const core = this.getCoreBuilding()
      const baseRadius = core
        ? BUILDING_DEFINITIONS[core.definitionId].baseRadius ?? 0
        : 0

      if (!core) {
        return { valid: false, message: '먼저 거점 코어를 설치해야 합니다.' }
      }

      if (
        !this.isFootprintWithinRadius(footprint, core, baseRadius) ||
        (accessFootprint &&
          !this.isFootprintWithinRadius(accessFootprint, core, baseRadius))
      ) {
        return { valid: false, message: '거점 코어 반경 안에 설치해야 합니다.' }
      }
    }

    const overlappingBodies = this.scene.physics.overlapRect(
      footprint.x,
      footprint.y,
      footprint.width,
      footprint.height,
      true,
      true,
    )

    if (overlappingBodies.some((body) => body.enable)) {
      return { valid: false, message: '다른 오브젝트와 겹쳐 설치할 수 없습니다.' }
    }

    if (accessFootprint) {
      const blockedAccessBodies = this.scene.physics.overlapRect(
        accessFootprint.x,
        accessFootprint.y,
        accessFootprint.width,
        accessFootprint.height,
        true,
        true,
      )

      if (blockedAccessBodies.some((body) => body.enable)) {
        return {
          valid: false,
          message: '작업 동물이 설 접근 지점이 막혀 있습니다.',
        }
      }
    }

    return { valid: true, message: '설치 가능한 위치입니다.' }
  }

  private overlapsForbiddenArea(footprint: BuildingFootprint) {
    const buildingRectangle = new Phaser.Geom.Rectangle(
      footprint.x,
      footprint.y,
      footprint.width,
      footprint.height,
    )

    return this.mapDefinition.buildForbiddenAreas.some((area) => {
      const forbiddenRectangle = new Phaser.Geom.Rectangle(
        area.x - area.width / 2,
        area.y - area.height / 2,
        area.width,
        area.height,
      )

      return Phaser.Geom.Intersects.RectangleToRectangle(
        buildingRectangle,
        forbiddenRectangle,
      )
    })
  }

  private isFootprintInsideMap(footprint: BuildingFootprint) {
    return (
      footprint.x >= 0 &&
      footprint.y >= 0 &&
      footprint.x + footprint.width <= this.mapDefinition.width &&
      footprint.y + footprint.height <= this.mapDefinition.height
    )
  }

  private overlapsExistingAccessArea(
    footprint: BuildingFootprint,
    accessFootprint: BuildingFootprint | null,
  ) {
    return [...this.buildings.values()].some((building) => {
      if (!building.accessPoint) {
        return false
      }

      const existingAccessFootprint = this.toAccessFootprint(
        building.accessPoint,
      )

      return (
        this.footprintsOverlap(footprint, existingAccessFootprint) ||
        (accessFootprint !== null &&
          this.footprintsOverlap(accessFootprint, existingAccessFootprint))
      )
    })
  }

  private footprintsOverlap(
    first: BuildingFootprint,
    second: BuildingFootprint,
  ) {
    return !(
      first.x + first.width <= second.x ||
      second.x + second.width <= first.x ||
      first.y + first.height <= second.y ||
      second.y + second.height <= first.y
    )
  }

  private isFootprintWithinRadius(
    footprint: BuildingFootprint,
    center: WorldPoint,
    radius: number,
  ) {
    const corners = [
      { x: footprint.x, y: footprint.y },
      { x: footprint.x + footprint.width, y: footprint.y },
      { x: footprint.x, y: footprint.y + footprint.height },
      {
        x: footprint.x + footprint.width,
        y: footprint.y + footprint.height,
      },
    ]

    return corners.every(
      (corner) =>
        Phaser.Math.Distance.Between(
          center.x,
          center.y,
          corner.x,
          corner.y,
        ) <= radius,
    )
  }

  private createBuildingGameObject(
    building: PlacedBuilding,
    definition: BuildingDefinition,
  ) {
    const gameObject = this.scene.physics.add.staticImage(
      building.x,
      building.y,
      definition.textureKey,
    )

    gameObject
      .setName(building.id)
      .setDisplaySize(definition.width, definition.height)
      .setAngle(building.rotation)
      .setDepth(6)
      .refreshBody()
    gameObject.body?.setSize(building.width, building.height, true)
    this.buildingGroup.add(gameObject)
  }

  private restoreBuilding(building: PlacedBuilding) {
    const definition = BUILDING_DEFINITIONS[building.definitionId]

    this.buildings.set(building.id, building)
    this.createBuildingGameObject(building, definition)

    if (building.definitionId === 'base-core') {
      this.baseCoreId = building.id
      this.drawBaseRadius(building, definition.baseRadius ?? 0)
    }

    if (definition.work) {
      this.createWorkStatusLabel(building)
    }
  }

  private drawBaseRadius(building: PlacedBuilding, radius: number) {
    const graphics = this.scene.add.graphics().setDepth(-1)

    graphics.fillStyle(0xffd65c, 0.06)
    graphics.fillCircle(building.x, building.y, radius)
    graphics.lineStyle(4, 0xffd65c, 0.42)
    graphics.strokeCircle(building.x, building.y, radius)
  }

  private createWorkStatusLabel(building: PlacedBuilding) {
    const label = this.scene.add.text(
      building.x,
      building.y - building.height / 2 - 10,
      '작업자 없음',
      {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#fff1c2',
        backgroundColor: '#17261dcc',
        padding: { x: 7, y: 4 },
      },
    )

    label.setOrigin(0.5, 1).setDepth(20)
    this.statusLabels.set(building.id, label)
  }

  private getRotatedDimensions(
    definition: BuildingDefinition,
    rotation: BuildingRotation,
  ) {
    return rotation % 180 === 0
      ? { width: definition.width, height: definition.height }
      : { width: definition.height, height: definition.width }
  }

  private toFootprint(
    position: WorldPoint,
    dimensions: Readonly<{ width: number; height: number }>,
  ): BuildingFootprint {
    return {
      x: position.x - dimensions.width / 2,
      y: position.y - dimensions.height / 2,
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  private toAccessFootprint(position: WorldPoint): BuildingFootprint {
    return {
      x: position.x - WORKER_ACCESS_CLEARANCE / 2,
      y: position.y - WORKER_ACCESS_CLEARANCE / 2,
      width: WORKER_ACCESS_CLEARANCE,
      height: WORKER_ACCESS_CLEARANCE,
    }
  }

  private rotateOffset(
    origin: WorldPoint,
    offset: WorldPoint,
    rotation: BuildingRotation,
  ) {
    const radians = Phaser.Math.DegToRad(rotation)

    return {
      x: origin.x + offset.x * Math.cos(radians) - offset.y * Math.sin(radians),
      y: origin.y + offset.x * Math.sin(radians) + offset.y * Math.cos(radians),
    }
  }
}
