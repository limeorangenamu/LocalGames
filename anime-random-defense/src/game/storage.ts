import type { RankingEntry } from './types'

const NICKNAME_KEY = 'ard:nickname'
const RANKING_KEY = 'ard:rankings'

export function getNickname(): string | null {
  return localStorage.getItem(NICKNAME_KEY)
}

export function setNickname(nickname: string): void {
  localStorage.setItem(NICKNAME_KEY, nickname.trim())
}

export function getRankings(): RankingEntry[] {
  const raw = localStorage.getItem(RANKING_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as RankingEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addRanking(entry: RankingEntry): RankingEntry[] {
  const rankings = [...getRankings(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
  localStorage.setItem(RANKING_KEY, JSON.stringify(rankings))
  return rankings
}

export function clearRankings(): void {
  localStorage.removeItem(RANKING_KEY)
}
