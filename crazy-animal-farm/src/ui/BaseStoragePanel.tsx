import { ITEM_DEFINITIONS } from '../game/data/items'
import type { InventoryItemKey } from '../game/types/item'
import { useGameStore } from '../store/useGameStore'
import './baseStoragePanel.css'

export function BaseStoragePanel() {
  const isOpen = useGameStore((state) => state.isBaseStorageOpen)
  const baseStorage = useGameStore((state) => state.baseStorage)
  const inventory = useGameStore((state) => state.inventory)
  const setOpen = useGameStore((state) => state.setBaseStorageOpen)
  const transferItem = useGameStore(
    (state) => state.transferBaseItemToInventory,
  )
  const requestSave = useGameStore((state) => state.requestManualSave)

  if (!isOpen) {
    return null
  }

  const storedItems = Object.values(ITEM_DEFINITIONS).filter(
    (definition) => baseStorage[definition.id] > 0,
  )
  const slots = Array.from(
    { length: 16 },
    (_, index): InventoryItemKey | null => storedItems[index]?.id ?? null,
  )
  const takeItem = (itemId: InventoryItemKey, amount: number) => {
    if (transferItem(itemId, amount)) {
      requestSave()
    }
  }

  return (
    <section className="base-storage" aria-label="거점 코어 창고">
      <header>
        <div>
          <span>BASE STORAGE</span>
          <h2>거점 코어 창고</h2>
        </div>
        <button type="button" onClick={() => setOpen(false)}>닫기</button>
      </header>
      <div className="base-storage__grid">
        {slots.map((itemId, index) => (
          <div key={itemId ?? `empty-${index}`} className={itemId ? 'is-filled' : ''}>
            {itemId && (
              <>
                <strong>{ITEM_DEFINITIONS[itemId].name}</strong>
                <span>창고 {baseStorage[itemId]} · 소지 {inventory[itemId]}</span>
                <div>
                  <button type="button" onClick={() => takeItem(itemId, 1)}>
                    1개 꺼내기
                  </button>
                  <button
                    type="button"
                    onClick={() => takeItem(itemId, baseStorage[itemId])}
                  >
                    전부
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p>꺼낸 자원은 플레이어 인벤토리로 이동하여 제작에 사용할 수 있습니다.</p>
    </section>
  )
}
