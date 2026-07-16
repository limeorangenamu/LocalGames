import type {
  AnimalElementDefinition,
  AnimalElementId,
  AnimalSelfStatusEffectDefinition,
  AnimalSelfStatusEffectId,
  AnimalTargetStatusEffectDefinition,
  AnimalTargetStatusEffectId,
} from '../types/animal'

export const ANIMAL_ELEMENTS = {
  neutral: {
    id: 'neutral',
    name: '무속성',
    color: '#d8dfd3',
    strongAgainst: [],
  },
  flame: {
    id: 'flame',
    name: '화염',
    color: '#ff765c',
    strongAgainst: ['nature', 'frost'],
  },
  aqua: {
    id: 'aqua',
    name: '수류',
    color: '#63b9ff',
    strongAgainst: ['flame', 'earth'],
  },
  nature: {
    id: 'nature',
    name: '자연',
    color: '#78d884',
    strongAgainst: ['aqua', 'earth'],
  },
  electric: {
    id: 'electric',
    name: '전기',
    color: '#f5d95f',
    strongAgainst: ['aqua', 'air'],
  },
  frost: {
    id: 'frost',
    name: '빙결',
    color: '#9ee9ff',
    strongAgainst: ['nature', 'air'],
  },
  earth: {
    id: 'earth',
    name: '대지',
    color: '#c99b67',
    strongAgainst: ['electric', 'flame'],
  },
  air: {
    id: 'air',
    name: '바람',
    color: '#b8f0da',
    strongAgainst: ['earth', 'shadow'],
  },
  shadow: {
    id: 'shadow',
    name: '그림자',
    color: '#b58be8',
    strongAgainst: ['neutral', 'air'],
  },
} as const satisfies Readonly<
  Record<AnimalElementId, AnimalElementDefinition>
>

export const ANIMAL_TARGET_STATUS_EFFECTS = {
  burning: {
    id: 'burning',
    name: '화상',
    description: '움직임과 공격력이 조금 감소합니다.',
    moveSpeedMultiplier: 0.9,
    outgoingDamageMultiplier: 0.9,
  },
  soaked: {
    id: 'soaked',
    name: '젖음',
    description: '전기와 빙결 공격에 취약해질 기반 상태입니다.',
    moveSpeedMultiplier: 0.9,
    outgoingDamageMultiplier: 1,
  },
  rooted: {
    id: 'rooted',
    name: '속박',
    description: '이동 속도가 크게 감소합니다.',
    moveSpeedMultiplier: 0.35,
    outgoingDamageMultiplier: 1,
  },
  shocked: {
    id: 'shocked',
    name: '감전',
    description: '움직임과 공격력이 함께 감소합니다.',
    moveSpeedMultiplier: 0.7,
    outgoingDamageMultiplier: 0.82,
  },
  chilled: {
    id: 'chilled',
    name: '냉기',
    description: '이동 속도와 공격력이 감소합니다.',
    moveSpeedMultiplier: 0.62,
    outgoingDamageMultiplier: 0.9,
  },
  weakened: {
    id: 'weakened',
    name: '약화',
    description: '주는 피해가 감소합니다.',
    moveSpeedMultiplier: 0.9,
    outgoingDamageMultiplier: 0.7,
  },
} as const satisfies Readonly<
  Record<
    AnimalTargetStatusEffectId,
    AnimalTargetStatusEffectDefinition
  >
>

export const ANIMAL_SELF_STATUS_EFFECTS = {
  guarded: {
    id: 'guarded',
    name: '수호',
    description: '다음에 받는 피해를 크게 줄입니다.',
  },
  evasive: {
    id: 'evasive',
    name: '회피',
    description: '다음 공격을 한 번 완전히 피합니다.',
  },
  inspired: {
    id: 'inspired',
    name: '고양',
    description: '일정 시간 동안 주는 피해가 증가합니다.',
  },
} as const satisfies Readonly<
  Record<AnimalSelfStatusEffectId, AnimalSelfStatusEffectDefinition>
>

export function getElementEffectiveness(
  attackingElement: AnimalElementId,
  defendingElement: AnimalElementId,
) {
  if (
    (
      ANIMAL_ELEMENTS[attackingElement]
        .strongAgainst as readonly AnimalElementId[]
    ).includes(defendingElement)
  ) {
    return 1.35
  }

  if (
    (
      ANIMAL_ELEMENTS[defendingElement]
        .strongAgainst as readonly AnimalElementId[]
    ).includes(attackingElement)
  ) {
    return 0.72
  }

  if (
    attackingElement !== 'neutral' &&
    attackingElement === defendingElement
  ) {
    return 0.85
  }

  return 1
}

export function getElementEffectivenessLabel(multiplier: number) {
  if (multiplier > 1) {
    return '효과가 뛰어남'
  }

  if (multiplier < 1) {
    return '효과가 약함'
  }

  return '보통 효과'
}
