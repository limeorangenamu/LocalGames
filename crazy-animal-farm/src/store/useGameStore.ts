import { create } from 'zustand'
import {
  createEmptyItemStorage,
  INITIAL_INVENTORY,
  ITEM_DEFINITIONS,
} from '../game/data/items'
import {
  ANIMAL_ACTIVE_SKILL_SLOT_COUNT,
  ANIMAL_PARTY_SLOT_COUNT,
  PLAYER_INITIAL_EXPERIENCE,
  PLAYER_INITIAL_EXPERIENCE_TO_NEXT_LEVEL,
  PLAYER_INITIAL_LEVEL,
  PLAYER_MAX_HUNGER,
  PLAYER_MAX_STAMINA,
} from '../game/config/gameConstants'
import { ANIMAL_DEFINITIONS } from '../game/data/animals'
import { COMPANION_EQUIPMENT } from '../game/data/companionEquipment'
import {
  getDefaultEquipmentDurability,
  TOOL_DEFINITIONS,
} from '../game/data/equipment'
import { CRAFTING_RECIPES } from '../game/data/crafting'
import {
  CAPTURE_SUPPORT_MODULES,
  getDefaultPlayerCapturePower,
  normalizePlayerCapturePower,
} from '../game/data/capture'
import {
  DEFAULT_MAP_ID,
  getMapDefinition,
  isMapId,
} from '../game/data/maps'
import type {
  AnimalActiveSkillId,
  AnimalSelfStatusEffectId,
  CapturedAnimal,
  CompanionEquipmentId,
  CompanionSkillCooldownState,
  CompanionCommandMode,
} from '../game/types/animal'
import type { PlacedBuilding } from '../game/types/building'
import type {
  CapturePreviewState,
  CaptureSupportModuleId,
} from '../game/types/capture'
import type {
  CraftingRecipeId,
  CraftingStationId,
} from '../game/types/crafting'
import type {
  EquipmentDurability,
  EquippedItems,
  EquipmentSlotId,
  ToolDefinitionId,
} from '../game/types/equipment'
import {
  createEmptyHotbarSlots,
  HOTBAR_SLOT_COUNT,
  type HotbarAssignment,
  type HotbarSlot,
} from '../game/types/hotbar'
import type { InventoryItemKey, ItemStack } from '../game/types/item'
import type { MapId, WorldPoint } from '../game/types/map'
import type { ResourceSpawnState } from '../game/types/resource'
import type { GameSave, SaveSlotId } from '../game/types/save'
import type { WorkAssignment } from '../game/types/work'
import type { PlayerMovementState } from '../game/types/player'
import {
  applyAnimalDamage,
  gainAnimalExperience,
  getAnimalCondition,
  normalizeAnimalTrust,
  recoverStoredAnimal,
} from '../game/utils/animalInstance'
import { getPlayerActionResourceProfile } from '../game/utils/playerActionResources'

export type GameMode = 'normal' | 'capture' | 'build' | 'craft'
export type MapViewLevel = 'world' | 'meadow' | 'current'
export type GameMenuTabId =
  | 'inventory'
  | 'technology'
  | 'animals'
  | 'bestiary'
  | 'controls'
  | 'options'

export type AnimalGrowthEvent = Readonly<{
  animalId: string
  animalName: string
  experienceGained: number
  level: number
  levelsGained: number
  learnedSkillIds: readonly AnimalActiveSkillId[]
}>

export type AnimalDamageEvent = Readonly<{
  animalId: string
  animalName: string
  damageTaken: number
  currentHp: number
  incapacitated: boolean
}>

export type AnimalRecoveryEvent = Readonly<{
  healedAnimalCount: number
  revivedAnimalNames: readonly string[]
}>

type GameStore = {
  playerHp: number
  playerMaxHp: number
  playerHunger: number
  playerMaxHunger: number
  playerLevel: number
  playerExperience: number
  playerExperienceToNextLevel: number
  playerCapturePower: number
  equippedCaptureSupportModuleId: CaptureSupportModuleId | null
  technologyPoints: number
  unlockedRecipeIds: readonly CraftingRecipeId[]
  playerShield: number
  playerMaxShield: number
  playerStamina: number
  playerMaxStamina: number
  playerStaminaRecoveryDelayed: boolean
  playerMovementState: PlayerMovementState
  hungerMessage: string
  playerWorldPosition: WorldPoint
  currentMapId: MapId
  currentMapName: string
  inventory: Record<InventoryItemKey, number>
  baseStorage: Record<InventoryItemKey, number>
  ownedToolIds: readonly ToolDefinitionId[]
  equippedToolId: ToolDefinitionId
  equippedItems: EquippedItems
  equipmentDurability: EquipmentDurability
  combatMessage: string
  hotbarSlots: readonly HotbarSlot[]
  selectedHotbarIndex: number
  activeMode: GameMode
  isGameMenuOpen: boolean
  isMapOpen: boolean
  activeMapView: MapViewLevel
  activeMenuTab: GameMenuTabId
  isBaseStorageOpen: boolean
  isCraftingWorkbenchOpen: boolean
  activeCraftingStationId: CraftingStationId | null
  capturePreview: CapturePreviewState | null
  captureMessage: string
  capturedAnimals: readonly CapturedAnimal[]
  activeAnimalPartyIds: readonly string[]
  selectedCompanionAnimalId: string | null
  summonedCompanionAnimalId: string | null
  companionCommandMode: CompanionCommandMode
  companionTargetName: string | null
  companionMessage: string
  companionSkillCooldowns: readonly CompanionSkillCooldownState[]
  companionActiveStatusEffectIds: readonly AnimalSelfStatusEffectId[]
  companionPartnerSkillActive: boolean
  companionLastSkillName: string | null
  placedBuildings: readonly PlacedBuilding[]
  selectedBuildingName: string | null
  buildMessage: string
  travelMessage: string
  craftMessage: string
  activeWorkerCount: number
  mapResourceStates: Readonly<
    Partial<Record<MapId, readonly ResourceSpawnState[]>>
  >
  saveHydrated: boolean
  lastSavedAt: number | null
  saveMessage: string
  manualSaveRequestId: number
  completedManualSaveRequestId: number
  lastManualSaveSucceeded: boolean | null
  requestedSaveSlotId: SaveSlotId
  setPlayerHp: (hp: number) => void
  setPlayerShieldState: (shield: number, maxShield: number) => void
  setPlayerActionResourceState: (
    stamina: number,
    maxStamina: number,
    recoveryDelayed: boolean,
    movementState: PlayerMovementState,
  ) => void
  gainPlayerExperience: (amount: number) => void
  unlockRecipe: (recipeId: CraftingRecipeId) => boolean
  setPlayerHunger: (hunger: number) => void
  setHungerMessage: (hungerMessage: string) => void
  eatFood: (item: InventoryItemKey) => boolean
  setPlayerWorldPosition: (position: WorldPoint) => void
  setCurrentMap: (mapId: MapId, mapName: string) => void
  addInventoryItem: (item: InventoryItemKey, amount: number) => void
  consumeInventoryItem: (item: InventoryItemKey, amount: number) => boolean
  consumeInventoryItems: (items: readonly ItemStack[]) => boolean
  unlockTool: (toolId: ToolDefinitionId) => boolean
  equipTool: (toolId: ToolDefinitionId) => boolean
  equipToolInSlot: (
    toolId: ToolDefinitionId,
    slotId: EquipmentSlotId,
  ) => boolean
  unequipItem: (slotId: EquipmentSlotId) => boolean
  damageEquipment: (toolId: ToolDefinitionId, amount: number) => boolean
  damageEquippedDefensiveItems: (amount: number) => readonly ToolDefinitionId[]
  repairEquipment: (toolId: ToolDefinitionId) => boolean
  setCombatMessage: (combatMessage: string) => void
  assignHotbarSlot: (
    index: number,
    assignment: HotbarAssignment,
  ) => boolean
  clearHotbarSlot: (index: number) => boolean
  selectHotbarSlot: (index: number) => boolean
  setActiveMode: (activeMode: GameMode) => void
  setGameMenuOpen: (isGameMenuOpen: boolean) => void
  setMapOpen: (isMapOpen: boolean) => void
  setActiveMapView: (activeMapView: MapViewLevel) => void
  setActiveMenuTab: (activeMenuTab: GameMenuTabId) => void
  setBaseStorageOpen: (isBaseStorageOpen: boolean) => void
  setCraftingWorkbenchOpen: (
    isOpen: boolean,
    stationId?: CraftingStationId,
  ) => void
  setCapturePreview: (capturePreview: CapturePreviewState | null) => void
  setCaptureMessage: (captureMessage: string) => void
  equipCaptureSupportModule: (
    moduleId: CaptureSupportModuleId | null,
  ) => boolean
  addCapturedAnimal: (capturedAnimal: CapturedAnimal) => void
  addAnimalToParty: (animalId: string) => boolean
  removeAnimalFromParty: (animalId: string) => boolean
  selectCompanionAnimal: (animalId: string) => boolean
  selectNextCompanionAnimal: () => string | null
  setSummonedCompanionAnimal: (animalId: string | null) => boolean
  setCompanionCommandMode: (commandMode: CompanionCommandMode) => void
  setCompanionTargetName: (targetName: string | null) => void
  setCompanionMessage: (message: string) => void
  gainAnimalPartyExperience: (
    amount: number,
    participatingAnimalId?: string | null,
  ) => readonly AnimalGrowthEvent[]
  gainAnimalTrust: (animalId: string, amount: number) => boolean
  equipAnimalActiveSkill: (
    animalId: string,
    skillId: AnimalActiveSkillId,
    slotIndex: number,
  ) => boolean
  equipCompanionEquipment: (
    animalId: string,
    equipmentId: CompanionEquipmentId | null,
  ) => boolean
  healCapturedAnimal: (animalId: string, amount: number) => number
  setCompanionCombatState: (
    skillCooldowns: readonly CompanionSkillCooldownState[],
    activeStatusEffectIds: readonly AnimalSelfStatusEffectId[],
    partnerSkillActive: boolean,
    lastSkillName?: string | null,
  ) => void
  damageCapturedAnimal: (
    animalId: string,
    rawDamage: number,
    damagedAt: number,
  ) => AnimalDamageEvent | null
  recoverStoredAnimals: (recoveryAt: number) => AnimalRecoveryEvent
  addPlacedBuilding: (building: PlacedBuilding) => void
  unassignCapturedAnimalFromBuilding: (animalId: string) => boolean
  assignCapturedAnimalToBuilding: (
    animalId: string,
    assignment: WorkAssignment,
  ) => boolean
  addBaseStorageItem: (item: InventoryItemKey, amount: number) => void
  transferBaseItemToInventory: (
    item: InventoryItemKey,
    amount: number,
  ) => boolean
  setSelectedBuildingName: (selectedBuildingName: string | null) => void
  setBuildMessage: (buildMessage: string) => void
  setTravelMessage: (travelMessage: string) => void
  setCraftMessage: (craftMessage: string) => void
  setActiveWorkerCount: (activeWorkerCount: number) => void
  setMapResourceStates: (
    mapId: MapId,
    resourceStates: readonly ResourceSpawnState[],
  ) => void
  hydrateFromSave: (save: GameSave) => void
  markSaveHydrated: () => void
  setSaveStatus: (savedAt: number | null, saveMessage: string) => void
  requestManualSave: (slotId?: SaveSlotId) => number
  completeManualSave: (requestId: number, success: boolean) => void
}

const INITIAL_PLAYER_HP = 100

export const useGameStore = create<GameStore>((set, get) => ({
  playerHp: INITIAL_PLAYER_HP,
  playerMaxHp: INITIAL_PLAYER_HP,
  playerHunger: PLAYER_MAX_HUNGER,
  playerMaxHunger: PLAYER_MAX_HUNGER,
  playerLevel: PLAYER_INITIAL_LEVEL,
  playerExperience: PLAYER_INITIAL_EXPERIENCE,
  playerExperienceToNextLevel: PLAYER_INITIAL_EXPERIENCE_TO_NEXT_LEVEL,
  playerCapturePower: getDefaultPlayerCapturePower(PLAYER_INITIAL_LEVEL),
  equippedCaptureSupportModuleId: null,
  technologyPoints: 4,
  unlockedRecipeIds: [],
  playerShield: 0,
  playerMaxShield: 0,
  playerStamina: PLAYER_MAX_STAMINA,
  playerMaxStamina: PLAYER_MAX_STAMINA,
  playerStaminaRecoveryDelayed: false,
  playerMovementState: 'idle',
  hungerMessage: '',
  playerWorldPosition: { ...getMapDefinition(DEFAULT_MAP_ID).playerSpawn },
  currentMapId: DEFAULT_MAP_ID,
  currentMapName: getMapDefinition(DEFAULT_MAP_ID).name,
  inventory: { ...INITIAL_INVENTORY },
  baseStorage: createEmptyItemStorage(),
  ownedToolIds: ['bare-hands'],
  equippedToolId: 'bare-hands',
  equippedItems: {},
  equipmentDurability: {},
  combatMessage: '',
  hotbarSlots: createEmptyHotbarSlots(),
  selectedHotbarIndex: 0,
  activeMode: 'normal',
  isGameMenuOpen: false,
  isMapOpen: false,
  activeMapView: 'world',
  activeMenuTab: 'inventory',
  isBaseStorageOpen: false,
  isCraftingWorkbenchOpen: false,
  activeCraftingStationId: null,
  capturePreview: null,
  captureMessage: '',
  capturedAnimals: [],
  activeAnimalPartyIds: [],
  selectedCompanionAnimalId: null,
  summonedCompanionAnimalId: null,
  companionCommandMode: 'follow',
  companionTargetName: null,
  companionMessage: '',
  companionSkillCooldowns: [],
  companionActiveStatusEffectIds: [],
  companionPartnerSkillActive: false,
  companionLastSkillName: null,
  placedBuildings: [],
  selectedBuildingName: null,
  buildMessage: '',
  travelMessage: '',
  craftMessage: '',
  activeWorkerCount: 0,
  mapResourceStates: {},
  saveHydrated: false,
  lastSavedAt: null,
  saveMessage: '',
  manualSaveRequestId: 0,
  completedManualSaveRequestId: 0,
  lastManualSaveSucceeded: null,
  requestedSaveSlotId: 'auto',
  setPlayerHp: (hp) => set({ playerHp: hp }),
  setPlayerShieldState: (playerShield, playerMaxShield) => {
    const safeMaxShield = Math.max(0, playerMaxShield)

    set({
      playerMaxShield: safeMaxShield,
      playerShield: Math.max(0, Math.min(safeMaxShield, playerShield)),
    })
  },
  setPlayerActionResourceState: (
    playerStamina,
    playerMaxStamina,
    playerStaminaRecoveryDelayed,
    playerMovementState,
  ) => {
    const safeMaxStamina = Math.max(1, playerMaxStamina)

    set({
      playerMaxStamina: safeMaxStamina,
      playerStamina: Math.max(
        0,
        Math.min(safeMaxStamina, playerStamina),
      ),
      playerStaminaRecoveryDelayed,
      playerMovementState,
    })
  },
  gainPlayerExperience: (amount) => {
    const safeAmount = Math.max(0, Math.floor(amount))

    if (safeAmount === 0) {
      return
    }

    set((state) => {
      let playerLevel = state.playerLevel
      let playerExperience = state.playerExperience + safeAmount
      let playerExperienceToNextLevel = state.playerExperienceToNextLevel
      let gainedTechnologyPoints = 0

      while (playerExperience >= playerExperienceToNextLevel) {
        playerExperience -= playerExperienceToNextLevel
        playerLevel += 1
        gainedTechnologyPoints += 2
        playerExperienceToNextLevel = Math.round(
          playerExperienceToNextLevel * 1.25,
        )
      }

      return {
        playerLevel,
        playerExperience,
        playerExperienceToNextLevel,
        playerCapturePower: getDefaultPlayerCapturePower(playerLevel),
        technologyPoints:
          state.technologyPoints + gainedTechnologyPoints,
      }
    })
  },
  unlockRecipe: (recipeId) => {
    const state = get()
    const recipe = CRAFTING_RECIPES[recipeId]

    if (
      state.unlockedRecipeIds.includes(recipeId) ||
      state.playerLevel < recipe.unlockLevel ||
      state.technologyPoints < recipe.technologyPointCost ||
      (recipe.prerequisiteRecipeId &&
        !state.unlockedRecipeIds.includes(recipe.prerequisiteRecipeId))
    ) {
      return false
    }

    set((currentState) => ({
      technologyPoints:
        currentState.technologyPoints - recipe.technologyPointCost,
      unlockedRecipeIds: [...currentState.unlockedRecipeIds, recipeId],
    }))
    return true
  },
  setPlayerHunger: (playerHunger) =>
    set({
      playerHunger: Math.max(0, Math.min(PLAYER_MAX_HUNGER, playerHunger)),
    }),
  setHungerMessage: (hungerMessage) => set({ hungerMessage }),
  eatFood: (item) => {
    const state = get()
    const definition = ITEM_DEFINITIONS[item]
    const hungerRestore = definition.hungerRestore ?? 0

    if (
      hungerRestore <= 0 ||
      state.inventory[item] <= 0 ||
      state.playerHunger >= PLAYER_MAX_HUNGER
    ) {
      return false
    }

    set((currentState) => ({
      inventory: {
        ...currentState.inventory,
        [item]: currentState.inventory[item] - 1,
      },
      playerHunger: Math.min(
        PLAYER_MAX_HUNGER,
        currentState.playerHunger + hungerRestore,
      ),
      hungerMessage: `${definition.name}을(를) 먹었습니다. 허기 +${hungerRestore}`,
    }))
    return true
  },
  setPlayerWorldPosition: (playerWorldPosition) => set({ playerWorldPosition }),
  setCurrentMap: (currentMapId, currentMapName) =>
    set({ currentMapId, currentMapName }),
  addInventoryItem: (item, amount) =>
    set((state) => ({
      inventory: {
        ...state.inventory,
        [item]: state.inventory[item] + amount,
      },
    })),
  consumeInventoryItem: (item, amount) => {
    if (amount <= 0 || get().inventory[item] < amount) {
      return false
    }

    set((state) => ({
      inventory: {
        ...state.inventory,
        [item]: state.inventory[item] - amount,
      },
    }))
    return true
  },
  consumeInventoryItems: (items) => {
    const requiredAmounts = new Map<InventoryItemKey, number>()

    for (const itemStack of items) {
      if (itemStack.amount <= 0) {
        return false
      }

      requiredAmounts.set(
        itemStack.item,
        (requiredAmounts.get(itemStack.item) ?? 0) + itemStack.amount,
      )
    }

    const currentInventory = get().inventory

    for (const [item, requiredAmount] of requiredAmounts) {
      if (currentInventory[item] < requiredAmount) {
        return false
      }
    }

    set((state) => {
      const inventory = { ...state.inventory }

      requiredAmounts.forEach((requiredAmount, item) => {
        inventory[item] -= requiredAmount
      })
      return { inventory }
    })
    return true
  },
  unlockTool: (toolId) => {
    if (get().ownedToolIds.includes(toolId)) {
      return false
    }

    set((state) => {
      const maxDurability = getDefaultEquipmentDurability(toolId)

      return {
        ownedToolIds: [...state.ownedToolIds, toolId],
        equipmentDurability:
          maxDurability === null
            ? state.equipmentDurability
            : {
                ...state.equipmentDurability,
                [toolId]: maxDurability,
              },
      }
    })
    return true
  },
  equipTool: (toolId) => {
    if (!get().ownedToolIds.includes(toolId)) {
      return false
    }

    const equipmentSlot = TOOL_DEFINITIONS[toolId].equipmentSlot

    if (!equipmentSlot) {
      set((state) => {
        const equippedItems = { ...state.equippedItems }
        delete equippedItems.rightHand
        return {
          equippedToolId: 'bare-hands',
          equippedItems,
          combatMessage: '',
        }
      })
      return true
    }

    return get().equipToolInSlot(toolId, equipmentSlot)
  },
  equipToolInSlot: (toolId, slotId) => {
    const currentState = get()

    if (
      !currentState.ownedToolIds.includes(toolId) ||
      TOOL_DEFINITIONS[toolId].equipmentSlot !== slotId ||
      (TOOL_DEFINITIONS[toolId].maxDurability !== undefined &&
        (currentState.equipmentDurability[toolId] ??
          TOOL_DEFINITIONS[toolId].maxDurability ??
          0) <= 0)
    ) {
      return false
    }

    if (currentState.equippedItems[slotId] === toolId) {
      return true
    }

    set((state) => {
      const shieldCapacity =
        slotId === 'shield'
          ? TOOL_DEFINITIONS[toolId].shieldCapacity ?? 0
          : state.playerMaxShield

      return {
        equippedItems: {
          ...state.equippedItems,
          [slotId]: toolId,
        },
        equippedToolId:
          slotId === 'rightHand' ? toolId : state.equippedToolId,
        playerMaxShield: shieldCapacity,
        playerShield:
          slotId === 'shield' ? shieldCapacity : state.playerShield,
        combatMessage: '',
      }
    })
    return true
  },
  unequipItem: (slotId) => {
    if (!get().equippedItems[slotId]) {
      return false
    }

    set((state) => {
      const equippedItems = { ...state.equippedItems }
      delete equippedItems[slotId]

      return {
        equippedItems,
        equippedToolId:
          slotId === 'rightHand' ? 'bare-hands' : state.equippedToolId,
        playerMaxShield:
          slotId === 'shield' ? 0 : state.playerMaxShield,
        playerShield:
          slotId === 'shield' ? 0 : state.playerShield,
        combatMessage: '',
      }
    })
    return true
  },
  assignHotbarSlot: (index, assignment) => {
    const state = get()

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= HOTBAR_SLOT_COUNT ||
      (assignment.kind === 'item'
        ? state.inventory[assignment.itemId] <= 0
        : !state.ownedToolIds.includes(assignment.toolId))
    ) {
      return false
    }

    set((currentState) => ({
      hotbarSlots: currentState.hotbarSlots.map((slot, slotIndex) => {
        if (slotIndex === index) {
          return assignment
        }

        return isSameHotbarAssignment(slot, assignment) ? null : slot
      }),
    }))

    if (get().selectedHotbarIndex === index) {
      get().selectHotbarSlot(index)
    }

    return true
  },
  clearHotbarSlot: (index) => {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= HOTBAR_SLOT_COUNT ||
      get().hotbarSlots[index] === null
    ) {
      return false
    }

    set((state) => ({
      hotbarSlots: state.hotbarSlots.map((slot, slotIndex) =>
        slotIndex === index ? null : slot,
      ),
    }))

    if (get().selectedHotbarIndex === index) {
      get().selectHotbarSlot(index)
    }

    return true
  },
  selectHotbarSlot: (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= HOTBAR_SLOT_COUNT) {
      return false
    }

    const assignment = get().hotbarSlots[index]
    set({ selectedHotbarIndex: index })

    if (assignment?.kind === 'tool') {
      return get().equipTool(assignment.toolId)
    }

    get().equipTool('bare-hands')
    return true
  },
  setActiveMode: (activeMode) => set({ activeMode }),
  setGameMenuOpen: (isGameMenuOpen) =>
    set({
      isGameMenuOpen,
      isMapOpen: isGameMenuOpen ? false : get().isMapOpen,
      isBaseStorageOpen: isGameMenuOpen ? false : get().isBaseStorageOpen,
      isCraftingWorkbenchOpen: isGameMenuOpen
        ? false
        : get().isCraftingWorkbenchOpen,
      activeCraftingStationId: isGameMenuOpen
        ? null
        : get().activeCraftingStationId,
    }),
  setMapOpen: (isMapOpen) =>
    set({
      isMapOpen,
      isGameMenuOpen: isMapOpen ? false : get().isGameMenuOpen,
      isBaseStorageOpen: isMapOpen ? false : get().isBaseStorageOpen,
      isCraftingWorkbenchOpen: isMapOpen
        ? false
        : get().isCraftingWorkbenchOpen,
      activeCraftingStationId: isMapOpen
        ? null
        : get().activeCraftingStationId,
    }),
  setActiveMapView: (activeMapView) => set({ activeMapView }),
  setActiveMenuTab: (activeMenuTab) => set({ activeMenuTab }),
  setBaseStorageOpen: (isBaseStorageOpen) =>
    set({
      isBaseStorageOpen,
      isMapOpen: isBaseStorageOpen ? false : get().isMapOpen,
      isGameMenuOpen: isBaseStorageOpen ? false : get().isGameMenuOpen,
      isCraftingWorkbenchOpen: isBaseStorageOpen
        ? false
        : get().isCraftingWorkbenchOpen,
      activeCraftingStationId: isBaseStorageOpen
        ? null
        : get().activeCraftingStationId,
    }),
  setCraftingWorkbenchOpen: (
    isCraftingWorkbenchOpen,
    activeCraftingStationId,
  ) =>
    set({
      isCraftingWorkbenchOpen,
      isMapOpen: isCraftingWorkbenchOpen ? false : get().isMapOpen,
      activeCraftingStationId: isCraftingWorkbenchOpen
        ? activeCraftingStationId ?? 'primitive-workbench'
        : null,
      isGameMenuOpen: isCraftingWorkbenchOpen
        ? false
        : get().isGameMenuOpen,
      isBaseStorageOpen: isCraftingWorkbenchOpen
        ? false
        : get().isBaseStorageOpen,
    }),
  setCapturePreview: (capturePreview) =>
    set({ capturePreview }),
  setCaptureMessage: (captureMessage) => set({ captureMessage }),
  equipCaptureSupportModule: (moduleId) => {
    if (moduleId === null) {
      set({ equippedCaptureSupportModuleId: null })
      return true
    }

    const definition = CAPTURE_SUPPORT_MODULES[moduleId]

    if (get().inventory[definition.inventoryItemId] <= 0) {
      return false
    }

    set({ equippedCaptureSupportModuleId: moduleId })
    return true
  },
  damageEquipment: (toolId, amount) => {
    const definition = TOOL_DEFINITIONS[toolId]
    const maxDurability = definition.maxDurability
    const currentState = get()

    if (
      maxDurability === undefined ||
      amount <= 0 ||
      !currentState.ownedToolIds.includes(toolId)
    ) {
      return false
    }

    const currentDurability =
      currentState.equipmentDurability[toolId] ?? maxDurability

    if (currentDurability <= 0) {
      return false
    }

    const nextDurability = Math.max(0, currentDurability - amount)
    const broke = nextDurability === 0

    set((state) => {
      const equipmentDurability = {
        ...state.equipmentDurability,
        [toolId]: nextDurability,
      }

      if (!broke) {
        return { equipmentDurability }
      }

      const equippedItems = { ...state.equippedItems }

      Object.entries(equippedItems).forEach(([slotId, equippedToolId]) => {
        if (equippedToolId === toolId) {
          delete equippedItems[slotId as EquipmentSlotId]
        }
      })

      return {
        equipmentDurability,
        equippedItems,
        equippedToolId:
          state.equippedToolId === toolId
            ? 'bare-hands'
            : state.equippedToolId,
        playerMaxShield:
          definition.equipmentSlot === 'shield'
            ? 0
            : state.playerMaxShield,
        playerShield:
          definition.equipmentSlot === 'shield'
            ? 0
            : state.playerShield,
        combatMessage: `${definition.name}의 내구도가 모두 소진되었습니다.`,
      }
    })
    return broke
  },
  damageEquippedDefensiveItems: (amount) => {
    const defensiveSlots: readonly EquipmentSlotId[] = [
      'head',
      'body',
      'cloak',
      'shield',
    ]
    const currentState = get()
    const equippedDefensiveToolIds = defensiveSlots
      .map((slotId) => currentState.equippedItems[slotId])
      .filter((toolId): toolId is ToolDefinitionId => toolId !== undefined)

    return equippedDefensiveToolIds.filter((toolId) =>
      get().damageEquipment(toolId, amount),
    )
  },
  repairEquipment: (toolId) => {
    const definition = TOOL_DEFINITIONS[toolId]
    const maxDurability = definition.maxDurability
    const repairIngredients = definition.repairIngredients ?? []
    const currentState = get()

    if (
      maxDurability === undefined ||
      !currentState.ownedToolIds.includes(toolId) ||
      (currentState.equipmentDurability[toolId] ?? maxDurability) >=
        maxDurability ||
      repairIngredients.length === 0 ||
      !currentState.consumeInventoryItems(repairIngredients)
    ) {
      return false
    }

    set((state) => ({
      equipmentDurability: {
        ...state.equipmentDurability,
        [toolId]: maxDurability,
      },
      combatMessage: `${definition.name} 수리를 완료했습니다.`,
    }))
    return true
  },
  setCombatMessage: (combatMessage) => set({ combatMessage }),
  addCapturedAnimal: (capturedAnimal) =>
    set((state) => {
      const canJoinParty =
        state.activeAnimalPartyIds.length < ANIMAL_PARTY_SLOT_COUNT &&
        !capturedAnimal.workAssignment
      const activeAnimalPartyIds = canJoinParty
        ? [...state.activeAnimalPartyIds, capturedAnimal.id]
        : state.activeAnimalPartyIds

      return {
        capturedAnimals: [...state.capturedAnimals, capturedAnimal],
        activeAnimalPartyIds,
        selectedCompanionAnimalId:
          state.selectedCompanionAnimalId ??
          activeAnimalPartyIds[0] ??
          null,
      }
    }),
  addAnimalToParty: (animalId) => {
    const state = get()
    const animal = state.capturedAnimals.find(
      (candidate) => candidate.id === animalId,
    )

    if (
      !animal ||
      animal.workAssignment ||
      animal.condition === 'incapacitated' ||
      state.activeAnimalPartyIds.includes(animalId) ||
      state.activeAnimalPartyIds.length >= ANIMAL_PARTY_SLOT_COUNT
    ) {
      return false
    }

    set((currentState) => {
      const activeAnimalPartyIds = [
        ...currentState.activeAnimalPartyIds,
        animalId,
      ]

      return {
        activeAnimalPartyIds,
        selectedCompanionAnimalId:
          currentState.selectedCompanionAnimalId ??
          activeAnimalPartyIds[0] ??
          null,
      }
    })
    return true
  },
  removeAnimalFromParty: (animalId) => {
    if (!get().activeAnimalPartyIds.includes(animalId)) {
      return false
    }

    set((state) => {
      const activeAnimalPartyIds = state.activeAnimalPartyIds.filter(
        (candidateId) => candidateId !== animalId,
      )

      return {
        capturedAnimals: state.capturedAnimals.map((animal) =>
          animal.id === animalId &&
          animal.condition !== 'incapacitated' &&
          animal.currentHp < animal.stats.maxHp
            ? { ...animal, lastRecoveryAt: Date.now() }
            : animal,
        ),
        activeAnimalPartyIds,
        selectedCompanionAnimalId:
          state.selectedCompanionAnimalId === animalId
            ? activeAnimalPartyIds[0] ?? null
            : state.selectedCompanionAnimalId,
        summonedCompanionAnimalId:
          state.summonedCompanionAnimalId === animalId
            ? null
            : state.summonedCompanionAnimalId,
        companionTargetName:
          state.summonedCompanionAnimalId === animalId
            ? null
            : state.companionTargetName,
        companionMessage:
          state.summonedCompanionAnimalId === animalId
            ? '파티에서 제외되어 동행 동물을 회수했습니다.'
            : state.companionMessage,
        companionSkillCooldowns:
          state.summonedCompanionAnimalId === animalId
            ? []
            : state.companionSkillCooldowns,
        companionActiveStatusEffectIds:
          state.summonedCompanionAnimalId === animalId
            ? []
            : state.companionActiveStatusEffectIds,
        companionPartnerSkillActive:
          state.summonedCompanionAnimalId === animalId
            ? false
            : state.companionPartnerSkillActive,
        companionLastSkillName:
          state.summonedCompanionAnimalId === animalId
            ? null
            : state.companionLastSkillName,
      }
    })
    return true
  },
  selectCompanionAnimal: (animalId) => {
    if (!get().activeAnimalPartyIds.includes(animalId)) {
      return false
    }

    set({ selectedCompanionAnimalId: animalId })
    return true
  },
  selectNextCompanionAnimal: () => {
    const state = get()
    const partyIds = state.activeAnimalPartyIds

    if (partyIds.length === 0) {
      set({ selectedCompanionAnimalId: null })
      return null
    }

    const currentIndex = state.selectedCompanionAnimalId
      ? partyIds.indexOf(state.selectedCompanionAnimalId)
      : -1
    const selectedCompanionAnimalId =
      partyIds[(currentIndex + 1) % partyIds.length]

    set({ selectedCompanionAnimalId })
    return selectedCompanionAnimalId
  },
  setSummonedCompanionAnimal: (animalId) => {
    const animal = animalId
      ? get().capturedAnimals.find((candidate) => candidate.id === animalId)
      : null

    if (
      animalId !== null &&
      (!get().activeAnimalPartyIds.includes(animalId) ||
        !animal ||
        animal.condition === 'incapacitated')
    ) {
      return false
    }

    set({
      summonedCompanionAnimalId: animalId,
      companionTargetName: null,
      companionSkillCooldowns: [],
      companionActiveStatusEffectIds: [],
      companionPartnerSkillActive: false,
      companionLastSkillName: null,
    })
    return true
  },
  setCompanionCommandMode: (companionCommandMode) =>
    set({
      companionCommandMode,
      companionTargetName:
        companionCommandMode === 'focus'
          ? get().companionTargetName
          : null,
    }),
  setCompanionTargetName: (companionTargetName) =>
    set({ companionTargetName }),
  setCompanionMessage: (companionMessage) => set({ companionMessage }),
  gainAnimalPartyExperience: (amount, participatingAnimalId = null) => {
    const safeAmount = Math.max(0, Math.floor(amount))
    const state = get()

    if (safeAmount === 0 || state.activeAnimalPartyIds.length === 0) {
      return []
    }

    const experienceByAnimalId = new Map<string, number>()
    const growthEvents: AnimalGrowthEvent[] = []
    const updatedAnimals = state.capturedAnimals.map((animal) => {
      if (
        !state.activeAnimalPartyIds.includes(animal.id) ||
        animal.condition === 'incapacitated'
      ) {
        return animal
      }

      const experienceGained =
        animal.id === participatingAnimalId
          ? safeAmount
          : Math.max(1, Math.floor(safeAmount * 0.6))
      const definition = ANIMAL_DEFINITIONS[animal.animalDefinitionId]

      if (!definition) {
        return animal
      }

      const growthResult = gainAnimalExperience(
        animal,
        definition,
        experienceGained,
      )

      experienceByAnimalId.set(animal.id, experienceGained)
      growthEvents.push({
        animalId: animal.id,
        animalName: animal.name,
        experienceGained,
        level: growthResult.animal.level,
        levelsGained: growthResult.levelsGained,
        learnedSkillIds: growthResult.learnedSkillIds,
      })
      return growthResult.animal
    })

    if (experienceByAnimalId.size > 0) {
      set({ capturedAnimals: updatedAnimals })
    }

    return growthEvents
  },
  gainAnimalTrust: (animalId, amount) => {
    const safeAmount = Math.floor(amount)
    const animal = get().capturedAnimals.find(
      (candidate) => candidate.id === animalId,
    )

    if (
      !animal ||
      animal.condition === 'incapacitated' ||
      safeAmount === 0
    ) {
      return false
    }

    const trust = normalizeAnimalTrust(animal.trust + safeAmount)

    if (trust === animal.trust) {
      return false
    }

    set((state) => ({
      capturedAnimals: state.capturedAnimals.map((candidate) =>
        candidate.id === animalId ? { ...candidate, trust } : candidate,
      ),
    }))
    return true
  },
  equipAnimalActiveSkill: (animalId, skillId, slotIndex) => {
    const animal = get().capturedAnimals.find(
      (candidate) => candidate.id === animalId,
    )

    if (
      !animal ||
      !animal.learnedActiveSkillIds.includes(skillId) ||
      !Number.isInteger(slotIndex) ||
      slotIndex < 0 ||
      slotIndex >= ANIMAL_ACTIVE_SKILL_SLOT_COUNT
    ) {
      return false
    }

    const equippedActiveSkillIds = [...animal.equippedActiveSkillIds]
    const previousSlotIndex = equippedActiveSkillIds.indexOf(skillId)

    if (previousSlotIndex >= 0) {
      equippedActiveSkillIds[previousSlotIndex] =
        equippedActiveSkillIds[slotIndex] ?? null
    }

    equippedActiveSkillIds[slotIndex] = skillId
    set((state) => ({
      capturedAnimals: state.capturedAnimals.map((candidate) =>
        candidate.id === animalId
          ? { ...candidate, equippedActiveSkillIds }
          : candidate,
      ),
    }))
    return true
  },
  equipCompanionEquipment: (animalId, equipmentId) => {
    const state = get()
    const animal = state.capturedAnimals.find(
      (candidate) => candidate.id === animalId,
    )

    if (!animal) {
      return false
    }

    const previousEquipment = animal.partnerEquipmentId

    if (equipmentId === previousEquipment) {
      return true
    }

    const nextEquipment = equipmentId
      ? COMPANION_EQUIPMENT[equipmentId]
      : null

    if (
      nextEquipment &&
      (nextEquipment.animalDefinitionId !==
        animal.animalDefinitionId ||
        state.inventory[nextEquipment.inventoryItemId] <= 0)
    ) {
      return false
    }

    set((currentState) => {
      const inventory = { ...currentState.inventory }

      if (previousEquipment) {
        const previousItemId =
          COMPANION_EQUIPMENT[previousEquipment].inventoryItemId

        inventory[previousItemId] += 1
      }

      if (nextEquipment) {
        inventory[nextEquipment.inventoryItemId] -= 1
      }

      return {
        inventory,
        capturedAnimals: currentState.capturedAnimals.map((candidate) =>
          candidate.id === animalId
            ? { ...candidate, partnerEquipmentId: equipmentId }
            : candidate,
        ),
      }
    })
    return true
  },
  healCapturedAnimal: (animalId, amount) => {
    const safeAmount = Math.max(0, Math.floor(amount))
    const animal = get().capturedAnimals.find(
      (candidate) => candidate.id === animalId,
    )

    if (
      !animal ||
      safeAmount === 0 ||
      animal.condition === 'incapacitated' ||
      animal.currentHp >= animal.stats.maxHp
    ) {
      return 0
    }

    const currentHp = Math.min(
      animal.stats.maxHp,
      animal.currentHp + safeAmount,
    )

    set((state) => ({
      capturedAnimals: state.capturedAnimals.map((candidate) =>
        candidate.id === animalId
          ? {
              ...candidate,
              currentHp,
              condition: getAnimalCondition(
                currentHp,
                candidate.stats.maxHp,
              ),
            }
          : candidate,
      ),
    }))
    return currentHp - animal.currentHp
  },
  setCompanionCombatState: (
    companionSkillCooldowns,
    companionActiveStatusEffectIds,
    companionPartnerSkillActive,
    companionLastSkillName = null,
  ) =>
    set({
      companionSkillCooldowns,
      companionActiveStatusEffectIds,
      companionPartnerSkillActive,
      companionLastSkillName,
    }),
  damageCapturedAnimal: (animalId, rawDamage, damagedAt) => {
    const state = get()
    const animal = state.capturedAnimals.find(
      (candidate) => candidate.id === animalId,
    )

    if (!animal) {
      return null
    }

    const result = applyAnimalDamage(animal, rawDamage, damagedAt)

    if (result.damageTaken === 0) {
      return null
    }

    const activeAnimalPartyIds = result.incapacitated
      ? state.activeAnimalPartyIds.filter(
          (candidateId) => candidateId !== animalId,
        )
      : state.activeAnimalPartyIds
    const selectedCompanionAnimalId =
      result.incapacitated &&
      state.selectedCompanionAnimalId === animalId
        ? activeAnimalPartyIds[0] ?? null
        : state.selectedCompanionAnimalId

    set({
      capturedAnimals: state.capturedAnimals.map((candidate) =>
        candidate.id === animalId ? result.animal : candidate,
      ),
      activeAnimalPartyIds,
      selectedCompanionAnimalId,
      summonedCompanionAnimalId:
        result.incapacitated &&
        state.summonedCompanionAnimalId === animalId
          ? null
          : state.summonedCompanionAnimalId,
      companionTargetName:
        result.incapacitated ? null : state.companionTargetName,
      companionSkillCooldowns:
        result.incapacitated ? [] : state.companionSkillCooldowns,
      companionActiveStatusEffectIds:
        result.incapacitated
          ? []
          : state.companionActiveStatusEffectIds,
      companionPartnerSkillActive:
        result.incapacitated
          ? false
          : state.companionPartnerSkillActive,
      companionLastSkillName:
        result.incapacitated ? null : state.companionLastSkillName,
    })

    return {
      animalId,
      animalName: animal.name,
      damageTaken: result.damageTaken,
      currentHp: result.animal.currentHp,
      incapacitated: result.incapacitated,
    }
  },
  recoverStoredAnimals: (recoveryAt) => {
    const state = get()
    const activePartyIdSet = new Set(state.activeAnimalPartyIds)
    let healedAnimalCount = 0
    const revivedAnimalNames: string[] = []
    let changed = false
    const capturedAnimals = state.capturedAnimals.map((animal) => {
      if (activePartyIdSet.has(animal.id) || animal.workAssignment) {
        return animal
      }

      const result = recoverStoredAnimal(animal, recoveryAt)

      if (result.animal === animal) {
        return animal
      }

      changed = true

      if (result.healedAmount > 0) {
        healedAnimalCount += 1
      }

      if (result.revived) {
        revivedAnimalNames.push(animal.name)
      }

      return result.animal
    })

    if (changed) {
      set({ capturedAnimals })
    }

    return { healedAnimalCount, revivedAnimalNames }
  },
  addPlacedBuilding: (building) =>
    set((state) => ({
      placedBuildings: [...state.placedBuildings, building],
    })),
  unassignCapturedAnimalFromBuilding: (animalId) => {
    const animal = get().capturedAnimals.find(
      (candidate) => candidate.id === animalId,
    )
    const buildingId = animal?.workAssignment?.buildingId

    if (!animal || !buildingId) {
      return false
    }

    set((state) => ({
      capturedAnimals: state.capturedAnimals.map((candidate) =>
        candidate.id === animalId
          ? {
              ...candidate,
              workAssignment: null,
              lastRecoveryAt:
                candidate.condition !== 'incapacitated' &&
                candidate.currentHp < candidate.stats.maxHp
                  ? Date.now()
                  : candidate.lastRecoveryAt,
            }
          : candidate,
      ),
      placedBuildings: state.placedBuildings.map((building) =>
        building.id === buildingId
          ? {
              ...building,
              assignedAnimalIds: building.assignedAnimalIds.filter(
                (assignedAnimalId) => assignedAnimalId !== animalId,
              ),
            }
          : building,
      ),
    }))
    return true
  },
  assignCapturedAnimalToBuilding: (animalId, assignment) => {
    const currentState = get()
    const animal = currentState.capturedAnimals.find(
      (candidate) => candidate.id === animalId,
    )

    if (
      !animal ||
      animal.workAssignment ||
      animal.condition === 'incapacitated' ||
      currentState.activeAnimalPartyIds.includes(animalId)
    ) {
      return false
    }

    set((state) => ({
      capturedAnimals: state.capturedAnimals.map((candidate) =>
        candidate.id === animalId
          ? { ...candidate, workAssignment: assignment }
          : candidate,
      ),
      placedBuildings: state.placedBuildings.map((building) =>
        building.id === assignment.buildingId
          ? {
              ...building,
              assignedAnimalIds: [...building.assignedAnimalIds, animalId],
            }
          : building,
      ),
    }))
    return true
  },
  addBaseStorageItem: (item, amount) =>
    set((state) => ({
      baseStorage: {
        ...state.baseStorage,
        [item]: state.baseStorage[item] + amount,
      },
    })),
  transferBaseItemToInventory: (item, amount) => {
    const safeAmount = Math.floor(amount)
    const state = get()

    if (safeAmount <= 0 || state.baseStorage[item] < safeAmount) {
      return false
    }

    set((currentState) => ({
      inventory: {
        ...currentState.inventory,
        [item]: currentState.inventory[item] + safeAmount,
      },
      baseStorage: {
        ...currentState.baseStorage,
        [item]: currentState.baseStorage[item] - safeAmount,
      },
    }))
    return true
  },
  setSelectedBuildingName: (selectedBuildingName) => set({ selectedBuildingName }),
  setBuildMessage: (buildMessage) => set({ buildMessage }),
  setTravelMessage: (travelMessage) => set({ travelMessage }),
  setCraftMessage: (craftMessage) => set({ craftMessage }),
  setActiveWorkerCount: (activeWorkerCount) => set({ activeWorkerCount }),
  setMapResourceStates: (mapId, resourceStates) =>
    set((state) => ({
      mapResourceStates: {
        ...state.mapResourceStates,
        [mapId]: resourceStates,
      },
    })),
  hydrateFromSave: (save) => {
    const primaryBase = save.bases[0]
    const mapResourceStates: Partial<
      Record<MapId, readonly ResourceSpawnState[]>
    > = {}

    Object.entries(save.maps).forEach(([mapId, mapState]) => {
      if (isMapId(mapId) && mapState) {
        mapResourceStates[mapId] = mapState.resources
      }
    })

    const ownedToolIds = [...save.player.ownedToolIds]
    const equippedShieldId = save.player.equippedItems.shield
    const equippedShieldCapacity = equippedShieldId
      ? TOOL_DEFINITIONS[equippedShieldId].shieldCapacity ?? 0
      : 0
    const savedMaxShield = equippedShieldCapacity
    const actionResourceProfile = getPlayerActionResourceProfile(
      save.player.equippedToolId,
      save.player.equippedItems,
    )

    const activeAnimalPartyIds = normalizeActiveAnimalPartyIds(
      save.player.activeAnimalPartyIds,
      save.capturedAnimals,
    )
    const selectedCompanionAnimalId =
      normalizeCompanionAnimalId(
        save.player.selectedCompanionAnimalId,
        activeAnimalPartyIds,
      ) ??
      activeAnimalPartyIds[0] ??
      null
    const summonedCompanionAnimalId = normalizeCompanionAnimalId(
      save.player.summonedCompanionAnimalId,
      activeAnimalPartyIds,
    )

    set({
      playerHp:
        save.player.hp > 0
          ? Math.min(INITIAL_PLAYER_HP, save.player.hp)
          : INITIAL_PLAYER_HP,
      playerHunger: Math.min(PLAYER_MAX_HUNGER, save.player.hunger),
      playerLevel: save.player.level ?? PLAYER_INITIAL_LEVEL,
      playerExperience:
        save.player.experience ?? PLAYER_INITIAL_EXPERIENCE,
      playerExperienceToNextLevel:
        save.player.experienceToNextLevel ??
        PLAYER_INITIAL_EXPERIENCE_TO_NEXT_LEVEL,
      playerCapturePower: normalizePlayerCapturePower(
        save.player.capturePower ?? Number.NaN,
        save.player.level ?? PLAYER_INITIAL_LEVEL,
      ),
      equippedCaptureSupportModuleId:
        save.player.equippedCaptureSupportModuleId ?? null,
      technologyPoints: save.player.technologyPoints ?? 4,
      unlockedRecipeIds: save.player.unlockedRecipeIds
        ? [...save.player.unlockedRecipeIds]
        : [],
      playerMaxShield: savedMaxShield,
      playerShield: Math.min(
        savedMaxShield,
        save.player.shield ?? equippedShieldCapacity,
      ),
      playerMaxStamina: actionResourceProfile.maxStamina,
      playerStamina: Math.min(
        actionResourceProfile.maxStamina,
        save.player.stamina ?? actionResourceProfile.maxStamina,
      ),
      playerStaminaRecoveryDelayed: false,
      playerMovementState: 'idle',
      playerWorldPosition: { ...save.player.position },
      currentMapId: save.player.currentMapId,
      currentMapName: getMapDefinition(save.player.currentMapId).name,
      inventory: { ...save.inventory },
      baseStorage: primaryBase
        ? { ...primaryBase.storage }
        : createEmptyItemStorage(),
      ownedToolIds,
      equippedToolId: save.player.equippedToolId,
      equippedItems: { ...save.player.equippedItems },
      equipmentDurability: {
        ...(save.player.equipmentDurability ?? {}),
      },
      combatMessage: '',
      hotbarSlots: save.player.hotbarSlots
        ? save.player.hotbarSlots.map((slot) => (slot ? { ...slot } : null))
        : createEmptyHotbarSlots(),
      selectedHotbarIndex: save.player.selectedHotbarIndex ?? 0,
      capturedAnimals: [...save.capturedAnimals],
      activeAnimalPartyIds,
      selectedCompanionAnimalId,
      summonedCompanionAnimalId,
      companionCommandMode:
        save.player.companionCommandMode ?? 'follow',
      companionTargetName: null,
      companionMessage: summonedCompanionAnimalId
        ? '저장된 동행 동물 상태를 불러왔습니다.'
        : '',
      companionSkillCooldowns: [],
      companionActiveStatusEffectIds: [],
      companionPartnerSkillActive: false,
      companionLastSkillName: null,
      capturePreview: null,
      placedBuildings: primaryBase ? [...primaryBase.buildings] : [],
      mapResourceStates,
      saveHydrated: true,
      lastSavedAt: save.savedAt,
      saveMessage: '저장된 게임을 불러왔습니다.',
    })
  },
  markSaveHydrated: () => set({ saveHydrated: true }),
  setSaveStatus: (lastSavedAt, saveMessage) =>
    set({ lastSavedAt, saveMessage }),
  requestManualSave: (requestedSaveSlotId = 'auto') => {
    const requestId = get().manualSaveRequestId + 1

    set({
      manualSaveRequestId: requestId,
      requestedSaveSlotId,
      lastManualSaveSucceeded: null,
    })
    return requestId
  },
  completeManualSave: (completedManualSaveRequestId, success) =>
    set({
      completedManualSaveRequestId,
      lastManualSaveSucceeded: success,
    }),
}))

function isSameHotbarAssignment(
  current: HotbarSlot,
  candidate: HotbarAssignment,
) {
  if (!current || current.kind !== candidate.kind) {
    return false
  }

  if (current.kind === 'item' && candidate.kind === 'item') {
    return current.itemId === candidate.itemId
  }

  return current.kind === 'tool' &&
    candidate.kind === 'tool' &&
    current.toolId === candidate.toolId
}

function normalizeActiveAnimalPartyIds(
  savedPartyIds: readonly string[] | undefined,
  capturedAnimals: readonly CapturedAnimal[],
) {
  const capturedAnimalById = new Map(
    capturedAnimals.map((animal) => [animal.id, animal] as const),
  )
  const candidateIds =
    savedPartyIds ??
    capturedAnimals
      .filter(
        (animal) =>
          !animal.workAssignment &&
          animal.condition !== 'incapacitated',
      )
      .slice(0, ANIMAL_PARTY_SLOT_COUNT)
      .map((animal) => animal.id)
  const seenAnimalIds = new Set<string>()

  return candidateIds
    .filter((animalId) => {
      const animal = capturedAnimalById.get(animalId)

      if (
        !animal ||
        animal.workAssignment ||
        animal.condition === 'incapacitated' ||
        seenAnimalIds.has(animalId)
      ) {
        return false
      }

      seenAnimalIds.add(animalId)
      return true
    })
    .slice(0, ANIMAL_PARTY_SLOT_COUNT)
}

function normalizeCompanionAnimalId(
  animalId: string | null | undefined,
  activeAnimalPartyIds: readonly string[],
) {
  return animalId && activeAnimalPartyIds.includes(animalId)
    ? animalId
    : null
}
