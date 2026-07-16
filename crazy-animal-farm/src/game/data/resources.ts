import {
  BERRY_BUSH_TEXTURE_KEY,
  COPPER_DEPOSIT_TEXTURE_KEY,
  FIBER_PLANT_TEXTURE_KEY,
  STONE_TEXTURE_KEY,
  TREE_TEXTURE_KEY,
} from '../config/gameConstants'
import type {
  ResourceDefinition,
  ResourceDefinitionId,
} from '../types/resource'

export const RESOURCE_DEFINITIONS: Readonly<
  Record<ResourceDefinitionId, ResourceDefinition>
> = {
  tree: {
    id: 'tree',
    name: '나무',
    textureKey: TREE_TEXTURE_KEY,
    width: 72,
    height: 96,
    maxHp: 30,
    respawnDelayMs: 60_000,
    drop: { item: 'wood', amount: 5 },
    collision: { width: 36, height: 34, offsetX: 18, offsetY: 58 },
  },
  stone: {
    id: 'stone',
    name: '돌',
    textureKey: STONE_TEXTURE_KEY,
    width: 64,
    height: 64,
    maxHp: 45,
    respawnDelayMs: 90_000,
    drop: { item: 'stone', amount: 4 },
    collision: { width: 52, height: 40, offsetX: 6, offsetY: 20 },
  },
  'fiber-plant': {
    id: 'fiber-plant',
    name: '질긴 풀 군락',
    textureKey: FIBER_PLANT_TEXTURE_KEY,
    width: 56,
    height: 58,
    maxHp: 18,
    respawnDelayMs: 45_000,
    drop: { item: 'plantFiber', amount: 4 },
    collision: { width: 34, height: 22, offsetX: 11, offsetY: 32 },
  },
  'berry-bush': {
    id: 'berry-bush',
    name: '들판 열매 덤불',
    textureKey: BERRY_BUSH_TEXTURE_KEY,
    width: 68,
    height: 58,
    maxHp: 22,
    respawnDelayMs: 70_000,
    drop: { item: 'wildBerry', amount: 4 },
    collision: { width: 48, height: 26, offsetX: 10, offsetY: 28 },
  },
  'copper-deposit': {
    id: 'copper-deposit',
    name: '구리 광맥',
    textureKey: COPPER_DEPOSIT_TEXTURE_KEY,
    width: 72,
    height: 66,
    maxHp: 65,
    respawnDelayMs: 120_000,
    drop: { item: 'copperOre', amount: 5 },
    collision: { width: 58, height: 42, offsetX: 7, offsetY: 20 },
  },
}
