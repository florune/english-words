import type { WordEntry } from '../types/word'

let cache: WordEntry[] | undefined

export async function loadWords() {
  if (cache) return cache
  const response = await fetch('/data/words.json')
  if (!response.ok) throw new Error('词库读取失败')
  cache = await response.json() as WordEntry[]
  return cache
}
