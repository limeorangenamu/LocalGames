import type {
  AnimalPassiveTraitDefinition,
  AnimalPassiveTraitId,
} from '../types/animal'

export const ANIMAL_PASSIVE_TRAITS = {
  hearty: {
    id: 'hearty',
    name: '튼튼한 심장',
    description: '최대 체력이 12% 증가합니다.',
    tone: 'positive',
    statModifiers: { maxHp: 0.12 },
  },
  ferocious: {
    id: 'ferocious',
    name: '사나운',
    description: '공격력이 12% 증가합니다.',
    tone: 'positive',
    statModifiers: { attack: 0.12 },
  },
  stalwart: {
    id: 'stalwart',
    name: '굳건한',
    description: '방어력이 12% 증가합니다.',
    tone: 'positive',
    statModifiers: { defense: 0.12 },
  },
  diligent: {
    id: 'diligent',
    name: '부지런한',
    description: '작업 속도가 15% 증가합니다.',
    tone: 'positive',
    statModifiers: { workSpeed: 0.15 },
  },
  'fleet-footed': {
    id: 'fleet-footed',
    name: '날랜 발',
    description: '이동 속도가 10% 증가합니다.',
    tone: 'positive',
    statModifiers: { moveSpeed: 0.1 },
  },
  timid: {
    id: 'timid',
    name: '신중한',
    description: '공격력이 8% 감소하지만 방어력이 8% 증가합니다.',
    tone: 'mixed',
    statModifiers: { attack: -0.08, defense: 0.08 },
  },
  lazy: {
    id: 'lazy',
    name: '느긋한',
    description: '작업 속도가 12% 감소하지만 최대 체력이 6% 증가합니다.',
    tone: 'mixed',
    statModifiers: { workSpeed: -0.12, maxHp: 0.06 },
  },
  fragile: {
    id: 'fragile',
    name: '가벼운 몸',
    description: '방어력이 12% 감소하지만 이동 속도가 8% 증가합니다.',
    tone: 'mixed',
    statModifiers: { defense: -0.12, moveSpeed: 0.08 },
  },
} as const satisfies Readonly<
  Record<AnimalPassiveTraitId, AnimalPassiveTraitDefinition>
>

export const ANIMAL_PASSIVE_TRAIT_IDS = Object.keys(
  ANIMAL_PASSIVE_TRAITS,
) as AnimalPassiveTraitId[]
