import type {
  CraftingRecipe,
  CraftingRecipeId,
  CraftingStationId,
} from '../types/crafting'

export const CRAFTING_STATIONS: Readonly<
  Record<
    CraftingStationId,
    Readonly<{
      id: CraftingStationId
      name: string
      description: string
    }>
  >
> = {
  'primitive-workbench': {
    id: 'primitive-workbench',
    name: '원시 제작 작업대',
    description: '기초 도구, 장비와 간단한 음식을 제작하는 작업대입니다.',
  },
}

export const CRAFTING_RECIPES: Readonly<
  Record<CraftingRecipeId, CraftingRecipe>
> = {
  'stone-axe': {
    id: 'stone-axe',
    name: '돌도끼',
    description: '채집 속도와 자원 피해량을 높여 주는 기초 벌목 도구입니다.',
    category: 'tool',
    unlockLevel: 1,
    technologyPointCost: 1,
    requiredStationId: 'primitive-workbench',
    outputKind: 'tool',
    outputToolId: 'stone-axe',
    ingredients: [
      { item: 'wood', amount: 5 },
      { item: 'stone', amount: 4 },
      { item: 'rabbitFur', amount: 1 },
    ],
  },
  'reinforced-logging-axe': {
    id: 'reinforced-logging-axe',
    name: '강화 벌목도끼',
    description: '벌목 작업에 특화된 상위 등급 도구입니다.',
    category: 'tool',
    unlockLevel: 2,
    technologyPointCost: 2,
    requiredStationId: 'primitive-workbench',
    outputKind: 'tool',
    outputToolId: 'reinforced-logging-axe',
    prerequisiteRecipeId: 'stone-axe',
    ingredients: [
      { item: 'wood', amount: 15 },
      { item: 'stone', amount: 10 },
      { item: 'rabbitFur', amount: 4 },
    ],
  },
  'roasted-rabbit-meat': {
    id: 'roasted-rabbit-meat',
    name: '구운 토끼 고기',
    description: '허기를 크게 회복하는 간단한 조리 음식입니다.',
    category: 'food',
    unlockLevel: 1,
    technologyPointCost: 1,
    requiredStationId: 'primitive-workbench',
    outputKind: 'item',
    ingredients: [
      { item: 'rabbitMeat', amount: 1 },
      { item: 'wood', amount: 1 },
    ],
    output: { item: 'roastedRabbitMeat', amount: 1 },
  },
  'wooden-shield': {
    id: 'wooden-shield',
    name: '연습용 나무 쉴드',
    description: '피해를 먼저 흡수하고 전투가 끝나면 자동 회복되는 방어 장비입니다.',
    category: 'equipment',
    unlockLevel: 1,
    technologyPointCost: 1,
    requiredStationId: 'primitive-workbench',
    outputKind: 'tool',
    outputToolId: 'wooden-shield',
    ingredients: [
      { item: 'wood', amount: 12 },
      { item: 'stone', amount: 3 },
      { item: 'rabbitFur', amount: 2 },
    ],
  },
  'capture-capsule-pack': {
    id: 'capture-capsule-pack',
    name: '수상한 포획 캡슐 묶음',
    description: '식물 섬유와 구리 광석으로 포획 캡슐 3개를 제작합니다.',
    category: 'tool',
    unlockLevel: 1,
    technologyPointCost: 1,
    requiredStationId: 'primitive-workbench',
    outputKind: 'item',
    ingredients: [
      { item: 'plantFiber', amount: 4 },
      { item: 'copperOre', amount: 1 },
      { item: 'stone', amount: 2 },
    ],
    output: { item: 'captureCapsule', amount: 3 },
  },
  'copper-pickaxe': {
    id: 'copper-pickaxe',
    name: '구리 곡괭이',
    description: '단단한 광석을 효율적으로 채집하기 위한 기초 채광 도구입니다.',
    category: 'tool',
    unlockLevel: 2,
    technologyPointCost: 2,
    requiredStationId: 'primitive-workbench',
    outputKind: 'tool',
    outputToolId: 'copper-pickaxe',
    prerequisiteRecipeId: 'stone-axe',
    ingredients: [
      { item: 'wood', amount: 6 },
      { item: 'copperOre', amount: 8 },
      { item: 'boarHide', amount: 1 },
    ],
  },
  'roasted-boar-meat': {
    id: 'roasted-boar-meat',
    name: '열매 소스 멧돼지 구이',
    description: '멧돼지 고기와 들판 열매를 함께 구운 든든한 음식입니다.',
    category: 'food',
    unlockLevel: 2,
    technologyPointCost: 1,
    requiredStationId: 'primitive-workbench',
    outputKind: 'item',
    ingredients: [
      { item: 'boarMeat', amount: 1 },
      { item: 'wildBerry', amount: 2 },
      { item: 'wood', amount: 1 },
    ],
    output: { item: 'roastedBoarMeat', amount: 1 },
  },
  'wool-cloak': {
    id: 'wool-cloak',
    name: '들판 양털 망토',
    description: '양털과 질긴 가죽으로 만든 초보 탐험가용 망토입니다.',
    category: 'equipment',
    unlockLevel: 2,
    technologyPointCost: 2,
    requiredStationId: 'primitive-workbench',
    outputKind: 'tool',
    outputToolId: 'wool-cloak',
    prerequisiteRecipeId: 'wooden-shield',
    ingredients: [
      { item: 'sheepWool', amount: 8 },
      { item: 'boarHide', amount: 3 },
      { item: 'plantFiber', amount: 6 },
    ],
  },
  'rabbit-wind-harness': {
    id: 'rabbit-wind-harness',
    name: '토끼 바람 하네스',
    description: '미친 토끼의 동반자 능력인 질풍 동행을 활성화합니다.',
    category: 'equipment',
    unlockLevel: 3,
    technologyPointCost: 2,
    requiredStationId: 'primitive-workbench',
    outputKind: 'item',
    prerequisiteRecipeId: 'reinforced-logging-axe',
    ingredients: [
      { item: 'rabbitFur', amount: 6 },
      { item: 'plantFiber', amount: 8 },
      { item: 'copperOre', amount: 3 },
    ],
    output: { item: 'rabbitWindHarness', amount: 1 },
  },
  'sheep-guardian-bell': {
    id: 'sheep-guardian-bell',
    name: '양 수호 방울',
    description: '몽실 들양의 동반자 능력인 포근한 수호를 활성화합니다.',
    category: 'equipment',
    unlockLevel: 3,
    technologyPointCost: 2,
    requiredStationId: 'primitive-workbench',
    outputKind: 'item',
    prerequisiteRecipeId: 'wool-cloak',
    ingredients: [
      { item: 'sheepWool', amount: 10 },
      { item: 'copperOre', amount: 4 },
      { item: 'plantFiber', amount: 5 },
    ],
    output: { item: 'sheepGuardianBell', amount: 1 },
  },
  'boar-stone-armor': {
    id: 'boar-stone-armor',
    name: '멧돼지 암석 갑주',
    description: '돌진 멧돼지의 동반자 능력인 암반 돌진을 활성화합니다.',
    category: 'equipment',
    unlockLevel: 3,
    technologyPointCost: 2,
    requiredStationId: 'primitive-workbench',
    outputKind: 'item',
    prerequisiteRecipeId: 'copper-pickaxe',
    ingredients: [
      { item: 'boarHide', amount: 8 },
      { item: 'stone', amount: 14 },
      { item: 'copperOre', amount: 6 },
    ],
    output: { item: 'boarStoneArmor', amount: 1 },
  },
}
