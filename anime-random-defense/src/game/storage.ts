import type { RankingEntry } from './types'

export const ADMIN_NICKNAME = '서버장'

const NICKNAME_KEY = 'ard:nickname'
const RANKING_KEY = 'ard:rankings'
const RANKING_API_PATH = '/api/rankings'

let rankingCache: RankingEntry[] | null = null

export function getNickname(): string | null {
  return localStorage.getItem(NICKNAME_KEY)
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim().slice(0, 12)
}

export function isAdminNickname(nickname: string): boolean {
  return normalizeNickname(nickname) === ADMIN_NICKNAME
}

export function isNicknameTaken(nickname: string, currentNickname = ''): boolean {
  const normalized = normalizeNickname(nickname)
  if (!normalized || normalized === normalizeNickname(currentNickname)) return false
  return getRankings().some((entry) => normalizeNickname(entry.nickname) === normalized)
}

export function setNickname(nickname: string): void {
  localStorage.setItem(NICKNAME_KEY, normalizeNickname(nickname))
}

export function getRankings(): RankingEntry[] {
  if (rankingCache) return rankingCache

  const raw = localStorage.getItem(RANKING_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as RankingEntry[]
    const rankings = Array.isArray(parsed) ? uniqueRankingsByNickname(parsed) : []
    rankingCache = rankings
    return rankings
  } catch {
    return []
  }
}

export async function loadRankings(): Promise<RankingEntry[]> {
  try {
    const response = await fetch(RANKING_API_PATH, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Ranking API failed: ${response.status}`)
    const parsed = await response.json() as RankingEntry[]
    const rankings = Array.isArray(parsed) ? uniqueRankingsByNickname(parsed).slice(0, 10) : []
    saveRankingsCache(rankings)
    return rankings
  } catch {
    return getRankings()
  }
}

export async function addRanking(entry: RankingEntry): Promise<RankingEntry[]> {
  const localRankings = uniqueRankingsByNickname([...getRankings(), entry]).slice(0, 10)
  saveRankingsCache(localRankings)

  try {
    const response = await fetch(RANKING_API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    })
    if (!response.ok) throw new Error(`Ranking API failed: ${response.status}`)
    const parsed = await response.json() as RankingEntry[]
    const rankings = Array.isArray(parsed) ? uniqueRankingsByNickname(parsed).slice(0, 10) : localRankings
    saveRankingsCache(rankings)
    return rankings
  } catch {
    return localRankings
  }
}

export async function clearRankings(): Promise<void> {
  rankingCache = []
  localStorage.removeItem(RANKING_KEY)

  try {
    await fetch(RANKING_API_PATH, { method: 'DELETE' })
  } catch {
    // Offline/local fallback already cleared above.
  }
}

function uniqueRankingsByNickname(entries: RankingEntry[]): RankingEntry[] {
  const bestByNickname = new Map<string, RankingEntry>()
  for (const entry of entries) {
    const nickname = normalizeNickname(entry.nickname)
    if (!nickname) continue
    const normalizedEntry = { ...entry, nickname }
    const current = bestByNickname.get(nickname)
    if (!current || isBetterRanking(normalizedEntry, current)) {
      bestByNickname.set(nickname, normalizedEntry)
    }
  }
  return [...bestByNickname.values()].sort((a, b) => b.score - a.score)
}

function isBetterRanking(next: RankingEntry, current: RankingEntry): boolean {
  if (next.score !== current.score) return next.score > current.score
  return next.createdAt > current.createdAt
}

function saveRankingsCache(rankings: RankingEntry[]): void {
  rankingCache = rankings
  localStorage.setItem(RANKING_KEY, JSON.stringify(rankings))
}
