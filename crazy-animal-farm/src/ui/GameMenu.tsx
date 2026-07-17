import { useEffect, useState, type DragEvent } from 'react'
import {
  ANIMAL_MAX_TRUST,
  ANIMAL_PARTY_SLOT_COUNT,
} from '../game/config/gameConstants'
import { ANIMAL_ACTIVE_SKILLS } from '../game/data/animalSkills'
import { ANIMAL_ELEMENTS } from '../game/data/animalElements'
import { ANIMAL_DEFINITIONS } from '../game/data/animals'
import { COMPANION_EQUIPMENT } from '../game/data/companionEquipment'
import { ANIMAL_PASSIVE_TRAITS } from '../game/data/animalTraits'
import {
  CRAFTING_RECIPES,
  CRAFTING_STATIONS,
} from '../game/data/crafting'
import {
  CAPTURE_SUPPORT_MODULES,
  getCaptureSupportModuleByItemId,
} from '../game/data/capture'
import { TOOL_DEFINITIONS } from '../game/data/equipment'
import { ITEM_DEFINITIONS } from '../game/data/items'
import {
  SAVE_SLOT_DEFINITIONS,
  SaveService,
} from '../game/services/SaveService'
import type {
  AnimalActiveSkillId,
  AnimalElementId,
  CapturedAnimal,
} from '../game/types/animal'
import type { CraftingRecipeId } from '../game/types/crafting'
import type {
  EquipmentSlotId,
  ToolDefinitionId,
} from '../game/types/equipment'
import type { HotbarAssignment, HotbarSlot } from '../game/types/hotbar'
import type { InventoryItemKey } from '../game/types/item'
import type {
  GameSave,
  ManualSaveSlotId,
  SaveSlotId,
} from '../game/types/save'
import type { WorkSkill } from '../game/types/work'
import { getPlayerArmorRating } from '../game/utils/playerCombat'
import {
  useGameStore,
  type GameMenuTabId,
} from '../store/useGameStore'
import { Hotbar } from './Hotbar'
import { getEquipmentIcon, getItemIcon } from './itemPresentation'
import './gameMenu.css'

const MENU_TABS: readonly Readonly<{
  id: GameMenuTabId
  label: string
}>[] = [
  { id: 'inventory', label: '인벤토리' },
  { id: 'technology', label: '제작법' },
  { id: 'animals', label: '동물' },
  { id: 'bestiary', label: '도감' },
  { id: 'controls', label: '조작키' },
  { id: 'options', label: '옵션' },
]

const EQUIPMENT_SLOTS: readonly Readonly<{
  id: EquipmentSlotId
  label: string
}>[] = [
  { id: 'head', label: '투구' },
  { id: 'body', label: '갑옷' },
  { id: 'rightHand', label: '주무기' },
  { id: 'cloak', label: '망토' },
  { id: 'shield', label: '쉴드' },
]

const WORK_SKILLS: readonly Readonly<{
  id: WorkSkill
  label: string
}>[] = [
  { id: 'logging', label: '벌목' },
  { id: 'mining', label: '채광' },
  { id: 'farming', label: '농사' },
  { id: 'carrying', label: '운반' },
]

const CONTROL_GROUPS = [
  ['이동', 'WASD 또는 방향키'],
  ['달리기', '이동 중 Shift · 스태미나를 계속 소모'],
  ['회피', 'Space · 이동 방향 또는 바라보는 방향으로 회피'],
  ['지도', 'M으로 열기 · 월드맵, 초원맵, 현재맵 단계 전환'],
  ['공격·채집', '마우스 왼쪽 버튼을 누르고 있기'],
  ['포획', 'Q로 포획 모드 · 왼쪽 클릭으로 캡슐 투척'],
  ['동행 선택', 'G로 활동 파티의 다음 동물 선택'],
  ['동행 소환', 'F로 선택 동물 소환 또는 회수'],
  ['동행 명령', 'V로 따라오기 · 대기 · 집중 공격 전환'],
  ['지정 공격', '소환 중 야생 동물을 마우스 오른쪽 클릭'],
  ['건설', 'B · 1 코어 · 2 벌목 작업대 · 3 제작 작업대 · R 회전'],
  ['작업 배치', '벌목 작업대 가까이에서 E'],
  ['지역 이동', '맵 출구 안에서 E'],
  ['제작', '제작 작업대 가까이에서 C 또는 작업대 클릭'],
  ['제작법 해금', 'Esc · 제작법 탭에서 기술 포인트 사용'],
  ['음식 섭취', 'Esc · 인벤토리 · 음식의 먹기 버튼'],
  ['퀵바', '인벤토리에서 배치 · 일반 플레이 중 숫자키 1~0으로 선택'],
  ['메뉴', 'Esc로 열기 또는 닫기'],
] as const

const EQUIPMENT_DRAG_TYPE = 'application/x-crazy-animal-farm-equipment'
const HOTBAR_DRAG_TYPE = 'application/x-crazy-animal-farm-hotbar'
const saveSlotService = new SaveService()

type EquipmentDragPayload = Readonly<{
  toolId: ToolDefinitionId
  source: 'inventory' | 'equipment'
  slotId?: EquipmentSlotId
}>

type PendingLoadRequest = Readonly<{
  slotId: SaveSlotId
  slotLabel: string
  hasSave: boolean
}>

type PendingBackupLoad = Readonly<{
  loadRequest: PendingLoadRequest
  requestId: number
  backupSlotLabel: string
}>

type InventoryEntry =
  | Readonly<{
      kind: 'item'
      id: InventoryItemKey
      name: string
      amount: number
    }>
  | Readonly<{
      kind: 'tool'
      id: ToolDefinitionId
      name: string
      amount: number
    }>

export function GameMenu() {
  const isOpen = useGameStore((state) => state.isGameMenuOpen)
  const activeTab = useGameStore((state) => state.activeMenuTab)
  const setActiveTab = useGameStore((state) => state.setActiveMenuTab)
  const setOpen = useGameStore((state) => state.setGameMenuOpen)

  if (!isOpen) {
    return null
  }

  return (
    <section className="game-menu" aria-label="게임 메뉴">
      <div className="game-menu__window">
        <header className="game-menu__header">
          <nav className="game-menu__tabs" aria-label="게임 메뉴 탭">
            {MENU_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'is-active' : ''}
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="game-menu__close"
            onClick={() => setOpen(false)}
          >
            ESC 닫기
          </button>
        </header>

        <div
          key={activeTab}
          className={`game-menu__content game-menu__content--${activeTab}`}
        >
          {activeTab === 'inventory' && <InventoryPanel />}
          {activeTab === 'technology' && <TechnologyPanel />}
          {activeTab === 'animals' && <AnimalPanel />}
          {activeTab === 'bestiary' && <BestiaryPanel />}
          {activeTab === 'controls' && <ControlsPanel />}
          {activeTab === 'options' && <OptionsPanel />}
        </div>
      </div>
      {activeTab === 'inventory' && <MenuHotbar />}
    </section>
  )
}

function MenuHotbar() {
  const assignHotbarSlot = useGameStore((state) => state.assignHotbarSlot)
  const clearHotbarSlot = useGameStore((state) => state.clearHotbarSlot)
  const selectHotbarSlot = useGameStore((state) => state.selectHotbarSlot)
  const requestSave = useGameStore((state) => state.requestManualSave)
  const [message, setMessage] = useState('')

  const handleDrop = (
    event: DragEvent<HTMLElement>,
    slotIndex: number,
  ) => {
    event.preventDefault()
    const assignment = readHotbarPayload(event)

    if (!assignment || !assignHotbarSlot(slotIndex, assignment)) {
      setMessage('이 아이템은 퀵바에 배치할 수 없습니다.')
      return
    }

    setMessage(
      `${getHotbarAssignmentName(assignment)}을(를) ${getHotbarKeyLabel(slotIndex)}번에 배치했습니다.`,
    )
    requestSave()
  }

  const handleClear = (slotIndex: number) => {
    if (!clearHotbarSlot(slotIndex)) {
      return
    }

    setMessage(`${getHotbarKeyLabel(slotIndex)}번 퀵바 슬롯을 비웠습니다.`)
    requestSave()
  }

  const handleSelect = (slotIndex: number) => {
    selectHotbarSlot(slotIndex)
    setMessage(`${getHotbarKeyLabel(slotIndex)}번 퀵바 슬롯을 선택했습니다.`)
    requestSave()
  }

  return (
    <div className="menu-hotbar">
      <Hotbar
        variant="menu"
        editable
        onDropSlot={handleDrop}
        onClearSlot={handleClear}
        onSelectSlot={handleSelect}
      />
      {message && <span>{message}</span>}
    </div>
  )
}

function TechnologyPanel() {
  const playerLevel = useGameStore((state) => state.playerLevel)
  const technologyPoints = useGameStore((state) => state.technologyPoints)
  const unlockedRecipeIds = useGameStore(
    (state) => state.unlockedRecipeIds,
  )
  const unlockRecipe = useGameStore((state) => state.unlockRecipe)
  const requestSave = useGameStore((state) => state.requestManualSave)
  const [message, setMessage] = useState(
    '레벨 조건을 만족한 제작법을 기술 포인트로 해금하세요.',
  )
  const recipes = Object.values(CRAFTING_RECIPES).sort(
    (left, right) =>
      left.unlockLevel - right.unlockLevel ||
      left.technologyPointCost - right.technologyPointCost ||
      left.name.localeCompare(right.name, 'ko'),
  )

  const handleUnlock = (recipeId: CraftingRecipeId) => {
    const recipe = CRAFTING_RECIPES[recipeId]

    if (!unlockRecipe(recipeId)) {
      setMessage(
        getRecipeUnlockReason(
          recipeId,
          playerLevel,
          technologyPoints,
          unlockedRecipeIds,
        ),
      )
      return
    }

    setMessage(
      `${recipe.name} 제작법을 해금했습니다. ${CRAFTING_STATIONS[recipe.requiredStationId].name}에서 제작할 수 있습니다.`,
    )
    requestSave()
  }

  return (
    <div className="technology-panel">
      <div className="technology-panel__heading">
        <div>
          <span className="menu-section-heading__eyebrow">TECHNOLOGY</span>
          <h2>제작법 해금</h2>
          <p>
            제작법만 이곳에서 획득합니다. 실제 제작은 지정된 작업대에서
            진행됩니다.
          </p>
        </div>
        <div className="technology-points" aria-label="보유 기술 포인트">
          <span>TECH POINT</span>
          <strong>{technologyPoints}</strong>
          <small>플레이어 레벨 {playerLevel}</small>
        </div>
      </div>

      <div className="technology-tree" aria-label="제작법 목록">
        {recipes.map((recipe) => {
          const isUnlocked = unlockedRecipeIds.includes(recipe.id)
          const prerequisiteName = recipe.prerequisiteRecipeId
            ? CRAFTING_RECIPES[recipe.prerequisiteRecipeId].name
            : null
          const disabledReason = getRecipeUnlockReason(
            recipe.id,
            playerLevel,
            technologyPoints,
            unlockedRecipeIds,
          )

          return (
            <article
              key={recipe.id}
              className={`technology-card${
                isUnlocked ? ' is-unlocked' : ''
              }`}
            >
              <div className="technology-card__icon">
                {getCraftingRecipeIcon(recipe.id)}
              </div>
              <div className="technology-card__body">
                <div className="technology-card__title">
                  <span>{getCraftingCategoryLabel(recipe.category)}</span>
                  <strong>{recipe.name}</strong>
                </div>
                <p>{recipe.description}</p>
                <dl>
                  <div>
                    <dt>필요 레벨</dt>
                    <dd>Lv.{recipe.unlockLevel}</dd>
                  </div>
                  <div>
                    <dt>제작 시설</dt>
                    <dd>{CRAFTING_STATIONS[recipe.requiredStationId].name}</dd>
                  </div>
                  {prerequisiteName && (
                    <div>
                      <dt>선행 제작법</dt>
                      <dd>{prerequisiteName}</dd>
                    </div>
                  )}
                </dl>
                <div className="technology-card__ingredients">
                  {recipe.ingredients.map((ingredient) => (
                    <span key={ingredient.item}>
                      {ITEM_DEFINITIONS[ingredient.item].name}{' '}
                      {ingredient.amount}
                    </span>
                  ))}
                </div>
                <small className="technology-card__status">
                  {isUnlocked
                    ? `${CRAFTING_STATIONS[recipe.requiredStationId].name}에서 제작 가능`
                    : disabledReason || '지금 해금할 수 있습니다.'}
                </small>
              </div>
              <button
                type="button"
                disabled={isUnlocked || Boolean(disabledReason)}
                title={disabledReason || undefined}
                onClick={() => handleUnlock(recipe.id)}
              >
                {isUnlocked
                  ? '해금 완료'
                  : `${recipe.technologyPointCost} TP 해금`}
              </button>
            </article>
          )
        })}
      </div>
      <p className="technology-panel__message">{message}</p>
    </div>
  )
}

function InventoryPanel() {
  const inventory = useGameStore((state) => state.inventory)
  const ownedToolIds = useGameStore((state) => state.ownedToolIds)
  const equippedItems = useGameStore((state) => state.equippedItems)
  const equipmentDurability = useGameStore(
    (state) => state.equipmentDurability,
  )
  const equipToolInSlot = useGameStore((state) => state.equipToolInSlot)
  const unequipItem = useGameStore((state) => state.unequipItem)
  const repairEquipment = useGameStore((state) => state.repairEquipment)
  const playerCapturePower = useGameStore(
    (state) => state.playerCapturePower,
  )
  const equippedCaptureSupportModuleId = useGameStore(
    (state) => state.equippedCaptureSupportModuleId,
  )
  const playerStamina = useGameStore((state) => state.playerStamina)
  const playerMaxStamina = useGameStore((state) => state.playerMaxStamina)
  const equipCaptureSupportModule = useGameStore(
    (state) => state.equipCaptureSupportModule,
  )
  const requestSave = useGameStore((state) => state.requestManualSave)
  const eatFood = useGameStore((state) => state.eatFood)
  const playerLevel = useGameStore((state) => state.playerLevel)
  const playerExperience = useGameStore((state) => state.playerExperience)
  const playerExperienceToNextLevel = useGameStore(
    (state) => state.playerExperienceToNextLevel,
  )
  const currentMapName = useGameStore((state) => state.currentMapName)
  const [dropMessage, setDropMessage] = useState('')
  const [inventoryMessage, setInventoryMessage] = useState('')
  const [sortMode, setSortMode] = useState<'default' | 'name'>('default')
  const equippedMenuItemIds = EQUIPMENT_SLOTS
    .map((slot) => equippedItems[slot.id])
    .filter((toolId): toolId is ToolDefinitionId => toolId !== undefined)
  const armorRating = getPlayerArmorRating(
    equippedItems,
    equipmentDurability,
  )
  const entries: InventoryEntry[] = [
    ...Object.values(ITEM_DEFINITIONS)
      .filter((definition) => inventory[definition.id] > 0)
      .map((definition) => ({
        kind: 'item' as const,
        id: definition.id,
        name: definition.name,
        amount: inventory[definition.id],
      })),
    ...ownedToolIds
      .filter(
        (toolId) =>
          toolId !== 'bare-hands' && !equippedMenuItemIds.includes(toolId),
      )
      .map((toolId) => ({
        kind: 'tool' as const,
        id: toolId,
        name: TOOL_DEFINITIONS[toolId].name,
        amount: 1,
      })),
  ]
  if (sortMode === 'name') {
    entries.sort((left, right) => left.name.localeCompare(right.name, 'ko'))
  }
  const inventoryCapacity = 64
  const inventoryColumnCount = 8
  const renderedSlotCount = Math.min(
    inventoryCapacity,
    Math.max(
      40,
      Math.ceil((entries.length + inventoryColumnCount) / inventoryColumnCount) *
        inventoryColumnCount,
    ),
  )
  const slots = Array.from(
    { length: renderedSlotCount },
    (_, index): InventoryEntry | null => entries[index] ?? null,
  )

  const handleEquipmentDrop = (
    event: DragEvent<HTMLElement>,
    slotId: EquipmentSlotId,
  ) => {
    event.preventDefault()
    const payload = readEquipmentPayload(event)

    if (!payload || TOOL_DEFINITIONS[payload.toolId].equipmentSlot !== slotId) {
      setDropMessage('해당 장비는 이 부위에 장착할 수 없습니다.')
      return
    }

    if (equipToolInSlot(payload.toolId, slotId)) {
      setDropMessage(`${TOOL_DEFINITIONS[payload.toolId].name}을(를) 장착했습니다.`)
      requestSave()
      return
    }

    setDropMessage(
      `${TOOL_DEFINITIONS[payload.toolId].name}의 내구도가 없어 먼저 수리해야 합니다.`,
    )
  }

  const handleInventoryDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const payload = readEquipmentPayload(event)

    if (payload?.source === 'equipment' && payload.slotId) {
      if (unequipItem(payload.slotId)) {
        setDropMessage(`${TOOL_DEFINITIONS[payload.toolId].name}을(를) 해제했습니다.`)
        requestSave()
      }
    }
  }

  const handleEatFood = (itemId: InventoryItemKey) => {
    if (eatFood(itemId)) {
      setInventoryMessage(`${ITEM_DEFINITIONS[itemId].name}을(를) 먹었습니다.`)
      requestSave()
    } else {
      setInventoryMessage('배가 이미 가득 차 있거나 먹을 수 없는 아이템입니다.')
    }
  }

  const handleCaptureModule = (itemId: InventoryItemKey) => {
    const moduleDefinition = getCaptureSupportModuleByItemId(itemId)

    if (!moduleDefinition) {
      return
    }

    const nextModuleId =
      equippedCaptureSupportModuleId === moduleDefinition.id
        ? null
        : moduleDefinition.id

    if (equipCaptureSupportModule(nextModuleId)) {
      setInventoryMessage(
        nextModuleId
          ? `${moduleDefinition.name}을(를) 장착했습니다.`
          : `${moduleDefinition.name}을(를) 해제했습니다.`,
      )
      requestSave()
    }
  }

  const handleRepairEquipment = (toolId: ToolDefinitionId) => {
    const definition = TOOL_DEFINITIONS[toolId]
    const maxDurability = definition.maxDurability
    const currentDurability =
      equipmentDurability[toolId] ?? maxDurability

    if (
      maxDurability === undefined ||
      currentDurability === undefined ||
      currentDurability >= maxDurability
    ) {
      setInventoryMessage('현재 장비는 수리할 필요가 없습니다.')
      return
    }

    if (repairEquipment(toolId)) {
      setInventoryMessage(`${definition.name} 수리를 완료했습니다.`)
      requestSave()
      return
    }

    const repairCost = (definition.repairIngredients ?? [])
      .map(
        ({ item, amount }) =>
          `${ITEM_DEFINITIONS[item].name} ${amount}`,
      )
      .join(', ')

    setInventoryMessage(
      repairCost
        ? `수리 재료가 부족합니다: ${repairCost}`
        : '수리할 필요가 없는 장비입니다.',
    )
  }

  return (
    <div className="inventory-panel">
      <section className="inventory-items-panel">
        <header className="inventory-panel__heading">
          <div>
            <h2>보유 아이템</h2>
            <span>{entries.length} / {inventoryCapacity}</span>
          </div>
          <div className="inventory-heading-actions">
            <button
              type="button"
              className={sortMode === 'name' ? 'is-active' : ''}
              aria-pressed={sortMode === 'name'}
              onClick={() =>
                setSortMode((current) =>
                  current === 'name' ? 'default' : 'name',
                )
              }
            >
              {sortMode === 'name' ? '기본순' : '이름순'}
            </button>
          </div>
        </header>
        <div className="inventory-grid-scroll">
          <div
            className="inventory-grid"
            aria-label={`보유 아이템 ${entries.length}개, 최대 ${inventoryCapacity}칸`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleInventoryDrop}
          >
            {slots.map((entry, index) => (
              <div
                key={index}
                className={`inventory-slot${entry ? ' is-filled' : ''}`}
                title={entry?.name}
                draggable={Boolean(entry)}
                onDragStart={(event) => {
                  if (!entry) {
                    return
                  }

                  if (entry.kind === 'tool') {
                    writeEquipmentPayload(event, {
                      toolId: entry.id,
                      source: 'inventory',
                    })
                  } else {
                    writeHotbarPayload(event, {
                      kind: 'item',
                      itemId: entry.id,
                    })
                  }
                }}
              >
                {entry && (
                  <>
                    <span className="inventory-slot__icon">
                      {entry.kind === 'tool'
                        ? getEquipmentIcon(entry.id)
                        : getItemIcon(entry.id)}
                    </span>
                    <span className="inventory-slot__name">{entry.name}</span>
                    {entry.amount > 1 && (
                      <strong className="inventory-slot__amount">{entry.amount}</strong>
                    )}
                    {entry.kind === 'tool' &&
                      TOOL_DEFINITIONS[entry.id].maxDurability !==
                        undefined && (
                        <span className="inventory-slot__durability">
                          {equipmentDurability[entry.id] ??
                            TOOL_DEFINITIONS[entry.id].maxDurability} /{' '}
                          {TOOL_DEFINITIONS[entry.id].maxDurability}
                        </span>
                      )}
                    {entry.kind === 'tool' &&
                      TOOL_DEFINITIONS[entry.id].maxDurability !==
                        undefined &&
                      (equipmentDurability[entry.id] ??
                        TOOL_DEFINITIONS[entry.id].maxDurability ??
                        0) <
                        (TOOL_DEFINITIONS[entry.id].maxDurability ?? 0) && (
                        <button
                          type="button"
                          className="inventory-slot__action"
                          onClick={() => handleRepairEquipment(entry.id)}
                        >
                          수리
                        </button>
                      )}
                    {entry.kind === 'item' &&
                      (ITEM_DEFINITIONS[entry.id].hungerRestore ?? 0) > 0 && (
                        <button
                          type="button"
                          className="inventory-slot__action"
                          onClick={() => handleEatFood(entry.id)}
                        >
                          먹기
                        </button>
                      )}
                    {entry.kind === 'item' &&
                      ITEM_DEFINITIONS[entry.id].category ===
                        'captureModule' && (
                        <button
                          type="button"
                          className="inventory-slot__action"
                          onClick={() => handleCaptureModule(entry.id)}
                        >
                          {getCaptureSupportModuleByItemId(entry.id)?.id ===
                          equippedCaptureSupportModuleId
                            ? '해제'
                            : '장착'}
                        </button>
                      )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        {inventoryMessage && (
          <p className="inventory-panel__feedback">{inventoryMessage}</p>
        )}
      </section>

      <aside className="avatar-equipment" aria-label="아바타와 장비">
        <header className="equipment-profile">
          <div>
            <strong>플레이어</strong>
            <small>{currentMapName}</small>
          </div>
          <div className="equipment-profile__level">
            <strong>LV. {playerLevel}</strong>
            <span>
              EXP {playerExperience} / {playerExperienceToNextLevel}
            </span>
          </div>
        </header>
        <div className="equipment-profile__experience" aria-label="플레이어 경험치">
          <span
            style={{
              width: `${
                playerExperienceToNextLevel > 0
                  ? (playerExperience / playerExperienceToNextLevel) * 100
                  : 0
              }%`,
            }}
          />
        </div>
        <div className="equipment-profile__stats">
          <div>
            <span>스태미나</span>
            <strong>{Math.ceil(playerStamina)} / {playerMaxStamina}</strong>
          </div>
          <div>
            <span>포획력</span>
            <strong>+{Math.round(playerCapturePower * 100)}%</strong>
          </div>
          <div>
            <span>방어력</span>
            <strong>{armorRating}</strong>
          </div>
          <div>
            <span>포획 모듈</span>
            <strong>
              {equippedCaptureSupportModuleId
                ? CAPTURE_SUPPORT_MODULES[equippedCaptureSupportModuleId].name
                : '없음'}
            </strong>
          </div>
        </div>
        <div className="avatar-equipment__layout">
          <div className="avatar-equipment__avatar" aria-label="플레이어 아바타">
            <span>●</span>
            <span className="avatar-equipment__body">◆</span>
          </div>
          <div className="equipment-slot-list">
            {EQUIPMENT_SLOTS.map((slot) => {
              const toolId = equippedItems[slot.id]
              const definition = toolId ? TOOL_DEFINITIONS[toolId] : null
              const durability = toolId
                ? equipmentDurability[toolId] ??
                  TOOL_DEFINITIONS[toolId].maxDurability
                : undefined

              return (
                <div
                  key={slot.id}
                  className={`equipment-slot equipment-slot--${slot.id}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleEquipmentDrop(event, slot.id)}
                >
                  <span>{slot.label}</span>
                  {toolId ? (
                    <>
                      <button
                        type="button"
                        draggable
                        title="인벤토리로 드래그하여 해제"
                        onDragStart={(event) =>
                          writeEquipmentPayload(event, {
                            toolId,
                            source: 'equipment',
                            slotId: slot.id,
                          })
                        }
                      >
                        {getEquipmentIcon(toolId)} {definition?.name}
                      </button>
                      {definition?.maxDurability !== undefined && (
                        <small className="equipment-slot__durability">
                          내구도 {durability ?? 0} / {definition.maxDurability}
                        </small>
                      )}
                      {definition?.maxDurability !== undefined &&
                        (durability ?? 0) < definition.maxDurability && (
                          <button
                            type="button"
                            className="equipment-slot__repair"
                            onClick={() => handleRepairEquipment(toolId)}
                          >
                            수리
                          </button>
                        )}
                    </>
                  ) : (
                    <em>비어 있음</em>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {dropMessage && (
          <p className="avatar-equipment__message">{dropMessage}</p>
        )}
      </aside>
    </div>
  )
}

function AnimalPanel() {
  const capturedAnimals = useGameStore((state) => state.capturedAnimals)
  const activeAnimalPartyIds = useGameStore(
    (state) => state.activeAnimalPartyIds,
  )
  const selectedCompanionAnimalId = useGameStore(
    (state) => state.selectedCompanionAnimalId,
  )
  const summonedCompanionAnimalId = useGameStore(
    (state) => state.summonedCompanionAnimalId,
  )
  const addAnimalToParty = useGameStore((state) => state.addAnimalToParty)
  const removeAnimalFromParty = useGameStore(
    (state) => state.removeAnimalFromParty,
  )
  const unassignAnimalFromBuilding = useGameStore(
    (state) => state.unassignCapturedAnimalFromBuilding,
  )
  const selectCompanionAnimal = useGameStore(
    (state) => state.selectCompanionAnimal,
  )
  const requestSave = useGameStore((state) => state.requestManualSave)
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null)
  const [partyMessage, setPartyMessage] = useState(
    '활동 파티에서 동행 대표를 선택한 뒤 F로 소환할 수 있습니다.',
  )
  const selectedAnimal =
    capturedAnimals.find((animal) => animal.id === selectedAnimalId) ??
    capturedAnimals.find(
      (animal) => animal.id === selectedCompanionAnimalId,
    ) ??
    capturedAnimals[0] ??
    null
  const activeAnimalParty = activeAnimalPartyIds.map(
    (animalId) =>
      capturedAnimals.find((animal) => animal.id === animalId) ?? null,
  )
  const partySlots = Array.from(
    { length: ANIMAL_PARTY_SLOT_COUNT },
    (_, index): CapturedAnimal | null => activeAnimalParty[index] ?? null,
  )
  const selectedAnimalIsInParty = selectedAnimal
    ? activeAnimalPartyIds.includes(selectedAnimal.id)
    : false
  const partyIsFull =
    activeAnimalPartyIds.length >= ANIMAL_PARTY_SLOT_COUNT
  const selectedAnimalIsCompanion =
    selectedAnimal?.id === selectedCompanionAnimalId
  const selectedAnimalIsSummoned =
    selectedAnimal?.id === summonedCompanionAnimalId

  const handleSelectPartyAnimal = (animal: CapturedAnimal) => {
    setSelectedAnimalId(animal.id)

    if (selectCompanionAnimal(animal.id)) {
      setPartyMessage(
        `${animal.name}을(를) 동행 대표로 선택했습니다. F로 소환하거나 회수할 수 있습니다.`,
      )
      requestSave()
    }
  }

  const handlePartyChange = () => {
    if (!selectedAnimal) {
      return
    }

    if (
      !selectedAnimalIsInParty &&
      selectedAnimal.condition === 'incapacitated'
    ) {
      setPartyMessage(
        '기절한 동물은 회복이 끝난 뒤 활동 파티에 넣을 수 있습니다.',
      )
      return
    }

    if (
      !selectedAnimalIsInParty &&
      selectedAnimal.workAssignment &&
      !unassignAnimalFromBuilding(selectedAnimal.id)
    ) {
      setPartyMessage('작업 배치를 해제하지 못했습니다.')
      return
    }

    const changed = selectedAnimalIsInParty
      ? removeAnimalFromParty(selectedAnimal.id)
      : addAnimalToParty(selectedAnimal.id)

    if (!changed) {
      setPartyMessage(
        '활동 파티가 가득 찼습니다. 다른 동물을 먼저 파티에서 빼주세요.',
      )
      return
    }

    setPartyMessage(
      selectedAnimalIsInParty
        ? `${selectedAnimal.name}을(를) 보관함으로 이동했습니다.`
        : `${selectedAnimal.name}을(를) 활동 파티에 배치했습니다.`,
    )
    requestSave()
  }

  return (
    <div className="animal-panel">
      <div className="animal-roster">
        <div className="menu-section-heading">
          <div>
            <span className="menu-section-heading__eyebrow">ACTIVE PARTY</span>
            <h2>활동 파티</h2>
          </div>
          <span>
            {activeAnimalPartyIds.length} / {ANIMAL_PARTY_SLOT_COUNT}
          </span>
        </div>
        <div className="animal-roster__slots">
          {partySlots.map((animal, index) => (
            <button
              key={animal?.id ?? `empty-${index}`}
              type="button"
              disabled={!animal}
              className={[
                selectedAnimal?.id === animal?.id ? 'is-active' : '',
                selectedCompanionAnimalId === animal?.id
                  ? 'is-companion'
                  : '',
              ].filter(Boolean).join(' ')}
              onClick={() => animal && handleSelectPartyAnimal(animal)}
            >
              <span>{index + 1}</span>
              {animal ? (
                <>
                  <strong>{animal.name}</strong>
                  <em>
                    {summonedCompanionAnimalId === animal.id
                      ? '현재 소환 중'
                      : selectedCompanionAnimalId === animal.id
                        ? '동행 대표'
                        : '동행 준비'}
                  </em>
                </>
              ) : (
                <em>빈 파티 슬롯</em>
              )}
            </button>
          ))}
        </div>

        <div className="animal-storage">
          <div className="animal-storage__heading">
            <div>
              <span className="menu-section-heading__eyebrow">ANIMAL BOX</span>
              <h3>포획 동물 보관함</h3>
            </div>
            <span>{capturedAnimals.length}마리</span>
          </div>
          <div className="animal-storage__list">
            {capturedAnimals.map((animal) => {
              const isInParty = activeAnimalPartyIds.includes(animal.id)

              return (
                <button
                  key={animal.id}
                  type="button"
                  className={
                    selectedAnimal?.id === animal.id ? 'is-active' : ''
                  }
                  onClick={() => setSelectedAnimalId(animal.id)}
                >
                  <span>{getAnimalIcon(animal.animalDefinitionId)}</span>
                  <strong>{animal.name}</strong>
                  <em>
                    {animal.condition === 'incapacitated'
                      ? '기절 회복 중'
                      : animal.workAssignment
                      ? '거점 작업 중'
                      : isInParty
                        ? '활동 파티'
                        : '보관 중'}
                  </em>
                </button>
              )
            })}
            {capturedAnimals.length === 0 && (
              <p>포획한 동물이 아직 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      <AnimalDetails
        animal={selectedAnimal}
        isInParty={selectedAnimalIsInParty}
        partyIsFull={partyIsFull}
        isSelectedCompanion={Boolean(selectedAnimalIsCompanion)}
        isSummoned={Boolean(selectedAnimalIsSummoned)}
        partyMessage={partyMessage}
        onPartyChange={handlePartyChange}
        onSelectCompanion={() => {
          if (selectedAnimal && selectCompanionAnimal(selectedAnimal.id)) {
            setPartyMessage(
              `${selectedAnimal.name}을(를) 동행 대표로 선택했습니다.`,
            )
            requestSave()
          }
        }}
      />
    </div>
  )
}

function AnimalDetails({
  animal,
  isInParty,
  partyIsFull,
  isSelectedCompanion,
  isSummoned,
  partyMessage,
  onPartyChange,
  onSelectCompanion,
}: Readonly<{
  animal: CapturedAnimal | null
  isInParty: boolean
  partyIsFull: boolean
  isSelectedCompanion: boolean
  isSummoned: boolean
  partyMessage: string
  onPartyChange: () => void
  onSelectCompanion: () => void
}>) {
  if (!animal) {
    return (
      <section className="animal-details is-empty">
        <strong>포획한 동물이 없습니다.</strong>
        <span>동물을 포획하면 첫 번째 슬롯부터 채워집니다.</span>
      </section>
    )
  }

  const definition = ANIMAL_DEFINITIONS[animal.animalDefinitionId]

  return (
    <section className="animal-details">
      <div className="animal-details__portrait">
        {getAnimalIcon(animal.animalDefinitionId)}
      </div>
      <div>
        <span className="menu-section-heading__eyebrow">ANIMAL PROFILE</span>
        <h2>{animal.name}</h2>
      </div>
      <dl>
        <div><dt>성별</dt><dd>{animal.gender === 'male' ? '수컷' : '암컷'}</dd></div>
        <div><dt>기본 이름</dt><dd>{definition?.name ?? animal.name}</dd></div>
        <div>
          <dt>속성</dt>
          <dd
            style={{
              color: definition
                ? ANIMAL_ELEMENTS[definition.element].color
                : undefined,
            }}
          >
            {definition
              ? ANIMAL_ELEMENTS[definition.element].name
              : '무속성'}
          </dd>
        </div>
        <div><dt>레벨</dt><dd>Lv.{animal.level}</dd></div>
        <div>
          <dt>경험치</dt>
          <dd>{animal.experience} / {animal.experienceToNextLevel}</dd>
        </div>
        <div>
          <dt>건강 상태</dt>
          <dd>{getAnimalConditionLabel(animal.condition)}</dd>
        </div>
        <div><dt>체력</dt><dd>{animal.currentHp} / {animal.stats.maxHp}</dd></div>
        <div><dt>공격력</dt><dd>{animal.stats.attack}</dd></div>
        <div><dt>방어력</dt><dd>{animal.stats.defense}</dd></div>
        <div><dt>작업 속도</dt><dd>{animal.stats.workSpeed}</dd></div>
        <div><dt>이동 속도</dt><dd>{animal.stats.moveSpeed}</dd></div>
      </dl>
      <div className="animal-details__growth">
        <div>
          <strong>신뢰도 {animal.trust} / {ANIMAL_MAX_TRUST}</strong>
          <span
            className="animal-details__trust-bar"
            role="progressbar"
            aria-label={`${animal.name} 신뢰도`}
            aria-valuemin={0}
            aria-valuemax={ANIMAL_MAX_TRUST}
            aria-valuenow={animal.trust}
          >
            <span
              style={{
                width: `${(animal.trust / ANIMAL_MAX_TRUST) * 100}%`,
              }}
            />
          </span>
        </div>
        <p>{getAnimalRecoveryText(animal, isInParty)}</p>
      </div>
      {definition && (
        <div className="animal-details__element-matchup">
          <span>
            강점{' '}
            <strong>
              {getStrongElementNames(definition.element)}
            </strong>
          </span>
          <span>
            약점{' '}
            <strong>
              {getWeakElementNames(definition.element)}
            </strong>
          </span>
        </div>
      )}
      <div className="animal-details__potential">
        <h3>개체 잠재력</h3>
        <span>
          생명력 <strong>{animal.potential.vitality}</strong>
        </span>
        <span>
          공격 <strong>{animal.potential.strength}</strong>
        </span>
        <span>
          방어 <strong>{animal.potential.resilience}</strong>
        </span>
      </div>
      <div className="animal-details__traits">
        <h3>패시브 특성</h3>
        {animal.passiveTraitIds.map((traitId) => {
          const trait = ANIMAL_PASSIVE_TRAITS[traitId]

          return (
            <span key={traitId} className={`is-${trait.tone}`}>
              <strong>{trait.name}</strong>
              <em>{trait.description}</em>
            </span>
          )
        })}
        {animal.passiveTraitIds.length === 0 && (
          <span className="is-empty">
            <strong>특성 없음</strong>
            <em>이 개체는 별도의 패시브 특성이 없습니다.</em>
          </span>
        )}
      </div>
      <AnimalActiveSkillPanel animal={animal} />
      <AnimalPartnerSkillPanel animal={animal} />
      <div className="animal-details__skills">
        <h3>작업 능력</h3>
        {WORK_SKILLS.map((skill) => (
          <span key={skill.id}>
            {skill.label} <strong>{animal.workSkills[skill.id] ?? 0}</strong>
          </span>
        ))}
      </div>
      <div className="animal-details__party">
        {isInParty && (
          <button
            type="button"
            disabled={isSelectedCompanion}
            onClick={onSelectCompanion}
          >
            {isSummoned
              ? '현재 소환 중'
              : isSelectedCompanion
                ? '현재 동행 대표'
                : '동행 대표로 선택'}
          </button>
        )}
        <button
          type="button"
          disabled={
            !isInParty &&
            (partyIsFull || animal.condition === 'incapacitated')
          }
          onClick={onPartyChange}
        >
          {isInParty
            ? '파티에서 빼기'
            : animal.condition === 'incapacitated'
              ? '기절 회복 중'
              : partyIsFull
                ? '파티 가득 참'
                : animal.workAssignment
                  ? '작업 해제 후 파티에 넣기'
                  : '활동 파티에 넣기'}
        </button>
        <small>{partyMessage}</small>
      </div>
    </section>
  )
}

function AnimalActiveSkillPanel({
  animal,
}: Readonly<{ animal: CapturedAnimal }>) {
  const equipAnimalActiveSkill = useGameStore(
    (state) => state.equipAnimalActiveSkill,
  )
  const requestSave = useGameStore((state) => state.requestManualSave)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const [skillMessage, setSkillMessage] = useState(
    '장착 칸을 선택한 뒤 습득 스킬을 눌러 교체할 수 있습니다.',
  )

  const handleEquipSkill = (skillId: AnimalActiveSkillId) => {
    if (
      equipAnimalActiveSkill(
        animal.id,
        skillId,
        selectedSlotIndex,
      )
    ) {
      setSkillMessage(
        `${ANIMAL_ACTIVE_SKILLS[skillId].name}을(를) ${selectedSlotIndex + 1}번 칸에 장착했습니다.`,
      )
      requestSave()
      return
    }

    setSkillMessage('스킬을 장착하지 못했습니다.')
  }

  return (
    <div className="animal-details__active-skills">
      <div className="animal-details__active-skills-heading">
        <h3>액티브 스킬</h3>
        <span>동행 전투에서 장착 순서대로 사용하며 각자 재사용 시간이 적용됩니다.</span>
      </div>
      <div className="animal-skill-slots">
        {animal.equippedActiveSkillIds.map((skillId, index) => {
          const skill = skillId ? ANIMAL_ACTIVE_SKILLS[skillId] : null

          return (
            <button
              key={`slot-${index}`}
              type="button"
              className={selectedSlotIndex === index ? 'is-selected' : ''}
              onClick={() => setSelectedSlotIndex(index)}
            >
              <em>{index + 1}</em>
              <strong>{skill?.name ?? '빈 스킬 칸'}</strong>
              <span>
                {skill
                  ? `${ANIMAL_ELEMENTS[skill.element].name} · 위력 ${Math.round(skill.powerMultiplier * 100)} · 재사용 ${(skill.cooldownMs / 1_000).toFixed(1)}초`
                  : '습득 스킬을 선택하세요.'}
              </span>
            </button>
          )
        })}
      </div>
      <div className="animal-learned-skills">
        {animal.learnedActiveSkillIds.map((skillId) => {
          const skill = ANIMAL_ACTIVE_SKILLS[skillId]
          const isEquipped =
            animal.equippedActiveSkillIds[selectedSlotIndex] === skillId

          return (
            <button
              key={skillId}
              type="button"
              disabled={isEquipped}
              onClick={() => handleEquipSkill(skillId)}
            >
              <strong>{skill.name}</strong>
              <span>
                {ANIMAL_ELEMENTS[skill.element].name} · {skill.description}
              </span>
            </button>
          )
        })}
      </div>
      <small>{skillMessage}</small>
    </div>
  )
}

function AnimalPartnerSkillPanel({
  animal,
}: Readonly<{ animal: CapturedAnimal }>) {
  const inventory = useGameStore((state) => state.inventory)
  const equipCompanionEquipment = useGameStore(
    (state) => state.equipCompanionEquipment,
  )
  const requestSave = useGameStore((state) => state.requestManualSave)
  const [message, setMessage] = useState('')
  const definition = ANIMAL_DEFINITIONS[animal.animalDefinitionId]

  if (!definition) {
    return null
  }

  const partnerSkill = definition.partnerSkill
  const equipment =
    COMPANION_EQUIPMENT[partnerSkill.requiredEquipmentId]
  const isActive =
    animal.partnerEquipmentId === equipment.id
  const inventoryAmount = inventory[equipment.inventoryItemId]

  const handleEquipmentChange = () => {
    const nextEquipmentId = isActive ? null : equipment.id

    if (
      equipCompanionEquipment(animal.id, nextEquipmentId)
    ) {
      setMessage(
        isActive
          ? `${equipment.name}을(를) 해제해 인벤토리로 옮겼습니다.`
          : `${equipment.name}을(를) 장착했습니다.`,
      )
      requestSave()
      return
    }

    setMessage('전용 장비를 변경하지 못했습니다.')
  }

  return (
    <div className="animal-details__partner-skill">
      <div>
        <span>PARTNER SKILL</span>
        <h3>{partnerSkill.name}</h3>
        <p>{partnerSkill.description}</p>
      </div>
      <div className={isActive ? 'is-active' : ''}>
        <span>{getItemIcon(equipment.inventoryItemId)}</span>
        <strong>{equipment.name}</strong>
        <small>
          {isActive
            ? '동반자 능력 활성화'
            : inventoryAmount > 0
              ? `인벤토리 보유 ${inventoryAmount}개`
              : '제작 작업대에서 먼저 제작하세요.'}
        </small>
        <button
          type="button"
          disabled={!isActive && inventoryAmount <= 0}
          onClick={handleEquipmentChange}
        >
          {isActive ? '전용 장비 해제' : '전용 장비 장착'}
        </button>
      </div>
      {message && <small>{message}</small>}
    </div>
  )
}

function BestiaryPanel() {
  const capturedAnimals = useGameStore((state) => state.capturedAnimals)
  const unlockedAnimalIds = new Set(
    capturedAnimals.map((animal) => animal.animalDefinitionId),
  )

  return (
    <div className="bestiary-panel">
      <div className="menu-section-heading">
        <div>
          <span className="menu-section-heading__eyebrow">FIELD GUIDE</span>
          <h2>동물 도감</h2>
        </div>
        <span>포획한 종류만 기록됩니다.</span>
      </div>
      <div className="bestiary-grid">
        {Object.values(ANIMAL_DEFINITIONS).map((animal) => {
          const isUnlocked = unlockedAnimalIds.has(animal.id)

          return (
            <article key={animal.id} className={isUnlocked ? '' : 'is-locked'}>
              <div>
                {isUnlocked ? getAnimalIcon(animal.id) : '?'}
              </div>
              <span>{isUnlocked ? animal.behaviorType.toUpperCase() : 'UNKNOWN'}</span>
              <h3>{isUnlocked ? animal.name : '발견하지 못한 동물'}</h3>
              <p>
                {isUnlocked
                  ? `${ANIMAL_ELEMENTS[animal.element].name} · 체력 ${animal.maxHp} · 공격력 ${animal.attackDamage} · 포획 난도 ${Math.round(animal.captureDifficulty * 100)}`
                  : '동물을 포획하면 도감 정보가 해금됩니다.'}
              </p>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function ControlsPanel() {
  return (
    <div className="controls-panel">
      <div className="menu-section-heading">
        <div>
          <span className="menu-section-heading__eyebrow">HOW TO PLAY</span>
          <h2>조작키</h2>
        </div>
      </div>
      <div className="controls-panel__list">
        {CONTROL_GROUPS.map(([label, description]) => (
          <div key={label}>
            <strong>{label}</strong>
            <span>{description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OptionsPanel() {
  const requestManualSave = useGameStore((state) => state.requestManualSave)
  const lastSavedAt = useGameStore((state) => state.lastSavedAt)
  const saveMessage = useGameStore((state) => state.saveMessage)
  const completedManualSaveRequestId = useGameStore(
    (state) => state.completedManualSaveRequestId,
  )
  const lastManualSaveSucceeded = useGameStore(
    (state) => state.lastManualSaveSucceeded,
  )
  const [activeOptionsTab, setActiveOptionsTab] = useState<'save' | 'load'>(
    'save',
  )
  const [isSlotSelectOpen, setSlotSelectOpen] = useState(false)
  const [slotRevision, setSlotRevision] = useState(0)
  const [slotMessage, setSlotMessage] = useState('')
  const [pendingLoadRequest, setPendingLoadRequest] =
    useState<PendingLoadRequest | null>(null)
  const [pendingBackupLoad, setPendingBackupLoad] =
    useState<PendingBackupLoad | null>(null)
  const slotSummaries = saveSlotService.getSlotSummaries()
  const autoSave = slotSummaries.find((slot) => slot.id === 'auto')

  useEffect(() => {
    if (
      !pendingBackupLoad ||
      completedManualSaveRequestId !== pendingBackupLoad.requestId ||
      lastManualSaveSucceeded !== true
    ) {
      return
    }

    if (
      !saveSlotService.requestLoadOnRestart(
        pendingBackupLoad.loadRequest.slotId,
      )
    ) {
      window.alert(
        '불러올 슬롯을 준비하지 못했습니다. 취소 후 다시 시도하세요.',
      )
      return
    }

    window.location.reload()
  }, [
    completedManualSaveRequestId,
    lastManualSaveSucceeded,
    pendingBackupLoad,
  ])
  const handleDeleteSlot = (slotId: SaveSlotId, slotLabel: string) => {
    if (
      !window.confirm(
        `${slotLabel}의 저장 기록을 삭제할까요? 삭제한 기록은 복구할 수 없습니다.`,
      )
    ) {
      return
    }

    if (saveSlotService.deleteSlot(slotId)) {
      setSlotRevision((revision) => revision + 1)
      setSlotMessage(`${slotLabel}의 저장 기록을 삭제했습니다.`)
      return
    }

    setSlotMessage(`${slotLabel}을 삭제하지 못했습니다.`)
  }
  const handleLoadSlot = (
    slotId: SaveSlotId,
    slotLabel: string,
    hasSave: boolean,
  ) => {
    if (pendingBackupLoad) {
      return
    }

    setPendingLoadRequest({ slotId, slotLabel, hasSave })
    setSlotMessage('')
  }
  const handleSaveBeforeLoad = (backupSlotId: ManualSaveSlotId) => {
    if (!pendingLoadRequest || pendingBackupLoad) {
      return
    }

    const backupDefinition = SAVE_SLOT_DEFINITIONS.find(
      (slot) => slot.id === backupSlotId,
    )
    const backupSummary = slotSummaries.find(
      (slot) => slot.id === backupSlotId,
    )
    const backupSlotLabel =
      backupDefinition?.label ?? `저장 슬롯 ${backupSlotId.slice(-1)}`

    if (
      backupSummary?.save &&
      !window.confirm(
        `${backupSlotLabel}의 기존 기록을 현재 진행으로 덮어쓸까요?`,
      )
    ) {
      return
    }

    const requestId = requestManualSave(backupSlotId)

    setPendingBackupLoad({
      loadRequest: pendingLoadRequest,
      requestId,
      backupSlotLabel,
    })
  }
  const handleLoadWithoutSaving = () => {
    if (!pendingLoadRequest || pendingBackupLoad) {
      return
    }

    if (
      !window.confirm(
        '현재 진행을 수동 슬롯에 남기지 않고 전환할까요? 자동저장은 새 플레이로 덮어써질 수 있으며 기존 진행을 복구하지 못할 수 있습니다.',
      )
    ) {
      return
    }

    if (!saveSlotService.requestLoadOnRestart(pendingLoadRequest.slotId)) {
      setSlotMessage('불러올 슬롯을 준비하지 못했습니다.')
      return
    }

    window.location.reload()
  }

  return (
    <div className="options-panel">
      <div className="menu-section-heading">
        <div>
          <span className="menu-section-heading__eyebrow">GAME SETTINGS</span>
          <h2>옵션</h2>
        </div>
      </div>
      <div className="options-panel__tabs" role="tablist" aria-label="저장 및 불러오기">
        <button
          type="button"
          role="tab"
          aria-selected={activeOptionsTab === 'save'}
          className={activeOptionsTab === 'save' ? 'is-active' : ''}
          onClick={() => setActiveOptionsTab('save')}
        >
          저장
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeOptionsTab === 'load'}
          className={activeOptionsTab === 'load' ? 'is-active' : ''}
          onClick={() => setActiveOptionsTab('load')}
        >
          불러오기
        </button>
      </div>

      {activeOptionsTab === 'save' ? (
        <>
      <section className="options-panel__save">
        <div>
          <h3>게임 저장</h3>
          <p>
            자동저장은 별도 슬롯에 유지됩니다. 수동 슬롯 1~5 중 하나를
            선택해 새로 저장하거나 덮어쓸 수 있습니다.
          </p>
          <span>
            이번 플레이 마지막 저장: {lastSavedAt
              ? new Date(lastSavedAt).toLocaleTimeString('ko-KR')
              : '아직 없음'}
          </span>
          {saveMessage && <span>{saveMessage}</span>}
          {slotMessage && <span>{slotMessage}</span>}
        </div>
        <button
          type="button"
          onClick={() => setSlotSelectOpen((current) => !current)}
        >
          {isSlotSelectOpen ? '슬롯 닫기' : '저장 슬롯 선택'}
        </button>
      </section>

      {isSlotSelectOpen && (
        <section className="options-save-slots" aria-label="저장 슬롯">
          <article
            key={`auto-${slotRevision}`}
            className="options-save-slot is-auto"
          >
            <span>AUTO</span>
            <div className="options-save-slot__info">
              <strong>자동저장</strong>
              <small>
                {autoSave?.save
                  ? `${getSaveSummaryText(autoSave.save)} · ${formatSaveDate(autoSave.save.savedAt)}`
                  : '아직 자동저장 기록이 없습니다.'}
              </small>
            </div>
            <div className="options-save-slot__actions">
              <em>자동 갱신</em>
              {autoSave?.save && (
                <button
                  type="button"
                  className="is-delete"
                  onClick={() => handleDeleteSlot('auto', '자동저장')}
                >
                  삭제
                </button>
              )}
            </div>
          </article>

          {SAVE_SLOT_DEFINITIONS.filter((slot) => !slot.isAuto).map(
            (definition) => {
              const summary = slotSummaries.find(
                (slot) => slot.id === definition.id,
              )
              const save = summary?.save ?? null

              return (
                <article
                  key={definition.id}
                  className={`options-save-slot${
                    save ? ' has-save' : ' is-empty'
                  }`}
                >
                  <span>{definition.id.slice(-1)}</span>
                  <div className="options-save-slot__info">
                    <strong>{definition.label}</strong>
                    <small>
                      {save
                        ? `${getSaveSummaryText(save)} · ${formatSaveDate(save.savedAt)}`
                        : '빈 슬롯 · 현재 게임을 새로 등록할 수 있습니다.'}
                    </small>
                  </div>
                  <div className="options-save-slot__actions">
                    <button
                      type="button"
                      onClick={() => requestManualSave(definition.id)}
                    >
                      {save ? '덮어쓰기' : '새로 저장'}
                    </button>
                    {save && (
                      <button
                        type="button"
                        className="is-delete"
                        onClick={() =>
                          handleDeleteSlot(
                            definition.id,
                            definition.label,
                          )
                        }
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </article>
              )
            },
          )}
        </section>
      )}
        </>
      ) : (
        <>
          <section className="options-panel__save options-panel__load-intro">
            <div>
              <h3>게임 불러오기</h3>
              <p>
                시작 화면과 같은 저장 슬롯 목록입니다. 기록을 불러오거나
                빈 슬롯에서 새 게임을 시작할 수 있습니다.
              </p>
              <span>
                불러오기 전에 현재 진행을 보관할 수동 슬롯을 선택할 수
                있습니다.
              </span>
              {slotMessage && <span>{slotMessage}</span>}
            </div>
          </section>
          {pendingLoadRequest && (
            <section
              className="options-load-backup"
              aria-label="현재 진행 저장 여부 선택"
            >
              <header>
                <span>BEFORE LOAD</span>
                <h3>현재 진행을 먼저 보관할까요?</h3>
                <p>
                  {pendingLoadRequest.hasSave
                    ? `${pendingLoadRequest.slotLabel} 기록을 불러오기 전에 현재 진행을 수동 슬롯에 저장하세요.`
                    : `${pendingLoadRequest.slotLabel}에서 새 게임을 시작하기 전에 현재 진행을 수동 슬롯에 저장하세요.`}
                </p>
                <strong>
                  자동저장은 새 플레이가 시작되면 덮어써질 수 있으므로
                  장기 보관용으로 안전하지 않습니다.
                </strong>
              </header>
              <div className="options-load-backup__slots">
                {SAVE_SLOT_DEFINITIONS.filter(
                  (definition) => !definition.isAuto,
                ).map((definition) => {
                  const isLoadTarget =
                    definition.id === pendingLoadRequest.slotId
                  const summary = slotSummaries.find(
                    (slot) => slot.id === definition.id,
                  )

                  return (
                    <button
                      key={`backup-${definition.id}`}
                      type="button"
                      disabled={isLoadTarget || Boolean(pendingBackupLoad)}
                      onClick={() =>
                        handleSaveBeforeLoad(
                          definition.id as ManualSaveSlotId,
                        )
                      }
                    >
                      <span>{definition.id.slice(-1)}</span>
                      <span>
                        <strong>{definition.label}</strong>
                        <small>
                          {isLoadTarget
                            ? '불러올 대상 슬롯'
                            : summary?.save
                              ? `${getSaveSummaryText(summary.save)} · 덮어쓰기`
                              : '빈 슬롯 · 현재 진행 저장'}
                        </small>
                      </span>
                      <em>
                        {isLoadTarget
                          ? '선택 불가'
                          : summary?.save
                            ? '덮어쓰고 전환'
                            : '저장 후 전환'}
                      </em>
                    </button>
                  )
                })}
              </div>
              {pendingBackupLoad && (
                <p className="options-load-backup__status">
                  {completedManualSaveRequestId ===
                  pendingBackupLoad.requestId
                    ? lastManualSaveSucceeded === false
                      ? `${pendingBackupLoad.backupSlotLabel} 저장에 실패했습니다. 취소 후 다시 시도하세요.`
                      : `${pendingBackupLoad.backupSlotLabel} 저장을 완료했습니다. 불러오기를 준비하고 있습니다.`
                    : `${pendingBackupLoad.backupSlotLabel} 저장 완료를 기다리고 있습니다.`}
                </p>
              )}
              <footer>
                <button
                  type="button"
                  className="is-danger"
                  disabled={Boolean(pendingBackupLoad)}
                  onClick={handleLoadWithoutSaving}
                >
                  저장하지 않고 전환
                </button>
                <button
                  type="button"
                  disabled={
                    Boolean(pendingBackupLoad) &&
                    completedManualSaveRequestId !==
                      pendingBackupLoad?.requestId
                  }
                  onClick={() => {
                    setPendingLoadRequest(null)
                    setPendingBackupLoad(null)
                    setSlotMessage('')
                  }}
                >
                  취소
                </button>
              </footer>
            </section>
          )}
          <section className="options-save-slots" aria-label="불러올 저장 슬롯">
            {SAVE_SLOT_DEFINITIONS.map((definition) => {
              const summary = slotSummaries.find(
                (slot) => slot.id === definition.id,
              )
              const save = summary?.save ?? null

              return (
                <article
                  key={`load-${definition.id}-${slotRevision}`}
                  className={`options-save-slot${
                    definition.isAuto ? ' is-auto' : ''
                  }${save ? ' has-save' : ' is-empty'}`}
                >
                  <span>
                    {definition.isAuto ? 'AUTO' : definition.id.slice(-1)}
                  </span>
                  <div className="options-save-slot__info">
                    <strong>{definition.label}</strong>
                    <small>
                      {save
                        ? `${getSaveSummaryText(save)} · ${formatSaveDate(save.savedAt)}`
                        : '저장된 모험이 없습니다.'}
                    </small>
                  </div>
                  <div className="options-save-slot__actions">
                    <button
                      type="button"
                      disabled={Boolean(pendingLoadRequest)}
                      onClick={() =>
                        handleLoadSlot(
                          definition.id,
                          definition.label,
                          Boolean(save),
                        )
                      }
                    >
                      {save ? '불러오기' : '새 게임'}
                    </button>
                    {save && (
                      <button
                        type="button"
                        className="is-delete"
                        disabled={Boolean(pendingLoadRequest)}
                        onClick={() =>
                          handleDeleteSlot(definition.id, definition.label)
                        }
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}

function writeEquipmentPayload(
  event: DragEvent<HTMLElement>,
  payload: EquipmentDragPayload,
) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(EQUIPMENT_DRAG_TYPE, JSON.stringify(payload))
  writeHotbarPayload(event, { kind: 'tool', toolId: payload.toolId })
}

function writeHotbarPayload(
  event: DragEvent<HTMLElement>,
  payload: HotbarAssignment,
) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(HOTBAR_DRAG_TYPE, JSON.stringify(payload))
}

function readEquipmentPayload(
  event: DragEvent<HTMLElement>,
): EquipmentDragPayload | null {
  try {
    const serializedPayload = event.dataTransfer.getData(EQUIPMENT_DRAG_TYPE)

    if (!serializedPayload) {
      return null
    }

    const payload: unknown = JSON.parse(serializedPayload)

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('toolId' in payload) ||
      typeof payload.toolId !== 'string' ||
      !Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, payload.toolId) ||
      !('source' in payload) ||
      (payload.source !== 'inventory' && payload.source !== 'equipment')
    ) {
      return null
    }

    const slotId = 'slotId' in payload ? payload.slotId : undefined

    if (
      slotId !== undefined &&
      !EQUIPMENT_SLOTS.some((slot) => slot.id === slotId)
    ) {
      return null
    }

    return {
      toolId: payload.toolId as ToolDefinitionId,
      source: payload.source,
      slotId: slotId as EquipmentSlotId | undefined,
    }
  } catch {
    return null
  }
}

function readHotbarPayload(
  event: DragEvent<HTMLElement>,
): HotbarAssignment | null {
  try {
    const serializedPayload = event.dataTransfer.getData(HOTBAR_DRAG_TYPE)

    if (!serializedPayload) {
      return null
    }

    const payload: unknown = JSON.parse(serializedPayload)

    if (typeof payload !== 'object' || payload === null || !('kind' in payload)) {
      return null
    }

    if (
      payload.kind === 'item' &&
      'itemId' in payload &&
      typeof payload.itemId === 'string' &&
      Object.prototype.hasOwnProperty.call(ITEM_DEFINITIONS, payload.itemId)
    ) {
      return {
        kind: 'item',
        itemId: payload.itemId as InventoryItemKey,
      }
    }

    if (
      payload.kind === 'tool' &&
      'toolId' in payload &&
      typeof payload.toolId === 'string' &&
      Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, payload.toolId)
    ) {
      return {
        kind: 'tool',
        toolId: payload.toolId as ToolDefinitionId,
      }
    }

    return null
  } catch {
    return null
  }
}

function getHotbarAssignmentName(assignment: HotbarSlot) {
  if (!assignment) {
    return ''
  }

  return assignment.kind === 'item'
    ? ITEM_DEFINITIONS[assignment.itemId].name
    : TOOL_DEFINITIONS[assignment.toolId].name
}

function getHotbarKeyLabel(index: number) {
  return index === 9 ? 0 : index + 1
}

function getRecipeUnlockReason(
  recipeId: CraftingRecipeId,
  playerLevel: number,
  technologyPoints: number,
  unlockedRecipeIds: readonly CraftingRecipeId[],
) {
  const recipe = CRAFTING_RECIPES[recipeId]

  if (unlockedRecipeIds.includes(recipeId)) {
    return ''
  }

  if (playerLevel < recipe.unlockLevel) {
    return `플레이어 레벨 ${recipe.unlockLevel}이 필요합니다.`
  }

  if (
    recipe.prerequisiteRecipeId &&
    !unlockedRecipeIds.includes(recipe.prerequisiteRecipeId)
  ) {
    return `${CRAFTING_RECIPES[recipe.prerequisiteRecipeId].name} 제작법을 먼저 해금해야 합니다.`
  }

  if (technologyPoints < recipe.technologyPointCost) {
    return `기술 포인트가 ${recipe.technologyPointCost - technologyPoints} 부족합니다.`
  }

  return ''
}

function getCraftingRecipeIcon(recipeId: CraftingRecipeId) {
  const recipe = CRAFTING_RECIPES[recipeId]

  return recipe.outputKind === 'tool'
    ? getEquipmentIcon(recipe.outputToolId)
    : getItemIcon(recipe.output.item)
}

function getCraftingCategoryLabel(
  category: (typeof CRAFTING_RECIPES)[CraftingRecipeId]['category'],
) {
  switch (category) {
    case 'tool':
      return '도구'
    case 'equipment':
      return '장비'
    case 'food':
      return '음식'
  }
}

function getSaveSummaryText(save: GameSave) {
  return `Lv.${save.player.level ?? 1} · ${getMapDisplayName(save.player.currentMapId)}`
}

function getMapDisplayName(mapId: string) {
  const mapNames: Readonly<Record<string, string>> = {
    meadow: '중앙 초원',
    'sunlit-plains': '햇살 들판',
    'whispering-grove': '속삭임 초원',
    'clover-fields': '클로버 들판',
    'riverbank-meadow': '강변 초원',
    'rock-canyon': '바위 협곡',
  }

  return mapNames[mapId] ?? '알 수 없는 지역'
}

function formatSaveDate(savedAt: number) {
  return new Date(savedAt).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getAnimalIcon(animalDefinitionId: string) {
  switch (animalDefinitionId) {
    case 'woolly-sheep':
      return '🐑'
    case 'rock-boar':
      return '🐗'
    default:
      return '🐇'
  }
}

function getAnimalRecoveryText(
  animal: CapturedAnimal,
  isInParty: boolean,
) {
  if (animal.condition === 'incapacitated') {
    const remainingSeconds = animal.reviveAt
      ? Math.max(0, Math.ceil((animal.reviveAt - Date.now()) / 1_000))
      : 0

    return `보관 회복 중 · 부활까지 약 ${remainingSeconds}초`
  }

  if (animal.currentHp >= animal.stats.maxHp) {
    return '체력이 모두 회복된 상태입니다.'
  }

  if (isInParty || animal.workAssignment) {
    return '파티 또는 작업 중에는 자연 회복이 멈춥니다.'
  }

  return '보관함에서 체력을 회복하고 있습니다.'
}

function getStrongElementNames(elementId: AnimalElementId) {
  const strongAgainst =
    ANIMAL_ELEMENTS[elementId].strongAgainst as readonly AnimalElementId[]

  return strongAgainst.length > 0
    ? strongAgainst
        .map((targetElementId) =>
          ANIMAL_ELEMENTS[targetElementId].name,
        )
        .join(', ')
    : '없음'
}

function getWeakElementNames(elementId: AnimalElementId) {
  const weakAgainst = (
    Object.values(ANIMAL_ELEMENTS) as readonly {
      id: AnimalElementId
      strongAgainst: readonly AnimalElementId[]
    }[]
  )
    .filter((element) =>
      element.strongAgainst.includes(elementId),
    )
    .map((element) => ANIMAL_ELEMENTS[element.id].name)

  return weakAgainst.length > 0
    ? weakAgainst.join(', ')
    : '없음'
}

function getAnimalConditionLabel(
  condition: CapturedAnimal['condition'],
) {
  switch (condition) {
    case 'healthy':
      return '건강'
    case 'injured':
      return '부상'
    case 'incapacitated':
      return '기절'
  }
}
