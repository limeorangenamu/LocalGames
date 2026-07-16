import { useState } from 'react'
import {
  CRAFTING_RECIPES,
  CRAFTING_STATIONS,
} from '../game/data/crafting'
import { ITEM_DEFINITIONS } from '../game/data/items'
import { TOOL_DEFINITIONS } from '../game/data/equipment'
import type {
  CraftingRecipe,
  CraftingRecipeId,
} from '../game/types/crafting'
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
  const consumeInventoryItems = useGameStore(
    (state) => state.consumeInventoryItems,
  )
  const addInventoryItem = useGameStore((state) => state.addInventoryItem)
  const unlockTool = useGameStore((state) => state.unlockTool)
  const setOpen = useGameStore((state) => state.setCraftingWorkbenchOpen)
  const requestSave = useGameStore((state) => state.requestManualSave)
  const [message, setMessage] = useState(
    '해금한 제작법과 필요한 재료를 확인하세요.',
  )

  if (!isOpen || !activeStationId) {
    return null
  }

  const station = CRAFTING_STATIONS[activeStationId]
  const recipes = Object.values(CRAFTING_RECIPES).filter(
    (recipe) => recipe.requiredStationId === activeStationId,
  )

  const handleCraft = (recipeId: CraftingRecipeId) => {
    const recipe = CRAFTING_RECIPES[recipeId]

    if (!unlockedRecipeIds.includes(recipeId)) {
      setMessage(
        `${recipe.name} 제작법이 없습니다. 메뉴의 제작법 탭에서 먼저 해금하세요.`,
      )
      return
    }

    if (
      recipe.outputKind === 'tool' &&
      ownedToolIds.includes(recipe.outputToolId)
    ) {
      setMessage(`${recipe.name}은(는) 이미 보유하고 있습니다.`)
      return
    }

    const missingIngredients = getMissingIngredients(recipe, inventory)

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

    if (!consumeInventoryItems(recipe.ingredients)) {
      setMessage('재료 상태가 변경되어 제작하지 못했습니다. 다시 시도하세요.')
      return
    }

    if (recipe.outputKind === 'tool') {
      unlockTool(recipe.outputToolId)
    } else {
      addInventoryItem(recipe.output.item, recipe.output.amount)
    }

    setMessage(`${recipe.name}을(를) 제작해 인벤토리에 보관했습니다.`)
    requestSave()
  }

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
          {recipes.map((recipe) => {
            const isUnlocked = unlockedRecipeIds.includes(recipe.id)
            const alreadyOwned =
              recipe.outputKind === 'tool' &&
              ownedToolIds.includes(recipe.outputToolId)
            const missingIngredients = getMissingIngredients(
              recipe,
              inventory,
            )
            const canCraft =
              isUnlocked &&
              !alreadyOwned &&
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
                </div>

                <div className="workbench-recipe__ingredients">
                  {[...getRequiredIngredientAmounts(recipe)].map(
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
                    missingIngredients,
                  )}
                  onClick={() => handleCraft(recipe.id)}
                >
                  {!isUnlocked
                    ? '제작법 미해금'
                    : alreadyOwned
                      ? '이미 보유 중'
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
            새 제작법은 ESC 메뉴의 제작법 탭에서 기술 포인트로 해금합니다.
          </small>
        </footer>
      </div>
    </section>
  )
}

function getMissingIngredients(
  recipe: CraftingRecipe,
  inventory: Readonly<Record<InventoryItemKey, number>>,
) {
  const requiredAmounts = getRequiredIngredientAmounts(recipe)

  return [...requiredAmounts].flatMap(([item, requiredAmount]) => {
    const missingAmount = requiredAmount - inventory[item]

    return missingAmount > 0
      ? [{ item, amount: missingAmount } as const]
      : []
  })
}

function getRequiredIngredientAmounts(recipe: CraftingRecipe) {
  const requiredAmounts = new Map<InventoryItemKey, number>()

  recipe.ingredients.forEach((ingredient) => {
    requiredAmounts.set(
      ingredient.item,
      (requiredAmounts.get(ingredient.item) ?? 0) + ingredient.amount,
    )
  })

  return requiredAmounts
}

function getCraftingDisabledReason(
  isUnlocked: boolean,
  alreadyOwned: boolean,
  missingIngredients: readonly Readonly<{
    item: InventoryItemKey
    amount: number
  }>[],
) {
  if (!isUnlocked) {
    return '메뉴의 제작법 탭에서 먼저 해금해야 합니다.'
  }

  if (alreadyOwned) {
    return '이미 보유한 장비입니다.'
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
