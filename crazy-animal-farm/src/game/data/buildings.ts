import {
  BASE_BUILD_RADIUS,
  BASE_CORE_TEXTURE_KEY,
  LOGGING_STATION_TEXTURE_KEY,
  PRIMITIVE_WORKBENCH_TEXTURE_KEY,
} from '../config/gameConstants'
import type {
  BuildingDefinition,
  BuildingDefinitionId,
} from '../types/building'

export const BUILDING_DEFINITIONS: Readonly<
  Record<BuildingDefinitionId, BuildingDefinition>
> = {
  'base-core': {
    id: 'base-core',
    name: '거점 코어',
    textureKey: BASE_CORE_TEXTURE_KEY,
    width: 96,
    height: 96,
    maximumInstances: 1,
    requiresBaseRange: false,
    baseRadius: BASE_BUILD_RADIUS,
  },
  'logging-station': {
    id: 'logging-station',
    name: '벌목 작업대',
    textureKey: LOGGING_STATION_TEXTURE_KEY,
    width: 128,
    height: 80,
    maximumInstances: 4,
    requiresBaseRange: true,
    work: {
      requiredSkill: 'logging',
      slots: 1,
      intervalMs: 5_000,
      output: { item: 'wood', amount: 1 },
      accessOffset: { x: 0, y: 72 },
    },
  },
  'primitive-workbench': {
    id: 'primitive-workbench',
    name: '원시 제작 작업대',
    textureKey: PRIMITIVE_WORKBENCH_TEXTURE_KEY,
    width: 112,
    height: 72,
    maximumInstances: 2,
    requiresBaseRange: true,
    craftingStationId: 'primitive-workbench',
  },
}
