import type { AnimalSpawnPoint } from '../types/animal'
import type {
  BuildForbiddenArea,
  MapDefinition,
  MapExitDefinition,
  MapId,
  ObstacleDefinition,
} from '../types/map'
import type { ResourceSpawnPoint } from '../types/resource'

const MAP_WIDTH = 2560
const MAP_HEIGHT = 1920
const CENTER_X = MAP_WIDTH / 2
const CENTER_Y = MAP_HEIGHT / 2

export const DEFAULT_MAP_ID: MapId = 'meadow'

export const MEADOW_MAP = {
  id: 'meadow',
  name: '중앙 초원',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  backgroundColor: 0x2f7246,
  gridColor: 0x8fcf78,
  playerSpawn: { x: CENTER_X, y: CENTER_Y },
  entryPoints: {
    default: { x: CENTER_X, y: CENTER_Y },
    'from-sunlit-plains': { x: 230, y: CENTER_Y },
    'from-whispering-grove': { x: CENTER_X, y: 230 },
    'from-clover-fields': { x: CENTER_X, y: MAP_HEIGHT - 230 },
  },
  exits: [
    exit(
      'meadow-west-exit',
      '햇살 들판',
      64,
      CENTER_Y,
      128,
      256,
      'sunlit-plains',
      'from-meadow',
    ),
    exit(
      'meadow-north-exit',
      '속삭임 초원',
      CENTER_X,
      64,
      256,
      128,
      'whispering-grove',
      'from-meadow',
    ),
    exit(
      'meadow-south-exit',
      '클로버 들판',
      CENTER_X,
      MAP_HEIGHT - 64,
      256,
      128,
      'clover-fields',
      'from-meadow',
    ),
  ],
  obstacles: [
    obstacle('tree-west-1', 340, 420, 120, 150, 0x245b35),
    obstacle('tree-west-2', 540, 720, 105, 135, 0x2a663c),
    obstacle('rock-north-1', 980, 360, 150, 100, 0x66736c),
    obstacle('tree-north-1', 1420, 330, 115, 150, 0x235934),
    obstacle('rock-east-1', 2100, 620, 170, 120, 0x707c74),
    obstacle('tree-east-1', 2240, 1220, 125, 155, 0x28633a),
    obstacle('rock-south-1', 1630, 1540, 180, 110, 0x5d6a63),
    obstacle('tree-south-1', 860, 1510, 115, 150, 0x215732),
    obstacle('hedge-center-1', 1110, 760, 220, 70, 0x367b43),
    obstacle('hedge-center-2', 1510, 1160, 220, 70, 0x367b43),
  ],
  resourceSpawns: [
    resource('tree-1', 'tree', 1370, 865),
    resource('tree-2', 'tree', 1125, 1060),
    resource('tree-3', 'tree', 760, 560),
    resource('tree-4', 'tree', 1880, 420),
    resource('tree-5', 'tree', 2050, 1450),
    resource('tree-6', 'tree', 520, 1320),
    resource('stone-1', 'stone', 1450, 1035),
    resource('stone-2', 'stone', 1040, 885),
    resource('stone-3', 'stone', 330, 1050),
    resource('stone-4', 'stone', 1760, 760),
    resource('stone-5', 'stone', 2220, 1620),
    resource('stone-6', 'stone', 1160, 1580),
    resource('meadow-fiber-1', 'fiber-plant', 820, 1180),
    resource('meadow-fiber-2', 'fiber-plant', 1710, 1310),
    resource('meadow-berry-1', 'berry-bush', 1980, 920),
  ],
  animalSpawns: [
    animal('rabbit-1', 'crazy-rabbit', 1580, 850),
    animal('rabbit-2', 'crazy-rabbit', 1260, 1320),
    animal('rabbit-3', 'crazy-rabbit', 690, 980),
    animal('rabbit-4', 'crazy-rabbit', 1910, 1250),
    animal('meadow-sheep-1', 'woolly-sheep', 910, 1280),
    animal('meadow-sheep-2', 'woolly-sheep', 1840, 610),
  ],
  buildForbiddenAreas: [
    forbidden('meadow-center', CENTER_X, CENTER_Y, 320, 256),
    forbidden('meadow-west-exit', 64, CENTER_Y, 224, 352),
    forbidden('meadow-north-exit', CENTER_X, 64, 352, 224),
    forbidden(
      'meadow-south-exit',
      CENTER_X,
      MAP_HEIGHT - 64,
      352,
      224,
    ),
  ],
} satisfies MapDefinition

export const SUNLIT_PLAINS_MAP = {
  id: 'sunlit-plains',
  name: '햇살 들판',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  backgroundColor: 0x5d984c,
  gridColor: 0xc8e879,
  playerSpawn: { x: MAP_WIDTH - 230, y: CENTER_Y },
  entryPoints: {
    default: { x: MAP_WIDTH - 230, y: CENTER_Y },
    'from-meadow': { x: MAP_WIDTH - 230, y: CENTER_Y },
  },
  exits: [
    exit(
      'sunlit-east-exit',
      '중앙 초원',
      MAP_WIDTH - 64,
      CENTER_Y,
      128,
      256,
      'meadow',
      'from-sunlit-plains',
    ),
  ],
  obstacles: [
    obstacle('sunlit-grove-1', 410, 420, 220, 130, 0x3f7c3e),
    obstacle('sunlit-grove-2', 820, 1490, 260, 120, 0x477f3f),
    obstacle('sunlit-boulder-1', 1480, 390, 160, 100, 0x78806a),
    obstacle('sunlit-boulder-2', 1820, 1430, 180, 105, 0x6e7864),
    obstacle('sunlit-hedge-1', 1180, 720, 300, 68, 0x4f9444),
    obstacle('sunlit-hedge-2', 1510, 1180, 310, 68, 0x4f9444),
  ],
  resourceSpawns: [
    resource('sunlit-tree-1', 'tree', 430, 720),
    resource('sunlit-tree-2', 'tree', 760, 360),
    resource('sunlit-tree-3', 'tree', 1160, 1480),
    resource('sunlit-tree-4', 'tree', 1940, 530),
    resource('sunlit-fiber-1', 'fiber-plant', 620, 1080),
    resource('sunlit-fiber-2', 'fiber-plant', 980, 880),
    resource('sunlit-fiber-3', 'fiber-plant', 1370, 1030),
    resource('sunlit-fiber-4', 'fiber-plant', 1850, 1180),
    resource('sunlit-berry-1', 'berry-bush', 860, 1250),
    resource('sunlit-berry-2', 'berry-bush', 1550, 620),
    resource('sunlit-berry-3', 'berry-bush', 2100, 1320),
    resource('sunlit-stone-1', 'stone', 1280, 520),
  ],
  animalSpawns: [
    animal('sunlit-rabbit-1', 'crazy-rabbit', 740, 850),
    animal('sunlit-rabbit-2', 'crazy-rabbit', 1660, 840),
    animal('sunlit-sheep-1', 'woolly-sheep', 1030, 1190),
    animal('sunlit-sheep-2', 'woolly-sheep', 1950, 1060),
    animal('sunlit-sheep-3', 'woolly-sheep', 520, 1420),
  ],
  buildForbiddenAreas: [
    forbidden(
      'sunlit-east-exit',
      MAP_WIDTH - 64,
      CENTER_Y,
      224,
      352,
    ),
  ],
} satisfies MapDefinition

export const WHISPERING_GROVE_MAP = {
  id: 'whispering-grove',
  name: '속삭임 초원',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  backgroundColor: 0x275f45,
  gridColor: 0x70b879,
  playerSpawn: { x: CENTER_X, y: MAP_HEIGHT - 230 },
  entryPoints: {
    default: { x: CENTER_X, y: MAP_HEIGHT - 230 },
    'from-meadow': { x: CENTER_X, y: MAP_HEIGHT - 230 },
  },
  exits: [
    exit(
      'grove-south-exit',
      '중앙 초원',
      CENTER_X,
      MAP_HEIGHT - 64,
      256,
      128,
      'meadow',
      'from-whispering-grove',
    ),
  ],
  obstacles: [
    obstacle('grove-wall-west', 420, 850, 200, 620, 0x194c34),
    obstacle('grove-wall-east', 2140, 920, 220, 660, 0x194b34),
    obstacle('grove-north-1', 880, 330, 280, 150, 0x1c5136),
    obstacle('grove-north-2', 1640, 310, 300, 150, 0x1c5136),
    obstacle('grove-stone-1', 1080, 970, 170, 105, 0x566b61),
    obstacle('grove-stone-2', 1580, 1220, 180, 110, 0x52675d),
  ],
  resourceSpawns: [
    resource('grove-tree-1', 'tree', 650, 520),
    resource('grove-tree-2', 'tree', 980, 620),
    resource('grove-tree-3', 'tree', 1420, 520),
    resource('grove-tree-4', 'tree', 1880, 590),
    resource('grove-tree-5', 'tree', 760, 1350),
    resource('grove-tree-6', 'tree', 1840, 1410),
    resource('grove-fiber-1', 'fiber-plant', 1120, 1180),
    resource('grove-fiber-2', 'fiber-plant', 1500, 820),
    resource('grove-berry-1', 'berry-bush', 920, 940),
    resource('grove-berry-2', 'berry-bush', 1690, 1060),
    resource('grove-stone-1', 'stone', 1280, 730),
  ],
  animalSpawns: [
    animal('grove-rabbit-1', 'crazy-rabbit', 900, 1120),
    animal('grove-sheep-1', 'woolly-sheep', 1420, 1380),
    animal('grove-sheep-2', 'woolly-sheep', 1760, 760),
    animal('grove-boar-1', 'rock-boar', 1180, 540),
  ],
  buildForbiddenAreas: [
    forbidden(
      'grove-south-exit',
      CENTER_X,
      MAP_HEIGHT - 64,
      352,
      224,
    ),
  ],
} satisfies MapDefinition

export const CLOVER_FIELDS_MAP = {
  id: 'clover-fields',
  name: '클로버 들판',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  backgroundColor: 0x3f8341,
  gridColor: 0xa8d86d,
  playerSpawn: { x: CENTER_X, y: 230 },
  entryPoints: {
    default: { x: CENTER_X, y: 230 },
    'from-meadow': { x: CENTER_X, y: 230 },
    'from-riverbank-meadow': { x: MAP_WIDTH - 230, y: CENTER_Y },
  },
  exits: [
    exit(
      'clover-north-exit',
      '중앙 초원',
      CENTER_X,
      64,
      256,
      128,
      'meadow',
      'from-clover-fields',
    ),
    exit(
      'clover-east-exit',
      '강변 초원',
      MAP_WIDTH - 64,
      CENTER_Y,
      128,
      256,
      'riverbank-meadow',
      'from-clover-fields',
    ),
  ],
  obstacles: [
    obstacle('clover-tree-1', 460, 440, 170, 180, 0x28653a),
    obstacle('clover-tree-2', 2090, 1460, 180, 185, 0x28653a),
    obstacle('clover-rock-1', 520, 1390, 200, 120, 0x66726a),
    obstacle('clover-rock-2', 1940, 510, 190, 115, 0x66726a),
    obstacle('clover-hedge-1', 940, 810, 280, 65, 0x3b8a42),
    obstacle('clover-hedge-2', 1510, 1210, 300, 65, 0x3b8a42),
  ],
  resourceSpawns: [
    resource('clover-tree-1', 'tree', 620, 760),
    resource('clover-tree-2', 'tree', 1760, 1450),
    resource('clover-stone-1', 'stone', 430, 1050),
    resource('clover-stone-2', 'stone', 1980, 760),
    resource('clover-fiber-1', 'fiber-plant', 830, 1180),
    resource('clover-fiber-2', 'fiber-plant', 1120, 650),
    resource('clover-fiber-3', 'fiber-plant', 1460, 970),
    resource('clover-fiber-4', 'fiber-plant', 1870, 1180),
    resource('clover-berry-1', 'berry-bush', 720, 1480),
    resource('clover-berry-2', 'berry-bush', 1320, 1370),
    resource('clover-berry-3', 'berry-bush', 1680, 620),
  ],
  animalSpawns: [
    animal('clover-rabbit-1', 'crazy-rabbit', 710, 930),
    animal('clover-rabbit-2', 'crazy-rabbit', 1730, 980),
    animal('clover-sheep-1', 'woolly-sheep', 1030, 1320),
    animal('clover-sheep-2', 'woolly-sheep', 1510, 540),
    animal('clover-sheep-3', 'woolly-sheep', 2050, 1280),
  ],
  buildForbiddenAreas: [
    forbidden('clover-north-exit', CENTER_X, 64, 352, 224),
    forbidden(
      'clover-east-exit',
      MAP_WIDTH - 64,
      CENTER_Y,
      224,
      352,
    ),
  ],
} satisfies MapDefinition

export const RIVERBANK_MEADOW_MAP = {
  id: 'riverbank-meadow',
  name: '강변 초원',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  backgroundColor: 0x397b58,
  gridColor: 0x8bd2a1,
  playerSpawn: { x: 230, y: CENTER_Y },
  entryPoints: {
    default: { x: 230, y: CENTER_Y },
    'from-clover-fields': { x: 230, y: CENTER_Y },
    'from-rock-canyon': { x: MAP_WIDTH - 230, y: CENTER_Y },
  },
  exits: [
    exit(
      'river-west-exit',
      '클로버 들판',
      64,
      CENTER_Y,
      128,
      256,
      'clover-fields',
      'from-riverbank-meadow',
    ),
    exit(
      'river-east-exit',
      '바위 협곡',
      MAP_WIDTH - 64,
      CENTER_Y,
      128,
      256,
      'rock-canyon',
      'from-riverbank-meadow',
    ),
  ],
  obstacles: [
    obstacle('river-bank-north', 1280, 300, 1500, 150, 0x327080),
    obstacle('river-bank-south', 1280, 1620, 1480, 150, 0x327080),
    obstacle('river-tree-1', 630, 610, 170, 180, 0x225f40),
    obstacle('river-tree-2', 1880, 1320, 170, 180, 0x225f40),
    obstacle('river-rock-1', 1120, 680, 180, 115, 0x65746f),
    obstacle('river-rock-2', 1550, 1240, 190, 120, 0x65746f),
  ],
  resourceSpawns: [
    resource('river-tree-1', 'tree', 520, 1170),
    resource('river-tree-2', 'tree', 870, 520),
    resource('river-tree-3', 'tree', 1910, 620),
    resource('river-stone-1', 'stone', 950, 1320),
    resource('river-stone-2', 'stone', 1750, 980),
    resource('river-fiber-1', 'fiber-plant', 720, 900),
    resource('river-fiber-2', 'fiber-plant', 1350, 780),
    resource('river-berry-1', 'berry-bush', 1230, 1320),
    resource('river-berry-2', 'berry-bush', 2040, 1120),
    resource('river-copper-1', 'copper-deposit', 1480, 570),
    resource('river-copper-2', 'copper-deposit', 2180, 760),
  ],
  animalSpawns: [
    animal('river-rabbit-1', 'crazy-rabbit', 830, 1080),
    animal('river-sheep-1', 'woolly-sheep', 1130, 880),
    animal('river-sheep-2', 'woolly-sheep', 1860, 1080),
    animal('river-boar-1', 'rock-boar', 1570, 1380),
    animal('river-boar-2', 'rock-boar', 2180, 1280),
  ],
  buildForbiddenAreas: [
    forbidden('river-west-exit', 64, CENTER_Y, 224, 352),
    forbidden(
      'river-east-exit',
      MAP_WIDTH - 64,
      CENTER_Y,
      224,
      352,
    ),
    forbidden('river-water-north', CENTER_X, 300, 1600, 210),
    forbidden('river-water-south', CENTER_X, 1620, 1600, 210),
  ],
} satisfies MapDefinition

export const ROCK_CANYON_MAP = {
  id: 'rock-canyon',
  name: '바위 협곡',
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  backgroundColor: 0x6f553d,
  gridColor: 0xc9a77c,
  playerSpawn: { x: 240, y: CENTER_Y },
  entryPoints: {
    default: { x: 240, y: CENTER_Y },
    'from-riverbank-meadow': { x: 240, y: CENTER_Y },
  },
  exits: [
    exit(
      'canyon-west-exit',
      '강변 초원',
      64,
      CENTER_Y,
      128,
      256,
      'riverbank-meadow',
      'from-rock-canyon',
    ),
  ],
  obstacles: [
    obstacle('canyon-wall-nw', 520, 300, 420, 180, 0x4e4339),
    obstacle('canyon-wall-n', 1160, 260, 520, 160, 0x53473b),
    obstacle('canyon-wall-ne', 2020, 330, 470, 190, 0x4b4037),
    obstacle('canyon-pillar-1', 780, 760, 150, 260, 0x625345),
    obstacle('canyon-pillar-2', 1390, 690, 180, 290, 0x5b4c41),
    obstacle('canyon-pillar-3', 1980, 790, 170, 250, 0x655548),
    obstacle('canyon-wall-sw', 600, 1600, 520, 180, 0x51443a),
    obstacle('canyon-wall-s', 1320, 1660, 430, 170, 0x594a3e),
    obstacle('canyon-wall-se', 2100, 1550, 480, 190, 0x4d4239),
    obstacle('canyon-ridge-1', 1040, 1240, 300, 110, 0x675647),
    obstacle('canyon-ridge-2', 1720, 1190, 330, 110, 0x604f43),
  ],
  resourceSpawns: [
    resource('canyon-stone-1', 'stone', 430, 690),
    resource('canyon-stone-2', 'stone', 940, 520),
    resource('canyon-stone-3', 'stone', 1550, 470),
    resource('canyon-stone-4', 'stone', 2240, 620),
    resource('canyon-stone-5', 'stone', 520, 1290),
    resource('canyon-stone-6', 'stone', 1480, 1390),
    resource('canyon-stone-7', 'stone', 2220, 1260),
    resource('canyon-tree-1', 'tree', 860, 1430),
    resource('canyon-tree-2', 'tree', 1840, 510),
    resource('canyon-copper-1', 'copper-deposit', 690, 1040),
    resource('canyon-copper-2', 'copper-deposit', 1190, 930),
    resource('canyon-copper-3', 'copper-deposit', 1780, 930),
    resource('canyon-copper-4', 'copper-deposit', 2080, 1390),
    resource('canyon-fiber-1', 'fiber-plant', 970, 1500),
  ],
  animalSpawns: [
    animal('canyon-rabbit-1', 'crazy-rabbit', 1120, 910),
    animal('canyon-boar-1', 'rock-boar', 1810, 980),
    animal('canyon-boar-2', 'rock-boar', 720, 1130),
    animal('canyon-boar-3', 'rock-boar', 2050, 1180),
  ],
  buildForbiddenAreas: [
    forbidden('canyon-west-exit', 64, CENTER_Y, 224, 352),
  ],
} satisfies MapDefinition

export const MAP_DEFINITIONS: Readonly<Record<MapId, MapDefinition>> = {
  meadow: MEADOW_MAP,
  'sunlit-plains': SUNLIT_PLAINS_MAP,
  'whispering-grove': WHISPERING_GROVE_MAP,
  'clover-fields': CLOVER_FIELDS_MAP,
  'riverbank-meadow': RIVERBANK_MEADOW_MAP,
  'rock-canyon': ROCK_CANYON_MAP,
}

export function isMapId(value: string): value is MapId {
  return Object.prototype.hasOwnProperty.call(MAP_DEFINITIONS, value)
}

export function getMapDefinition(mapId: string) {
  return isMapId(mapId)
    ? MAP_DEFINITIONS[mapId]
    : MAP_DEFINITIONS[DEFAULT_MAP_ID]
}

function resource(
  id: string,
  resourceDefinitionId: ResourceSpawnPoint['resourceDefinitionId'],
  x: number,
  y: number,
): ResourceSpawnPoint {
  return {
    id,
    resourceDefinitionId,
    x,
    y,
    respawnAt: null,
    blockedByBuilding: false,
  }
}

function animal(
  id: string,
  animalDefinitionId: string,
  x: number,
  y: number,
): AnimalSpawnPoint {
  return { id, animalDefinitionId, x, y }
}

function obstacle(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
): ObstacleDefinition {
  return { id, x, y, width, height, color }
}

function forbidden(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): BuildForbiddenArea {
  return { id, x, y, width, height }
}

function exit(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  targetMapId: MapId,
  targetEntryId: string,
): MapExitDefinition {
  return {
    id,
    name,
    x,
    y,
    width,
    height,
    targetMapId,
    targetEntryId,
  }
}
