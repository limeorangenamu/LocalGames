import type { CSSProperties } from 'react'
import { ANIMAL_DEFINITIONS } from '../game/data/animals'
import { BUILDING_DEFINITIONS } from '../game/data/buildings'
import {
  MAP_DEFINITIONS,
  getMapDefinition,
} from '../game/data/maps'
import { RESOURCE_DEFINITIONS } from '../game/data/resources'
import type { MapId } from '../game/types/map'
import {
  useGameStore,
  type MapViewLevel,
} from '../store/useGameStore'
import './mapPanel.css'

const MAP_TABS: readonly Readonly<{
  id: MapViewLevel
  label: string
  description: string
}>[] = [
  {
    id: 'world',
    label: '월드맵',
    description: '지역 단위',
  },
  {
    id: 'meadow',
    label: '초원맵',
    description: '맵 연결',
  },
  {
    id: 'current',
    label: '현재맵',
    description: '주변 탐색',
  },
]

const MEADOW_NODE_POSITIONS: Readonly<
  Record<MapId, Readonly<{ left: string; top: string }>>
> = {
  'sunlit-plains': { left: '12%', top: '48%' },
  'whispering-grove': { left: '42%', top: '15%' },
  meadow: { left: '42%', top: '48%' },
  'clover-fields': { left: '42%', top: '79%' },
  'riverbank-meadow': { left: '72%', top: '79%' },
  'rock-canyon': { left: '88%', top: '79%' },
}

const MEADOW_CONNECTIONS: readonly Readonly<{
  from: MapId
  to: MapId
}>[] = [
  { from: 'sunlit-plains', to: 'meadow' },
  { from: 'whispering-grove', to: 'meadow' },
  { from: 'meadow', to: 'clover-fields' },
  { from: 'clover-fields', to: 'riverbank-meadow' },
  { from: 'riverbank-meadow', to: 'rock-canyon' },
]

export function MapPanel() {
  const isOpen = useGameStore((state) => state.isMapOpen)
  const activeMapView = useGameStore((state) => state.activeMapView)
  const setActiveMapView = useGameStore(
    (state) => state.setActiveMapView,
  )
  const setMapOpen = useGameStore((state) => state.setMapOpen)
  const currentMapName = useGameStore((state) => state.currentMapName)

  if (!isOpen) {
    return null
  }

  return (
    <section className="map-panel" aria-label="지도">
      <div className="map-panel__window">
        <header className="map-panel__header">
          <div className="map-panel__title">
            <span>FIELD NAVIGATION</span>
            <strong>{currentMapName}</strong>
          </div>
          <nav className="map-panel__tabs" aria-label="지도 단계">
            {MAP_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeMapView === tab.id ? 'is-active' : ''}
                aria-pressed={activeMapView === tab.id}
                onClick={() => setActiveMapView(tab.id)}
              >
                <strong>{tab.label}</strong>
                <span>{tab.description}</span>
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="map-panel__close"
            onClick={() => setMapOpen(false)}
          >
            M / ESC 닫기
          </button>
        </header>

        <div className="map-panel__content">
          {activeMapView === 'world' && <WorldMapView />}
          {activeMapView === 'meadow' && <MeadowMapView />}
          {activeMapView === 'current' && <CurrentMapView />}
        </div>
      </div>
    </section>
  )
}

function WorldMapView() {
  const currentMapId = useGameStore((state) => state.currentMapId)
  const isInMeadowRegion = currentMapId !== 'rock-canyon'

  return (
    <div className="world-map-view">
      <div className="world-map-view__ocean" aria-hidden="true" />
      <div className="world-map-view__route" aria-hidden="true" />
      <article
        className={`world-region world-region--meadow${
          isInMeadowRegion ? ' is-current' : ''
        }`}
      >
        <span className="world-region__icon">🌿</span>
        <div>
          <small>GRASSLAND REGION</small>
          <h2>푸른 초원권</h2>
          <p>다섯 개의 초원 지대가 서로 연결된 넓은 생활권</p>
          <strong>5 MAPS</strong>
        </div>
        {isInMeadowRegion && <em>현재 지역</em>}
      </article>
      <article
        className={`world-region world-region--canyon${
          !isInMeadowRegion ? ' is-current' : ''
        }`}
      >
        <span className="world-region__icon">⛰️</span>
        <div>
          <small>ROCK REGION</small>
          <h2>바위 협곡권</h2>
          <p>강변 초원 너머의 광물과 야생동물이 풍부한 협곡</p>
          <strong>1 MAP</strong>
        </div>
        {!isInMeadowRegion && <em>현재 지역</em>}
      </article>
      <footer className="world-map-view__legend">
        <span><i className="is-current" /> 현재 위치</span>
        <span><i /> 이동 가능한 지역</span>
      </footer>
    </div>
  )
}

function MeadowMapView() {
  const currentMapId = useGameStore((state) => state.currentMapId)

  return (
    <div className="meadow-map-view">
      <svg
        className="meadow-map-view__connections"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {MEADOW_CONNECTIONS.map(({ from, to }) => {
          const fromPosition = MEADOW_NODE_POSITIONS[from]
          const toPosition = MEADOW_NODE_POSITIONS[to]

          return (
            <line
              key={`${from}-${to}`}
              x1={fromPosition.left}
              y1={fromPosition.top}
              x2={toPosition.left}
              y2={toPosition.top}
            />
          )
        })}
      </svg>

      {Object.values(MAP_DEFINITIONS).map((map) => {
        const position = MEADOW_NODE_POSITIONS[map.id]
        const isCanyon = map.id === 'rock-canyon'

        return (
          <article
            key={map.id}
            className={`meadow-map-node${
              currentMapId === map.id ? ' is-current' : ''
            }${isCanyon ? ' is-canyon' : ''}`}
            style={position}
          >
            <span>{isCanyon ? '⛰️' : getMapNodeIcon(map.id)}</span>
            <strong>{map.name}</strong>
            <small>
              자원 {map.resourceSpawns.length} · 동물 {map.animalSpawns.length}
            </small>
            {currentMapId === map.id && <em>현재 위치</em>}
          </article>
        )
      })}

      <div className="meadow-map-view__notice">
        <strong>초원권 연결도</strong>
        <span>실선으로 연결된 출구를 통해 인접 맵으로 이동할 수 있습니다.</span>
      </div>
    </div>
  )
}

function CurrentMapView() {
  const currentMapId = useGameStore((state) => state.currentMapId)
  const playerWorldPosition = useGameStore(
    (state) => state.playerWorldPosition,
  )
  const placedBuildings = useGameStore((state) => state.placedBuildings)
  const map = getMapDefinition(currentMapId)
  const currentMapBuildings = placedBuildings.filter(
    (building) => building.mapId === currentMapId,
  )

  return (
    <div className="current-map-view">
      <section className="current-map-view__summary">
        <span>CURRENT AREA</span>
        <h2>{map.name}</h2>
        <dl>
          <div><dt>출구</dt><dd>{map.exits.length}</dd></div>
          <div><dt>자원 지점</dt><dd>{map.resourceSpawns.length}</dd></div>
          <div><dt>야생동물</dt><dd>{map.animalSpawns.length}</dd></div>
          <div><dt>건축물</dt><dd>{currentMapBuildings.length}</dd></div>
        </dl>
        <p>
          플레이어 위치와 출구, 자원, 야생동물, 설치한 건축물을 간략하게
          표시합니다.
        </p>
      </section>

      <div
        className="current-map-canvas"
        style={{
          '--map-background': colorToHex(map.backgroundColor),
          aspectRatio: `${map.width} / ${map.height}`,
        } as CSSProperties}
        aria-label={`${map.name} 상세 지도`}
      >
        {map.obstacles.map((obstacle) => (
          <span
            key={obstacle.id}
            className="current-map-canvas__obstacle"
            style={{
              left: toPercent(obstacle.x - obstacle.width / 2, map.width),
              top: toPercent(obstacle.y - obstacle.height / 2, map.height),
              width: toPercent(obstacle.width, map.width),
              height: toPercent(obstacle.height, map.height),
              backgroundColor: colorToHex(obstacle.color),
            }}
            title="지형 장애물"
          />
        ))}

        {map.resourceSpawns.map((resource) => (
          <span
            key={resource.id}
            className={`current-map-marker current-map-marker--resource current-map-marker--${resource.resourceDefinitionId}`}
            style={pointStyle(resource.x, resource.y, map.width, map.height)}
            title={RESOURCE_DEFINITIONS[resource.resourceDefinitionId].name}
          >
            {getResourceIcon(resource.resourceDefinitionId)}
          </span>
        ))}

        {map.animalSpawns.map((animal) => (
          <span
            key={animal.id}
            className="current-map-marker current-map-marker--animal"
            style={pointStyle(animal.x, animal.y, map.width, map.height)}
            title={
              ANIMAL_DEFINITIONS[
                animal.animalDefinitionId as keyof typeof ANIMAL_DEFINITIONS
              ]?.name ?? '야생동물'
            }
          >
            {getAnimalIcon(animal.animalDefinitionId)}
          </span>
        ))}

        {currentMapBuildings.map((building) => (
          <span
            key={building.id}
            className="current-map-marker current-map-marker--building"
            style={pointStyle(building.x, building.y, map.width, map.height)}
            title={BUILDING_DEFINITIONS[building.definitionId].name}
          >
            ⛺
          </span>
        ))}

        {map.exits.map((exit) => (
          <span
            key={exit.id}
            className="current-map-canvas__exit"
            style={{
              left: toPercent(exit.x, map.width),
              top: toPercent(exit.y, map.height),
            }}
            title={`${exit.name}으로 이동`}
          >
            <i />
            <strong>{exit.name}</strong>
          </span>
        ))}

        <span
          className="current-map-marker current-map-marker--player"
          style={pointStyle(
            playerWorldPosition.x,
            playerWorldPosition.y,
            map.width,
            map.height,
          )}
          title="플레이어"
        >
          <i />
        </span>
      </div>

      <footer className="current-map-view__legend">
        <span><i className="is-player" /> 플레이어</span>
        <span>🌲 자원</span>
        <span>🐾 야생동물</span>
        <span>⛺ 건축물</span>
        <span><i className="is-exit" /> 출구</span>
      </footer>
    </div>
  )
}

function pointStyle(
  x: number,
  y: number,
  width: number,
  height: number,
): CSSProperties {
  return {
    left: toPercent(x, width),
    top: toPercent(y, height),
  }
}

function toPercent(value: number, maximum: number) {
  return `${Math.max(0, Math.min(100, (value / maximum) * 100))}%`
}

function colorToHex(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`
}

function getMapNodeIcon(mapId: MapId) {
  switch (mapId) {
    case 'whispering-grove':
      return '🌲'
    case 'riverbank-meadow':
      return '💧'
    case 'clover-fields':
      return '☘️'
    case 'sunlit-plains':
      return '☀️'
    default:
      return '🌿'
  }
}

function getResourceIcon(resourceId: string) {
  switch (resourceId) {
    case 'tree':
      return '🌲'
    case 'stone':
      return '◆'
    case 'fiber-plant':
      return '🌿'
    case 'berry-bush':
      return '●'
    case 'copper-deposit':
      return '⬟'
    default:
      return '•'
  }
}

function getAnimalIcon(animalDefinitionId: string) {
  switch (animalDefinitionId) {
    case 'woolly-sheep':
      return '🐑'
    case 'rock-boar':
      return '🐗'
    default:
      return '🐇'
  }
}
