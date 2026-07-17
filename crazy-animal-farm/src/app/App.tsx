import { useState } from 'react'
import { GameCanvas } from '../game/GameCanvas'
import { SaveService } from '../game/services/SaveService'
import type { SaveSlotId } from '../game/types/save'
import { BaseStoragePanel } from '../ui/BaseStoragePanel'
import { CraftingWorkbenchPanel } from '../ui/CraftingWorkbenchPanel'
import { GameMenu } from '../ui/GameMenu'
import { Hud } from '../ui/Hud'
import { MapPanel } from '../ui/MapPanel'
import { TitleScreen } from '../ui/TitleScreen'
import './App.css'

const saveService = new SaveService()
const pendingLoadSlotId = saveService.consumePendingLoadSlot()

export function App() {
  const [screen, setScreen] = useState<'title' | 'slots' | 'playing'>(
    pendingLoadSlotId ? 'playing' : 'title',
  )

  const startFromSlot = (slotId: SaveSlotId) => {
    saveService.setActiveLoadSlot(slotId)
    setScreen('playing')
  }

  if (screen !== 'playing') {
    return (
      <TitleScreen
        screen={screen}
        onStart={() => setScreen('slots')}
        onBack={() => setScreen('title')}
        onSelectSlot={startFromSlot}
      />
    )
  }

  return (
    <main className="app">
      <section className="app__game-frame" aria-label="게임 화면">
        <GameCanvas />
        <Hud />
        <MapPanel />
        <GameMenu />
        <BaseStoragePanel />
        <CraftingWorkbenchPanel />
      </section>
    </main>
  )
}
