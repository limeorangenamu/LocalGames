import type {
  AnimalDefinition,
  CapturedAnimal,
  CompanionEquipmentDefinition,
  CompanionEquipmentId,
  PartnerSkillModifiers,
} from '../types/animal'

export const COMPANION_EQUIPMENT = {
  'rabbit-wind-harness': {
    id: 'rabbit-wind-harness',
    name: '토끼 바람 하네스',
    description: '토끼의 질풍 동행 능력을 활성화하는 전용 장비입니다.',
    animalDefinitionId: 'crazy-rabbit',
    inventoryItemId: 'rabbitWindHarness',
  },
  'sheep-guardian-bell': {
    id: 'sheep-guardian-bell',
    name: '양 수호 방울',
    description: '양의 포근한 수호 능력을 활성화하는 전용 장비입니다.',
    animalDefinitionId: 'woolly-sheep',
    inventoryItemId: 'sheepGuardianBell',
  },
  'boar-stone-armor': {
    id: 'boar-stone-armor',
    name: '멧돼지 암석 갑주',
    description: '멧돼지의 암반 돌진 능력을 활성화하는 전용 장비입니다.',
    animalDefinitionId: 'rock-boar',
    inventoryItemId: 'boarStoneArmor',
  },
} as const satisfies Readonly<
  Record<CompanionEquipmentId, CompanionEquipmentDefinition>
>

export function isCompanionEquipmentId(
  value: string,
): value is CompanionEquipmentId {
  return Object.prototype.hasOwnProperty.call(COMPANION_EQUIPMENT, value)
}

export function isPartnerSkillActive(
  capturedAnimal: CapturedAnimal,
  definition: AnimalDefinition,
) {
  return (
    capturedAnimal.partnerEquipmentId ===
    definition.partnerSkill.requiredEquipmentId
  )
}

export function getActivePartnerSkillModifiers(
  capturedAnimal: CapturedAnimal,
  definition: AnimalDefinition,
): PartnerSkillModifiers {
  return isPartnerSkillActive(capturedAnimal, definition)
    ? definition.partnerSkill.modifiers
    : {}
}
