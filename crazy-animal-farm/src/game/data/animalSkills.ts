import type {
  AnimalActiveSkillDefinition,
  AnimalActiveSkillId,
} from '../types/animal'

export const ANIMAL_ACTIVE_SKILLS = {
  'quick-strike': {
    id: 'quick-strike',
    name: '재빠른 일격',
    description: '빠른 바람 공격으로 대상을 일정 확률로 약화합니다.',
    unlockLevel: 1,
    element: 'air',
    powerMultiplier: 0.9,
    cooldownMs: 1_600,
    targetStatusEffect: {
      id: 'weakened',
      chance: 0.28,
      durationMs: 2_400,
    },
  },
  'guard-call': {
    id: 'guard-call',
    name: '수호의 외침',
    description: '짧은 충격을 주고 다음에 받는 피해를 크게 줄입니다.',
    unlockLevel: 3,
    element: 'neutral',
    powerMultiplier: 0.45,
    cooldownMs: 5_500,
    selfStatusEffect: {
      id: 'guarded',
      durationMs: 4_000,
    },
  },
  'power-charge': {
    id: 'power-charge',
    name: '힘 모으기',
    description: '대지의 힘으로 강하게 돌진하여 대상을 확실히 약화합니다.',
    unlockLevel: 5,
    element: 'earth',
    powerMultiplier: 1.7,
    cooldownMs: 5_200,
    targetStatusEffect: {
      id: 'weakened',
      chance: 1,
      durationMs: 4_000,
    },
  },
  'evasive-step': {
    id: 'evasive-step',
    name: '회피 발놀림',
    description: '바람처럼 스쳐 공격하고 다음 공격을 한 번 피합니다.',
    unlockLevel: 7,
    element: 'air',
    powerMultiplier: 0.75,
    cooldownMs: 4_200,
    selfStatusEffect: {
      id: 'evasive',
      durationMs: 4_500,
    },
  },
  'work-chant': {
    id: 'work-chant',
    name: '일손 북돋우기',
    description: '자연의 힘으로 공격하고 체력을 회복하며 공격력을 높입니다.',
    unlockLevel: 9,
    element: 'nature',
    powerMultiplier: 0.6,
    cooldownMs: 6_800,
    targetStatusEffect: {
      id: 'rooted',
      chance: 0.7,
      durationMs: 2_600,
    },
    selfStatusEffect: {
      id: 'inspired',
      durationMs: 5_000,
    },
    healRatio: 0.12,
  },
} as const satisfies Readonly<
  Record<AnimalActiveSkillId, AnimalActiveSkillDefinition>
>

export const ANIMAL_ACTIVE_SKILL_IDS = Object.keys(
  ANIMAL_ACTIVE_SKILLS,
) as AnimalActiveSkillId[]
