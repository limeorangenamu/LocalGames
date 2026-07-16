import type {
  InventoryItemKey,
  ItemDefinition,
} from '../types/item'

export const ITEM_DEFINITIONS: Readonly<
  Record<InventoryItemKey, ItemDefinition>
> = {
  wood: {
    id: 'wood',
    name: '목재',
    category: 'material',
    maxStack: 999,
  },
  stone: {
    id: 'stone',
    name: '돌',
    category: 'material',
    maxStack: 999,
  },
  rabbitMeat: {
    id: 'rabbitMeat',
    name: '토끼 고기',
    category: 'foodIngredient',
    maxStack: 99,
    hungerRestore: 8,
    animalFeedValue: 4,
  },
  roastedRabbitMeat: {
    id: 'roastedRabbitMeat',
    name: '구운 토끼 고기',
    category: 'food',
    maxStack: 99,
    hungerRestore: 30,
  },
  rabbitFur: {
    id: 'rabbitFur',
    name: '토끼 털',
    category: 'material',
    maxStack: 99,
  },
  plantFiber: {
    id: 'plantFiber',
    name: '질긴 식물 섬유',
    category: 'material',
    maxStack: 999,
  },
  copperOre: {
    id: 'copperOre',
    name: '구리 광석',
    category: 'material',
    maxStack: 999,
  },
  wildBerry: {
    id: 'wildBerry',
    name: '들판 열매',
    category: 'food',
    maxStack: 99,
    hungerRestore: 12,
    animalFeedValue: 8,
  },
  sheepWool: {
    id: 'sheepWool',
    name: '폭신한 양털',
    category: 'material',
    maxStack: 99,
  },
  boarHide: {
    id: 'boarHide',
    name: '멧돼지 가죽',
    category: 'material',
    maxStack: 99,
  },
  boarMeat: {
    id: 'boarMeat',
    name: '멧돼지 고기',
    category: 'foodIngredient',
    maxStack: 99,
    hungerRestore: 10,
    animalFeedValue: 5,
  },
  roastedBoarMeat: {
    id: 'roastedBoarMeat',
    name: '열매 소스 멧돼지 구이',
    category: 'food',
    maxStack: 99,
    hungerRestore: 45,
  },
  captureCapsule: {
    id: 'captureCapsule',
    name: '수상한 포획 캡슐',
    category: 'captureTool',
    maxStack: 99,
    captureBonus: 0.12,
  },
  rabbitWindHarness: {
    id: 'rabbitWindHarness',
    name: '토끼 바람 하네스',
    category: 'companionEquipment',
    maxStack: 99,
  },
  sheepGuardianBell: {
    id: 'sheepGuardianBell',
    name: '양 수호 방울',
    category: 'companionEquipment',
    maxStack: 99,
  },
  boarStoneArmor: {
    id: 'boarStoneArmor',
    name: '멧돼지 암석 갑주',
    category: 'companionEquipment',
    maxStack: 99,
  },
}

export const INITIAL_INVENTORY: Record<InventoryItemKey, number> = {
  wood: 0,
  stone: 0,
  rabbitMeat: 0,
  roastedRabbitMeat: 0,
  rabbitFur: 0,
  plantFiber: 0,
  copperOre: 0,
  wildBerry: 0,
  sheepWool: 0,
  boarHide: 0,
  boarMeat: 0,
  roastedBoarMeat: 0,
  captureCapsule: 5,
  rabbitWindHarness: 0,
  sheepGuardianBell: 0,
  boarStoneArmor: 0,
}

export function createEmptyItemStorage(): Record<InventoryItemKey, number> {
  return {
    wood: 0,
    stone: 0,
    rabbitMeat: 0,
    roastedRabbitMeat: 0,
    rabbitFur: 0,
    plantFiber: 0,
    copperOre: 0,
    wildBerry: 0,
    sheepWool: 0,
    boarHide: 0,
    boarMeat: 0,
    roastedBoarMeat: 0,
    captureCapsule: 0,
    rabbitWindHarness: 0,
    sheepGuardianBell: 0,
    boarStoneArmor: 0,
  }
}
