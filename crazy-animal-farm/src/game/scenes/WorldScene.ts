import Phaser from 'phaser'
import {
  useGameStore,
  type AnimalGrowthEvent,
} from '../../store/useGameStore'
import {
  AUTO_SAVE_INTERVAL_MS,
  ANIMAL_STORAGE_RECOVERY_INTERVAL_MS,
  ANIMAL_TRUST_INTERVAL_MS,
  CAPTURE_PROJECTILE_RADIUS,
  CAPTURE_THROW_RANGE,
  COMPANION_COMMAND_TARGET_RADIUS,
  HUNGER_DRAIN_AMOUNT,
  HUNGER_DRAIN_INTERVAL_MS,
  HUD_SYNC_INTERVAL_MS,
  MAP_FADE_DURATION_MS,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_RANGE,
  PLAYER_PROJECTILE_HIT_RADIUS,
  RESPAWN_HUNGER,
  STARVATION_DAMAGE,
  STARVATION_DAMAGE_INTERVAL_MS,
  WORKER_ACCESS_CLEARANCE,
} from '../config/gameConstants'
import { BUILDING_DEFINITIONS } from '../data/buildings'
import {
  ANIMAL_ELEMENTS,
  getElementEffectivenessLabel,
} from '../data/animalElements'
import { TOOL_DEFINITIONS } from '../data/equipment'
import {
  CAPTURE_SUPPORT_MODULES,
  CAPTURE_TOOL_DEFINITIONS,
  resolveActiveCaptureToolItemId,
} from '../data/capture'
import { getMapDefinition, isMapId } from '../data/maps'
import {
  Animal,
  type AnimalCaptureSnapshot,
} from '../entities/Animal'
import { CaptureCapsule } from '../entities/CaptureCapsule'
import { Player } from '../entities/Player'
import { PlayerProjectile } from '../entities/PlayerProjectile'
import {
  AnimalManager,
  type AnimalAttackResult,
  type CaptureAttemptResult,
} from '../managers/AnimalManager'
import { BuildingManager } from '../managers/BuildingManager'
import { CompanionManager } from '../managers/CompanionManager'
import { MapManager } from '../managers/MapManager'
import { ResourceManager } from '../managers/ResourceManager'
import { WorkManager } from '../managers/WorkManager'
import { SaveService } from '../services/SaveService'
import type { BuildingDefinitionId, PlacedBuilding } from '../types/building'
import type { CompanionCommandMode } from '../types/animal'
import type {
  CapturePreviewState,
  CaptureToolItemId,
} from '../types/capture'
import type {
  EquippedItems,
  ToolDefinitionId,
} from '../types/equipment'
import type { ItemStack } from '../types/item'
import type { MapExitDefinition, MapId } from '../types/map'
import type { GameSavePayload, MapSaveData } from '../types/save'
import type { SaveSlotId } from '../types/save'
import {
  calculateCaptureChanceBreakdown,
  getCaptureChanceLabel,
} from '../utils/capture'
import { getPlayerActionResourceProfile } from '../utils/playerActionResources'
import { getPlayerArmorRating } from '../utils/playerCombat'

export class WorldScene extends Phaser.Scene {
  private player?: Player
  private animalManager?: AnimalManager
  private companionManager?: CompanionManager
  private buildingManager?: BuildingManager
  private mapManager?: MapManager
  private resourceManager?: ResourceManager
  private workManager?: WorkManager
  private readonly saveService = new SaveService()
  private captureModeKey?: Phaser.Input.Keyboard.Key
  private buildModeKey?: Phaser.Input.Keyboard.Key
  private craftModeKey?: Phaser.Input.Keyboard.Key
  private rotateBuildingKey?: Phaser.Input.Keyboard.Key
  private cancelModeKey?: Phaser.Input.Keyboard.Key
  private mapKey?: Phaser.Input.Keyboard.Key
  private selectCoreKey?: Phaser.Input.Keyboard.Key
  private selectLoggingStationKey?: Phaser.Input.Keyboard.Key
  private selectPrimitiveWorkbenchKey?: Phaser.Input.Keyboard.Key
  private interactKey?: Phaser.Input.Keyboard.Key
  private companionSelectKey?: Phaser.Input.Keyboard.Key
  private companionSummonKey?: Phaser.Input.Keyboard.Key
  private companionCommandKey?: Phaser.Input.Keyboard.Key
  private captureAimGraphics?: Phaser.GameObjects.Graphics
  private activeCaptureCapsule?: CaptureCapsule
  private readonly playerProjectiles = new Set<PlayerProjectile>()
  private captureSequenceInProgress = false
  private isCaptureMode = false
  private isBuildMode = false
  private isCraftMode = false
  private wasLeftButtonDown = false
  private wasRightButtonDown = false
  private nextHudSyncAt = 0
  private nextAutoSaveAt = 0
  private nextHungerDrainAt = 0
  private nextStarvationDamageAt = 0
  private nextAnimalRecoveryAt = 0
  private nextCompanionTrustAt = 0
  private mapTransitionInProgress = false
  private physicsPausedForUi = false
  private uiPauseStartedAt: number | null = null
  private handledManualSaveRequestId = 0
  private lastEquippedToolId: ToolDefinitionId = 'bare-hands'
  private lastEquippedShieldId: ToolDefinitionId | null = null
  private lastActionResourceEquipmentSignature = ''
  private requestedMapId: string | null = null
  private requestedEntryId: string | null = null

  constructor() {
    super('world')
  }

  init(data: Readonly<{ mapId?: string; entryId?: string }> = {}) {
    this.requestedMapId = data.mapId ?? null
    this.requestedEntryId = data.entryId ?? null
  }

  create() {
    this.resetRuntimeState()
    const restoredSavedGame = this.hydrateSavedGame()

    const gameStore = useGameStore.getState()
    const mapDefinition = getMapDefinition(
      this.requestedMapId ?? gameStore.currentMapId,
    )
    const requestedEntry = this.requestedEntryId
      ? mapDefinition.entryPoints[this.requestedEntryId]
      : null
    const savedPosition =
      gameStore.currentMapId === mapDefinition.id
        ? gameStore.playerWorldPosition
        : null
    const initialPosition = requestedEntry ?? savedPosition ?? mapDefinition.playerSpawn
    const x = Phaser.Math.Clamp(initialPosition.x, 32, mapDefinition.width - 32)
    const y = Phaser.Math.Clamp(initialPosition.y, 32, mapDefinition.height - 32)

    this.mapManager = new MapManager(this, mapDefinition)
    const obstacles = this.mapManager.createWorld()

    this.player = new Player(this, x, y)
    this.player.restoreHp(gameStore.playerHp)
    this.player.configureShield(
      gameStore.playerMaxShield,
      gameStore.playerShield,
    )
    this.player.equipTool(TOOL_DEFINITIONS[gameStore.equippedToolId])
    this.player.configureActionResources(
      getPlayerActionResourceProfile(
        gameStore.equippedToolId,
        gameStore.equippedItems,
      ),
      gameStore.playerStamina,
    )
    this.player.configureArmorRating(
      getPlayerArmorRating(
        gameStore.equippedItems,
        gameStore.equipmentDurability,
      ),
    )
    this.lastEquippedToolId = gameStore.equippedToolId
    this.lastEquippedShieldId =
      gameStore.equippedItems.shield ?? null
    this.lastActionResourceEquipmentSignature =
      this.getActionResourceEquipmentSignature(
        gameStore.equippedToolId,
        gameStore.equippedItems,
      )
    this.physics.add.collider(this.player, obstacles)

    this.resourceManager = new ResourceManager(
      this,
      mapDefinition.resourceSpawns,
      gameStore.mapResourceStates[mapDefinition.id] ?? [],
    )
    const resources = this.resourceManager.createResources()
    this.physics.add.collider(this.player, resources)

    this.animalManager = new AnimalManager(this)
    const animals = this.animalManager.createAnimals(
      mapDefinition.animalSpawns,
    )
    this.physics.add.collider(this.player, animals)
    this.physics.add.collider(animals, obstacles)
    this.physics.add.collider(animals, resources)

    this.buildingManager = new BuildingManager(
      this,
      mapDefinition,
      gameStore.placedBuildings,
    )
    this.buildingManager
      .getBuildings()
      .forEach((building) => this.blockBuildingResourceSpawns(building))
    this.workManager = new WorkManager(this)
    const buildings = this.buildingManager.getBuildingGroup()
    const workers = this.workManager.getWorkerGroup()
    this.companionManager = new CompanionManager(this)
    const companions = this.companionManager.getPhysicsGroup()

    this.physics.add.collider(this.player, buildings)
    this.physics.add.collider(animals, buildings)
    this.physics.add.collider(companions, obstacles)
    this.physics.add.collider(companions, resources)
    this.physics.add.collider(companions, buildings)
    this.physics.add.collider(companions, animals)
    this.physics.add.collider(workers, obstacles)
    this.physics.add.collider(workers, resources)
    this.physics.add.collider(workers, buildings)

    this.restoreCurrentMapWorkers()

    this.captureModeKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.Q,
    )
    this.buildModeKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.B,
    )
    this.craftModeKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.C,
    )
    this.rotateBuildingKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.R,
    )
    this.cancelModeKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    )
    this.mapKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.M,
    )
    this.selectCoreKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ONE,
    )
    this.selectLoggingStationKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.TWO,
    )
    this.selectPrimitiveWorkbenchKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.THREE,
    )
    this.interactKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.E,
    )
    this.companionSelectKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.G,
    )
    this.companionSummonKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.F,
    )
    this.companionCommandKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.V,
    )
    this.input.mouse?.disableContextMenu()
    this.captureAimGraphics = this.add.graphics().setDepth(22)

    const camera = this.cameras.main
    camera.startFollow(this.player, true, 0.12, 0.12)
    camera.setDeadzone(120, 80)
    camera.setBackgroundColor(mapDefinition.backgroundColor)
    camera.fadeIn(MAP_FADE_DURATION_MS, 0, 0, 0)

    gameStore.setActiveMode('normal')
    gameStore.setCapturePreview(null)
    gameStore.setCaptureMessage('')
    gameStore.setSelectedBuildingName(null)
    gameStore.setBuildMessage('')
    gameStore.setTravelMessage('')
    gameStore.setCraftMessage('')
    gameStore.setGameMenuOpen(false)
    gameStore.setMapOpen(false)
    gameStore.setBaseStorageOpen(false)
    gameStore.setCraftingWorkbenchOpen(false)
    gameStore.setCompanionTargetName(null)
    gameStore.setActiveWorkerCount(
      this.workManager.getActiveWorkerCount(),
    )
    gameStore.setCurrentMap(mapDefinition.id, mapDefinition.name)
    gameStore.setPlayerHp(this.player.currentHp)
    this.syncPlayerActionResourceState()
    gameStore.setPlayerWorldPosition({ x, y })
    const recoveryEvent = gameStore.recoverStoredAnimals(Date.now())
    this.synchronizeCompanionState()
    this.nextAutoSaveAt = this.time.now + AUTO_SAVE_INTERVAL_MS
    this.nextHungerDrainAt = this.time.now + HUNGER_DRAIN_INTERVAL_MS
    this.nextStarvationDamageAt =
      this.time.now + STARVATION_DAMAGE_INTERVAL_MS
    this.nextAnimalRecoveryAt =
      this.time.now + ANIMAL_STORAGE_RECOVERY_INTERVAL_MS
    this.nextCompanionTrustAt =
      this.time.now + ANIMAL_TRUST_INTERVAL_MS
    this.handledManualSaveRequestId = gameStore.manualSaveRequestId
    window.addEventListener('beforeunload', this.handleBeforeUnload)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
    })

    if (recoveryEvent.revivedAnimalNames.length > 0) {
      gameStore.setCompanionMessage(
        `${recoveryEvent.revivedAnimalNames.join(', ')}의 기절 회복이 완료되었습니다.`,
      )
    }

    if (!restoredSavedGame) {
      const startingSlotId = this.saveService.getActiveLoadSlot()

      if (startingSlotId !== 'auto') {
        this.saveCurrentGame(
          `${this.getSaveSlotNumberLabel(startingSlotId)}에 새 게임을 등록했습니다.`,
          startingSlotId,
        )
      }

      this.saveCurrentGame('새 게임을 자동저장 슬롯에 등록했습니다.')
    } else if (this.requestedMapId) {
      this.saveCurrentGame('지역 이동 완료 상태를 저장했습니다.')
    }
  }

  private resetRuntimeState() {
    this.player = undefined
    this.animalManager = undefined
    this.companionManager = undefined
    this.buildingManager = undefined
    this.mapManager = undefined
    this.resourceManager = undefined
    this.workManager = undefined
    this.captureModeKey = undefined
    this.buildModeKey = undefined
    this.craftModeKey = undefined
    this.rotateBuildingKey = undefined
    this.cancelModeKey = undefined
    this.mapKey = undefined
    this.selectCoreKey = undefined
    this.selectLoggingStationKey = undefined
    this.selectPrimitiveWorkbenchKey = undefined
    this.interactKey = undefined
    this.companionSelectKey = undefined
    this.companionSummonKey = undefined
    this.companionCommandKey = undefined
    this.captureAimGraphics = undefined
    this.activeCaptureCapsule = undefined
    this.playerProjectiles.clear()
    this.captureSequenceInProgress = false
    this.isCaptureMode = false
    this.isBuildMode = false
    this.isCraftMode = false
    this.wasLeftButtonDown = false
    this.wasRightButtonDown = false
    this.nextHudSyncAt = 0
    this.nextAutoSaveAt = 0
    this.nextHungerDrainAt = 0
    this.nextStarvationDamageAt = 0
    this.nextAnimalRecoveryAt = 0
    this.nextCompanionTrustAt = 0
    this.mapTransitionInProgress = false
    this.physicsPausedForUi = false
    this.uiPauseStartedAt = null
    this.handledManualSaveRequestId = 0
    this.lastEquippedToolId = 'bare-hands'
    this.lastEquippedShieldId = null
    this.lastActionResourceEquipmentSignature = ''
  }

  private hydrateSavedGame() {
    const gameStore = useGameStore.getState()

    if (gameStore.saveHydrated) {
      return true
    }

    const savedGame = this.saveService.load()

    if (savedGame) {
      gameStore.hydrateFromSave(savedGame)
      return true
    } else {
      gameStore.markSaveHydrated()
      return false
    }
  }

  private restoreCurrentMapWorkers() {
    const buildingManager = this.buildingManager
    const workManager = this.workManager

    if (!buildingManager || !workManager) {
      return
    }

    const gameStore = useGameStore.getState()
    gameStore.capturedAnimals.forEach((capturedAnimal) => {
      const buildingId = capturedAnimal.workAssignment?.buildingId

      if (!buildingId) {
        return
      }

      const building = buildingManager.getBuildingById(buildingId)

      if (!building?.accessPoint) {
        return
      }

      if (
        workManager.restoreWorker(
          capturedAnimal,
          building,
          building.accessPoint,
          this.time.now,
        )
      ) {
        buildingManager.setWorkStatus(building.id, '벌목 작업 중')
      }
    })
  }

  private beginMapTransition(exit: MapExitDefinition) {
    if (this.mapTransitionInProgress || !this.player) {
      return
    }

    this.mapTransitionInProgress = true
    this.player.setVelocity(0, 0)
    useGameStore
      .getState()
      .setTravelMessage(`${exit.name}(으)로 이동하는 중입니다.`)
    this.cameras.main.fadeOut(MAP_FADE_DURATION_MS, 0, 0, 0)
    this.time.delayedCall(MAP_FADE_DURATION_MS, () => {
      this.saveCurrentGame('맵 이동 전 자동 저장했습니다.')
      this.scene.restart({
        mapId: exit.targetMapId,
        entryId: exit.targetEntryId,
      })
    })
  }

  private syncRuntimeState() {
    if (!this.player || !this.mapManager || !this.resourceManager) {
      return
    }

    const gameStore = useGameStore.getState()

    gameStore.setPlayerHp(this.player.currentHp)
    gameStore.setPlayerShieldState(
      this.player.currentShield,
      this.player.maxShield,
    )
    this.syncPlayerActionResourceState()
    gameStore.setPlayerWorldPosition({ x: this.player.x, y: this.player.y })
    gameStore.setMapResourceStates(
      this.mapManager.definition.id,
      this.resourceManager.getSpawnStates(),
    )
  }

  private saveCurrentGame(
    successMessage: string,
    slotId: SaveSlotId = 'auto',
  ) {
    this.syncRuntimeState()

    const gameStore = useGameStore.getState()
    const maps: Partial<Record<MapId, MapSaveData>> = {}

    Object.entries(gameStore.mapResourceStates).forEach(
      ([mapId, resourceStates]) => {
        if (isMapId(mapId) && resourceStates) {
          maps[mapId] = {
            resources: [...resourceStates],
            processedEventIds: [],
          }
        }
      },
    )

    const payload: GameSavePayload = {
      player: {
        currentMapId: gameStore.currentMapId,
        position: { ...gameStore.playerWorldPosition },
        hp: gameStore.playerHp,
        hunger: gameStore.playerHunger,
        level: gameStore.playerLevel,
        experience: gameStore.playerExperience,
        experienceToNextLevel: gameStore.playerExperienceToNextLevel,
        capturePower: gameStore.playerCapturePower,
        equippedCaptureSupportModuleId:
          gameStore.equippedCaptureSupportModuleId,
        technologyPoints: gameStore.technologyPoints,
        unlockedRecipeIds: [...gameStore.unlockedRecipeIds],
        shield: gameStore.playerShield,
        maxShield: gameStore.playerMaxShield,
        stamina: gameStore.playerStamina,
        ownedToolIds: [...gameStore.ownedToolIds],
        equippedToolId: gameStore.equippedToolId,
        equippedItems: { ...gameStore.equippedItems },
        equipmentDurability: { ...gameStore.equipmentDurability },
        hotbarSlots: gameStore.hotbarSlots.map((slot) =>
          slot ? { ...slot } : null,
        ),
        selectedHotbarIndex: gameStore.selectedHotbarIndex,
        activeAnimalPartyIds: [...gameStore.activeAnimalPartyIds],
        selectedCompanionAnimalId: gameStore.selectedCompanionAnimalId,
        summonedCompanionAnimalId: gameStore.summonedCompanionAnimalId,
        companionCommandMode: gameStore.companionCommandMode,
      },
      inventory: { ...gameStore.inventory },
      capturedAnimals: [...gameStore.capturedAnimals],
      bases: [
        {
          id: 'primary-base',
          storage: { ...gameStore.baseStorage },
          buildings: [...gameStore.placedBuildings],
        },
      ],
      maps,
    }
    const result = this.saveService.save(payload, slotId)

    gameStore.setSaveStatus(
      result.success ? result.savedAt : gameStore.lastSavedAt,
      result.success ? successMessage : result.message,
    )
    return result
  }

  private readonly handleBeforeUnload = () => {
    if (this.saveService.hasPendingLoadOnRestart()) {
      return
    }

    this.saveCurrentGame('브라우저 종료 전 저장했습니다.')
  }

  update(time: number, delta: number) {
    if (!this.player) {
      return
    }

    this.updateUiToggle()
    this.syncEquippedTool()
    this.handleManualSaveRequest()

    if (this.syncUiPause()) {
      return
    }

    if (this.mapTransitionInProgress) {
      this.player.setVelocity(0, 0)
      return
    }

    this.updateCompanionControls()
    this.synchronizeCompanionState()
    this.player.updateMovement(time, delta)
    this.updateCaptureMode()
    this.updateBuildMode()
    this.updateCraftMode()
    this.updateBuildControls()
    this.updateCraftControls()
    this.updateBuildPreview()
    this.updateHunger(time)
    this.player.updateShield(time)
    this.resourceManager?.update(time)
    this.updateStoredAnimalRecovery(time)
    this.updateCompanionTrust(time)
    const playerDamaged = this.animalManager?.update(time, this.player) ?? false

    if (playerDamaged) {
      const gameStore = useGameStore.getState()
      gameStore.damageEquippedDefensiveItems(1)

      gameStore.setPlayerHp(this.player.currentHp)
      gameStore.setPlayerShieldState(
        this.player.currentShield,
        this.player.maxShield,
      )

      if (this.player.currentHp === 0) {
        this.respawnPlayer()
      }
    }

    this.updateCompanion(time)
    this.handleInteraction(time)

    if (this.mapTransitionInProgress) {
      return
    }

    this.processWorkProduction(time)
    this.handlePrimaryInput(time)
    this.updatePlayerProjectiles(time)
    this.handleCompanionTargetInput()
    this.updateCaptureProjectile()
    this.updateCaptureAimPreview()

    if (time >= this.nextAutoSaveAt) {
      this.saveCurrentGame('30초 자동 저장을 완료했습니다.')
      this.nextAutoSaveAt = time + AUTO_SAVE_INTERVAL_MS
    }

    if (time < this.nextHudSyncAt || !this.mapManager) {
      return
    }

    const gameStore = useGameStore.getState()
    gameStore.setPlayerWorldPosition({ x: this.player.x, y: this.player.y })
    gameStore.setPlayerShieldState(
      this.player.currentShield,
      this.player.maxShield,
    )
    this.syncPlayerActionResourceState()
    const nearbyExit = this.mapManager.findExitAt(this.player)
    gameStore.setTravelMessage(
      nearbyExit ? `E · ${nearbyExit.name}(으)로 이동` : '',
    )
    this.syncCapturePreview()

    if (this.isBuildMode && this.buildingManager) {
      gameStore.setBuildMessage(this.buildingManager.getPreviewMessage())
    }

    this.nextHudSyncAt = time + HUD_SYNC_INTERVAL_MS
  }

  private updateHunger(time: number) {
    if (!this.player) {
      return
    }

    const gameStore = useGameStore.getState()

    if (time >= this.nextHungerDrainAt) {
      const elapsedIntervals =
        Math.floor(
          (time - this.nextHungerDrainAt) / HUNGER_DRAIN_INTERVAL_MS,
        ) + 1
      gameStore.setPlayerHunger(
        gameStore.playerHunger - elapsedIntervals * HUNGER_DRAIN_AMOUNT,
      )
      this.nextHungerDrainAt +=
        elapsedIntervals * HUNGER_DRAIN_INTERVAL_MS
    }

    const currentHunger = useGameStore.getState().playerHunger

    if (currentHunger > 0) {
      this.nextStarvationDamageAt =
        time + STARVATION_DAMAGE_INTERVAL_MS
      return
    }

    if (time < this.nextStarvationDamageAt) {
      return
    }

    this.nextStarvationDamageAt = time + STARVATION_DAMAGE_INTERVAL_MS
    const tookDamage = this.player.takeDamage(
      STARVATION_DAMAGE,
      { x: this.player.x, y: this.player.y },
      time,
      true,
    )

    if (!tookDamage) {
      return
    }

    gameStore.setPlayerHp(this.player.currentHp)
    gameStore.setHungerMessage('허기가 바닥나 체력이 감소하고 있습니다.')

    if (this.player.currentHp === 0) {
      this.respawnPlayer()
    }
  }

  private updateUiToggle() {
    const gameStore = useGameStore.getState()

    if (
      this.mapKey &&
      Phaser.Input.Keyboard.JustDown(this.mapKey)
    ) {
      const shouldOpenMap = !gameStore.isMapOpen

      if (shouldOpenMap) {
        this.exitGameplayModesForMenu()
      }

      gameStore.setMapOpen(shouldOpenMap)
      return
    }

    if (
      !this.cancelModeKey ||
      !Phaser.Input.Keyboard.JustDown(this.cancelModeKey)
    ) {
      return
    }

    if (gameStore.isMapOpen) {
      gameStore.setMapOpen(false)
      return
    }

    if (gameStore.isBaseStorageOpen) {
      gameStore.setBaseStorageOpen(false)
      return
    }

    if (gameStore.isCraftingWorkbenchOpen) {
      gameStore.setCraftingWorkbenchOpen(false)
      return
    }

    const shouldOpenMenu = !gameStore.isGameMenuOpen

    if (shouldOpenMenu) {
      this.exitGameplayModesForMenu()
    }

    gameStore.setGameMenuOpen(shouldOpenMenu)
  }

  private exitGameplayModesForMenu() {
    if (this.isBuildMode) {
      this.exitBuildMode()
    }

    if (this.isCraftMode) {
      this.exitCraftMode()
    }

    this.isCaptureMode = false
    this.captureAimGraphics?.clear()

    const gameStore = useGameStore.getState()
    gameStore.setActiveMode('normal')
    gameStore.setCapturePreview(null)
    gameStore.setCaptureMessage('')
  }

  private syncUiPause() {
    const gameStore = useGameStore.getState()
    const shouldPause =
      gameStore.isGameMenuOpen ||
      gameStore.isMapOpen ||
      gameStore.isBaseStorageOpen ||
      gameStore.isCraftingWorkbenchOpen

    if (shouldPause && !this.physicsPausedForUi) {
      this.physics.world.pause()
      this.physicsPausedForUi = true
      this.uiPauseStartedAt = this.time.now
    } else if (!shouldPause && this.physicsPausedForUi) {
      this.physics.world.resume()
      this.physicsPausedForUi = false

      if (this.uiPauseStartedAt !== null) {
        const pausedDuration = this.time.now - this.uiPauseStartedAt
        this.nextHungerDrainAt += pausedDuration
        this.nextStarvationDamageAt += pausedDuration
      }

      this.uiPauseStartedAt = null
    }

    if (shouldPause) {
      this.player?.setVelocity(0, 0)
    }

    return shouldPause
  }

  private handleManualSaveRequest() {
    const gameStore = useGameStore.getState()

    if (gameStore.manualSaveRequestId <= this.handledManualSaveRequestId) {
      return
    }

    const requestId = gameStore.manualSaveRequestId

    this.handledManualSaveRequestId = requestId
    const slotId = gameStore.requestedSaveSlotId
    const result = this.saveCurrentGame(
      slotId === 'auto'
        ? '자동저장 슬롯에 게임 상태를 저장했습니다.'
        : `${this.getSaveSlotNumberLabel(slotId)}에 게임 상태를 저장했습니다.`,
      slotId,
    )
    gameStore.completeManualSave(requestId, result.success)
  }

  private getSaveSlotNumberLabel(slotId: SaveSlotId) {
    return slotId === 'auto'
      ? '자동저장 슬롯'
      : `저장 슬롯 ${slotId.slice(-1)}`
  }

  private syncEquippedTool() {
    if (!this.player) {
      return
    }

    const gameStore = useGameStore.getState()
    const equippedToolId = gameStore.equippedToolId

    if (equippedToolId !== this.lastEquippedToolId) {
      this.lastEquippedToolId = equippedToolId
      this.player.equipTool(TOOL_DEFINITIONS[equippedToolId])
    }

    const equippedShieldId = gameStore.equippedItems.shield ?? null

    if (equippedShieldId !== this.lastEquippedShieldId) {
      this.lastEquippedShieldId = equippedShieldId
      const shieldCapacity = equippedShieldId
        ? TOOL_DEFINITIONS[equippedShieldId].shieldCapacity ?? 0
        : 0

      this.player.configureShield(shieldCapacity, gameStore.playerShield)
      gameStore.setPlayerShieldState(
        this.player.currentShield,
        this.player.maxShield,
      )
    }

    const actionResourceEquipmentSignature =
      this.getActionResourceEquipmentSignature(
        equippedToolId,
        gameStore.equippedItems,
      )

    if (
      actionResourceEquipmentSignature !==
      this.lastActionResourceEquipmentSignature
    ) {
      this.lastActionResourceEquipmentSignature =
        actionResourceEquipmentSignature
      this.player.configureActionResources(
        getPlayerActionResourceProfile(
          equippedToolId,
          gameStore.equippedItems,
        ),
      )
      this.player.configureArmorRating(
        getPlayerArmorRating(
          gameStore.equippedItems,
          gameStore.equipmentDurability,
        ),
      )
      this.syncPlayerActionResourceState()
    }
  }

  private getActionResourceEquipmentSignature(
    equippedToolId: ToolDefinitionId,
    equippedItems: EquippedItems,
  ) {
    const equipmentEntries = Object.entries(equippedItems)
      .sort(([leftSlot], [rightSlot]) => leftSlot.localeCompare(rightSlot))
      .map(([slotId, toolId]) => `${slotId}:${toolId}`)
      .join('|')

    return `${equippedToolId}|${equipmentEntries}`
  }

  private syncPlayerActionResourceState() {
    if (!this.player) {
      return
    }

    const snapshot = this.player.getActionResourceSnapshot(this.time.now)

    useGameStore.getState().setPlayerActionResourceState(
      snapshot.stamina,
      snapshot.maxStamina,
      snapshot.recoveryDelayed,
      snapshot.movementState,
    )
  }

  private updateCompanionControls() {
    const gameStore = useGameStore.getState()

    if (
      this.isBuildMode ||
      this.isCaptureMode ||
      this.isCraftMode
    ) {
      return
    }

    if (
      this.companionSelectKey &&
      Phaser.Input.Keyboard.JustDown(this.companionSelectKey)
    ) {
      const selectedAnimalId = gameStore.selectNextCompanionAnimal()
      const selectedAnimal = selectedAnimalId
        ? useGameStore
            .getState()
            .capturedAnimals.find((animal) => animal.id === selectedAnimalId)
        : null

      gameStore.setCompanionMessage(
        selectedAnimal
          ? `동행 대상으로 ${selectedAnimal.name}을(를) 선택했습니다.`
          : '활동 파티에 동물이 없습니다.',
      )
    }

    if (
      this.companionSummonKey &&
      Phaser.Input.Keyboard.JustDown(this.companionSummonKey)
    ) {
      const currentState = useGameStore.getState()
      const selectedAnimalId = currentState.selectedCompanionAnimalId
      const selectedAnimal = selectedAnimalId
        ? currentState.capturedAnimals.find(
            (animal) => animal.id === selectedAnimalId,
          )
        : null

      if (!selectedAnimalId || !selectedAnimal) {
        currentState.setCompanionMessage(
          '먼저 동물을 포획해 활동 파티에 배치하세요.',
        )
      } else if (
        currentState.summonedCompanionAnimalId === selectedAnimalId
      ) {
        currentState.setSummonedCompanionAnimal(null)
        currentState.setCompanionMessage(
          `${selectedAnimal.name}을(를) 회수했습니다.`,
        )
      } else {
        currentState.setSummonedCompanionAnimal(selectedAnimalId)
        currentState.setCompanionMessage(
          `${selectedAnimal.name}을(를) 소환했습니다.`,
        )
      }
    }

    if (
      this.companionCommandKey &&
      Phaser.Input.Keyboard.JustDown(this.companionCommandKey)
    ) {
      const currentState = useGameStore.getState()

      if (!currentState.summonedCompanionAnimalId) {
        currentState.setCompanionMessage(
          '명령을 내릴 동행 동물을 먼저 소환하세요.',
        )
        return
      }

      const commandMode = getNextCompanionCommandMode(
        currentState.companionCommandMode,
      )
      currentState.setCompanionCommandMode(commandMode)
      currentState.setCompanionMessage(
        `${getCompanionCommandLabel(commandMode)} 명령으로 변경했습니다.`,
      )
    }
  }

  private synchronizeCompanionState() {
    if (!this.player || !this.companionManager) {
      return
    }

    const gameStore = useGameStore.getState()
    const capturedAnimal = gameStore.summonedCompanionAnimalId
      ? gameStore.capturedAnimals.find(
          (animal) =>
            animal.id === gameStore.summonedCompanionAnimalId &&
            gameStore.activeAnimalPartyIds.includes(animal.id) &&
            !animal.workAssignment &&
            animal.condition !== 'incapacitated',
        ) ?? null
      : null

    if (
      gameStore.summonedCompanionAnimalId &&
      !capturedAnimal
    ) {
      gameStore.setSummonedCompanionAnimal(null)
      gameStore.setCompanionMessage(
        '동행 가능한 상태가 아니어서 소환을 해제했습니다.',
      )
    }

    this.companionManager.synchronize(
      capturedAnimal,
      this.player,
      gameStore.companionCommandMode,
    )
  }

  private updateCompanion(time: number) {
    if (
      !this.player ||
      !this.animalManager ||
      !this.companionManager
    ) {
      return
    }

    const result = this.companionManager.update(
      time,
      this.player,
      this.animalManager,
    )
    const gameStore = useGameStore.getState()
    const activeCompanionId =
      this.companionManager.getActiveCompanionId()
    const targetName = this.companionManager.getTargetName()
    const combatSnapshot =
      this.companionManager.getCombatSnapshot(time)

    if (time >= this.nextHudSyncAt || result) {
      gameStore.setCompanionCombatState(
        combatSnapshot.skillCooldowns,
        combatSnapshot.activeStatusEffectIds,
        combatSnapshot.partnerSkillActive,
        result?.skillName ??
          (activeCompanionId
            ? gameStore.companionLastSkillName
            : null),
      )
    }

    if (gameStore.companionTargetName !== targetName) {
      gameStore.setCompanionTargetName(targetName)
    }

    if (!result) {
      return
    }

    const healedAmount =
      result.healing > 0 && activeCompanionId
        ? gameStore.healCapturedAnimal(
            activeCompanionId,
            result.healing,
          )
        : 0

    if (result.counterAttackDamage > 0 && activeCompanionId) {
      const damageEvent = gameStore.damageCapturedAnimal(
        activeCompanionId,
        result.counterAttackDamage,
        Date.now(),
      )

      if (damageEvent?.incapacitated) {
        gameStore.setCompanionMessage(
          `${damageEvent.animalName}이(가) 전투에서 기절했습니다. 보관 상태에서 회복해야 합니다.`,
        )
        this.synchronizeCompanionState()
        return
      }
    }

    if (!result.defeated) {
      const combatDetails = [
        `${result.skillName} (${ANIMAL_ELEMENTS[result.element].name})`,
        getElementEffectivenessLabel(
          result.effectivenessMultiplier,
        ),
        result.appliedStatusEffectName
          ? `${result.appliedStatusEffectName} 부여`
          : null,
        healedAmount > 0 ? `체력 ${healedAmount} 회복` : null,
        result.counterAttackEvaded ? '반격 회피' : null,
      ].filter((detail): detail is string => detail !== null)

      gameStore.setCompanionMessage(combatDetails.join(' · '))
      return
    }

    this.collectDrops(result.drops)
    gameStore.gainPlayerExperience(18)
    const growthEvents = gameStore.gainAnimalPartyExperience(
      26,
      activeCompanionId,
    )

    if (activeCompanionId) {
      gameStore.gainAnimalTrust(activeCompanionId, 2)
    }

    gameStore.setCompanionMessage(
      `${result.skillName}으로 ${result.targetName}을(를) 쓰러뜨렸습니다.${this.getAnimalGrowthMessage(growthEvents)}`,
    )
  }

  private updateCompanionTrust(time: number) {
    if (time < this.nextCompanionTrustAt) {
      return
    }

    const gameStore = useGameStore.getState()

    if (gameStore.summonedCompanionAnimalId) {
      gameStore.gainAnimalTrust(
        gameStore.summonedCompanionAnimalId,
        1,
      )
    }

    this.nextCompanionTrustAt = time + ANIMAL_TRUST_INTERVAL_MS
  }

  private updateStoredAnimalRecovery(time: number) {
    if (time < this.nextAnimalRecoveryAt) {
      return
    }

    const gameStore = useGameStore.getState()
    const recoveryEvent = gameStore.recoverStoredAnimals(Date.now())

    if (recoveryEvent.revivedAnimalNames.length > 0) {
      gameStore.setCompanionMessage(
        `${recoveryEvent.revivedAnimalNames.join(', ')}의 기절 회복이 완료되었습니다.`,
      )
    }

    this.nextAnimalRecoveryAt =
      time + ANIMAL_STORAGE_RECOVERY_INTERVAL_MS
  }

  private getAnimalGrowthMessage(
    growthEvents: readonly AnimalGrowthEvent[],
  ) {
    const leveledAnimals = growthEvents.filter(
      (event) => event.levelsGained > 0,
    )

    if (leveledAnimals.length === 0) {
      return ''
    }

    return ` ${leveledAnimals
      .map((event) => `${event.animalName} Lv.${event.level}`)
      .join(', ')} 레벨 업!`
  }

  private handleCompanionTargetInput() {
    const rightButtonDown = this.input.activePointer.rightButtonDown()
    const rightButtonPressed =
      rightButtonDown && !this.wasRightButtonDown

    this.wasRightButtonDown = rightButtonDown

    if (
      !rightButtonPressed ||
      this.isBuildMode ||
      this.isCaptureMode ||
      this.isCraftMode ||
      !this.companionManager ||
      !this.animalManager
    ) {
      return
    }

    const gameStore = useGameStore.getState()

    if (!this.companionManager.getActiveCompanionId()) {
      gameStore.setCompanionMessage(
        '지정 공격을 내릴 동행 동물을 먼저 소환하세요.',
      )
      return
    }

    const pointer = this.input.activePointer
    pointer.updateWorldPoint(this.cameras.main)
    const target = this.animalManager.findClosestToPoint(
      { x: pointer.worldX, y: pointer.worldY },
      COMPANION_COMMAND_TARGET_RADIUS,
    )

    if (!target || !this.companionManager.commandAttack(target)) {
      gameStore.setCompanionMessage(
        '오른쪽 클릭 위치에 공격 가능한 동물이 없습니다.',
      )
      return
    }

    gameStore.setCompanionTargetName(target.definition.name)
    gameStore.setCompanionMessage(
      `${target.definition.name} 지정 공격 명령을 내렸습니다.`,
    )
  }

  private updateCaptureMode() {
    if (
      !this.captureModeKey ||
      !Phaser.Input.Keyboard.JustDown(this.captureModeKey)
    ) {
      return
    }

    if (this.isBuildMode) {
      this.exitBuildMode()
    }

    if (this.isCraftMode) {
      this.exitCraftMode()
    }

    this.isCaptureMode = !this.isCaptureMode

    const gameStore = useGameStore.getState()
    gameStore.setActiveMode(this.isCaptureMode ? 'capture' : 'normal')
    gameStore.setBuildMessage('')
    gameStore.setCaptureMessage(
      this.isCaptureMode ? '포획할 동물을 조준하세요.' : '',
    )

    if (!this.isCaptureMode) {
      gameStore.setCapturePreview(null)
      this.captureAimGraphics?.clear()
    }
  }

  private updateBuildMode() {
    if (
      !this.buildModeKey ||
      !Phaser.Input.Keyboard.JustDown(this.buildModeKey)
    ) {
      return
    }

    if (this.isBuildMode) {
      this.exitBuildMode()
      return
    }

    if (this.isCraftMode) {
      this.exitCraftMode()
    }

    this.isCaptureMode = false
    this.captureAimGraphics?.clear()
    this.isBuildMode = true

    const defaultBuilding: BuildingDefinitionId = this.buildingManager?.getCoreBuilding()
      ? 'logging-station'
      : 'base-core'

    this.selectBuildingForPlacement(defaultBuilding)

    const gameStore = useGameStore.getState()
    gameStore.setActiveMode('build')
    gameStore.setCapturePreview(null)
    gameStore.setCaptureMessage('')
    gameStore.setBuildMessage('건설 위치를 선택하세요.')
  }

  private updateCraftMode() {
    if (
      !this.craftModeKey ||
      !Phaser.Input.Keyboard.JustDown(this.craftModeKey)
    ) {
      return
    }

    const gameStore = useGameStore.getState()
    const nearbyStation = this.player
      ? this.buildingManager?.findNearestCraftingStation(this.player, 170)
      : null
    const craftingStationId = nearbyStation
      ? BUILDING_DEFINITIONS[nearbyStation.definitionId].craftingStationId
      : null

    if (!craftingStationId) {
      gameStore.setCraftMessage(
        '제작 작업대 가까이에서 C를 누르거나 작업대를 클릭하세요.',
      )
      return
    }

    gameStore.setCraftingWorkbenchOpen(true, craftingStationId)
  }

  private updateBuildControls() {
    if (
      this.cancelModeKey &&
      Phaser.Input.Keyboard.JustDown(this.cancelModeKey)
    ) {
      if (this.isBuildMode) {
        this.exitBuildMode()
      } else if (this.isCaptureMode) {
        this.isCaptureMode = false
        this.captureAimGraphics?.clear()
        const gameStore = useGameStore.getState()
        gameStore.setActiveMode('normal')
        gameStore.setCapturePreview(null)
        gameStore.setCaptureMessage('')
      } else if (this.isCraftMode) {
        this.exitCraftMode()
      }
      return
    }

    if (!this.isBuildMode) {
      return
    }

    if (
      this.selectCoreKey &&
      Phaser.Input.Keyboard.JustDown(this.selectCoreKey)
    ) {
      this.selectBuildingForPlacement('base-core')
    } else if (
      this.selectLoggingStationKey &&
      Phaser.Input.Keyboard.JustDown(this.selectLoggingStationKey)
    ) {
      this.selectBuildingForPlacement('logging-station')
    } else if (
      this.selectPrimitiveWorkbenchKey &&
      Phaser.Input.Keyboard.JustDown(this.selectPrimitiveWorkbenchKey)
    ) {
      this.selectBuildingForPlacement('primitive-workbench')
    }

    if (
      this.rotateBuildingKey &&
      Phaser.Input.Keyboard.JustDown(this.rotateBuildingKey)
    ) {
      this.buildingManager?.rotatePreview()
      useGameStore.getState().setBuildMessage('건설물을 90도 회전했습니다.')
    }
  }

  private updateCraftControls() {
    // 제작은 React 작업대 창에서 처리한다.
  }

  private updateBuildPreview() {
    if (!this.isBuildMode || !this.buildingManager) {
      return
    }

    const pointer = this.input.activePointer
    pointer.updateWorldPoint(this.cameras.main)
    this.buildingManager.updatePreview({
      x: pointer.worldX,
      y: pointer.worldY,
    })
  }

  private selectBuildingForPlacement(definitionId: BuildingDefinitionId) {
    this.buildingManager?.beginPlacement(definitionId)

    const selectedName = this.buildingManager?.getSelectedBuildingName() ?? null
    const gameStore = useGameStore.getState()
    gameStore.setSelectedBuildingName(selectedName)
    gameStore.setBuildMessage(
      selectedName ? `${selectedName} 배치를 선택했습니다.` : '',
    )
  }

  private exitBuildMode() {
    this.isBuildMode = false
    this.buildingManager?.cancelPlacement()

    const gameStore = useGameStore.getState()
    gameStore.setActiveMode('normal')
    gameStore.setSelectedBuildingName(null)
    gameStore.setBuildMessage('')
  }

  private exitCraftMode() {
    this.isCraftMode = false

    const gameStore = useGameStore.getState()
    gameStore.setActiveMode('normal')
    gameStore.setCraftMessage('')
  }

  private tryPlaceBuilding() {
    if (!this.buildingManager || !this.resourceManager) {
      return
    }

    const result = this.buildingManager.placeSelected()
    const gameStore = useGameStore.getState()

    gameStore.setBuildMessage(result.message)

    if (!result.building) {
      return
    }

    gameStore.addPlacedBuilding(result.building)
    this.blockBuildingResourceSpawns(result.building)

    this.saveCurrentGame('건물 설치 후 자동 저장했습니다.')

    if (result.building.definitionId === 'base-core') {
      this.selectBuildingForPlacement('logging-station')
      gameStore.setBuildMessage(
        '거점 코어를 설치했습니다. 이제 반경 안에 벌목 작업대를 설치하세요.',
      )
    }
  }

  private handleInteraction(time: number) {
    if (
      this.isBuildMode ||
      this.isCaptureMode ||
      this.isCraftMode ||
      !this.interactKey ||
      !Phaser.Input.Keyboard.JustDown(this.interactKey) ||
      !this.player ||
      !this.mapManager
    ) {
      return
    }

    const nearbyExit = this.mapManager.findExitAt(this.player)

    if (nearbyExit) {
      this.beginMapTransition(nearbyExit)
      return
    }

    this.handleWorkAssignment(time)
  }

  private handleWorkAssignment(time: number) {
    if (
      !this.player ||
      !this.buildingManager ||
      !this.workManager
    ) {
      return
    }

    const building = this.buildingManager.findNearestWorkstation(
      this.player,
      130,
    )
    const gameStore = useGameStore.getState()

    if (!building) {
      gameStore.setBuildMessage('가까운 벌목 작업대가 없습니다.')
      return
    }

    const requiredSkill =
      BUILDING_DEFINITIONS[building.definitionId].work?.requiredSkill
    const requiredSkillLabel =
      requiredSkill === 'logging'
        ? '벌목'
        : requiredSkill === 'mining'
          ? '채광'
          : requiredSkill === 'farming'
            ? '농사'
            : '운반'
    const capturedAnimal = gameStore.capturedAnimals.find(
      (animal) =>
        !animal.workAssignment &&
        !gameStore.activeAnimalPartyIds.includes(animal.id) &&
        requiredSkill !== undefined &&
        (animal.workSkills[requiredSkill] ?? 0) > 0,
    )

    if (!capturedAnimal) {
      gameStore.setBuildMessage(
        requiredSkill
          ? `이 작업에 필요한 ${requiredSkillLabel} 능력을 가진 대기 동물이 없습니다.`
          : '배치할 수 있는 포획 동물이 없습니다.',
      )
      return
    }

    const spawnPosition = { x: this.player.x, y: this.player.y }
    const result = this.workManager.assignWorker(
      capturedAnimal,
      building,
      spawnPosition,
      time,
    )

    gameStore.setBuildMessage(result.message)

    if (!result.assignment) {
      return
    }

    gameStore.assignCapturedAnimalToBuilding(
      capturedAnimal.id,
      result.assignment,
    )
    gameStore.setActiveWorkerCount(this.workManager.getActiveWorkerCount())
    this.buildingManager.setWorkStatus(building.id, '벌목 작업 중')
    this.saveCurrentGame('작업 배치 후 자동 저장했습니다.')
  }

  private processWorkProduction(time: number) {
    if (!this.workManager || !this.buildingManager) {
      return
    }

    const gameStore = useGameStore.getState()
    const releasedBuildingIds = this.workManager.synchronizeAssignments(
      gameStore.capturedAnimals,
    )

    releasedBuildingIds.forEach((buildingId) => {
      this.buildingManager?.setWorkStatus(buildingId, '작업자 대기')
    })

    if (releasedBuildingIds.length > 0) {
      gameStore.setActiveWorkerCount(this.workManager.getActiveWorkerCount())
    }

    const events = this.workManager.update(time)

    if (events.length === 0) {
      return
    }

    events.forEach((event) => {
      gameStore.addBaseStorageItem(event.output.item, event.output.amount)
      this.buildingManager?.setWorkStatus(
        event.buildingId,
        `벌목 작업 중 · 목재 +${event.output.amount}`,
      )
    })
    gameStore.setBuildMessage('거점 보관함에 목재가 자동 생산되었습니다.')
  }

  private getBuildingFootprint(building: PlacedBuilding) {
    return {
      x: building.x - building.width / 2,
      y: building.y - building.height / 2,
      width: building.width,
      height: building.height,
    }
  }

  private blockBuildingResourceSpawns(building: PlacedBuilding) {
    if (!this.resourceManager) {
      return
    }

    this.resourceManager.blockSpawnsWithinFootprint(
      this.getBuildingFootprint(building),
    )

    if (building.accessPoint) {
      this.resourceManager.blockSpawnsWithinFootprint({
        x: building.accessPoint.x - WORKER_ACCESS_CLEARANCE / 2,
        y: building.accessPoint.y - WORKER_ACCESS_CLEARANCE / 2,
        width: WORKER_ACCESS_CLEARANCE,
        height: WORKER_ACCESS_CLEARANCE,
      })
    }
  }

  private handlePrimaryInput(time: number) {
    const leftButtonDown = this.input.activePointer.leftButtonDown()

    if (this.isBuildMode) {
      if (leftButtonDown && !this.wasLeftButtonDown) {
        this.tryPlaceBuilding()
      }
    } else if (this.isCaptureMode) {
      if (leftButtonDown && !this.wasLeftButtonDown) {
        this.tryCapture()
      }
    } else if (!this.isCraftMode && leftButtonDown) {
      if (!this.wasLeftButtonDown && this.tryOpenBuildingPanel()) {
        this.wasLeftButtonDown = leftButtonDown
        return
      }

      this.handleHeldPrimaryAction(time)
    }

    this.wasLeftButtonDown = leftButtonDown
  }

  private tryOpenBuildingPanel() {
    if (!this.buildingManager) {
      return false
    }

    const pointer = this.input.activePointer
    pointer.updateWorldPoint(this.cameras.main)
    const building = this.buildingManager.findBuildingAt({
      x: pointer.worldX,
      y: pointer.worldY,
    })

    if (!building) {
      return false
    }

    const gameStore = useGameStore.getState()

    if (building.definitionId === 'base-core') {
      gameStore.setBaseStorageOpen(true)
      return true
    }

    const craftingStationId =
      BUILDING_DEFINITIONS[building.definitionId].craftingStationId

    if (craftingStationId) {
      gameStore.setCraftingWorkbenchOpen(true, craftingStationId)
      return true
    }

    return false
  }

  private handleHeldPrimaryAction(time: number) {
    const pointer = this.input.activePointer

    if (
      !this.player ||
      !this.resourceManager ||
      !this.animalManager
    ) {
      return
    }

    pointer.updateWorldPoint(this.cameras.main)

    const origin = { x: this.player.x, y: this.player.y }
    const pointerWorldPosition = { x: pointer.worldX, y: pointer.worldY }
    const attackDirection = this.getAttackDirection(
      origin,
      pointerWorldPosition,
    )

    if (this.player.getCombatStyle() === 'ranged') {
      this.handleRangedPrimaryAction(time, origin, attackDirection)
      return
    }

    const attackRange = this.player.getCombatRange(PLAYER_ATTACK_RANGE)
    const aimPoint = {
      x: origin.x + attackDirection.x * attackRange,
      y: origin.y + attackDirection.y * attackRange,
    }
    const resourceTarget = this.resourceManager.findClosestTarget(
      origin,
      aimPoint,
      attackRange,
    )
    const animalTarget = this.animalManager.findClosestTarget(
      origin,
      aimPoint,
      attackRange,
    )
    const actionKind = animalTarget
      ? 'combat'
      : resourceTarget
        ? 'gathering'
        : 'combat'

    if (!this.player.tryPrimaryAction(time, actionKind)) {
      return
    }

    this.consumeEquippedItemDurability()

    this.showAttackEffect(origin, attackDirection)

    if (animalTarget) {
      const attackResult = this.animalManager.attack(
        animalTarget,
        this.player.getCombatDamage(PLAYER_ATTACK_DAMAGE),
        time,
        origin,
      )
      this.handlePlayerAnimalAttackResult(animalTarget, attackResult)
      return
    }

    const attackResult = resourceTarget
      ? this.resourceManager.attack(
          resourceTarget,
          this.player.getResourceDamage(PLAYER_ATTACK_DAMAGE),
        )
      : null

    if (attackResult?.drop) {
      this.collectDrops([attackResult.drop])
      useGameStore.getState().gainPlayerExperience(8)
    }
  }

  private handleRangedPrimaryAction(
    time: number,
    origin: Readonly<{ x: number; y: number }>,
    direction: Readonly<{ x: number; y: number }>,
  ) {
    if (!this.player) {
      return
    }

    const gameStore = useGameStore.getState()
    const equippedToolId = gameStore.equippedToolId
    const definition = TOOL_DEFINITIONS[equippedToolId]
    const ammunitionItemId = this.player.getAmmunitionItemId()

    if (!ammunitionItemId || gameStore.inventory[ammunitionItemId] <= 0) {
      gameStore.setCombatMessage('사용할 수 있는 탄약이 없습니다.')
      return
    }

    if (
      definition.maxDurability !== undefined &&
      (gameStore.equipmentDurability[equippedToolId] ??
        definition.maxDurability) <= 0
    ) {
      gameStore.setCombatMessage(`${definition.name}을(를) 먼저 수리하세요.`)
      return
    }

    if (!this.player.tryPrimaryAction(time, 'combat')) {
      return
    }

    if (!gameStore.consumeInventoryItem(ammunitionItemId, 1)) {
      gameStore.setCombatMessage('탄약 상태가 변경되어 발사하지 못했습니다.')
      return
    }

    const projectileOrigin = {
      x: origin.x + direction.x * 30,
      y: origin.y + direction.y * 30,
    }
    const projectile = new PlayerProjectile(
      this,
      projectileOrigin,
      direction,
      this.player.getProjectileSpeed(),
      this.player.getCombatRange(PLAYER_ATTACK_RANGE),
      this.player.getCombatDamage(PLAYER_ATTACK_DAMAGE),
    )

    this.playerProjectiles.add(projectile)
    this.consumeEquippedItemDurability()
    gameStore.setCombatMessage('')
  }

  private updatePlayerProjectiles(time: number) {
    if (!this.animalManager) {
      return
    }

    this.playerProjectiles.forEach((projectile) => {
      if (!projectile.active) {
        this.playerProjectiles.delete(projectile)
        return
      }

      const target = this.animalManager?.findClosestToPoint(
        projectile,
        PLAYER_PROJECTILE_HIT_RADIUS,
      )

      if (target) {
        const attackResult = this.animalManager?.attack(
          target,
          projectile.damage,
          time,
          projectile,
        )

        this.handlePlayerAnimalAttackResult(target, attackResult ?? null)
        projectile.destroy()
        this.playerProjectiles.delete(projectile)
        return
      }

      if (projectile.hasExceededRange()) {
        projectile.destroy()
        this.playerProjectiles.delete(projectile)
      }
    })
  }

  private consumeEquippedItemDurability() {
    const gameStore = useGameStore.getState()
    const equippedToolId = gameStore.equippedToolId
    const durabilityLoss =
      TOOL_DEFINITIONS[equippedToolId].durabilityLossPerUse ?? 0

    if (durabilityLoss > 0) {
      gameStore.damageEquipment(equippedToolId, durabilityLoss)
    }
  }

  private handlePlayerAnimalAttackResult(
    animalTarget: Animal,
    attackResult: AnimalAttackResult | null,
  ) {
    this.collectDrops(attackResult?.drops ?? [])

    if (attackResult?.defeated) {
      const gameStore = useGameStore.getState()
      gameStore.gainPlayerExperience(24)
      const growthEvents = gameStore.gainAnimalPartyExperience(
        18,
        gameStore.summonedCompanionAnimalId,
      )
      const growthMessage = this.getAnimalGrowthMessage(growthEvents)

      if (growthMessage) {
        gameStore.setCompanionMessage(growthMessage.trim())
      }

      if (gameStore.companionTargetName === animalTarget.definition.name) {
        gameStore.setCompanionTargetName(null)
      }
      return
    }

    const gameStore = useGameStore.getState()

    if (
      attackResult &&
      gameStore.companionCommandMode === 'focus' &&
      gameStore.summonedCompanionAnimalId &&
      this.companionManager?.commandAttack(animalTarget)
    ) {
      gameStore.setCompanionTargetName(animalTarget.definition.name)
      gameStore.setCompanionMessage(
        `${animalTarget.definition.name}에게 집중 공격 명령을 내렸습니다.`,
      )
    }
  }

  private tryCapture() {
    if (!this.player || !this.animalManager) {
      return
    }

    const gameStore = useGameStore.getState()

    if (this.activeCaptureCapsule || this.captureSequenceInProgress) {
      gameStore.setCaptureMessage('현재 포획 판정이 끝날 때까지 기다려 주세요.')
      return
    }

    const captureToolItemId = resolveActiveCaptureToolItemId(
      gameStore.inventory,
      gameStore.hotbarSlots,
      gameStore.selectedHotbarIndex,
    )

    if (!captureToolItemId) {
      gameStore.setCapturePreview(null)
      gameStore.setCaptureMessage('사용할 수 있는 포획 캡슐이 없습니다.')
      return
    }

    if (!gameStore.consumeInventoryItem(captureToolItemId, 1)) {
      gameStore.setCaptureMessage('선택한 포획 캡슐을 사용할 수 없습니다.')
      return
    }

    const pointer = this.input.activePointer
    pointer.updateWorldPoint(this.cameras.main)

    const playerPosition = { x: this.player.x, y: this.player.y }
    const direction = this.getAttackDirection(playerPosition, {
      x: pointer.worldX,
      y: pointer.worldY,
    })
    const captureTool = CAPTURE_TOOL_DEFINITIONS[captureToolItemId]
    const capsule = new CaptureCapsule(
      this,
      playerPosition,
      direction,
      captureToolItemId,
      captureTool.projectileTint,
    )
    const overlap = this.physics.add.overlap(
      capsule,
      this.animalManager.getPhysicsGroup(),
      (_capsuleObject, animalObject) => {
        if (animalObject instanceof Animal) {
          this.handleCaptureImpact(capsule, animalObject)
        }
      },
    )

    capsule.once('destroy', () => overlap.destroy())
    this.activeCaptureCapsule = capsule
    gameStore.setCaptureMessage(
      `${captureTool.gradeName} 포획 캡슐을 투척했습니다.`,
    )
  }

  private updateCaptureProjectile() {
    const capsule = this.activeCaptureCapsule

    if (
      !capsule ||
      !capsule.active ||
      capsule.isResolved() ||
      !capsule.hasReachedMaximumRange()
    ) {
      return
    }

    capsule.stopAtImpact()
    this.tweens.add({
      targets: capsule,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 100,
      onComplete: () => {
        this.finishCaptureCapsule(capsule)
        useGameStore
          .getState()
          .setCaptureMessage('포획 캡슐이 동물에게 닿지 않았습니다.')
      },
    })
  }

  private handleCaptureImpact(
    capsule: CaptureCapsule,
    target: Animal,
  ) {
    if (
      this.activeCaptureCapsule !== capsule ||
      this.captureSequenceInProgress ||
      !this.animalManager ||
      !capsule.stopAtImpact()
    ) {
      return
    }

    const capturePreview = this.getTargetCapturePreview(
      target,
      capsule.toolItemId,
      capsule.getLaunchPosition(),
    )
    const chance = capturePreview.breakdown.chance
    const result = this.animalManager.rollCapture(target, chance)

    if (!result) {
      this.finishCaptureCapsule(capsule)
      return
    }

    this.captureSequenceInProgress = true
    let snapshot: AnimalCaptureSnapshot | null = null

    snapshot = target.beginCapturePull(
      { x: capsule.x, y: capsule.y },
      () => {
        if (snapshot) {
          this.resolveCaptureAnimation(capsule, target, snapshot, result)
        }
      },
    )

    if (!snapshot) {
      this.finishCaptureCapsule(capsule)
      return
    }

    const gameStore = useGameStore.getState()
    gameStore.setCapturePreview(capturePreview)
    gameStore.setCaptureMessage(
      `캡슐 적중${capturePreview.isRearHit ? ' · 후방 보정' : ''}${capturePreview.activeStatusEffectIds.length > 0 ? ` · 상태 보정 ${capturePreview.activeStatusEffectIds.length}개` : ''} · ${this.formatChance(chance)}`,
    )
  }

  private resolveCaptureAnimation(
    capsule: CaptureCapsule,
    target: Animal,
    snapshot: AnimalCaptureSnapshot,
    result: CaptureAttemptResult,
  ) {
    if (result.success && result.capturedAnimal) {
      this.playCaptureSuccess(capsule, target, result)
      return
    }

    this.playCaptureFailure(capsule, target, snapshot, result.chance)
  }

  private playCaptureSuccess(
    capsule: CaptureCapsule,
    target: Animal,
    result: CaptureAttemptResult,
  ) {
    const ring = this.add.graphics().setDepth(25)
    ring.setPosition(capsule.x, capsule.y)
    ring.lineStyle(6, 0x8cf5b2, 0.9)
    ring.strokeCircle(0, 0, 22)
    capsule.setTint(0x8cf5b2)

    this.tweens.add({
      targets: ring,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    })
    this.tweens.add({
      targets: capsule,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 130,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        const gameStore = useGameStore.getState()

        target.finalizeCapture()

        if (result.capturedAnimal) {
          gameStore.addCapturedAnimal(result.capturedAnimal)
          gameStore.gainPlayerExperience(32)
          this.collectDrops(result.drops)
          gameStore.setCaptureMessage(
            `포획 성공! ${result.capturedAnimal.name} · ${CAPTURE_TOOL_DEFINITIONS[capsule.toolItemId].gradeName} 캡슐 · ${this.formatChance(result.chance)}`,
          )
          this.saveCurrentGame('동물 포획 후 자동 저장했습니다.')
        }

        gameStore.setCapturePreview(null)
        this.finishCaptureCapsule(capsule)
      },
    })
  }

  private playCaptureFailure(
    capsule: CaptureCapsule,
    target: Animal,
    snapshot: AnimalCaptureSnapshot,
    chance: number,
  ) {
    const impactX = capsule.x

    capsule.setTint(0xff7c9d)
    this.tweens.add({
      targets: capsule,
      x: impactX + 9,
      duration: 55,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        target.escapeCapture(snapshot, () => {
          useGameStore.getState().setCaptureMessage(
            `포획 실패 · ${CAPTURE_TOOL_DEFINITIONS[capsule.toolItemId].gradeName} 캡슐 · ${this.formatChance(chance)} · 동물이 캡슐에서 탈출했습니다.`,
          )
          this.finishCaptureCapsule(capsule)
        })
      },
    })
  }

  private finishCaptureCapsule(capsule: CaptureCapsule) {
    if (capsule.active) {
      capsule.destroy()
    }

    if (this.activeCaptureCapsule === capsule) {
      this.activeCaptureCapsule = undefined
    }

    this.captureSequenceInProgress = false
  }

  private findCapturePreviewTarget() {
    if (!this.player || !this.animalManager) {
      return null
    }

    const pointer = this.input.activePointer
    pointer.updateWorldPoint(this.cameras.main)

    const origin = { x: this.player.x, y: this.player.y }
    const direction = this.getAttackDirection(origin, {
      x: pointer.worldX,
      y: pointer.worldY,
    })
    return this.animalManager.findCapturePathTarget(
      origin,
      direction,
      CAPTURE_THROW_RANGE,
    )
  }

  private getTargetCapturePreview(
    target: Animal,
    toolItemId: CaptureToolItemId,
    captureOrigin: Readonly<{ x: number; y: number }>,
  ): CapturePreviewState {
    const gameStore = useGameStore.getState()
    const activeStatusEffectIds = target.getActiveTargetStatusEffectIds(
      this.time.now,
    )
    const isRearHit = target.isPositionBehind(captureOrigin)
    const supportModuleId = gameStore.equippedCaptureSupportModuleId
    const supportModule = supportModuleId
      ? CAPTURE_SUPPORT_MODULES[supportModuleId]
      : null
    const breakdown = calculateCaptureChanceBreakdown({
      currentHp: target.currentHp,
      maxHp: target.definition.maxHp,
      captureDifficulty: target.definition.captureDifficulty,
      toolBonus: CAPTURE_TOOL_DEFINITIONS[toolItemId].captureBonus,
      activeStatusEffectCount: activeStatusEffectIds.length,
      isRearHit,
      playerCapturePower: gameStore.playerCapturePower,
      supportModule,
      speciesBonus: target.definition.speciesCaptureBonus,
    })

    return {
      targetName: target.definition.name,
      toolItemId,
      supportModuleId,
      activeStatusEffectIds,
      isRearHit,
      breakdown,
    }
  }

  private syncCapturePreview() {
    const gameStore = useGameStore.getState()

    if (this.captureSequenceInProgress) {
      return
    }

    if (!this.isCaptureMode) {
      gameStore.setCapturePreview(null)
      return
    }

    const target = this.findCapturePreviewTarget()
    const toolItemId = resolveActiveCaptureToolItemId(
      gameStore.inventory,
      gameStore.hotbarSlots,
      gameStore.selectedHotbarIndex,
    )

    gameStore.setCapturePreview(
      target && toolItemId && this.player
        ? this.getTargetCapturePreview(
            target,
            toolItemId,
            { x: this.player.x, y: this.player.y },
          )
        : null,
    )
  }

  private updateCaptureAimPreview() {
    const graphics = this.captureAimGraphics

    if (!graphics) {
      return
    }

    graphics.clear()

    if (!this.isCaptureMode || !this.player) {
      return
    }

    const pointer = this.input.activePointer
    pointer.updateWorldPoint(this.cameras.main)

    const origin = { x: this.player.x, y: this.player.y }
    const direction = this.getAttackDirection(origin, {
      x: pointer.worldX,
      y: pointer.worldY,
    })
    const endX = origin.x + direction.x * CAPTURE_THROW_RANGE
    const endY = origin.y + direction.y * CAPTURE_THROW_RANGE

    const target = this.animalManager?.findCapturePathTarget(
      origin,
      direction,
      CAPTURE_THROW_RANGE,
    )

    graphics.lineStyle(5, target ? 0x8cf5b2 : 0xc88cff, 0.62)
    graphics.lineBetween(origin.x, origin.y, endX, endY)
    graphics.fillStyle(0xe0b9ff, 0.75)
    graphics.fillCircle(endX, endY, 10)

    if (target) {
      const collisionCenter = target.getCaptureCollisionCenter()

      graphics.lineStyle(4, 0x8cf5b2, 0.88)
      graphics.strokeCircle(
        collisionCenter.x,
        collisionCenter.y,
        target.captureCollisionRadius + CAPTURE_PROJECTILE_RADIUS,
      )
    }
  }

  private collectDrops(drops: readonly ItemStack[]) {
    const gameStore = useGameStore.getState()

    drops.forEach((drop) => {
      gameStore.addInventoryItem(drop.item, drop.amount)
    })
  }

  private formatChance(chance: number) {
    return `${getCaptureChanceLabel(chance)} ${Math.round(chance * 100)}%`
  }

  private respawnPlayer() {
    if (!this.player || !this.mapManager) {
      return
    }

    const spawn = this.mapManager.definition.playerSpawn

    this.player.setPosition(spawn.x, spawn.y)
    this.player.setVelocity(0, 0)
    this.player.healFully()
    this.player.restoreStaminaFully()
    this.player.restoreShieldFully()
    this.cameras.main.flash(220, 255, 255, 255)

    const gameStore = useGameStore.getState()
    gameStore.setPlayerHp(this.player.currentHp)
    gameStore.setPlayerShieldState(
      this.player.currentShield,
      this.player.maxShield,
    )
    this.syncPlayerActionResourceState()
    gameStore.setPlayerHunger(RESPAWN_HUNGER)
    gameStore.setHungerMessage(
      `쓰러진 뒤 허기가 ${RESPAWN_HUNGER}까지 회복되었습니다.`,
    )
    gameStore.setPlayerWorldPosition(spawn)
  }

  private getAttackDirection(
    origin: Readonly<{ x: number; y: number }>,
    aimPoint: Readonly<{ x: number; y: number }>,
  ) {
    const offsetX = aimPoint.x - origin.x
    const offsetY = aimPoint.y - origin.y
    const distance = Math.hypot(offsetX, offsetY)

    if (distance === 0) {
      return this.player?.getFacingDirection() ?? { x: 1, y: 0 }
    }

    return { x: offsetX / distance, y: offsetY / distance }
  }

  private showAttackEffect(
    origin: Readonly<{ x: number; y: number }>,
    direction: Readonly<{ x: number; y: number }>,
  ) {
    const endX = origin.x + direction.x * PLAYER_ATTACK_RANGE
    const endY = origin.y + direction.y * PLAYER_ATTACK_RANGE
    const graphics = this.add.graphics().setDepth(12)

    graphics.lineStyle(18, 0xffef9b, 0.48)
    graphics.lineBetween(origin.x, origin.y, endX, endY)
    graphics.fillStyle(0xfff4b8, 0.7)
    graphics.fillCircle(endX, endY, 9)

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 110,
      onComplete: () => graphics.destroy(),
    })
  }
}

function getNextCompanionCommandMode(
  commandMode: CompanionCommandMode,
): CompanionCommandMode {
  switch (commandMode) {
    case 'follow':
      return 'stay'
    case 'stay':
      return 'focus'
    case 'focus':
      return 'follow'
  }
}

function getCompanionCommandLabel(commandMode: CompanionCommandMode) {
  switch (commandMode) {
    case 'follow':
      return '따라오기'
    case 'stay':
      return '대기'
    case 'focus':
      return '집중 공격'
  }
}
