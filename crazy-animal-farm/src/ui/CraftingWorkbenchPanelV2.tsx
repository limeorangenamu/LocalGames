import { useState } from 'react'
import {
  CRAFTING_RECIPES,
  CRAFTING_STATIONS,
} from '../game/data/crafting'
import { TOOL_DEFINITIONS } from '../game/data/equipment'
import {
  canReplaceEquipmentVariant,
  createEquipmentBlueprintId,
  EQUIPMENT_BLUEPRINT_RARITIES,
  EQUIPMENT_RARITIES,
  getEquipmentBlueprintAmount,
  getEquipmentBlueprintName,
  getEquipmentRarity,
  getNextEquipmentBlueprintId,
  isEquipmentBlueprintId,
} from '../game/data/equipmentProgression'
import { ITEM_DEFINITIONS } from '../game/data/items'
import type {
  CraftingRecipe,
  CraftingRecipeId,
} from '../game/types/crafting'
import type {
  CraftableEquipmentId,
  EquipmentBlueprintId,
  EquipmentRarity,
  EquipmentVariants,
} from '../game/types/equipment'
import type { InventoryItemKey } from '../game/types/item'
import { useGameStore } from '../store/useGameStore'
import { getEquipmentIcon, getItemIcon } from './itemPresentation'
import './craftingWorkbenchPanel.css'

export function CraftingWorkbenchPanel() {
  const isOpen = useGameStore((state) => state.isCraftingWorkbenchOpen)
  const activeStationId = useGameStore(
    (state) => state.activeCraftingStationId,
  )
  const unlockedRecipeIds = useGameStore(
    (state) => state.unlockedRecipeIds,
  )
  const inventory = useGameStore((state) => state.inventory)
  const ownedToolIds = useGameStore((state) => state.ownedToolIds)
  const equipmentVariants = useGameStore((state) => state.equipmentVariants)
  const equipmentBlueprints = useGameStore(
    (state) => state.equipmentBlueprints,
  )
  const consumeInventoryItems = useGameStore(
    (state) => state.consumeInventoryItems,
  )
  const addInventoryItem = useGameStore((state) => state.addInventoryItem)
  const craftEquipment = useGameStore((state) => state.craftEquipment)
  const synthesizeEquipmentBlueprint = useGameStore(
    (state) => state.synthesizeEquipmentBlueprint,
  )
  const setOpen = useGameStore((state) => state.setCraftingWorkbenchOpen)
  const requestSave = useGameStore((state) => state.requestManualSave)
  const [message, setMessage] = useState(
    '해금한 제작법과 필요한 재료를 확인하세요.',
  )
  const [selectedRarityByToolId, setSelectedRarityByToolId] = useState<
    Partial<Record<CraftableEquipmentId, EquipmentRarity>>
  >({})

  if (!isOpen || !activeStationId) {
    return null
  }

  const station = CRAFTING_STATIONS[activeStationId]
  const recipes = Object.values(CRAFTING_RECIPES).filter(
    (recipe) => recipe.requiredStationId === activeStationId,
  )

  const handleCraft = (
    recipeId: CraftingRecipeId,
    rarity: EquipmentRarity = 'common',
  ) => {
    const recipe = CRAFTING_RECIPES[recipeId]

    if (!unlockedRecipeIds.includes(recipeId)) {
      setMessage(
        `${recipe.name} 제작법이 없습니다. 메뉴의 제작법 탭에서 먼저 해금하세요.`,
      )
      return
    }

    if (recipe.outputKind === 'tool') {
      const toolId = recipe.outputToolId

      if (toolId === 'bare-hands') {
        return
      }

      const blueprintId =
        rarity === 'common'
          ? null
          : createEquipmentBlueprintId(toolId, rarity)

      if (
        blueprintId &&
        getEquipmentBlueprintAmount(equipmentBlueprints, blueprintId) <= 0
      ) {
        setMessage(`${EQUIPMENT_RARITIES[rarity].name} 설계도가 없습니다.`)
        return
      }

      if (!canReplaceEquipmentVariant(equipmentVariants[toolId], rarity)) {
        setMessage('현재 보유 장비보다 높은 등급만 교체 제작할 수 있습니다.')
        return
      }
    }

    const ingredients = getScaledIngredients(recipe, rarity)
    const missingIngredients = getMissingIngredients(ingredients, inventory)

    if (missingIngredients.length > 0) {
      setMessage(
        `재료가 부족합니다: ${missingIngredients
          .map(
            ({ item, amount }) =>
              `${ITEM_DEFINITIONS[item].name} ${amount}`,
          )
          .join(', ')}`,
      )
      return
    }

    if (!consumeInventoryItems(ingredients)) {
      setMessage('재료 상태가 변경되어 제작하지 못했습니다. 다시 시도하세요.')
      return
    }

    if (recipe.outputKind === 'tool') {
      if (
        recipe.outputToolId === 'bare-hands' ||
        !craftEquipment(recipe.outputToolId, rarity)
      ) {
        setMessage('장비 등급 상태가 변경되어 제작하지 못했습니다.')
        return
      }
    } else {
      addInventoryItem(recipe.output.item, recipe.output.amount)
    }

    const rarityPrefix =
      recipe.outputKind === 'tool'
        ? `${EQUIPMENT_RARITIES[rarity].name} `
        : ''
    setMessage(
      `${rarityPrefix}${recipe.name}을(를) 제작해 인벤토리에 보관했습니다.`,
    )
    requestSave()
  }

  const handleSynthesize = (blueprintId: EquipmentBlueprintId) => {
    const nextBlueprintId = synthesizeEquipmentBlueprint(blueprintId)

    if (!nextBlueprintId) {
      setMessage('같은 설계도 3장이 필요하거나 이미 최고 등급입니다.')
      return
    }

    setMessage(
      `${getEquipmentBlueprintName(nextBlueprintId)} 합성에 성공했습니다.`,
    )
    requestSave()
  }

  const ownedBlueprintEntries = Object.entries(equipmentBlueprints).filter(
    (entry): entry is [EquipmentBlueprintId, number] =>
      isEquipmentBlueprintId(entry[0]) &&
      typeof entry[1] === 'number' &&
      entry[1] > 0,
  )

  return (
    <section
      className="crafting-workbench"
      role="dialog"
      aria-modal="true"
      aria-label={station.name}
    >
      <div className="crafting-workbench__window">
        <header className="crafting-workbench__header">
          <div>
            <span>CRAFTING STATION</span>
            <h2>{station.name}</h2>
            <p>{station.description}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)}>
            ESC 닫기
          </button>
        </header>

        <div className="crafting-workbench__recipes">
          {ownedBlueprintEntries.length > 0 && (
            <section className="blueprint-synthesis">
              <div className="blueprint-synthesis__heading">
                <strong>장비 설계도 합성</strong>
                <span>같은 설계도 3장 → 다음 등급 1장</span>
              </div>
              <div className="blueprint-synthesis__list">
                {ownedBlueprintEntries.map(([blueprintId, amount]) => {
                  const nextBlueprintId =
                    getNextEquipmentBlueprintId(blueprintId)

                  return (
                    <article key={blueprintId}>
                      <span aria-hidden="true">📜</span>
                      <strong>{getEquipmentBlueprintName(blueprintId)}</strong>
                      <small>{amount}장</small>
                      <button
                        type="button"
                        disabled={amount < 3 || !nextBlueprintId}
                        onClick={() => handleSynthesize(blueprintId)}
                      >
                        {nextBlueprintId ? '3장 합성' : '최고 등급'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {recipes.map((recipe) => {
            const isUnlocked = unlockedRecipeIds.includes(recipe.id)
            const toolId =
              recipe.outputKind === 'tool' &&
              recipe.outputToolId !== 'bare-hands'
                ? recipe.outputToolId
                : null
            const selectedRarity = toolId
              ? selectedRarityByToolId[toolId] ?? 'common'
              : 'common'
            const selectedBlueprintId =
              toolId && selectedRarity !== 'common'
                ? createEquipmentBlueprintId(toolId, selectedRarity)
                : null
            const hasSelectedBlueprint =
              !selectedBlueprintId ||
              getEquipmentBlueprintAmount(
                equipmentBlueprints,
                selectedBlueprintId,
              ) > 0
            const alreadyOwned = Boolean(
              toolId &&
                !canReplaceEquipmentVariant(
                  equipmentVariants[toolId],
                  selectedRarity,
                ),
            )
            const scaledIngredients = getScaledIngredients(
              recipe,
              selectedRarity,
            )
            const missingIngredients = getMissingIngredients(
              scaledIngredients,
              inventory,
            )
            const canCraft =
              isUnlocked &&
              !alreadyOwned &&
              hasSelectedBlueprint &&
              missingIngredients.length === 0

            return (
              <article
                key={recipe.id}
                className={`workbench-recipe${
                  isUnlocked ? '' : ' is-locked'
                }`}
              >
                <div className="workbench-recipe__icon">
                  {recipe.outputKind === 'tool'
                    ? getEquipmentIcon(recipe.outputToolId)
                    : getItemIcon(recipe.output.item)}
                </div>
                <div className="workbench-recipe__summary">
                  <span>
                    {isUnlocked ? 'RECIPE ACQUIRED' : 'RECIPE LOCKED'}
                  </span>
                  <h3>{recipe.name}</h3>
                  <p>{recipe.description}</p>
                  <strong>
                    결과:{' '}
                    {recipe.outputKind === 'tool'
                      ? TOOL_DEFINITIONS[recipe.outputToolId].name
                      : `${ITEM_DEFINITIONS[recipe.output.item].name} ${recipe.output.amount}개`}
                  </strong>
                  {toolId && (
                    <label className="workbench-recipe__rarity">
                      <span>제작 등급</span>
                      <select
                        value={selectedRarity}
                        onChange={(event) =>
                          setSelectedRarityByToolId((current) => ({
                            ...current,
                            [toolId]: event.target.value as EquipmentRarity,
                          }))
                        }
                      >
                        <option value="common">일반 제작법</option>
                        {EQUIPMENT_BLUEPRINT_RARITIES.map((rarity) => {
                          const blueprintId = createEquipmentBlueprintId(
                            toolId,
                            rarity,
                          )
                          const amount = getEquipmentBlueprintAmount(
                            equipmentBlueprints,
                            blueprintId,
                          )

                          return (
                            <option
                              key={rarity}
                              value={rarity}
                              disabled={amount <= 0}
                            >
                              {EQUIPMENT_RARITIES[rarity].name} 설계도 ({amount})
                            </option>
                          )
                        })}
                      </select>
                      <small>
                        현재{' '}
                        {getOwnedEquipmentRarityLabel(
                          toolId,
                          ownedToolIds,
                          equipmentVariants,
                        )}
                      </small>
                    </label>
                  )}
                </div>

                <div className="workbench-recipe__ingredients">
                  {[...getRequiredIngredientAmounts(scaledIngredients)].map(
                    ([item, requiredAmount]) => {
                      const currentAmount = inventory[item]
                      const isMissing = currentAmount < requiredAmount

                      return (
                        <span
                          key={item}
                          className={isMissing ? 'is-missing' : ''}
                        >
                          {ITEM_DEFINITIONS[item].name}
                          <strong>
                            {currentAmount} / {requiredAmount}
                          </strong>
                        </span>
                      )
                    },
                  )}
                </div>

                <button
                  type="button"
                  disabled={!canCraft}
                  title={getCraftingDisabledReason(
                    isUnlocked,
                    alreadyOwned,
                    hasSelectedBlueprint,
                    missingIngredients,
                  )}
                  onClick={() => handleCraft(recipe.id, selectedRarity)}
                >
                  {!isUnlocked
                    ? '제작법 미해금'
                    : !hasSelectedBlueprint
                      ? '설계도 없음'
                      : alreadyOwned
                        ? '상위 등급 필요'
                        : missingIngredients.length > 0
                          ? '재료 부족'
                          : '제작하기'}
                </button>
              </article>
            )
          })}
        </div>

        <footer className="crafting-workbench__footer">
          <span>{message}</span>
          <small>
            제작법은 ESC 메뉴의 제작법 탭에서 기술 포인트로 해금합니다.
          </small>
        </footer>
      </div>
    </section>
  )
}

function getOwnedEquipmentRarityLabel(
  toolId: CraftableEquipmentId,
  ownedToolIds: readonly string[],
  equipmentVariants: EquipmentVariants,
) {
  if (!ownedToolIds.includes(toolId)) {
    return '미보유'
  }

  return EQUIPMENT_RARITIES[getEquipmentRarity(toolId, equipmentVariants)].name
}

function getMissingIngredients(
  ingredients: readonly Readonly<{
    item: InventoryItemKey
    amount: number
  }>[],
  inventory: Readonly<Record<InventoryItemKey, number>>,
) {
  const requiredAmounts = getRequiredIngredientAmounts(ingredients)

  return [...requiredAmounts].flatMap(([item, requiredAmount]) => {
    const missingAmount = requiredAmount - inventory[item]

    return missingAmount > 0
      ? [{ item, amount: missingAmount } as const]
      : []
  })
}

function getRequiredIngredientAmounts(
  ingredients: readonly Readonly<{
    item: InventoryItemKey
    amount: number
  }>[],
) {
  const requiredAmounts = new Map<InventoryItemKey, number>()

  ingredients.forEach((ingredient) => {
    requiredAmounts.set(
      ingredient.item,
      (requiredAmounts.get(ingredient.item) ?? 0) + ingredient.amount,
    )
  })

  return requiredAmounts
}

function getScaledIngredients(
  recipe: CraftingRecipe,
  rarity: EquipmentRarity,
) {
  const multiplier =
    recipe.outputKind === 'tool'
      ? EQUIPMENT_RARITIES[rarity].ingredientMultiplier
      : 1

  return recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    amount: Math.ceil(ingredient.amount * multiplier),
  }))
}

function getCraftingDisabledReason(
  isUnlocked: boolean,
  alreadyOwned: boolean,
  hasBlueprint: boolean,
  missingIngredients: readonly Readonly<{
    item: InventoryItemKey
    amount: number
  }>[],
) {
  if (!isUnlocked) {
    return '메뉴의 제작법 탭에서 먼저 해금해야 합니다.'
  }

  if (!hasBlueprint) {
    return '해당 등급의 장비 설계도가 필요합니다.'
  }

  if (alreadyOwned) {
    return '현재 장비보다 높은 등급만 제작할 수 있습니다.'
  }

  if (missingIngredients.length > 0) {
    return `부족한 재료: ${missingIngredients
      .map(
        ({ item, amount }) =>
          `${ITEM_DEFINITIONS[item].name} ${amount}`,
      )
      .join(', ')}`
  }

  return undefined
}
