import { useState } from 'react'
import {
  SAVE_SLOT_DEFINITIONS,
  SaveService,
} from '../game/services/SaveService'
import type {
  SaveSlotId,
  SaveSlotSummary,
} from '../game/types/save'
import './titleScreen.css'

type TitleScreenProps = Readonly<{
  screen: 'title' | 'slots'
  onStart: () => void
  onBack: () => void
  onSelectSlot: (slotId: SaveSlotId) => void
}>

const saveService = new SaveService()

export function TitleScreen({
  screen,
  onStart,
  onBack,
  onSelectSlot,
}: TitleScreenProps) {
  const [, setSlotRevision] = useState(0)
  const slotSummaries =
    screen === 'slots' ? saveService.getSlotSummaries() : []
  const handleDeleteSlot = (slotId: SaveSlotId, slotLabel: string) => {
    if (
      !window.confirm(
        `${slotLabel}의 저장 기록을 삭제할까요? 삭제한 기록은 복구할 수 없습니다.`,
      )
    ) {
      return
    }

    if (saveService.deleteSlot(slotId)) {
      setSlotRevision((revision) => revision + 1)
    }
  }

  return (
    <main className="title-screen">
      <div className="title-screen__cloud title-screen__cloud--one" />
      <div className="title-screen__cloud title-screen__cloud--two" />
      <div className="title-screen__hill title-screen__hill--back" />
      <div className="title-screen__hill title-screen__hill--front" />

      {screen === 'title' ? (
        <section className="title-screen__hero" aria-label="메인 화면">
          <span className="title-screen__eyebrow">A WILD FARM ADVENTURE</span>
          <h1>
            CRAZY
            <strong>ANIMAL FARM</strong>
          </h1>
          <p>동물을 만나고, 포획하고, 나만의 거점을 만들어 보세요.</p>
          <button type="button" onClick={onStart}>
            게임 시작
          </button>
          <small>WASD · Shift 달리기 · M 지도 · ESC 메뉴</small>
        </section>
      ) : (
        <section className="save-select" aria-label="저장 슬롯 선택">
          <header>
            <div>
              <span>SELECT ADVENTURE</span>
              <h1>저장 슬롯 선택</h1>
              <p>이어 할 기록을 선택하거나 빈 슬롯에서 새 게임을 시작하세요.</p>
            </div>
            <button type="button" onClick={onBack}>
              뒤로
            </button>
          </header>

          <div className="save-select__slots">
            {SAVE_SLOT_DEFINITIONS.map((definition) => {
              const summary = slotSummaries.find(
                (slot) => slot.id === definition.id,
              )

              return (
                <SaveSlotButton
                  key={definition.id}
                  summary={{
                    ...definition,
                    save: summary?.save ?? null,
                  }}
                  onSelect={onSelectSlot}
                  onDelete={handleDeleteSlot}
                />
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}

function SaveSlotButton({
  summary,
  onSelect,
  onDelete,
}: Readonly<{
  summary: SaveSlotSummary
  onSelect: (slotId: SaveSlotId) => void
  onDelete: (slotId: SaveSlotId, slotLabel: string) => void
}>) {
  const save = summary.save

  return (
    <article
      className={`save-select__slot${
        summary.isAuto ? ' is-auto' : ''
      }${save ? ' has-save' : ' is-empty'}`}
    >
      <button
        type="button"
        className="save-select__slot-main"
        onClick={() => onSelect(summary.id)}
      >
        <span className="save-select__slot-number">
          {summary.isAuto ? 'AUTO' : summary.id.slice(-1)}
        </span>
        <span className="save-select__slot-content">
          <strong>{summary.label}</strong>
          {save ? (
            <>
              <em>
                Lv.{save.player.level ?? 1} ·{' '}
                {getSavedMapName(save.player.currentMapId)}
              </em>
              <small>{formatSavedAt(save.savedAt)}</small>
            </>
          ) : (
            <>
              <em>새 게임</em>
              <small>저장된 모험이 없습니다.</small>
            </>
          )}
        </span>
        <span className="save-select__slot-action">
          {save ? '이어하기' : '시작하기'}
        </span>
      </button>
      {save && (
        <button
          type="button"
          className="save-select__slot-delete"
          onClick={() => onDelete(summary.id, summary.label)}
        >
          삭제
        </button>
      )}
    </article>
  )
}

function getSavedMapName(mapId: string) {
  const mapNames: Readonly<Record<string, string>> = {
    meadow: '중앙 초원',
    'sunlit-plains': '햇살 들판',
    'whispering-grove': '속삭임 초원',
    'clover-fields': '클로버 들판',
    'riverbank-meadow': '강변 초원',
    'rock-canyon': '바위 협곡',
  }

  return mapNames[mapId] ?? '알 수 없는 지역'
}

function formatSavedAt(savedAt: number) {
  return new Date(savedAt).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
