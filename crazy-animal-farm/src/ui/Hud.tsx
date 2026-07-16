import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import {
  ANIMAL_ELEMENTS,
  ANIMAL_SELF_STATUS_EFFECTS,
} from '../game/data/animalElements'
import { ANIMAL_ACTIVE_SKILLS } from '../game/data/animalSkills'
import { ANIMAL_DEFINITIONS } from '../game/data/animals'
import type {
  AnimalSelfStatusEffectId,
  CapturedAnimal,
  CompanionSkillCooldownState,
  CompanionCommandMode,
} from '../game/types/animal'
import { Hotbar } from './Hotbar'
import './gameplayHud.css'

const HOTBAR_KEY_CODES: Readonly<Partial<Record<string, number>>> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  Digit7: 6,
  Digit8: 7,
  Digit9: 8,
  Digit0: 9,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3,
  Numpad5: 4,
  Numpad6: 5,
  Numpad7: 6,
  Numpad8: 7,
  Numpad9: 8,
  Numpad0: 9,
}

export function Hud() {
  const playerHp = useGameStore((state) => state.playerHp)
  const playerMaxHp = useGameStore((state) => state.playerMaxHp)
  const playerHunger = useGameStore((state) => state.playerHunger)
  const playerMaxHunger = useGameStore((state) => state.playerMaxHunger)
  const playerLevel = useGameStore((state) => state.playerLevel)
  const playerExperience = useGameStore((state) => state.playerExperience)
  const playerExperienceToNextLevel = useGameStore(
    (state) => state.playerExperienceToNextLevel,
  )
  const playerShield = useGameStore((state) => state.playerShield)
  const playerMaxShield = useGameStore((state) => state.playerMaxShield)
  const isGameMenuOpen = useGameStore((state) => state.isGameMenuOpen)
  const isMapOpen = useGameStore((state) => state.isMapOpen)
  const isBaseStorageOpen = useGameStore((state) => state.isBaseStorageOpen)
  const isCraftingWorkbenchOpen = useGameStore(
    (state) => state.isCraftingWorkbenchOpen,
  )
  const activeMode = useGameStore((state) => state.activeMode)
  const capturedAnimals = useGameStore((state) => state.capturedAnimals)
  const activeAnimalPartyIds = useGameStore(
    (state) => state.activeAnimalPartyIds,
  )
  const selectedCompanionAnimalId = useGameStore(
    (state) => state.selectedCompanionAnimalId,
  )
  const summonedCompanionAnimalId = useGameStore(
    (state) => state.summonedCompanionAnimalId,
  )
  const companionCommandMode = useGameStore(
    (state) => state.companionCommandMode,
  )
  const companionTargetName = useGameStore(
    (state) => state.companionTargetName,
  )
  const companionMessage = useGameStore((state) => state.companionMessage)
  const companionSkillCooldowns = useGameStore(
    (state) => state.companionSkillCooldowns,
  )
  const companionActiveStatusEffectIds = useGameStore(
    (state) => state.companionActiveStatusEffectIds,
  )
  const companionPartnerSkillActive = useGameStore(
    (state) => state.companionPartnerSkillActive,
  )
  const companionLastSkillName = useGameStore(
    (state) => state.companionLastSkillName,
  )
  const selectHotbarSlot = useGameStore((state) => state.selectHotbarSlot)

  useEffect(() => {
    const handleHotbarKeyDown = (event: KeyboardEvent) => {
      const slotIndex = HOTBAR_KEY_CODES[event.code]

      if (
        slotIndex === undefined ||
        event.repeat ||
        isGameMenuOpen ||
        isMapOpen ||
        isBaseStorageOpen ||
        isCraftingWorkbenchOpen ||
        activeMode === 'build' ||
        activeMode === 'craft' ||
        isTextInput(event.target)
      ) {
        return
      }

      selectHotbarSlot(slotIndex)
    }

    window.addEventListener('keydown', handleHotbarKeyDown)
    return () => window.removeEventListener('keydown', handleHotbarKeyDown)
  }, [
    activeMode,
    isBaseStorageOpen,
    isCraftingWorkbenchOpen,
    isGameMenuOpen,
    isMapOpen,
    selectHotbarSlot,
  ])

  if (
    isGameMenuOpen ||
    isMapOpen ||
    isBaseStorageOpen ||
    isCraftingWorkbenchOpen
  ) {
    return null
  }

  const hpPercent = toPercent(playerHp, playerMaxHp)
  const hungerPercent = toPercent(playerHunger, playerMaxHunger)
  const experiencePercent = toPercent(
    playerExperience,
    playerExperienceToNextLevel,
  )
  const shieldPercent = toPercent(playerShield, playerMaxShield)
  const activeAnimalParty = activeAnimalPartyIds
    .map(
      (animalId) =>
        capturedAnimals.find((animal) => animal.id === animalId) ?? null,
    )
    .filter((animal): animal is CapturedAnimal => animal !== null)
  const selectedCompanion =
    activeAnimalParty.find(
      (animal) => animal.id === selectedCompanionAnimalId,
    ) ??
    activeAnimalParty[0] ??
    null
  const summonedCompanion =
    activeAnimalParty.find(
      (animal) => animal.id === summonedCompanionAnimalId,
    ) ?? null

  return (
    <aside className="hud" aria-label="플레이 상태">
      <CompanionStatus
        party={activeAnimalParty}
        selectedCompanion={selectedCompanion}
        summonedCompanion={summonedCompanion}
        commandMode={companionCommandMode}
        targetName={companionTargetName}
        message={companionMessage}
        skillCooldowns={companionSkillCooldowns}
        activeStatusEffectIds={companionActiveStatusEffectIds}
        partnerSkillActive={companionPartnerSkillActive}
        lastSkillName={companionLastSkillName}
      />
      <section className="player-vitals" aria-label="플레이어 상태">
        <div className="player-vitals__portrait" aria-label="플레이어 프로필">
          <span>●</span>
          <strong>Lv.{playerLevel}</strong>
        </div>
        <div className="player-vitals__main">
          <div className="player-vitals__identity">
            <strong>플레이어</strong>
            <span>
              EXP {playerExperience} / {playerExperienceToNextLevel}
            </span>
          </div>
          <CompactBar
            label="경험치"
            percent={experiencePercent}
            tone="experience"
          />
          {playerMaxShield > 0 && (
            <CompactBar
              label={`쉴드 ${Math.ceil(playerShield)} / ${playerMaxShield}`}
              percent={shieldPercent}
              tone="shield"
            />
          )}
          <CompactBar
            label={`체력 ${playerHp} / ${playerMaxHp}`}
            percent={hpPercent}
            tone="health"
          />
        </div>
        <div
          className="player-vitals__hunger"
          role="progressbar"
          aria-label="플레이어 허기"
          aria-valuemin={0}
          aria-valuemax={playerMaxHunger}
          aria-valuenow={playerHunger}
          title={`허기 ${playerHunger} / ${playerMaxHunger}`}
        >
          <span style={{ height: `${hungerPercent}%` }} />
          <strong>◆</strong>
        </div>
      </section>

      <Hotbar variant="gameplay" />
    </aside>
  )
}

type CompanionStatusProps = Readonly<{
  party: readonly CapturedAnimal[]
  selectedCompanion: CapturedAnimal | null
  summonedCompanion: CapturedAnimal | null
  commandMode: CompanionCommandMode
  targetName: string | null
  message: string
  skillCooldowns: readonly CompanionSkillCooldownState[]
  activeStatusEffectIds: readonly AnimalSelfStatusEffectId[]
  partnerSkillActive: boolean
  lastSkillName: string | null
}>

function CompanionStatus({
  party,
  selectedCompanion,
  summonedCompanion,
  commandMode,
  targetName,
  message,
  skillCooldowns,
  activeStatusEffectIds,
  partnerSkillActive,
  lastSkillName,
}: CompanionStatusProps) {
  if (!selectedCompanion) {
    return null
  }

  const hpPercent = toPercent(
    selectedCompanion.currentHp,
    selectedCompanion.stats.maxHp,
  )
  const isSelectedSummoned =
    selectedCompanion.id === summonedCompanion?.id
  const definition =
    ANIMAL_DEFINITIONS[selectedCompanion.animalDefinitionId]

  return (
    <section className="companion-status" aria-label="동행 동물 상태">
      <div className="companion-status__party" aria-label="활동 파티">
        {party.map((animal, index) => (
          <span
            key={animal.id}
            className={[
              animal.id === selectedCompanion.id ? 'is-selected' : '',
              animal.id === summonedCompanion?.id ? 'is-summoned' : '',
            ].filter(Boolean).join(' ')}
            title={`${index + 1}. ${animal.name}`}
          >
            <em>{index + 1}</em>
            {getAnimalIcon(animal.animalDefinitionId)}
          </span>
        ))}
      </div>
      <div className="companion-status__profile">
        <div className="companion-status__portrait">
          {getAnimalIcon(selectedCompanion.animalDefinitionId)}
        </div>
        <div className="companion-status__body">
          <div className="companion-status__heading">
            <strong>
              Lv.{selectedCompanion.level} {selectedCompanion.name}
            </strong>
            <span>
              {isSelectedSummoned
                ? '소환 중'
                : summonedCompanion
                  ? `${summonedCompanion.name} 소환 중`
                  : '대기 중'}
            </span>
          </div>
          {definition && (
            <div className="companion-status__element">
              <span
                style={{
                  color: ANIMAL_ELEMENTS[definition.element].color,
                }}
              >
                {ANIMAL_ELEMENTS[definition.element].name}
              </span>
              <span>
                {partnerSkillActive && isSelectedSummoned
                  ? `${definition.partnerSkill.name} 활성`
                  : '동반자 능력 대기'}
              </span>
            </div>
          )}
          <span
            className="companion-status__health"
            role="progressbar"
            aria-label={`${selectedCompanion.name} 체력`}
            aria-valuemin={0}
            aria-valuemax={selectedCompanion.stats.maxHp}
            aria-valuenow={selectedCompanion.currentHp}
          >
            <span style={{ width: `${hpPercent}%` }} />
            <em>
              HP {selectedCompanion.currentHp} / {selectedCompanion.stats.maxHp}
            </em>
          </span>
          <div className="companion-status__growth">
            <span>
              EXP {selectedCompanion.experience} /{' '}
              {selectedCompanion.experienceToNextLevel}
            </span>
            <span>신뢰 {selectedCompanion.trust}%</span>
          </div>
          <div className="companion-status__skills">
            {selectedCompanion.equippedActiveSkillIds.map(
              (skillId, slotIndex) => {
                const skill = skillId
                  ? ANIMAL_ACTIVE_SKILLS[skillId]
                  : null
                const runtimeState = skillCooldowns.find(
                  (state) => state.slotIndex === slotIndex,
                )
                const cooldownSeconds =
                  isSelectedSummoned && runtimeState
                    ? runtimeState.remainingMs / 1_000
                    : 0

                return (
                  <span
                    key={`skill-${slotIndex}`}
                    className={
                      cooldownSeconds > 0 ? 'is-cooling' : ''
                    }
                    title={skill?.description}
                  >
                    <em>{slotIndex + 1}</em>
                    <strong>{skill?.name ?? '빈 칸'}</strong>
                    <small>
                      {cooldownSeconds > 0
                        ? `${cooldownSeconds.toFixed(1)}초`
                        : 'READY'}
                    </small>
                  </span>
                )
              },
            )}
          </div>
          {isSelectedSummoned &&
            activeStatusEffectIds.length > 0 && (
              <div className="companion-status__effects">
                {activeStatusEffectIds.map((statusEffectId) => (
                  <span key={statusEffectId}>
                    {
                      ANIMAL_SELF_STATUS_EFFECTS[statusEffectId]
                        .name
                    }
                  </span>
                ))}
              </div>
            )}
          <div className="companion-status__command">
            <strong>{getCommandLabel(commandMode)}</strong>
            <span>{targetName ? `대상 · ${targetName}` : '공격 대상 없음'}</span>
          </div>
        </div>
      </div>
      <p>
        {message ||
          (lastSkillName
            ? `최근 기술 · ${lastSkillName}`
            : 'F 소환 · G 선택 · V 명령 · 우클릭 지정 공격')}
      </p>
    </section>
  )
}

type CompactBarProps = Readonly<{
  label: string
  percent: number
  tone: 'experience' | 'shield' | 'health'
}>

function CompactBar({
  label,
  percent,
  tone,
}: CompactBarProps) {
  return (
    <span
      className={`player-vitals__bar player-vitals__bar--${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      title={label}
    >
      <span style={{ width: `${percent}%` }} />
      <em>{label}</em>
    </span>
  )
}

function toPercent(value: number, maximum: number) {
  return maximum > 0
    ? Math.max(0, Math.min(100, (value / maximum) * 100))
    : 0
}

function isTextInput(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

function getCommandLabel(commandMode: CompanionCommandMode) {
  switch (commandMode) {
    case 'follow':
      return '따라오기'
    case 'stay':
      return '대기'
    case 'focus':
      return '집중 공격'
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
