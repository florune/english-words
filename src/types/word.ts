export type WordStatus = 'new' | 'unknown' | 'fuzzy' | 'known'
export type StudyMode = 'frequency' | 'random' | 'unknown' | 'fuzzy' | 'review'

export interface WordEntry {
  rank: number
  word: string
  frequency: number
}

export interface WordProgress {
  status: WordStatus
  viewedCount: number
  lastViewedAt: number
}

export interface ActivityDay {
  viewed: number
  marked: number
}

export interface StoredState {
  version: 1
  progress: Record<number, WordProgress>
  frequencyCursor: number
  rangeMax: number
  activity: Record<string, ActivityDay>
  settings: { theme: 'system' | 'light' | 'dark'; voiceURI: string }
}
