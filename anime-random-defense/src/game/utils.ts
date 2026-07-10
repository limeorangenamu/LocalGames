import type { Grade, Genre } from './types'
import { GENRE_LABEL } from './balance'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function weightedPick<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as Array<[T, number]>
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0)
  let roll = Math.random() * total
  for (const [key, weight] of entries) {
    roll -= Math.max(0, weight)
    if (roll <= 0) return key
  }
  return entries[entries.length - 1][0]
}

export function randomItem<T>(items: T[]): T {
  if (items.length === 0) throw new Error('randomItem: empty array')
  return items[Math.floor(Math.random() * items.length)]
}

export function formatNumber(value: number): string {
  return Math.floor(value).toLocaleString('ko-KR')
}

export function gradeWeightObject(row: { common: number; rare: number; hero: number; legend: number; myth: number }): Record<Grade, number> {
  return {
    common: row.common,
    rare: row.rare,
    hero: row.hero,
    legend: row.legend,
    myth: row.myth
  }
}

export function genreListText(genres: Genre[]): string {
  return genres.length > 0 ? genres.map((genre) => GENRE_LABEL[genre] ?? String(genre)).join(', ') : '-'
}
