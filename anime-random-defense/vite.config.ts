import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

type Genre = 'mha' | 'onepunch' | 'overwatch' | 'tooniverse'

interface RankingEntry {
  nickname: string
  score: number
  wave: number
  cleared: boolean
  topGenres: Genre[]
  createdAt: string
}

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const rankingFilePath = path.resolve(rootDir, 'data', 'rankings.json')
const validGenres = new Set<Genre>(['mha', 'onepunch', 'overwatch', 'tooniverse'])
let rankingUpdateQueue = Promise.resolve<RankingEntry[]>([])

export default defineConfig({
  plugins: [sharedRankingPlugin()],
  server: {
    port: 3001,
    host: '0.0.0.0'
  },
  preview: {
    port: 4173,
    host: '0.0.0.0'
  }
})

function sharedRankingPlugin(): Plugin {
  const handle = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    void handleRankingRequest(req, res, next)
  }

  return {
    name: 'shared-ranking-api',
    configureServer(server) {
      server.middlewares.use(handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle)
    }
  }
}

async function handleRankingRequest(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname !== '/api/rankings') {
    next()
    return
  }

  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }

    if (req.method === 'GET') {
      sendJson(res, 200, await readRankings())
      return
    }

    if (req.method === 'POST') {
      const body = await readRequestBody(req)
      const entry = normalizeRankingEntry(JSON.parse(body))
      if (!entry) {
        sendJson(res, 400, { error: 'Invalid ranking entry' })
        return
      }

      const rankings = await updateRankings((current) => uniqueRankingsByNickname([...current, entry]).slice(0, 10))
      sendJson(res, 200, rankings)
      return
    }

    if (req.method === 'DELETE') {
      const rankings = await updateRankings(() => [])
      sendJson(res, 200, rankings)
      return
    }

    sendJson(res, 405, { error: 'Method not allowed' })
  } catch {
    sendJson(res, 500, { error: 'Ranking server error' })
  }
}

async function readRankings(): Promise<RankingEntry[]> {
  try {
    const raw = await readFile(rankingFilePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? uniqueRankingsByNickname(parsed.map(normalizeRankingEntry).filter((entry): entry is RankingEntry => entry !== null)).slice(0, 10)
      : []
  } catch {
    return []
  }
}

async function updateRankings(updater: (current: RankingEntry[]) => RankingEntry[]): Promise<RankingEntry[]> {
  const task = rankingUpdateQueue
    .catch(() => [])
    .then(async () => {
      const current = await readRankings()
      const next = updater(current)
      await writeRankings(next)
      return next
    })

  rankingUpdateQueue = task
  return task
}

async function writeRankings(rankings: RankingEntry[]): Promise<void> {
  await mkdir(path.dirname(rankingFilePath), { recursive: true })
  await writeFile(rankingFilePath, `${JSON.stringify(rankings, null, 2)}\n`, 'utf8')
}

function normalizeRankingEntry(value: unknown): RankingEntry | null {
  if (!value || typeof value !== 'object') return null
  const entry = value as Partial<RankingEntry>
  const nickname = typeof entry.nickname === 'string' ? entry.nickname.trim().slice(0, 12) : ''
  const score = Number(entry.score)
  const wave = Number(entry.wave)
  const cleared = Boolean(entry.cleared)
  const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString()
  const topGenres = Array.isArray(entry.topGenres)
    ? entry.topGenres.filter((genre): genre is Genre => validGenres.has(genre as Genre)).slice(0, 3)
    : []

  if (!nickname || !Number.isFinite(score) || !Number.isFinite(wave)) return null

  return {
    nickname,
    score: Math.max(0, Math.floor(score)),
    wave: Math.max(0, Math.floor(wave)),
    cleared,
    topGenres,
    createdAt
  }
}

function uniqueRankingsByNickname(entries: RankingEntry[]): RankingEntry[] {
  const bestByNickname = new Map<string, RankingEntry>()
  for (const entry of entries) {
    const nickname = entry.nickname.trim().slice(0, 12)
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

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8')
      if (body.length > 100_000) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}
